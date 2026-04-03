// --- 1. CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyA5FbN-2Gx5ZnvIx0r4Dc6W741Y_gVxk4M",
    authDomain: "speakreal-a5f44.firebaseapp.com",
    projectId: "speakreal-a5f44",
    storageBucket: "speakreal-a5f44.firebasestorage.app",
    messagingSenderId: "318441420730",
    appId: "1:318441420730:web:c40ae61784f66778f44f83",
    measurementId: "G-PWGYCTQDM7"
};

// Key từ AI Studio mày gửi nè
const GEMINI_API_KEY = "AIzaSyDO6ZVI4nHZBTZRUoAp0U6JDlVpnEFsqSg";
const appId = "speakreal-app-v1";

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// State
let user = null;
let isListening = false;
let recognition = null;

// UI Elements
const logoContainer = document.getElementById('logo-container');
const btnTabTranslate = document.getElementById('btn-tab-translate');
const btnTabStudy = document.getElementById('btn-tab-study');
const sectionTranslate = document.getElementById('section-translate');
const sectionStudy = document.getElementById('section-study');
const inputText = document.getElementById('input-text');
const btnMic = document.getElementById('btn-mic');
const btnSubmit = document.getElementById('btn-submit');
const resultsContainer = document.getElementById('results-container');
const notebookList = document.getElementById('notebook-list');

// Logo SVG xịn sò
logoContainer.innerHTML = `
  <svg viewBox="0 0 100 100" class="w-24 h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="superGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <linearGradient id="electricGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="50%" stop-color="#FDE047" /> 
        <stop offset="100%" stop-color="#EAB308" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="42" stroke="rgba(252, 211, 77, 0.3)" stroke-width="0.5" stroke-dasharray="5 10"></circle>
    <path d="M65 10 L35 55 L55 55 L40 95 L75 45 L55 45 L65 10Z" fill="url(#electricGrad)" filter="url(#superGlow)" class="electric-bolt"></path>
  </svg>
`;

// --- AUTH (Đăng nhập ẩn danh) ---
const initAuth = async () => {
    try {
        await auth.signInAnonymously();
    } catch (e) {
        console.error("Auth error:", e);
    }
};

auth.onAuthStateChanged((u) => {
    user = u;
    if (user) loadNotebook();
});

// --- SPEECH RECOGNITION ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.onstart = () => {
        isListening = true;
        btnMic.classList.add('bg-red-500', 'text-white', 'animate-pulse');
    };
    recognition.onend = () => {
        isListening = false;
        btnMic.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
    };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        inputText.value += (inputText.value ? " " : "") + transcript;
    };
}

btnMic.onclick = () => {
    if (!recognition) return;
    if (isListening) recognition.stop();
    else recognition.start();
};

// --- CHUYỂN TAB ---
btnTabTranslate.onclick = () => {
    sectionTranslate.classList.remove('hidden');
    sectionStudy.classList.add('hidden');
    btnTabTranslate.className = "px-12 py-3 rounded-full font-black uppercase text-[10px] tracking-[0.2em] transition-all bg-white text-orange-700 shadow-lg";
    btnTabStudy.className = "px-12 py-3 rounded-full font-black uppercase text-[10px] tracking-[0.2em] transition-all text-white/60 hover:text-white";
};

btnTabStudy.onclick = () => {
    sectionTranslate.classList.add('hidden');
    sectionStudy.classList.remove('hidden');
    btnTabStudy.className = "px-12 py-3 rounded-full font-black uppercase text-[10px] tracking-[0.2em] transition-all bg-white text-orange-700 shadow-lg";
    btnTabTranslate.className = "px-12 py-3 rounded-full font-black uppercase text-[10px] tracking-[0.2em] transition-all text-white/60 hover:text-white";
};

// --- CORE AI LOGIC ---
const formatBold = (text) => text.replace(/\*\*(.*?)\*\*/g, '<span class="bold-tag">$1</span>');

btnSubmit.onclick = async () => {
    const val = inputText.value.trim();
    if (!val || btnSubmit.disabled) return;

    btnSubmit.disabled = true;
    btnSubmit.querySelector('span').innerText = "Đang gồng...";
    resultsContainer.innerHTML = "";
    resultsContainer.classList.add('hidden');

    const systemPrompt = `Mày là chuyên gia tiếng Anh người Mỹ, nhưng nói chuyện rặt phong cách mày-tao kiểu miền Tây dân dã.
    Dịch tiếng Việt sang JSON: { "versions": [ { "type": "...", "english": "...", "tips": "...", "grammar": "...", "tense": "..." } ] }.
    Làm 3 bản dịch: Super Casual (slang), Natural, Formal.
    Bôi đậm (dùng **) cấu trúc quan trọng trong "english" và giải thích trong "grammar".
    Tips giải thích vibe bằng tiếng Việt kiểu bạn thân.`;

    try {
        const response = await fetch(https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: Dịch câu này: "${val}" }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { responseMimeType: "application/json" }
            })
        });
        
        const data = await response.json();
        if (!data.candidates) throw new Error("Gemini API Error");
        
        const res = JSON.parse(data.candidates[0].content.parts[0].text);
        displayResults(res);
        
        if (user) saveToNotebook(val, res.versions[0].english);
    } catch (e) {
        alert("Lỗi rồi mày ơi! Coi lại cái Key Gemini coi.");
        console.error(e);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.querySelector('span').innerText = "Xuất Chiêu!";
    }
};

