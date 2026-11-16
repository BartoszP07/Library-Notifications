# Durham-inspired library dashboard

The dashboard is a student tool for checking live study-space availability. Use a compact white header, serif library name, sans serif UI and tabular numbers. Keep navigation and controls familiar, and let the live free-space count lead the overview.

Shared CSS theme tokens in both existing client stylesheets define white (`#FFFFFF`), Durham-inspired purple (`#68246D`), pale lilac (`#F7F1F8`) and dark plum (`#231B25`). Purple identifies active tabs, selected floors and keyboard focus. Thin dividers and spacing group supporting metrics. Usage labels use readable green, amber and red inks on pale surfaces and remain visually distinct from buttons. Continuous occupancy colours remain on the model, bars and functional legend; text badges use darker inks for contrast.

Overview includes live occupancy followed by Today's forecast, separated by spacing and a thin divider. Both public and private dashboards use this combined tab. Forecast keeps prominent quieter and peak periods, the existing hourly chart, tooltips and explanation. Explore remains a separate tab for the 3D floor guide, with both floor selectors, all model controls, occupancy details and the schematic note. Private Notifications and Settings remain separate tabs. The model supplies the visual interest; introductory copy stays brief.

The combined Overview tab replaces the separate Forecast tab at Bart's request; all forecast content and controls remain available. Preserve calculations, thresholds, chart and map interactions. Occupancy now refreshes in a separate minute-based backend poller; Telegram and history retain their existing schedule and quiet hours. The private frequency label names Telegram explicitly. See `public-app/README.md` for refresh and cache timing.
