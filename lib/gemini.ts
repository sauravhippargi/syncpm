import {
  ACTION_ITEM_RESPONSE_SCHEMA,
  buildExtractionPrompt,
  validateExtractionResult,
  type ExtractedActionItem,
} from "./prompts/extraction";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Thrown when the Gemini request itself fails (network error, non-429 error
// status, or exhausted 429 retries). Caller shows "Extraction failed — try
// again" per rules.md.
export class GeminiRequestError extends Error {}

// Thrown when Gemini responds successfully but the JSON doesn't match the
// expected schema. Carries the raw text so the caller can show it and let
// the user manually add items instead of silently coercing (rules.md).
export class GeminiValidationError extends Error {
  rawOutput: string;
  constructor(message: string, rawOutput: string) {
    super(message);
    this.rawOutput = rawOutput;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 429 backoff per rules.md section 2: retry up to 3x (1s -> 2s -> 4s).
const BACKOFF_MS = [1000, 2000, 4000];

// generationConfig is optional — omit it entirely for plain-text output
// (e.g. Slack draft messages); pass responseMimeType/responseSchema for
// structured JSON output (e.g. extraction). apiKeyOverride defaults to
// GEMINI_API_KEY (the only key production callers ever use) — it exists so
// evals/run.ts can pass its own separate GEMINI_API_KEY_EVAL key, keeping
// eval trials off the same free-tier daily quota as real user traffic,
// without any production call site needing to change.
async function callGemini(
  prompt: string,
  generationConfig?: Record<string, unknown>,
  apiKeyOverride?: string
): Promise<string> {
  const apiKey = apiKeyOverride ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiRequestError("GEMINI_API_KEY is not configured");
  }

  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    let response: Response;
    try {
      response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(generationConfig ? { generationConfig } : {}),
        }),
      });
    } catch (err) {
      throw new GeminiRequestError(
        `Gemini request failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (response.status === 429) {
      if (attempt < BACKOFF_MS.length) {
        await sleep(BACKOFF_MS[attempt]);
        continue;
      }
      throw new GeminiRequestError("Gemini rate limit exceeded after retries (429)");
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new GeminiRequestError(
        `Gemini request failed (${response.status}): ${body.slice(0, 500)}`
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      throw new GeminiRequestError("Gemini response missing expected text output");
    }
    return text;
  }

  // Unreachable: the loop above always returns or throws.
  throw new GeminiRequestError("Gemini request failed");
}

export async function extractActionItems(
  transcriptText: string,
  apiKeyOverride?: string
): Promise<ExtractedActionItem[]> {
  const prompt = buildExtractionPrompt(transcriptText);
  const rawOutput = await callGemini(
    prompt,
    {
      responseMimeType: "application/json",
      responseSchema: ACTION_ITEM_RESPONSE_SCHEMA,
      // Extraction must be deterministic: the same transcript should always
      // yield the same action items. At the model default (temperature 1) the
      // identical transcript produced anywhere from 1 to 4 items with differing
      // phrasing across runs (observed on the "PMM Team Weekly Call" re-sync).
      // Consistency matters here far more than creative variation, so pin it low.
      temperature: 0,
    },
    apiKeyOverride
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawOutput);
  } catch {
    throw new GeminiValidationError("Gemini output was not valid JSON", rawOutput);
  }

  const items = validateExtractionResult(parsed);
  if (!items) {
    throw new GeminiValidationError(
      "Gemini output didn't match the expected schema",
      rawOutput
    );
  }

  return items;
}

// Plain-text output (no JSON schema) — used for Slack draft messages
// (prd.md 6.5), which are freeform prose, not structured data.
export async function draftSlackMessage(prompt: string): Promise<string> {
  const text = await callGemini(prompt);
  return text.trim();
}
