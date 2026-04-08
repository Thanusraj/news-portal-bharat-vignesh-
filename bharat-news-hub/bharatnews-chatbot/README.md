# BharatNews AI Chatbot — v2.0

A completely redesigned, AI-powered news chatbot with glassmorphism UI, chat history, and rotating logo animation.

---

## Features

- **Crystal Glassmorphism UI** — Dark deep-navy theme with frosted glass cards
- **Chat History Sidebar** — Persistent sessions with pinning, search, and time grouping  
- **Rotating Logo Animation** — Bharat globe logo spins during AI generation (like Claude's animation)
- **Journalist-Style Responses** — Structured news cards with headline, summary, key points, sources
- **Follow-up Suggestions** — Clickable questions to continue the conversation  
- **Sentiment Analysis** — Visual indicator for news tone (Positive/Negative/Neutral/Mixed)
- **Breaking News Banner** — Auto-detects urgent news topics
- **News Ticker** — Animated top bar ticker
- **Animated Background** — Twinkling star constellation effect

---

## Setup

### 1. File Placement

Copy the files into your existing React project:

```
src/
├── components/
│   └── bharatnews/
│       ├── BharatNewsLogo.tsx
│       ├── ChatSidebar.tsx
│       ├── NewsMessageCard.tsx
│       ├── GeneratingIndicator.tsx
│       ├── ChatInput.tsx
│       └── WelcomeScreen.tsx
├── pages/
│   └── NewsBotPage.tsx
├── services/
│   └── newsBotApi.ts
└── types/
    └── newsBot.types.ts
```

Also copy your logo image to:
```
src/assets/logo_part.png
```

### 2. Update Imports in NewsBotPage.tsx

Change the component imports to match your project's alias:
```tsx
// If you use @/ alias:
import ChatSidebar from "@/components/bharatnews/ChatSidebar";

// Or use relative paths:
import ChatSidebar from "../components/bharatnews/ChatSidebar";
```

### 3. API Key Setup

**Option A — Environment Variable (Recommended)**

Add to your `.env` file:
```
VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Option B — In-app Settings**

Leave the env variable empty. When the user first sends a message, the API key modal will appear. The key is saved to localStorage.

**Option C — Use Groq instead of Anthropic**

In `newsBotApi.ts`, import and use `sendNewsQueryGroq` instead of `sendNewsQuery`:
```ts
import { sendNewsQueryGroq } from "@/services/newsBotApi";
// Then use sendNewsQueryGroq(text, history, groqApiKey)
```

Add to `.env`:
```
VITE_GROQ_API_KEY=gsk_your_key_here
```

### 4. Add the Route

In your router file (e.g., `App.tsx`):
```tsx
import NewsBotPage from "@/pages/NewsBotPage";

// Add route:
<Route path="/newsbot" element={<NewsBotPage />} />
```

Or replace your existing `TruthLensPage`:
```tsx
import NewsBotPage from "@/pages/NewsBotPage";
<Route path="/truthlens" element={<NewsBotPage />} />
```

---

## Customization

### Change the AI Provider

Edit `src/services/newsBotApi.ts`:
- Uses Anthropic Claude by default
- Groq (llama-3.3-70b) function also included
- You can add OpenRouter or any OpenAI-compatible API

### Change Logo

Replace the SVG in `BharatNewsLogo.tsx` OR import your actual PNG:
```tsx
import logoSrc from "@/assets/logo_part.png";

// In the component:
<img 
  src={logoSrc} 
  width={size} 
  height={size} 
  style={spinning ? {animation:"bharatLogoSpin 1.8s linear infinite"} : {}}
/>
```

### Adjust Colors

The main accent colors are in each component's inline styles:
- **Saffron accent**: `#FF9933`
- **Purple gradient**: `#6366f1` → `#8b5cf6`
- **Background**: `#040916`

---

## Dependencies Required

These are already in most React projects:
- `react` + `react-dom`
- `lucide-react` (for icons)
- TypeScript

No additional packages needed.

---

## Architecture

```
NewsBotPage
├── ChatSidebar          — Collapsible left panel with session list
├── BharatNewsLogo       — SVG globe logo with spin/pulse animations
├── TopBar               — Logo, status, news ticker, settings button
├── WelcomeScreen        — Shown when session is empty
├── NewsMessageCard      — Renders each AI news response as a structured card
│   ├── Category badge
│   ├── Sentiment indicator
│   ├── Headline (serif font)
│   ├── Summary paragraph
│   ├── Key developments list
│   ├── Sources chips
│   └── Follow-up suggestions
├── GeneratingIndicator  — Spinning logo + pulsing bars + cycling text
└── ChatInput            — Auto-resize textarea with topic suggestions
```

---

Built with ❤️ using Claude AI
