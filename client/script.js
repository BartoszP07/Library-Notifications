const btn = document.getElementById("press-btn");
const msg_inp = document.getElementById("message-input");
const msg_btn = document.getElementById("send-message-btn");

const total_spaces_p = document.getElementById("total-spaces");
const free_spaces_p = document.getElementById("free-spaces");
const free_spaces_percent_p = document.getElementById("free-spaces-percent");
const usage_status_p = document.getElementById("usage-status");
const occupancy_meter_fill = document.getElementById("occupancy-meter-fill");
const occupied_summary = document.getElementById("occupied-summary");

const update_time_p = document.getElementById("update-time-p");
const toast_container = document.getElementById("toast-container");

function showToast(title, message, isError = false) {
    if (!toast_container) return;

    const toast = document.createElement("div");
    toast.className = `toast${isError ? " toast-error" : ""}`;
    toast.innerHTML = `
        <span class="toast-tag">${title}</span>
        <span class="toast-msg">${message}</span>
    `;

    toast_container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 200);
    }, 3200);
}

const increase_freq = document.getElementById("increase-frequency-btn");
const decrease_freq = document.getElementById("decrease-frequency-btn");
const freq_value_p = document.getElementById("frequency-value");
const apply_freq_btn = document.getElementById("apply-frequency-btn");
const next_run_time_p = document.getElementById("next-run-time-p");

const quiet_start_select = document.getElementById("quiet-start-select");
const quiet_end_select = document.getElementById("quiet-end-select");
const apply_quiet_btn = document.getElementById("apply-quiet-btn");
const quiet_status_summary = document.getElementById("quiet-status-summary");

const low_label_input = document.getElementById("low-label-input");
const low_max_input = document.getElementById("low-max-input");
const normal_label_input = document.getElementById("normal-label-input");
const normal_range_readout = document.getElementById("normal-range-readout");
const high_label_input = document.getElementById("high-label-input");
const high_min_input = document.getElementById("high-min-input");
const apply_usage_btn = document.getElementById("apply-usage-btn");

const target_main_btn = document.getElementById("target-main-btn");
const target_debug_btn = document.getElementById("target-debug-btn");

let current_telegram_target = "main";
let waiting_minutes;
let current_waiting_minutes = 60;
let settings_initialized = false;

let min_freq = 1;
let max_freq = 120;

let library_data;

