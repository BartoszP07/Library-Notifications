const btn = document.getElementById("press-btn");
const msg_inp = document.getElementById("message-input");
const msg_btn = document.getElementById("send-message-btn");

const total_spaces_p = document.getElementById("total-spaces");
const free_spaces_p = document.getElementById("free-spaces");
const free_spaces_percent_p = document.getElementById("free-spaces-percent");

const update_time_p = document.getElementById("update-time-p");

const increase_freq = document.getElementById("increase-frequency-btn");
const decrease_freq = document.getElementById("decrease-frequency-btn");
const freq_value_p = document.getElementById("frequency-value");
const apply_freq_btn = document.getElementById("apply-frequency-btn");

let waiting_minutes;
let current_waiting_minutes = 30;

let min_freq = 1;
let max_freq = 120;

let library_data;

async function ApplyNewFrequency(){
    try{
        const response = await fetch("/api/change-fetch-frequency", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({frequency: current_waiting_minutes})
        });
        const data = await response.json();
        console.log(data);
    }
    catch (err){
        console.error(err);
    }
}

apply_freq_btn.addEventListener("click", async function() {
    await ApplyNewFrequency();
})

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
    await GetSpaces();
})

msg_btn.addEventListener("click", async function() {
    if (msg_inp.value.length < 1) { return; }
    await SendTelegram(msg_inp.value);
    // Clear the input
    msg_inp.value = "";
})

async function GetSpaces(){
    try{
        const response = await fetch("/api/get-spaces");
        const data = (await response.json()).data;
        library_data = data;
        console.log(data);

        // Update variables
        // Check if the data is defined
        if (data){
            total_spaces_p.innerHTML = `<span style="color:gold;">${data.total}</span> Total Spaces`;
            free_spaces_p.innerHTML = `<span style="color:gold;">${data.free}</span> Free Spaces`;
            free_spaces_percent_p.innerHTML = `<span style="color:gold;">${data.freePercentage}%</span> Free`
        }
        else{
            total_spaces_p.innerHTML = `<span style="color:gold;">Loading</span>`;
            free_spaces_p.innerHTML = `<span style="color:gold;">Loading</span>`;
            free_spaces_percent_p.innerHTML = `<span style="color:gold;">Loading</span>`;
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
            body: JSON.stringify({"message": message})
        })
        const data = await response.json();

        console.log(data);
    }
    catch (err){
        console.error(err);
    }
}

// 5 Seconds
setInterval(async () => {
    // Update stuff
    try{
        const response = await fetch("/api/get-fetch-frequency");
        const data = await response.json();
        waiting_minutes = data.freq_mins;

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

    
    
}, 1000);

// On window loaded
window.addEventListener("load", async function() {
    await GetSpaces();
    if (waiting_minutes){
        update_time_p.innerHTML = `Updates Every <span style="color:gold;">${waiting_minutes}</span> Minutes`;
    }
    else{
        update_time_p.innerHTML = `<span style="color:gold;">Loading</span>`;
    }
})