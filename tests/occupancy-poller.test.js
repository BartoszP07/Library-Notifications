const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createOccupancyPoller, OCCUPANCY_REFRESH_MS } = require('../server/occupancy-poller');

function fixture(fetchSpaces) {
    let time = 100000;
    const timers = [];
    const cancelled = [];
    const poller = createOccupancyPoller(fetchSpaces, {
        now: () => time,
        setTimer: (callback, delay) => {
            const timer = { callback, delay };
            timers.push(timer);
            return timer;
        },
        clearTimer: timer => cancelled.push(timer)
    });
    return { poller, timers, cancelled, advance: milliseconds => { time += milliseconds; } };
}

test('occupancy fetches immediately, then every minute without waiting for Telegram', async () => {
    let calls = 0;
    const { poller, timers, advance } = fixture(async () => {
        calls++;
        return 'OK';
    });
    await poller.start();
    assert.equal(calls, 1);
    assert.equal(timers[0].delay, 60000);
    // Real timers can fire a millisecond early; a scheduled poll must still fetch.
    advance(59999);
    await timers[0].callback();
    assert.equal(calls, 2);
    assert.equal(timers[1].delay, 60000);
    poller.stop();
});

test('concurrent automatic, manual and hourly refreshes share one university request', async () => {
    let complete;
    let calls = 0;
    const { poller } = fixture(() => {
        calls++;
        return new Promise(resolve => { complete = resolve; });
    });
    const first = poller.refresh();
    const second = poller.refresh({ maxAgeMs: OCCUPANCY_REFRESH_MS });
    await Promise.resolve();
    assert.equal(first, second);
    assert.equal(calls, 1);
    complete('OK');
    await first;
});

test('hourly work reuses a fresh cache; manual refresh can fetch immediately', async () => {
    let calls = 0;
    const { poller, advance } = fixture(async () => {
        calls++;
        return 'OK';
    });
    await poller.refresh();
    advance(59000);
    await poller.refresh({ maxAgeMs: OCCUPANCY_REFRESH_MS });
    assert.equal(calls, 1);
    await poller.refresh();
    assert.equal(calls, 2);
    advance(60000);
    await poller.refresh({ maxAgeMs: OCCUPANCY_REFRESH_MS });
    assert.equal(calls, 3);
});

test('failed fetch retains the last successful timestamp and retries on the next minute', async () => {
    let succeed = true;
    const { poller, timers, advance } = fixture(async () => succeed ? 'OK' : 'NOT OK');
    assert.equal(poller.getUpdatedAt(), null);
    await poller.start();
    const updatedAt = poller.getUpdatedAt();
    succeed = false;
    advance(60000);
    await timers[0].callback();
    assert.equal(poller.getUpdatedAt(), updatedAt);
    succeed = true;
    advance(60000);
    await timers[1].callback();
    assert.notEqual(poller.getUpdatedAt(), updatedAt);
    poller.stop();
});

test('slow fetches never overlap and stopping prevents rescheduling', async () => {
    let complete;
    const { poller, timers } = fixture(() => new Promise(resolve => { complete = resolve; }));
    const started = poller.start();
    await Promise.resolve();
    assert.equal(timers.length, 0);
    assert.equal(poller.start(), undefined);
    poller.stop();
    complete('OK');
    await started;
    assert.equal(timers.length, 0);
});

const source = fs.readFileSync(require.resolve('../server/server.js'), 'utf8');
const loopSource = source.match(/async function runLibraryLoop\(\) \{[\s\S]*?\n\}/)[0];

for (const hour of [8, 12, 23]) {
    test(`Telegram scheduled loop keeps forecast/quiet-hour/history behavior at ${hour}:00`, async () => {
        const calls = [];
        const context = {
            OCCUPANCY_REFRESH_MS,
            GetLibrarySpaces: async options => calls.push(['fetch', options.maxAgeMs]),
            Date: class { getHours() { return hour; } getMinutes() { return 0; } },
            library_data: { free: 1200, total: 1800, usage: 'Normal' },
            isQuietHour: value => value >= 23 || value < 8,
            sendDailyForecast: async () => calls.push(['forecast']),
            SendTelegramNotification: async () => calls.push(['telegram']),
            save_library_history: async (free, total) => calls.push(['history', free, total]),
            ScheduleNextRun: () => calls.push(['schedule'])
        };
        vm.runInNewContext(loopSource, context);
        await context.runLibraryLoop();
        assert.deepEqual(calls, [
            ['fetch', 60000],
            ...(hour === 8 ? [['forecast']] : hour === 12 ? [['telegram']] : []),
            ['history', 1200, 1800],
            ['schedule']
        ]);
    });
}
