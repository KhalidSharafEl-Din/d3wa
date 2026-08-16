# Design

## Theme

**Storefront: the Cairo atelier.** Warm plaster-and-paper daylight gallery where the templates are the framed artwork. The chrome is calm and crafted; every template card supplies its own color world. This deliberately breaks from the old navy+gold chrome, which read as "the Royal Navy template turned into a website." Light theme by intent: browsing/deciding happens as window-shopping, and dark/pastel/vivid template cards all pop against warm paper.

**Templates: each its own world.** No shared palette. The only shared DNA is structural (bilingual, countdown, WhatsApp RSVP) and quality.

## Color (storefront chrome)

- Ground: warm plaster `#f5efe3`, raised paper `#fbf7ee`
- Ink: `#231a10` primary text, `#6d5f4b` secondary
- Accent: burnished copper `#9c4a1a` (hover `#7e3a12`) — carries CTAs, display accents, active states. Committed strategy: copper is the voice, used generously in display moments, not a timid 5%.
- Lines: `rgba(35,26,16,.14)` hairlines; copper at 25% for emphasis rules
- WhatsApp green `#1fa855` (darkened for AA on paper) reserved for WhatsApp actions only
- Never pure #fff/#000

## Typography (storefront)

- Arabic display: **Reem Kufi** (geometric modern Kufi — contemporary studio voice, distinct from every template's classical scripts)
- Body + Latin: **Alexandria** (300/400/600/800), single family carrying both scripts; hierarchy via strong weight contrast (300 body vs 800 display)
- Templates keep their own fonts (Aref Ruqaa, Amiri, El Messiri, Italiana...) inside their own pages/cards only
- Scale: clamp() fluid, ≥1.3 ratio between steps; Arabic body line-height ≥1.9

## Components

- Buttons: pill-less rectangles, 2px radius, copper solid / copper outline; 50px min-height
- Template cards: framed-artwork treatment — paper mat border around the mini phone preview, code chip, price always visible
- Ornament: single hand-drawn-feel copper underline stroke (SVG) under display words; hairline rules elsewhere; no ◆ diamonds (old identity)
- Sections alternate alignment (start-aligned editorial blocks, not everything centered)

## Layout

- max 1120px; asymmetric two-column moments where content allows
- RTL-first with full logical-property mirroring
- 375px is the design target

## Motion

- Scroll reveals: opacity+8px rise, 0.6s ease-out-quart, staggered
- Hover: lift 3px on cards, background shifts on buttons; no bounce
- prefers-reduced-motion: everything off
