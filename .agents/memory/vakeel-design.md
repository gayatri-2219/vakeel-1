---
name: VAKEEL design system
description: Color tokens, font stack, logo, and QVAC branding conventions for the VAKEEL app.
---

**Why:** These choices were confirmed by the user and represent non-obvious decisions worth being consistent with.

**Color tokens (CSS variables in index.css):**
- `--primary`: hsl(160 70% 14%) — deep legal green #0b3b2d
- `--secondary`: hsl(35 45% 62%) — muted gold (gold accent)
- `--background`: hsl(40 25% 97%) — warm cream
- `--risk-green/amber/red`: hsl(152 64% 28%), hsl(38 90% 48%), hsl(0 78% 52%)

**Font stack:**
- Headings: Cabinet Grotesk (font-display class)
- Body: Plus Jakarta Sans (font-sans)
- Code/model names: JetBrains Mono (font-mono)

**Logo:** SVG shield with gold "V" path on dark green background. Component at `src/components/Logo.tsx` exports `VakeelLogo` (SVG) and `VakeelWordmark` (styled span).

**QVAC branding rule:** Always show model names in JetBrains Mono — LLAMA_3_2_1B_INST_Q4_0, LLAMA_3_2_11B_VISION_INSTRUCT, NOMIC_EMBED_TEXT_V1_5_Q8_0, WHISPER_TINY, VAD_SILERO_5_1_2. QvacBadge component shows @qvac/sdk + model + offline status.

**How to apply:** Any new page/component should use these tokens. Avoid inline hex values — always use CSS variables or Tailwind utility classes mapped in tailwind.config.js.
