# Design

## Theme

Midnight celebration: deep navy night-sky ground with candlelit gold. Evokes an Egyptian wedding at night, lights strung over a Nile-side venue. Dark by intent (invitations are opened in evening WhatsApp sessions; gold reads as celebration against night), with each template demo carrying its own palette.

## Color

- `--navy #16213c` primary ground; `--navy-2 #1d2b4d` raised; `--navy-3 #0d1730` header/deep
- `--gold #cfa658` accent and CTAs; `--gold-lt #e3cf9b` headings-on-dark
- `--ivory #f2ecdf` body text; `--muted #a8a294` secondary
- Lines: gold at 15–30% alpha, never solid hairlines
- Strategy: Committed. Gold carries identity (30%+ of visual weight via ornament, borders, CTAs); navy is the drenched ground. Template mini-previews are the only place foreign palettes appear.

## Typography

- Arabic display: "Aref Ruqaa" (headings, ornamental), fallback "Amiri"
- Arabic body: "Cairo" 300/400/600/800
- Latin display: "Italiana" (brand, EN headings)
- Scale: clamp()-based, hero 34–58px, section titles 26–38px, body 14–15px; line-height 1.9 for Arabic body
- Arabic leads: EN swaps display font but inherits the same hierarchy

## Components

- Buttons: 3px radius, 50px min-height, outlined gold or solid gold on navy; WhatsApp green reserved for the floating bubble only
- Template cards: mini live-style preview (arch motif) above meta; hover lift 4px
- Ornament: thin gradient rules with a ◆ diamond; eight-point star motifs in moderation
- Panels/FAQ: 1px gold-soft border, 8–10px radius, near-transparent white fill

## Layout

- Single column, max 1080px, generous clamp() section padding (44–80px)
- RTL default; every inline-start/end property logical, mirrors cleanly in EN/LTR
- Mobile-first: 375px is the design target, desktop is the enlargement

## Motion

- 0.3s ease transitions on hover/CTA; scroll-behavior smooth
- prefers-reduced-motion: all transitions off
