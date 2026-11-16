let library_data;
let occupancyLoading = false;
const refreshSpacesButton = document.getElementById('press-btn');

async function loadPublicSpaces() {
    if (occupancyLoading) {
        return;
    }

    occupancyLoading = true;
    refreshSpacesButton.disabled = true;
    refreshSpacesButton.textContent = 'Refreshing…';

    try {
        const response = await fetch('/api/get-spaces', { cache: 'no-store' });
        if (!response.ok) throw new Error('Occupancy unavailable');
        library_data = (await response.json()).data;
        if (!library_data) throw new Error('Occupancy unavailable');
        const update = (id, value, label) => {
            const element = document.getElementById(id);
            const metric = document.createElement('span');
            metric.className = 'metric-value';
            metric.textContent = value;
            element.replaceChildren(metric, ` ${label}`);
        };
        update('free-spaces', library_data.free, 'spaces free');
        update('free-spaces-percent', `${library_data.freePercentage}%`, 'Free');
        update('total-spaces', library_data.total, 'Total Spaces');
        update('usage-status', library_data.usage ?? '--', 'Usage Level');
        const tier = library_data.usage_tier === 'medium' ? 'normal' : library_data.usage_tier;
        document.getElementById('usage-status').dataset.usageTier = ['low','normal','high'].includes(tier) ? tier : 'unknown';
        const occupied = Math.max(0, library_data.total - library_data.free);
        const percent = library_data.total > 0 ? Math.min(100, Math.round(occupied / library_data.total * 100)) : 0;
        document.getElementById('occupancy-meter-fill').style.width = `${percent}%`;
        document.getElementById('occupied-summary').textContent = `${occupied} / ${library_data.total} OCCUPIED (${percent}%)`;
        renderFloor();
    } catch (error) {
        document.getElementById('occupied-summary').textContent = 'Occupancy unavailable';
    } finally {
        occupancyLoading = false;
        refreshSpacesButton.disabled = false;
        refreshSpacesButton.textContent = 'Refresh data';
    }
}
refreshSpacesButton.addEventListener('click', loadPublicSpaces);
loadPublicSpaces();
setInterval(loadPublicSpaces, 60000);