const displayResults = (res) => {
    resultsContainer.classList.remove('hidden');
    res.versions.forEach((v) => {
        const div = document.createElement('div');
        div.className = "bg-white p-8 md:p-10 rounded-[2.5rem] shadow-lg border border-orange-50 space-y-6";
        div.innerHTML = `
            <div class="flex justify-between items-start gap-4">
                <div class="space-y-4 flex-1">
                    <div class="flex gap-2">
                        <span class="text-[10px] font-black uppercase px-4 py-1.5 rounded-full text-orange-700 bg-orange-50 tracking-widest border border-orange-100">${v.type}</span>
                        ${v.tense ? <span class="text-[10px] font-black uppercase px-4 py-1.5 rounded-full text-blue-700 bg-blue-50 tracking-widest border border-blue-100">${v.tense}</span> : ''}
                    </div>
                    <h3 class="text-3xl font-black text-slate-900 leading-tight">${formatBold(v.english)}</h3>
                </div>
                <div class="flex flex-col gap-3">
                    <button onclick="copyToClipboard('${v.english.replace(/'/g, "\\'")}')" class="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-orange-500 transition-colors"><i data-lucide="copy"></i></button>
                    <button onclick="speakText('${v.english.replace(/'/g, "\\'")}')" class="p-4 bg-orange-500 rounded-2xl text-white shadow-xl hover:bg-orange-600 transition-colors"><i data-lucide="volume-2"></i></button>
                </div>
            </div>
            <div class="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 text-slate-700 font-bold">
                <p class="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Structure</p>
                ${formatBold(v.grammar)}
            </div>
            <div class="bg-slate-900 p-6 rounded-[2rem] text-white flex gap-4 items-center">
                <div class="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0"><i data-lucide="lightbulb" class="text-yellow-200"></i></div>
                <div>
                    <p class="text-[10px] font-black uppercase text-orange-400 tracking-widest">TIPS</p>
                    <p class="text-sm italic opacity-95">"${v.tips}"</p>
                </div>
            </div>
        `;
        resultsContainer.appendChild(div);
    });
    lucide.createIcons();
};

// --- UTILS ---
window.copyToClipboard = (text) => {
    const clean = text.replace(/\*\*/g, "");
    navigator.clipboard.writeText(clean);
};

window.speakText = async (text) => {
    const clean = text.replace(/\*\*/g, "");
    try {
        const response = await fetch(https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: Say naturally: ${clean} }] }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: { voiceConfig: { voiceName: "Puck" } }
                }
            })
        });
        const data = await response.json();
        const pcm = data.candidates[0].content.parts[0].inlineData.data;
        
        // Chuyển PCM sang WAV để play
        const bin = atob(pcm);
        const buf = new ArrayBuffer(bin.length + 44);
        const view = new DataView(buf);
        const writeStr = (off, s) => { for (let i=0; i<s.length; i++) view.setUint8(off+i, s.charCodeAt(i)); };
        writeStr(0, 'RIFF'); view.setUint32(4, 32 + bin.length, true); writeStr(8, 'WAVE');
        writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
        view.setUint16(22, 1, true); view.setUint32(24, 24000, true); view.setUint32(28, 48000, true);
        view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeStr(36, 'data');
        view.setUint32(40, bin.length, true);
        for (let i=0; i<bin.length; i++) view.setUint8(44+i, bin.charCodeAt(i));
        
        const audioBlob = new Blob([buf], {type: 'audio/wav'});
        new Audio(URL.createObjectURL(audioBlob)).play();
    } catch (e) { console.error(e); }
};

const saveToNotebook = async (input, english) => {
    if (!user) return;
    try {
        await db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('notebook').add({
            input, english, timestamp: Date.now()
        });
    } catch (e) { console.error("Save error:", e); }
};

const loadNotebook = () => {
    db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('notebook')
      .onSnapshot((snap) => {
          notebookList.innerHTML = "";
          snap.forEach(doc => {
              const data = doc.data();
              const item = document.createElement('div');
              item.className = "p-6 bg-orange-50/30 rounded-3xl border border-orange-100 flex justify-between items-center mb-4";
              item.innerHTML = `
                <div>
                    <p class="text-[10px] font-black text-orange-400 uppercase tracking-widest">${data.input}</p>
                    <h4 class="text-xl font-black text-slate-800">${formatBold(data.english)}</h4>
                </div>
                <button onclick="deleteNote('${doc.id}')" class="text-slate-300 hover:text-red-500"><i data-lucide="trash-2"></i></button>
              `;
              notebookList.appendChild(item);
          });
          if (snap.empty) notebookList.innerHTML = '<p class="text-slate-300 italic py-10 text-center">Trống trơn mày ơi...</p>';
          lucide.createIcons();
      });
};

window.deleteNote = async (id) => {
    await db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('notebook').doc(id).delete();
};

initAuth();
lucide.createIcons();
