
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
let library_data;

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

        // Automatically delete any old entries ( > 4 weeks (28 days))
        const result = await db.run(`
            DELETE FROM occupancy
            WHERE timestamp < datetime("now", "-28 days")
        `);

        // Log is any rows were deleted
        if (result.changes > 0){
            console.log(`Deleted ${result.changes} entries`);
        }
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

        // Query database
        const result = db.all(`
            SELECT 
                hourOfDay,
                ROUND(AVG(totalSpaces - freeSpaces)) as averagePeople
            FROM occupancy
            WHERE dayOfWeek = ?
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
    const new_freq = req.body.frequency;
    UpdateWaitTime(new_freq);
    res.status(200).json({message: "changed frequency"});
})

app.get("/api/get-fetch-frequency", (req, res) => {
    res.status(200).json({freq_mins: waiting_minutes})
})

app.get("/api/get-spaces", async (req, res) => {
    if (library_data){
        res.status(200).json({data: library_data});
        return;
    }
    res.status(500).json({error: "No data found!"})
})

async function GetLibrarySpaces(){
    const UNIVERSITY_API_URL = process.env.UNIVERSITY_API_URL;
    try{
        const response = await fetch(UNIVERSITY_API_URL);
        library_data = await response.json();
    }
    catch (err){
        console.error(err);
    }
}

app.post("/api/send-telegram-noti", async (req, res) => {
    console.log(req.body);
    const message = req.body.message;
    const response = await SendTelegramNotification(message);
    if (!response.ok) {
        res.status(500).json({error: "Telegram API Error"});
    }
    res.status(200).json({message: "Sent notification"});
    
})

async function SendTelegramNotification(message){
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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

        if (!response.ok) {
            console.error("Telegram API error");
        }

        console.log("Sent notification");
        return response;
        
    }
    catch (err){
        console.error(err);
    }
}

let current_timer_id = null;

async function runLibraryLoop() {
    await GetLibrarySpaces();

    // Get the current time
    const now = new Date();

    // Check the desired date
    if (now.getHours() == 9 && now.getMinutes() == 0) {
        await sendDailyForecast();
    }

    
    if (library_data) { 
        let message = `There are currently ${library_data.total - library_data.free} / ${library_data.total} people using the library. Usage is ${library_data.usage}`;
        await SendTelegramNotification(message);

        // Save the library data
        await save_library_history(library_data.free, library_data.total);
    }

    ScheduleNextRun();
}

function ScheduleNextRun() {
    const interval_ms = waiting_minutes * 60 * 1000;
    const now = Date.now();
    const ms_until_next = interval_ms - (now % interval_ms);
    current_timer_id = setTimeout(runLibraryLoop, ms_until_next);
    
    const next_time = new Date(Date.now() + ms_until_next);
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
    const peakHours = historyData.filter(row => row.averagePeople > 1100);
    const quietHours = historyData.filter(row => row.averagePeople < 600);

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