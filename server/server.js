
const express = require("express");
const path = require("path");
const dotenv = require("dotenv").config();

const app = express();

app.use(express.static(path.join(__dirname, "../client")));
app.use(express.json());

app.get("/api/get-spaces", async (req, res) => {
    const UNIVERSITY_API_URL = process.env.UNIVERSITY_API_URL;
    try{
        const response = await fetch(UNIVERSITY_API_URL);
        const data = await response.json();
        res.status(200).json({data: data});
    }
    catch (err){
        console.error(err);
    }
})

app.post("/api/send-telegram-noti", async (req, res) => {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    console.log(req.body);
    const message = req.body.message;
    

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
        res.status(200).json({message: "Sent notification"});
    }
    catch (err){
        console.error(err);
    }
})

app.listen(3000, function(){
    console.log("localhost:3000");
})