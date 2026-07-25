# SyncPM — Design System

Direction: **Focused & professional** — a clean, navy-accented SaaS look. Meant to read as trustworthy and low-noise, closer to Linear/Notion than a flashy consumer app.

## 1. Color & Theme

### Core palette
| Token | Hex | Usage |
|---|---|---|
| `bg-page` | `#F6F7F9` | App background |
| `bg-card` | `#FFFFFF` | Cards, panels |
| `border` | `#E4E7EC` | Card borders, dividers |
| `text-primary` | `#101828` | Headings, primary body text |
| `text-secondary` | `#667085` | Muted/supporting text, timestamps |

### Accent (primary actions)
| Token | Hex | Usage |
|---|---|---|
| `accent` | `#2454FF` | Primary buttons ("Sync to Jira"), links, active states |
| `accent-bg` | `#EEF4FF` | Owner pill backgrounds, subtle highlights |
| `accent-text-on-tint` | `#2454FF` | Text on `accent-bg` tints |

### Semantic (status)
| Token | Hex (bg / text) | Usage |
|---|---|---|
| Warning / Blocker | `#FFF4E5` / `#B54708` | Blocker tags |
| Success / Synced | `#ECFDF3` / `#067647` | "Synced to Jira" state |
| Danger (reserved) | `#FEF3F2` / `#B42318` | Failed Jira sync, destructive actions |

No dark mode in v1 — this is a single-user portfolio tool, so one well-tuned light theme is prioritized over building and maintaining two.

## 2. Font

- **Primary typeface:** [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts, free) — used for everything: headings, body, labels, buttons
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
| Page title | 19px | 600 | 1.3 | Screen headers ("Review & edit") |
| Section subtitle | 13px | 400 | 1.4 | Context line under a page title |
| Card title | 14px | 500 | 1.4 | Action item description |
| Body | 14px | 400 | 1.5 | Default paragraph/body text |
| Label / pill / badge | 12px | 500 | 1.3 | Owner tags, status tags, button text |
| Micro / caption | 11px | 400 | 1.3 | Timestamps, fine print (11px floor — never smaller) |

## 4. Component Tokens (for consistency across screens)

- **Card radius:** 10px
- **Button/pill radius:** 6px
- **Card padding:** 14px 16px
- **Card border:** 1px solid `border`
- **Button height:** ~32px, padding 6px 12px
- **Gap between stacked cards:** 12px

## 5. Tailwind Reference

```js
// tailwind.config.ts (excerpt)
theme: {
  extend: {
    colors: {
      page: '#F6F7F9',
      card: '#FFFFFF',
      border: '#E4E7EC',
      'text-primary': '#101828',
      'text-secondary': '#667085',
      accent: '#2454FF',
      'accent-tint': '#EEF4FF',
      warning: '#B54708',
      'warning-tint': '#FFF4E5',
      success: '#067647',
      'success-tint': '#ECFDF3',
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
    },
  },
},
```
