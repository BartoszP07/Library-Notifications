const OCCUPANCY_REFRESH_MS = 60 * 1000;

function createOccupancyPoller(fetchSpaces, {
    now = Date.now,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
    intervalMs = OCCUPANCY_REFRESH_MS
} = {}) {
    let pending = null;
    let lastSuccessAt = null;
    let timer = null;
    let running = false;

    function refresh({ maxAgeMs = 0 } = {}) {
        if (pending) {
            return pending;
        }

        if (lastSuccessAt !== null && maxAgeMs > 0 && now() - lastSuccessAt < maxAgeMs) {
            return Promise.resolve("OK");
        }

        pending = Promise.resolve().then(fetchSpaces).then(result => {
            if (result === "OK") {
                lastSuccessAt = now();
            }
            return result;
        }).finally(() => {
            pending = null;
        });

        return pending;
    }

    async function poll() {
        try {
            await refresh();
        } finally {
            if (running) {
                timer = setTimer(poll, intervalMs);
            }
        }
    }

    function start() {
        if (!running) {
            running = true;
            return poll();
        }
    }

    function stop() {
        running = false;
        clearTimer(timer);
        timer = null;
    }

    function getUpdatedAt() {
        return lastSuccessAt === null ? null : new Date(lastSuccessAt).toISOString();
    }

    return { refresh, start, stop, getUpdatedAt };
}

module.exports = { createOccupancyPoller, OCCUPANCY_REFRESH_MS };