function formatHourLabel(hour) {
    const ampm = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${h}:00 ${ampm}`;
}

function initQuietSelects() {
    if (!quiet_start_select || !quiet_end_select) return;
    quiet_start_select.innerHTML = "";
    quiet_end_select.innerHTML = "";

    for (let h = 0; h <= 23; h++) {
        const label = formatHourLabel(h);
        const optStart = document.createElement("option");
        optStart.value = h;
        optStart.textContent = label;
        quiet_start_select.appendChild(optStart);

        const optEnd = document.createElement("option");
        optEnd.value = h;
        optEnd.textContent = label;
        quiet_end_select.appendChild(optEnd);
    }

    quiet_start_select.value = "0";
    quiet_end_select.value = "6";
}

function updateQuietSummaryDisplay(startHour, endHour) {
    if (!quiet_status_summary) return;
    if (startHour === endHour) {
        quiet_status_summary.innerText = "QUIET: DISABLED (24/7 ACTIVE)";
    } else {
        quiet_status_summary.innerText = `QUIET: ${formatHourLabel(startHour)} - ${formatHourLabel(endHour)}`;
    }
}

function updateNextRunDisplay(isoString) {
    if (!next_run_time_p || !isoString) return;
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return;
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    next_run_time_p.innerText = `NEXT: ${timeStr}`;
}

function setTelegramTargetUI(target) {
    current_telegram_target = target === "debug" ? "debug" : "main";
    if (target_main_btn && target_debug_btn) {
        target_main_btn.classList.toggle("active", current_telegram_target === "main");
        target_debug_btn.classList.toggle("active", current_telegram_target === "debug");
    }
}

async function switchTelegramTarget(target) {
    try {
        const response = await fetch("/api/change-telegram-target", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ target })
        });
        const data = await response.json();
        if (response.ok) {
            setTelegramTargetUI(data.telegram_target);
            const label = data.telegram_target === "debug" ? "Debug Chat" : "Main Chat";
            showToast("CHAT TARGET UPDATED", `Routing Telegram messages to ${label}.`);
        } else {
            showToast("TARGET ERROR", data.error || "Could not switch Telegram chat.", true);
        }
    } catch (err) {
        console.error(err);
        showToast("NETWORK ERROR", "Could not reach server to switch Telegram chat.", true);
    }
}

if (target_main_btn) {
    target_main_btn.addEventListener("click", () => switchTelegramTarget("main"));
}
if (target_debug_btn) {
    target_debug_btn.addEventListener("click", () => switchTelegramTarget("debug"));
}

initQuietSelects();

async function ApplyNewFrequency(){
    try{
        const response = await fetch("/api/change-fetch-frequency", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({frequency: current_waiting_minutes})
        });
        const data = await response.json();
        console.log(data);
        if (response.ok) {
            waiting_minutes = current_waiting_minutes;
            update_time_p.innerHTML = `Updates Every <span style="color:gold;">${waiting_minutes}</span> Minutes`;
            if (data.next_run_time) {
                updateNextRunDisplay(data.next_run_time);
            }
            showToast("FREQUENCY UPDATED", `Sync schedule set to every ${current_waiting_minutes} minutes.`);
        } else {
            showToast("UPDATE FAILED", data.error || "Could not update frequency.", true);
        }
    }
    catch (err){
        console.error(err);
        showToast("NETWORK ERROR", "Could not reach server to update frequency.", true);
    }
}

apply_freq_btn.addEventListener("click", async function() {
    await ApplyNewFrequency();
})

async function ApplyQuietHours() {
    const startHour = Number(quiet_start_select.value);
    const endHour = Number(quiet_end_select.value);
    try {
        const response = await fetch("/api/change-quiet-hours", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ startHour, endHour })
        });
        const data = await response.json();
        if (response.ok) {
            updateQuietSummaryDisplay(data.quiet_start_hour, data.quiet_end_hour);
            const msg = startHour === endHour
                ? "Quiet hours disabled — notifications active all day."
                : `Muted between ${formatHourLabel(startHour)} and ${formatHourLabel(endHour)}.`;
            showToast("QUIET HOURS SAVED", msg);
        } else {
            showToast("UPDATE FAILED", data.error || "Could not update quiet hours.", true);
        }
    } catch (err) {
        console.error(err);
        showToast("NETWORK ERROR", "Could not reach server to update quiet hours.", true);
    }
}

if (apply_quiet_btn) {
    apply_quiet_btn.addEventListener("click", ApplyQuietHours);
}

function updateNormalRangeReadout() {
    if (!normal_range_readout || !low_max_input || !high_min_input) return;
    const lowVal = Number(low_max_input.value) || 0;
    const highVal = Number(high_min_input.value) || 0;
    normal_range_readout.innerText = `${lowVal} – ${highVal}`;
}

if (low_max_input && high_min_input) {
    low_max_input.addEventListener("input", updateNormalRangeReadout);
    high_min_input.addEventListener("input", updateNormalRangeReadout);
}

async function ApplyUsageSettings() {
    const lowMax = Number(low_max_input.value);
    const highMin = Number(high_min_input.value);
    const lowLabel = low_label_input.value.trim() || "Low";
    const normalLabel = normal_label_input.value.trim() || "Normal";
    const highLabel = high_label_input.value.trim() || "High";

    if (highMin < lowMax) {
        showToast("INVALID RANGE", "High cutoff must be greater than or equal to Low cutoff.", true);
        return;
    }

    try {
        const response = await fetch("/api/change-usage-settings", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                lowMax,
                highMin,
                lowLabel,
                normalLabel,
                highLabel
            })
        });
        const data = await response.json();
        if (response.ok) {
            updateNormalRangeReadout();
            await GetSpaces();
            showToast(
                "USAGE UPDATED",
                `${lowLabel} (<${lowMax}) · ${normalLabel} (${lowMax}–${highMin}) · ${highLabel} (>${highMin})`
            );
        } else {
            showToast("UPDATE FAILED", data.error || "Could not update usage settings.", true);
        }
    } catch (err) {
        console.error(err);
        showToast("NETWORK ERROR", "Could not reach server to update usage settings.", true);
    }
}

if (apply_usage_btn) {
    apply_usage_btn.addEventListener("click", ApplyUsageSettings);
}

function ChangeCurrentFreq(value){
    current_waiting_minutes += value;
    if (current_waiting_minutes < min_freq)
    { 
        current_waiting_minutes = min_freq;
    }
    else if (current_waiting_minutes > max_freq)
    { 
        current_waiting_minutes = max_freq;
    }
    freq_value_p.innerText = current_waiting_minutes;
}

increase_freq.addEventListener("click", function() {
    ChangeCurrentFreq(-1);
})

decrease_freq.addEventListener("click", function() {
    ChangeCurrentFreq(1);
})

btn.addEventListener("click", async function(){
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Fetching...";
    try {
        const response = await fetch("/api/get-updated-spaces", {
            method: "POST"
        });
        console.log(response.ok);

        if (response.ok) {
            await GetSpaces();
            const details = library_data
                ? `Updated: ${library_data.free} / ${library_data.total} free spaces (${library_data.freePercentage}%).`
                : "Latest occupancy data fetched.";
            showToast("DATA SYNCED", details);
        } else {
            showToast("SYNC FAILED", "University API did not return updated data.", true);
        }
    } catch (err) {
        console.error(err);
        showToast("NETWORK ERROR", "Could not reach server to update data.", true);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
})

async function handleSendTelegram() {
    if (msg_inp.value.trim().length < 1) { return; }
    const messageToSend = msg_inp.value;
    msg_inp.value = "";
    await SendTelegram(messageToSend);
}

msg_btn.addEventListener("click", handleSendTelegram);

msg_inp.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        handleSendTelegram();
    }
});

async function GetSpaces(){
    try{
        const response = await fetch("/api/get-spaces");
        const data = (await response.json()).data;
        library_data = data;

        // Update variables
        // Check if the data is defined
        if (data){
            total_spaces_p.innerHTML = `<span style="color:gold;">${data.total}</span> Total Spaces`;
            free_spaces_p.innerHTML = `<span style="color:gold;">${data.free}</span> Free Spaces`;
            free_spaces_percent_p.innerHTML = `<span style="color:gold;">${data.freePercentage}%</span> Free`;
            if (usage_status_p) {
                usage_status_p.innerHTML = `<span style="color:gold;">${data.usage ?? "--"}</span> Usage Level`;
            }

            const occupied = Math.max(0, data.total - data.free);
            const occupiedPct = data.total > 0 ? Math.min(100, Math.round((occupied / data.total) * 100)) : 0;
            if (occupancy_meter_fill) {
                occupancy_meter_fill.style.width = `${occupiedPct}%`;
            }
            if (occupied_summary) {
                occupied_summary.innerText = `${occupied} / ${data.total} OCCUPIED (${occupiedPct}%)`;
            }
        }
        else{
            total_spaces_p.innerHTML = `<span style="color:gold;">Loading</span> Total Spaces`;
            free_spaces_p.innerHTML = `<span style="color:gold;">Loading</span> Free Spaces`;
            free_spaces_percent_p.innerHTML = `<span style="color:gold;">Loading</span> Free`;
            if (usage_status_p) {
                usage_status_p.innerHTML = `<span style="color:gold;">Loading</span> Usage Level`;
            }
        }
        
    }
    catch (err){
        console.error(err);
    }
}

async function SendTelegram(message){
    try{
        const response = await fetch("/api/send-telegram-noti", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message,
                target: current_telegram_target
            })
        })
        const data = await response.json();

        console.log(data);
        if (response.ok) {
            const label = current_telegram_target === "debug" ? "Debug Chat" : "Main Chat";
            showToast("TELEGRAM SENT", `Dispatched to ${label}.`);
        } else {
            showToast("TELEGRAM ERROR", data.error || "Failed to send Telegram notification.", true);
        }
    }
    catch (err){
        console.error(err);
        showToast("TELEGRAM ERROR", "Network error while sending notification.", true);
    }
}

async function refreshStatus() {
    try{
        const response = await fetch("/api/get-fetch-frequency");
        const data = await response.json();
        waiting_minutes = data.freq_mins;

        if (data.next_run_time) {
            updateNextRunDisplay(data.next_run_time);
        }

        if (data.telegram_target) {
            setTelegramTargetUI(data.telegram_target);
        }

        if (typeof data.quiet_start_hour === "number" && typeof data.quiet_end_hour === "number") {
            updateQuietSummaryDisplay(data.quiet_start_hour, data.quiet_end_hour);
        }

        if (!settings_initialized && waiting_minutes) {
            current_waiting_minutes = waiting_minutes;
            freq_value_p.innerText = current_waiting_minutes;
            if (typeof data.quiet_start_hour === "number" && quiet_start_select) {
                quiet_start_select.value = String(data.quiet_start_hour);
            }
            if (typeof data.quiet_end_hour === "number" && quiet_end_select) {
                quiet_end_select.value = String(data.quiet_end_hour);
            }
            if (data.usage_config) {
                if (low_label_input) low_label_input.value = data.usage_config.lowLabel ?? "Low";
                if (low_max_input) low_max_input.value = data.usage_config.lowMax ?? 600;
                if (normal_label_input) normal_label_input.value = data.usage_config.normalLabel ?? "Normal";
                if (high_label_input) high_label_input.value = data.usage_config.highLabel ?? "High";
                if (high_min_input) high_min_input.value = data.usage_config.highMin ?? 1100;
                updateNormalRangeReadout();
            }
            settings_initialized = true;
        }

        await GetSpaces();
    }
    catch (error){
        console.error(error);
    }

    if (waiting_minutes){
        update_time_p.innerHTML = `Updates Every <span style="color:gold;">${waiting_minutes}</span> Minutes`;
    }
    else{
        update_time_p.innerHTML = `<span style="color:gold;">Loading</span>`;
    }
}

// 5 Seconds
setInterval(refreshStatus, 5000);

// On window loaded
window.addEventListener("load", refreshStatus);
