
const express = require("express");
const path = require("path");
const dotenv = require("dotenv").config();
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const app = express();

app.use(express.static(path.join(__dirname, "../client")));
app.use(express.json());

let db;

let waiting_minutes = 60;
let quiet_start_hour = 0; // 12:00 AM (midnight)
let quiet_end_hour = 6;   // 6:00 AM (active when hour >= 6 and <= 23)
let telegram_target = "main"; // "main" | "debug"
let usage_config = {
    lowMax: 600,
    highMin: 1100,
    lowLabel: "Low",
    normalLabel: "Normal",
    highLabel: "High"
};
let library_data;

function applyCustomUsage() {
    if (!library_data || library_data.total === undefined || library_data.free === undefined) {
        return;
    }
    if (library_data.raw_usage === undefined && library_data.usage !== undefined) {
        library_data.raw_usage = library_data.usage;
    }
    const occupied = Math.max(0, Number(library_data.total) - Number(library_data.free));
    if (occupied < usage_config.lowMax) {
        library_data.usage = usage_config.lowLabel;
    } else if (occupied > usage_config.highMin) {
        library_data.usage = usage_config.highLabel;
    } else {
        library_data.usage = usage_config.normalLabel;
    }
}

function isQuietHour(hour) {
    if (quiet_start_hour === quiet_end_hour) return false;
    if (quiet_start_hour < quiet_end_hour) {
        return hour >= quiet_start_hour && hour < quiet_end_hour;
    }
    // Overnight window (e.g., 23:00 to 06:00)
    return hour >= quiet_start_hour || hour < quiet_end_hour;
}

async function init_database(){
    // open the db file
    db = await open({
        filename: "./library_history.db",
        driver: sqlite3.Database
    });

    // Create the table if its the first time running
    await db.exec(`
        CREATE TABLE IF NOT EXISTS occupancy (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            dayOfWeek INTEGER,
            hourOfDay INTEGER,
            freeSpaces INTEGER,
            totalSpaces INTEGER
        )    
    `);
    console.log("SQLite DB is ready...");
}

// Save history
async function save_library_history(free, total){
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    try{
        await db.run(
            `INSERT INTO occupancy (dayOfWeek, hourOfDay, freeSpaces, totalSpaces)
            VALUES (?, ?, ?, ?)`,
            [day, hour, free, total]
        );
        console.log("Saved library data");
    }
    catch (error){
        console.error("Failed to save to database, ", error);
    }
}

// Get history
async function get_library_history(){
    // Get current day
    const now = new Date();
    const day = now.getDay();

    try{

        // Query database (last 4 weeks / 28 days of data)
        const result = await db.all(`
            SELECT 
                hourOfDay,
                ROUND(AVG(totalSpaces - freeSpaces)) as averagePeople
            FROM occupancy
            WHERE dayOfWeek = ?
              AND timestamp >= datetime("now", "-28 days")
            GROUP BY hourOfDay
            ORDER BY hourOfDay ASC
        `, [day]);
        return result;
    }
    catch (error){
        console.error("Database query failed", error);
        return [];
    }
}

app.post("/api/change-fetch-frequency", (req, res) => {
    const new_freq = Number(req.body.frequency);
    if (!Number.isFinite(new_freq) || new_freq < 1 || new_freq > 120) {
        return res.status(400).json({error: "Invalid frequency"});
    }
    UpdateWaitTime(new_freq);
    return res.status(200).json({
        message: "changed frequency",
        freq_mins: waiting_minutes,
        next_run_time: next_scheduled_time
    });
})

app.post("/api/change-quiet-hours", (req, res) => {
    const start = Number(req.body.startHour);
    const end = Number(req.body.endHour);
    if (!Number.isInteger(start) || start < 0 || start > 23 || !Number.isInteger(end) || end < 0 || end > 23) {
        return res.status(400).json({error: "Hours must be integers between 0 and 23"});
    }
    quiet_start_hour = start;
    quiet_end_hour = end;
    console.log(`Quiet hours updated: ${quiet_start_hour}:00 to ${quiet_end_hour}:00`);
    return res.status(200).json({
        message: "changed quiet hours",
        quiet_start_hour,
        quiet_end_hour
    });
})

app.post("/api/change-usage-settings", (req, res) => {
    const lowMax = Number(req.body.lowMax);
    const highMin = Number(req.body.highMin);
    const lowLabel = String(req.body.lowLabel ?? "Low").trim() || "Low";
    const normalLabel = String(req.body.normalLabel ?? "Normal").trim() || "Normal";
    const highLabel = String(req.body.highLabel ?? "High").trim() || "High";

    if (!Number.isFinite(lowMax) || !Number.isFinite(highMin) || lowMax < 0 || highMin < lowMax) {
        return res.status(400).json({error: "Invalid thresholds: High threshold must be >= Low threshold."});
    }

    usage_config = {
        lowMax: Math.round(lowMax),
        highMin: Math.round(highMin),
        lowLabel,
        normalLabel,
        highLabel
    };

    applyCustomUsage();
    console.log("Usage config updated:", usage_config);
    return res.status(200).json({
        message: "changed usage settings",
        usage_config
    });
})

