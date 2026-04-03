// Firebase & App Configuration
const firebaseConfig = JSON.parse(__firebase_config);
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const appId = typeof __app_id !== 'undefined' ? __app_id : 'casual-translator-teo';

// State
let activeTab = "translate";
let isListening = false;
let user = null;
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

// Initialize Logo
logoContainer.innerHTML = `
  <svg viewBox="0 0 100 100" class="w-24 h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="superGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <linearGradient id="electricGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#FDE047" /> 
        <stop offset="100%" stopColor="#EAB308" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="42" stroke="rgba(252, 211, 77, 0.3)" strokeWidth="0.5" strokeDasharray="5 10"></circle>
    <path d="M65 10 L35 55 L55 55 L40 95 L75 45 L55 45 L65 10Z" fill="url(#electricGrad)" filter="url(#superGlow)" class="electric-bolt"></path>
  </svg>
`;

// Auth Initialization
const initAuth = async () => {
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await auth.signInWithCustomToken(__initial_auth_token);
    } else {
        await auth.signInAnonymously();
    }
};

auth.onAuthStateChanged((u) => {
    user = u;
    if (user) loadNotebook();
});

// Speech Recognition Setup
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

// Tabs Logic
btnTabTranslate.onclick = () => {
    activeTab = "translate";
    sectionTranslate.classList.remove('hidden');
    sectionStudy.classList.add('hidden');
    btnTabTranslate.className = "px-12 py-3 rounded-full font-black uppercase text-[10px] tracking-[0.2em] transition-all bg-white text-orange-700 shadow-lg";
    btnTabStudy.className = "px-12 py-3 rounded-full font-black uppercase text-[10px] tracking-[0.2em] transition-all text-white/60 hover:text-white";
};

btnTabStudy.onclick = () => {
    activeTab = "study";
    sectionTranslate.classList.add('hidden');
    sectionStudy.classList.remove('hidden');
    btnTabStudy.className = "px-12 py-3 rounded-full font-black uppercase text-[10px] tracking-[0.2em] transition-all bg-white text-orange-700 shadow-lg";
    btnTabTranslate.className = "px-12 py-3 rounded-full font-black uppercase text-[10px] tracking-[0.2em] transition-all text-white/60 hover:text-white";
};

// Formatting Helper
const formatBold = (text) => {
    return text.replace(/\*\*(.*?)\*\*/g, '<span class="bold-tag">$1</span>');
};

// Translation Logic
btnSubmit.onclick = async () => {
    const val = inputText.value.trim();
    if (!val || btnSubmit.disabled) return;

    btnSubmit.disabled = true;
    btnSubmit.querySelector('span').innerText = "Đang gồng...";
    resultsContainer.innerHTML = "";
    resultsContainer.classList.add('hidden');

    const apiKey = ""; // API key will be injected by env
    const systemPrompt = `You are an American English expert. Xưng mày tao, nói chuyện dân dã kiểu miền Tây.
    Dịch tiếng Việt sang JSON có dạng: { "input": "...", "versions": [ { "type": "...", "english": "...", "tips": "...", "grammar": "...", "tense": "..." } ] }.
    Bản dịch gồm 3 bản: Super Casual (slang), Natural, Formal.
    Bôi đậm cấu trúc quan trọng nhất trong "english" và giải thích cấu trúc đó trong "grammar" bằng **.
    TRONG PHẦN "grammar": Phải có công thức dạng ký hiệu cực rõ (ví dụ: **S + V + O**).
    Trong "tips", giải thích cái 'vibe' hoặc mẹo dùng câu bằng tiếng Việt dân chơi.
    Trong "tense", ghi tên thì bằng tiếng Anh.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Dịch câu này: "${val}"` }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { responseMimeType: "application/json" }
            })
        });
        const data = await response.json();
        const res = JSON.parse(data.candidates[0].content.parts[0].text);
        
        displayResults(res);
        if (user && res.versions[0]) {
            saveToNotebook(res.input || val, res.versions[0].english);
        }
    } catch (e) {
        console.error(e);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.querySelector('span').innerText = "Xuất Chiêu!";
    }
};

const displayResults = (res) => {
    resultsContainer.classList.remove('hidden');
    res.versions.forEach((v, idx) => {
        const div = document.createElement('div');
        div.className = "bg-white p-8 md:p-10 rounded-[2.5rem] shadow-lg border border-orange-50 space-y-6 animate-in slide-in-from-bottom-4";
        div.innerHTML = `
            <div class="flex justify-between items-start gap-4">
                <div class="space-y-4 flex-1">
                    <div class="flex gap-2">
                        <span class="text-[10px] font-black uppercase px-4 py-1.5 rounded-full text-orange-700 bg-orange-50 tracking-widest border border-orange-100">${v.type}</span>
                        ${v.tense ? `<span class="text-[10px] font-black uppercase px-4 py-1.5 rounded-full text-blue-700 bg-blue-50 tracking-widest border border-blue-100">${v.tense}</span>` : ''}
                    </div>
                    <h3 class="text-3xl font-black text-slate-900 leading-tight">${formatBold(v.english)}</h3>
                </div>
                <div class="flex flex-col gap-3">
                    <button onclick="copyText('${v.english.replace(/'/g, "\\'")}')" class="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-orange-500"><i data-lucide="copy"></i></button>
                    <button onclick="speakText('${v.english.replace(/'/g, "\\'")}')" class="p-4 bg-orange-500 rounded-2xl text-white shadow-xl"><i data-lucide="volume-2"></i></button>
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

// Utils: TTS, Copy, Firestore
window.speakText = async (text) => {
    const clean = text.replace(/\*\*/g, "");
    const apiKey = "";
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Say naturally: ${clean}` }] }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: { voiceConfig: { voiceName: "Puck" } }
                }
            })
        });
        const data = await response.json();
        const pcm = data.candidates[0].content.parts[0].inlineData.data;
        const audioBlob = pcmToWav(pcm);
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.play();
    } catch (e) { console.error(e); }
};

window.copyText = (text) => {
    const clean = text.replace(/\*\*/g, "");
    const el = document.createElement('textarea');
    el.value = clean;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
};

const saveToNotebook = async (input, english) => {
    if (!user) return;
    await db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('notebook').add({
        input, english, timestamp: Date.now()
    });
};

const loadNotebook = () => {
    if (!user) return;
    db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('notebook')
      .orderBy('timestamp', 'desc')
      .onSnapshot((snap) => {
          notebookList.innerHTML = "";
          snap.forEach(doc => {
              const data = doc.data();
              const item = document.createElement('div');
              item.className = "p-6 bg-orange-50/30 rounded-3xl border border-orange-100 flex justify-between items-center";
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

const pcmToWav = (base64) => {
    const bin = atob(base64);
    const buf = new ArrayBuffer(bin.length + 44);
    const view = new DataView(buf);
    const writeStr = (off, s) => { for (let i=0; i<s.length; i++) view.setUint8(off+i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF'); view.setUint32(4, 32 + bin.length, true); writeStr(8, 'WAVE');
    writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, 24000, true); view.setUint32(28, 48000, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeStr(36, 'data');
    view.setUint32(40, bin.length, true);
    for (let i=0; i<bin.length; i++) view.setUint8(44+i, bin.charCodeAt(i));
    return new Blob([buf], {type: 'audio/wav'});
};

initAuth();
lucide.createIcons();