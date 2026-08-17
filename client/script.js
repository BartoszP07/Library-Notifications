const btn = document.getElementById("press-btn");
const msg_inp = document.getElementById("message-input");
const msg_btn = document.getElementById("send-message-btn");

const total_spaces_p = document.getElementById("total-spaces");
const free_spaces_p = document.getElementById("free-spaces");
const free_spaces_percent_p = document.getElementById("free-spaces-percent");

const update_time_p = document.getElementById("update-time-p");

const waiting_minutes = 30;

btn.addEventListener("click", async function(){
    await GetSpaces();
})

msg_btn.addEventListener("click", async function() {
    if (msg_inp.value.length < 1) { return; }
    await SendTelegram(msg_inp.value);
})

async function GetSpaces(){
    try{
        const response = await fetch("/api/get-spaces");
        const data = (await response.json()).data;
        console.log(data);

        // What I want the mssage to look like
        // There are currently x/people using the library - usage: y

        let message = `There are currently ${data.total - data.free} / ${data.total} people using the library. Usage is ${data.usage}`;
        await SendTelegram(message);

        // Update variables
        total_spaces_p.innerHTML = `<span style="color:gold;">${data.total}</span> Total Spaces`;
        free_spaces_p.innerHTML = `<span style="color:gold;">${data.free}</span> Free Spaces`;
        free_spaces_percent_p.innerHTML = `<span style="color:gold;">${data.freePercentage}%</span> Free`
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

// 30 Mins
setInterval(async function(){
    await GetSpaces();
}, 60000 * waiting_minutes);

// 5 Seconds
setInterval(() => {
    // Update stuff
    update_time_p.innerText = `Updates Every ${waiting_minutes} Minutes`;
}, 5000);

// On window loaded
window.addEventListener("load", async function() {
    await GetSpaces();
    update_time_p.innerText = `Updates Every ${waiting_minutes} Minutes`;
})