app.post("/api/change-telegram-target", (req, res) => {
    const target = req.body.target === "debug" ? "debug" : "main";
    if (target === "debug" && !process.env.TELEGRAM_CHAT_ID_DEBUG) {
        return res.status(400).json({error: "TELEGRAM_CHAT_ID_DEBUG is not set in .env"});
    }
    telegram_target = target;
    console.log(`Telegram target switched to: ${telegram_target}`);
    return res.status(200).json({
        message: "changed telegram target",
        telegram_target
    });
})

app.get("/api/get-fetch-frequency", (req, res) => {
    return res.status(200).json({
        freq_mins: waiting_minutes,
        next_run_time: next_scheduled_time,
        quiet_start_hour,
        quiet_end_hour,
        usage_config,
        telegram_target
    })
})

app.get("/api/get-spaces", async (req, res) => {
    if (library_data){
        return res.status(200).json({data: library_data});
    }
    return res.status(500).json({error: "No data found!"})
})

async function GetLibrarySpaces(){
    const UNIVERSITY_API_URL = process.env.UNIVERSITY_API_URL;
    try{
        const apiOrigin = new URL(UNIVERSITY_API_URL).origin;
        const response = await fetch(UNIVERSITY_API_URL, {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-GB,en;q=0.9",
                "Referer": `${apiOrigin}/`,
                "Cache-Control": "no-cache"
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            console.error(`University API returned status ${response.status}: ${response.statusText}`);
            return "NOT OK";
        }

        library_data = await response.json();
        applyCustomUsage();
        return "OK";
    }
    catch (err){
        console.error("Failed to fetch library spaces:", err.message || err);
        return "NOT OK";
    }
}

app.post("/api/get-updated-spaces", async (req, res) => {
    const response = await GetLibrarySpaces();
    if (response == "OK"){
        console.log("got new data");
        return res.status(200).json({message: "got new data"});
    }
    else{
        return res.status(500).json({error: "Failed to fetch updated spaces"});
    }

})

app.post("/api/send-telegram-noti", async (req, res) => {
    console.log(req.body);
    const message = req.body.message;
    const targetOverride = req.body.target;
    const response = await SendTelegramNotification(message, targetOverride);
    if (!response.ok) {
        console.error("Telegram Rejected Message:", response);
        return res.status(500).json({error: response.error || "Telegram API Error"});
    }
    return res.status(200).json({message: "Sent notification", target: response.target});
    
})

app.post("/api/send-telegram-data", async (req, res) => {
    const targetOverride = req.body?.target;
    if (!library_data) {
        await GetLibrarySpaces();
    }
    if (!library_data) {
        return res.status(500).json({error: "No library data available on server"});
    }

    const lines = Object.entries(library_data).map(([key, value]) => {
        const formattedVal = typeof value === "object" && value !== null
            ? JSON.stringify(value)
            : String(value);
        return `${key}: ${formattedVal}`;
    });

    const fullMessage =
        `📊 Library API Server Data (${new Date().toLocaleTimeString()})\n` +
        `────────────────────\n` +
        lines.join("\n") +
        `\n\nRaw JSON:\n` +
        JSON.stringify(library_data, null, 2);

    const response = await SendTelegramNotification(fullMessage, targetOverride);
    if (!response.ok) {
        console.error("Telegram Rejected Server Data Message:", response);
        return res.status(500).json({error: response.error || "Telegram API Error"});
    }
    return res.status(200).json({message: "Sent full server data", target: response.target});
})

async function SendTelegramNotification(message, targetOverride){
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const activeTarget = targetOverride ? (targetOverride === "debug" ? "debug" : "main") : telegram_target;
    const CHAT_ID = activeTarget === "debug"
        ? process.env.TELEGRAM_CHAT_ID_DEBUG
        : process.env.TELEGRAM_CHAT_ID;

    if (!CHAT_ID) {
        console.error(`Missing chat ID for target: ${activeTarget}`);
        return { ok: false, error: `Missing chat ID in .env for ${activeTarget} chat` };
    }

    try{
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message
            })
        });

	const data = await response.json();
	
        if (!response.ok) {
            console.error("Telegram API error", response);
	    return { ok: false, error: data};
        }

        console.log(`Sent notification (${activeTarget})`);
        return {ok: true, data: data, target: activeTarget};
        
    }
    catch (err){
        console.error(err);
	return {ok: false, error: err.message};
    }
}

let current_timer_id = null;
let next_scheduled_time = null;

