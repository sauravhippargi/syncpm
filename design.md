# SyncPM — Design System

Direction: **Stripe-inspired** — near-white background, soft barely-there card shadows instead of relying on borders alone, a signature indigo accent, and small dot/chip indicators in place of larger icons. Reads as polished and product-grade rather than purely utilitarian. (Superseded the earlier "Focused & professional" navy direction — this file reflects the current, adopted palette.)

## 1. Color & Theme

### Core palette
| Token | Hex | Usage |
|---|---|---|
| `bg-page` | `#F6F9FC` | App background |
| `bg-card` | `#FFFFFF` | Cards, panels, sidebar |
| `card-border` | `#E3E8EE` | Card borders, dividers |
| `row-divider` | `#EDF1F5` | Dividers between list rows within a card |
| `card-shadow` | `0 2px 5px -1px rgba(50,50,93,.06), 0 1px 3px -1px rgba(0,0,0,.05)` | Applied to every card alongside its border — soft elevation, not flat |
| `text-primary` | `#0A2540` | Headings, primary body text |
| `text-secondary` | `#6B7280` | Muted/supporting text, timestamps |
| `text-body` | `#1A1F36` | Slightly softer than text-primary, for longer body copy |
| `text-muted` | `#9CA3AF` | Lowest-emphasis text (placeholders, disabled states) |

### Sidebar-specific
| Token | Hex | Usage |
|---|---|---|
| `sidebar-bg` | `#FFFFFF` | Sidebar background |
| `sidebar-border` | `#E3E8EE` | Sidebar right-edge border |
| `sidebar-text-inactive` | `#6B7280` | Inactive nav link text |
| `sidebar-selected-bg` | `#F0F3FF` | Active nav link background |
| `sidebar-selected-icon` | `#635BFF` | Active nav link icon color |
| `sidebar-selected-text` | `#423DAB` | Active nav link text color |

### Accent (primary actions)
| Token | Hex | Usage |
|---|---|---|
| `accent` / `primary` | `#635BFF` | Primary buttons, links, active states, "Raise a ticket" |
| `accent-bg` | `#F0F3FF` | Owner pill backgrounds, subtle highlights (matches sidebar-selected-bg) |

**Owner vs. source-transcript link (Action Items tab):** these must not share a color. Owner stays a pill (`accent-bg`/`accent`, indigo). The "which meeting it came from" reference is deliberately *not* a pill — it's a plain text link in `text-secondary` gray, underlined on hover, since it's a contextual breadcrumb rather than a categorical tag like owner or blocker.
| `neutral-pill-bg` | `#F0F3F7` | Neutral pills/tags with no specific status color |
| `neutral-pill-text` | `#536171` | Text on neutral pills |

### Semantic (status)
| Token | Hex | Usage |
|---|---|---|
| `success` | `#00A67E` | "Synced to Jira" state, positive trend indicators |
| `warning` | `#FFB020` | Blocker indicators (dot/border accents) |
| `warning-bg` / `warning-text` | `#FFF6E5` / `#B25E00` | Blocker tags |
| `danger` | `#E5484D` | Failed Jira sync, destructive actions (delete confirmations) |
| `info` | `#635BFF` | Same as accent — informational highlights |

No dark mode in v1 — this is a single-user portfolio tool, so one well-tuned light theme is prioritized over building and maintaining two.

## 2. Font

- **Primary typeface:** [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts, free) — used for everything: headings, body, labels, buttons. Unchanged by the Stripe palette adoption — only colors/shadows changed, not the font strategy.
- **Weights used:** 400 (regular, body text), 500 (medium, labels/buttons/emphasis), 600 (semibold, headings only)
- Loaded via `next/font/google` for automatic optimization (no manual `<link>` tags, no layout shift)

```ts
// app/layout.tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })
```

## 3. Typography Scale

| Style | Size | Weight | Line-height | Usage |
|---|---|---|---|---|
| Page title | 24px | 700 | 1.2 | Screen headers ("Review & Edit"), letter-spacing -0.01em — stands alone, no subtitle underneath (removed app-wide) |
| Section header (in-card) | 14px | 600 | 1.3 | Panel titles inside a card, e.g. "Recent Transcripts," "Upcoming Deadlines" |
| Card title | 14px | 500 | 1.4 | Action item description |
| Body | 14px | 400 | 1.5 | Default paragraph/body text |
| Label / pill / badge | 12px | 500 | 1.3 | Owner tags, status tags, button text |
| Micro / caption | 11px | 400 | 1.3 | Timestamps, fine print (11px floor — never smaller) |

Page subtitles (the descriptive tagline that used to sit under every page title, e.g. "An overview of your open action items...") have been removed app-wide — every page title now stands alone with no explanatory line beneath it.

