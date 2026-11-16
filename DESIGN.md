# Library dashboard design

## Reference and capture

- Reference: [Dashboard UI by Nixtio](https://dribbble.com/shots/25683483-Dashboard-UI).
- Inspected on 16 November 2026 using Firecrawl page retrieval and direct visual inspection of the dashboard shot in the browser.
- Inspected image: https://cdn.dribbble.com/userupload/36734261/file/original-822ee72523e5fd7b7d2d1e968054b218.png?resize=1600x
- The shot is the design reference; Dribbble's surrounding website and branding are not.

## Observed visual system

The shot places a black application shell on a pale sage background. Charcoal cards have large rounded corners, generous internal padding and little border emphasis. Navigation uses dark capsules and a slim column of circular shortcuts. Condensed uppercase headings sit above large numerical readouts. Lime, warm orange and off-white provide contrast. Tiny labels and subtle dividers establish hierarchy without heavy outlines.

The source page lists palette swatches #030303, #8EC060, #435E2A, #FAFAFA, #F95106 and #0F3DDE. These are page-provided palette values, not a complete set of sampled component colors. Brighter lime and softer orange are visible in the shot. Exact font files, CSS spacing, interactions and mobile layouts are not available from the image.

## Implemented tokens (visual estimates and adaptation)

| Role | Value |
| --- | --- |
| Outer sage | #C6D9AC |
| Application shell | #080A08 |
| Card | #202120 |
| Inset | #171817 |
| Accent | #C5F87B |
| Secondary accent | #FFB44F |
| Off-white | #F5F5EF |
| Muted text | #A3A69E |
| Primary card radius | 24px |
| Shell radius | 36px |
| Card gap | 16–24px |

Segoe UI / Arial is the local body-font stack. Impact / Arial Narrow supplies the condensed display headings. These are implementation choices approximating the reference, not identified source fonts.

## Application layout

- Brand and university identifier across the top.
- No sidebar or page-jump navigation, following the user’s preference.
- Heading and refresh action, followed by four occupancy cards and the existing occupancy meter.
- Large interactive building panel beside selected-floor details and live occupancy widgets.
- Telegram controls and notification settings in separate rounded panels below.
- Pill buttons, inset inputs, soft dividers, readable labels and visible keyboard focus throughout.

All original data/action IDs are retained. Numerical values remain sourced from the existing backend. No reference charts or fabricated history have been added. The model, entrance, cutaway, floor controls and continuous occupancy colors are preserved.

## Responsive adaptation and limits

The desktop image does not demonstrate mobile behavior. The implemented mobile layout is an adaptation: two metric columns, a single model/detail column, a compact header and stacked settings. Reduced-motion preferences disable smooth scrolling and transitions. The local embedded browser could not reach the preview server; component references, JavaScript syntax and asset wiring were checked independently.

## Final view selection

The dashboard offers only the whole-building 3D visualization and its selected-level cutaway. The alternative 2D plan and view toggle were removed at the user’s request.
