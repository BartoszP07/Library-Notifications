
const express = require("express");
const path = require("path");
const dotenv = require("dotenv").config();

const app = express();

app.use(express.static(path.join(__dirname, "../client")));
app.use(express.json());

let waiting_minutes = 30;
let library_data;

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
    
    if (library_data) { 
        let message = `There are currently ${library_data.total - library_data.free} / ${library_data.total} people using the library. Usage is ${library_data.usage}`;
        await SendTelegramNotification(message);
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

ScheduleNextRun();   

app.listen(process.env.SERVER_PORT, async function(){
    console.log(`localhost:${process.env.SERVER_PORT}`);
    // Get spaces
    await GetLibrarySpaces();
})