**All headers use Title Case** — page titles, in-card section headers ("Recent Transcripts," "Missed Deadlines"), sidebar nav labels, and modal titles all capitalize each major word (small connector words like "a," "to," "the" stay lowercase — "Upload a Transcript," not "Upload A Transcript"). This applies only to UI chrome/structural labels, never to actual content (an extracted action item's description, an AI-drafted message, a real Jira ticket title) — those stay exactly as extracted or entered, untouched.

## 4. Component Tokens (for consistency across screens)

- **Card radius:** 10px
- **Button/pill radius:** 6px
- **Card padding:** 14px 16px
- **Card border:** 1px solid `card-border`, **plus** `card-shadow` (both together — this theme uses soft shadow depth, not flat borders alone, unlike the earlier direction)
- **Button height:** ~32px, padding 6px 12px
- **Gap between stacked cards:** 12px generally; **16px specifically on Action Items**, since each card there carries more controls (owner, due date, status, ticket/message actions, edit/delete) than a simple list row and benefits from a bit more breathing room between cards

### Dashboard empty state — blurred backdrop
- The real populated layout (stat cards + Recent Transcripts/Upcoming Deadlines columns), filled with representative sample data, rendered behind the welcome content — not a blank page
- Backdrop treatment: `filter: blur(5px)`, `opacity: 0.55`, and non-interactive (`pointer-events: none`) — it's a preview, not real/clickable content
- Foreground (welcome heading, option cards, 3-step row) stays fully sharp, with a stronger shadow than the backdrop's normal card-shadow (e.g. `0 8px 24px -4px rgba(50,50,93,.15), 0 4px 8px -2px rgba(0,0,0,.08)`) so it visibly sits above the blurred layer rather than blending into it
- Sample data used for the backdrop should look plausible (real-looking transcript titles, counts, dates) — not placeholder Lorem ipsum or all-zero stats, since the point is to preview what real use looks like

### Stat cards (Dashboard)
- Padding: `20px 20px 18px`
- **Number-first layout**: the number renders large and *above* its label, not below it
- Number: 30px, weight 700, letter-spacing -0.02em, line-height 1.1, margin-bottom 6px
- Four stat cards, each with a distinct color: **Open action items** → `accent` (indigo, in-progress), **Blockers** → `warning` (orange, needs attention), **Completed action items** → `success` (green), **Tickets raised** → `jira-blue` (`#0052CC`, Atlassian's actual brand blue — kept distinct from Completed's green since sharing a color made the two easy to confuse at a glance; blue also reads as a deliberate nod to the specific tool tickets are raised in)
- **Responsive:** the 4-across desktop layout doesn't survive phone widths (confirmed on a real iPhone — labels clip/overflow at 4 columns under ~400px). Below the same `md` breakpoint used for the mobile nav, switch to a **2×2 grid** — keeps all four scannable without stacking to a single tall column.
- Label: below the number, small (~12.5px), `text-secondary`, with a small colored dot before the text matching the stat's color
- Clicking the **Open action items** card navigates to the Action Items tab

### Meta pills (transcript/action item counts)
- Not plain text — two small pill-shaped tags: `inline-flex`, padding `2px 8px`, `border-radius: 20px` (fully rounded), font-size 11.5px, weight 600
- Neutral variant (`neutral-pill-bg`/`neutral-pill-text`) for counts like "7 action items"
- Warning variant (`warning-bg`/`warning-text`) for "1 blocker"
- Pills are followed by a `·` separator, then the plain (non-pilled) timestamp text — e.g. `[7 action items] [1 blocker] · 7/25/2026, 10:42:24 AM`

### List rows (Recent Transcripts, Action Items, Deadlines — same base pattern, one weight distinction)

### Deadlines page — Missed/Upcoming sections, grouped by date
- Section headers ("Missed Deadlines," "Upcoming Deadlines"): same section-header style as panel titles (14px/600), Missed Deadlines rendered in `danger` red rather than the default text-primary color, so it reads as urgent at a glance, not just structurally first
- **Date-group headers sit outside/above any card — plain text, no border or background of their own**, not padded inside the same box as the items below it. Smaller than the section header, `text-secondary` (Missed Deadlines' date headers may take a subtle danger tint to reinforce urgency; Upcoming's stay neutral).
- **Each action item is its own separate card** (same bordered/shadowed card style as Action Items and Recent Transcripts) — not multiple items sharing one continuous box with internal dividers between them. A date header is followed by one card per item due that day, each fully independent.
- Individual rows no longer show their own due date (redundant once grouped under a date header) — same row pattern otherwise (owner pill, blocker tag, source-transcript link)
- Row padding: `12px 0`
- Row divider: `1px solid row-divider`, with the last row in a list having no border
- Meta line (item counts as pills, timestamps): 12.5px, `text-secondary`, pieces separated by a 6px gap, wrapping allowed
- **Row title weight depends on content type**: short titles (transcript names, in Recent Transcripts) are bold — 14.5px, weight 600, margin-bottom 6px before the meta line. Longer descriptive content (an action item's full description, in Deadlines and Action Items) is **not bold** — same 14.5px size, but weight 400 — since a full sentence in heavy weight reads as harder to scan, not more important.

## 5. Tailwind Reference

```js
// tailwind.config.ts (excerpt)
theme: {
  extend: {
    colors: {
      page: '#F6F9FC',
      card: '#FFFFFF',
      'card-border': '#E3E8EE',
      'row-divider': '#EDF1F5',
      'text-primary': '#0A2540',
      'text-secondary': '#6B7280',
      'text-body': '#1A1F36',
      'text-muted': '#9CA3AF',
      accent: '#635BFF',
      'accent-tint': '#F0F3FF',
      'sidebar-selected-text': '#423DAB',
      'neutral-pill-bg': '#F0F3F7',
      'neutral-pill-text': '#536171',
      success: '#00A67E',
      warning: '#FFB020',
      'warning-bg': '#FFF6E5',
      'warning-text': '#B25E00',
      danger: '#E5484D',
      'jira-blue': '#0052CC',
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
    },
    boxShadow: {
      card: '0 2px 5px -1px rgba(50,50,93,.06), 0 1px 3px -1px rgba(0,0,0,.05)',
    },
  },
},
```
