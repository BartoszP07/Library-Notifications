(() => {
    const refreshButton = document.getElementById("refresh-forecast-btn");
    const status = document.getElementById("forecast-status");
    const content = document.getElementById("forecast-content");
    let loading = false;

    function renderForecast(data) {
        const date = new Date(`${data.date}T12:00:00Z`);
        document.getElementById("forecast-date").textContent = date.toLocaleDateString("en-GB", {
            timeZone: data.timeZone, weekday: "short", day: "numeric", month: "short"
        }) + " · UK time";
        if (!data.availableHours) {
            content.hidden = true;
            status.hidden = false;
            status.textContent = "Not enough history yet. A forecast will appear as occupancy readings are collected for this weekday.";
            return;
        }
        const highest = Math.max(100, Number(data.capacity) || 0, ...data.hours.map(row => row.averagePeople ?? 0));
        const scale = Math.ceil(highest / 250) * 250;
        document.getElementById("forecast-scale-label").textContent = `Scale: 0–${scale.toLocaleString("en-GB")}`;
        const chart = document.getElementById("forecast-chart");
        chart.replaceChildren(...data.hours.map(row => {
            const item = document.createElement("li");
            const hour = String(row.hour).padStart(2, "0") + ":00";
            const nextHour = String(row.hour + 1).padStart(2, "0") + ":00";
            const known = row.averagePeople !== null;
            const tier = ["low", "normal", "high"].includes(row.tier) ? row.tier : "unknown";
            const description = known ? `${hour}–${nextHour}: about ${row.averagePeople} people, ${tier} usage` : `${hour}–${nextHour}: no historical data`;
            item.className = `forecast-hour tier-${tier}`;
            item.title = description;
            item.tabIndex = 0;
            item.setAttribute("aria-label", description);
            item.style.setProperty("--bar-height", `${known ? Math.max(2, Math.min(100, row.averagePeople / scale * 100)) : 2}%`);
            const bar = document.createElement("span");
            bar.className = "forecast-bar";
            bar.setAttribute("aria-hidden", "true");
            const label = document.createElement("span");
            label.className = "forecast-hour-label";
            label.textContent = row.hour % 3 === 0 ? hour : "";
            label.setAttribute("aria-hidden", "true");
            const tooltip = document.createElement("span");
            tooltip.className = "forecast-tooltip";
            tooltip.textContent = description;
            tooltip.setAttribute("aria-hidden", "true");
            item.append(bar, label, tooltip);
            return item;
        }));
        document.getElementById("forecast-quiet").textContent = data.quietWindows === "None"
            ? "No quiet windows in the available history." : data.quietWindows;
        document.getElementById("forecast-peak").textContent = data.peakWindows === "None"
            ? "No peak periods in the available history." : data.peakWindows;
        document.getElementById("forecast-note").textContent = `Based on the last ${data.lookbackDays} days for this weekday. ${data.availableHours}/24 hours have history; gaps mean no data. Estimates use your current usage thresholds, not live counts.`;
        status.hidden = true;
        content.hidden = false;
    }

    async function loadForecast() {
        if (loading) return;
        loading = true;
        if (refreshButton) refreshButton.disabled = true;
        if (refreshButton) refreshButton.textContent = "Refreshing…";
        try {
            const response = await fetch("/api/forecast", { cache: "no-store" });
            if (!response.ok) throw new Error("Forecast request failed");
            const { data } = await response.json();
            if (!data || !Array.isArray(data.hours)) throw new Error("Missing forecast data");
            renderForecast(data);
        } catch (error) {
            content.hidden = true;
            status.hidden = false;
            status.textContent = "Couldn’t load the forecast. Use Refresh forecast to try again.";
        } finally {
            if (refreshButton) refreshButton.disabled = false;
            if (refreshButton) refreshButton.textContent = "Refresh forecast";
            loading = false;
        }
    }

    if (refreshButton) refreshButton.addEventListener("click", loadForecast);
    window.addEventListener("forecast-settings-changed", loadForecast);
    // Update through the day (including midnight) without polling the database every five seconds.
    setInterval(loadForecast, 15 * 60 * 1000);
    loadForecast();
})();