async function runLibraryLoop() {
    await GetLibrarySpaces();

    // Get the current time
    const now = new Date();

    // Check the desired date
    // 0 - 23 so 9am is 8.
    if (now.getHours() == 8 && now.getMinutes() == 0) {
        await sendDailyForecast();
    }

    
    if (library_data) { 
        let message = `There are currently ${library_data.total - library_data.free} / ${library_data.total} people using the library. Usage is ${library_data.usage}`;
        // Dont send the message during quiet hours or at the time of the forecast message
        if (!(now.getHours() == 8 && now.getMinutes() == 0) && !isQuietHour(now.getHours())) {
            await SendTelegramNotification(message);    
        }
        

        // Save the library data
        await save_library_history(library_data.free, library_data.total);
    }

    ScheduleNextRun();
}

function ScheduleNextRun() {
    const interval_ms = waiting_minutes * 60 * 1000;
    const now = Date.now();
    // Add 1-15 seconds of random jitter so requests don't fire on the exact millisecond mark
    const jitter_ms = Math.floor(Math.random() * 14000) + 1000;
    const ms_until_next = (interval_ms - (now % interval_ms)) + jitter_ms;
    current_timer_id = setTimeout(runLibraryLoop, ms_until_next);
    
    const next_time = new Date(Date.now() + ms_until_next);
    next_scheduled_time = next_time.toISOString();
    console.log(`Next check scheduled for: ${next_time.toLocaleTimeString()}`);
}

function UpdateWaitTime(newMinutes) {
    waiting_minutes = newMinutes;
    console.log(`Frequency changed! Syncing clock to every ${newMinutes} minutes.`);

    if (current_timer_id) {
        clearTimeout(current_timer_id);
    }
    ScheduleNextRun(); 
}

async function sendDailyForecast() {
    // Fetch the averaged data for today 
    const historyData = await get_library_history();

    // Check in case the database is empty
    if (!historyData || historyData.length === 0) {
        console.log("Not enough data to generate a forecast yet.");
        return;
    }

    // Filter the data based on busyness thresholds
    const peakHours = historyData.filter(row => row.averagePeople > usage_config.highMin);
    const quietHours = historyData.filter(row => row.averagePeople < usage_config.lowMax);

    // Group consecutive hours to prevent fragmented output (e.g., turns 2-3,3-4 into 2-5)
    const peakString = formatTimeBlocks(peakHours);
    const quietString = formatTimeBlocks(quietHours);

    // Construct the Telegram message using Markdown formatting
    const forecast_message = 
        `📅 *Today's Library Forecast*\n\n` +
        `🚨 *Times to Avoid (Peak):*\n` +
        `${peakString !== "None" ? `• ${peakString}` : "• None! Should be manageable all day."}\n\n` +
        `🟢 *Best Study Windows (Quiet):*\n` +
        `${quietString !== "None" ? `• ${quietString}` : "• None. It's going to be a busy day!"}`;
    // Send the message
    await SendTelegramNotification(forecast_message);
    console.log("📨 Daily forecast sent!");
}

function formatTimeBlocks(filteredArray) {
    if (filteredArray.length === 0) return "None";

    const hours = filteredArray.map(row => row.hourOfDay).sort((a, b) => a - b);

    let blocks = [];
    let startHour = hours[0];
    let endHour = hours[0];

    for (let i = 1; i < hours.length; i++) {
        if (hours[i] === endHour + 1) {
            endHour = hours[i];
        } else {
            blocks.push(createTimeString(startHour, endHour));
            startHour = hours[i];
            endHour = hours[i];
        }
    }
    blocks.push(createTimeString(startHour, endHour));

    return blocks.join(', ');
}

function createTimeString(start, end) {
    // If it's just a single isolated hour
    if (start === end) {
        return `${formatAMPM(start)} - ${formatAMPM(start + 1)}`;
    }
    // If it's a range of consecutive hours
    return `${formatAMPM(start)} - ${formatAMPM(end + 1)}`;
}

function formatAMPM(hour) {
    if (hour === 24) return "12 AM"; 
    
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour} ${ampm}`;
}

async function Start(){
    await init_database();
    ScheduleNextRun();
}

Start();

app.listen(process.env.SERVER_PORT, async function(){
    console.log(`localhost:${process.env.SERVER_PORT}`);
    // Get spaces
    await GetLibrarySpaces();
})


async function seedTestDatabase() {
    await init_database();
    console.log("🌱 Seeding database with test data...");
    const totalSpaces = 1800;

    // Loop through days 0 (Sunday) to 6 (Saturday)
    for (let day = 0; day <= 6; day++) {
        // Loop through hours 0 to 23
        for (let hour = 0; hour <= 23; hour++) {
            
            // Generate a random number of free spaces between 200 and 1800
            const freeSpaces = Math.floor(Math.random() * 1600) + 200;

            try {
                await db.run(
                    `INSERT INTO occupancy (dayOfWeek, hourOfDay, freeSpaces, totalSpaces) 
                     VALUES (?, ?, ?, ?)`,
                    [day, hour, freeSpaces, totalSpaces]
                );
            } catch (error) {
                console.error("Error inserting data:", error);
            }
        }
    }
    console.log("✅ Database successfully seeded with 168 test rows!");
}

// seedTestDatabase();
