const firebaseConfig = {
    apiKey: "AIzaSyA5FbN-2Gx5ZnvIx0r4Dc6W741Y_gVxk4M",
  authDomain: "speakreal-a5f44.firebaseapp.com",
  projectId: "speakreal-a5f44",
  storageBucket: "speakreal-a5f44.firebasestorage.app",
  messagingSenderId: "318441420730",
  appId: "1:318441420730:web:c40ae61784f66778f44f83",
  measurementId: "G-PWGYCTQDM7"
};

const GEMINI_API_KEY = "AIzaSyDO6ZVI4nHZBTZRUoAp0U6JDlVpnEFsqSg";

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const appId = "speakreal-web-teo";

let user = null;

const btnTabTranslate = document.getElementById('btn-tab-translate');
const btnTabStudy = document.getElementById('btn-tab-study');
const sectionTranslate = document.getElementById('section-translate');
const sectionStudy = document.getElementById('section-study');
const inputText = document.getElementById('input-text');
const btnSubmit = document.getElementById('btn-submit');
const resultsContainer = document.getElementById('results-container');
const notebookList = document.getElementById('notebook-list');

auth.signInAnonymously().catch(e => console.error("Lỗi: Nhớ bật Anonymous Auth trong Firebase Console!", e));
auth.onAuthStateChanged(u => {
    user = u;
    if (u) loadNotebook();
});

const switchTab = (tab) => {
    if (tab === 'translate') {
        sectionTranslate.classList.remove('hidden');
        sectionStudy.classList.add('hidden');
        btnTabTranslate.className = "px-12 py-3 rounded-full font-black bg-white text-orange-700 shadow-lg";
        btnTabStudy.className = "px-12 py-3 rounded-full font-black text-white/60";
    } else {
        sectionTranslate.classList.add('hidden');
        sectionStudy.classList.remove('hidden');
        btnTabStudy.className = "px-12 py-3 rounded-full font-black bg-white text-orange-700 shadow-lg";
        btnTabTranslate.className = "px-12 py-3 rounded-full font-black text-white/60";
    }
};
btnTabTranslate.onclick = () => switchTab('translate');
btnTabStudy.onclick = () => switchTab('study');

btnSubmit.onclick = async () => {
    const val = inputText.value.trim();
    if (!val || GEMINI_API_KEY.includes("DÁN")) return alert("Nhập chữ với dán Key Gemini vô đã mày!");

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = "Đang gồng...";

    const prompt = `You are an American English expert. Xưng mày tao, nói chuyện dân dã kiểu miền Tây.
    Dịch câu: "${val}" sang JSON: { "versions": [ { "type": "Slang/Natural/Formal", "english": "...", "tips": "...", "grammar": "..." } ] }.
    Bôi đậm cấu trúc bằng **.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });
        const data = await response.json();
        const res = JSON.parse(data.candidates[0].content.parts[0].text);
        
        resultsContainer.innerHTML = "";
        resultsContainer.classList.remove('hidden');
        res.versions.forEach(v => {
            resultsContainer.innerHTML += `
                <div class="bg-white p-8 rounded-[2.5rem] shadow-lg border border-orange-50 mb-6">
                    <span class="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-orange-50 text-orange-600">${v.type}</span>
                    <h3 class="text-3xl font-black mt-2 text-slate-900">${v.english.replace(/\*\*(.*?)\*\*/g, '<span class="bold-tag">$1</span>')}</h3>
                    <div class="mt-4 p-4 bg-slate-900 rounded-2xl text-white text-xs italic"><b>Tèo Tips:</b> ${v.tips}</div>
                </div>`;
        });

        if (user) {
            // Lưu vào collection chuẩn để tránh lỗi phân quyền
            const path = `artifacts/${appId}/public/data/notebook`; 
            await db.collection(path).add({ 
                userId: user.uid,
                vi: val, 
                en: res.versions[0].english.replace(/\*\*/g, ""), 
                time: Date.now() 
            });
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi rồi mày ơi! Coi lại cái API Key Gemini coi có sống không.");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = "Xuất Chiêu!";
    }
};

function loadNotebook() {
    if (!user) return;
    const path = `artifacts/${appId}/public/data/notebook`;
    // Lấy hết về rồi lọc theo userId ở máy khách để tránh lỗi index Firestore
    db.collection(path).onSnapshot(snap => {
        notebookList.innerHTML = "";
        const myNotes = [];
        snap.forEach(doc => {
            const d = doc.data();
            if (d.userId === user.uid) myNotes.push({id: doc.id, ...d});
        });
        
        myNotes.sort((a, b) => b.time - a.time).forEach(d => {
            notebookList.innerHTML += `
                <div class="p-6 bg-orange-50/50 rounded-3xl flex justify-between items-center mb-4 border border-orange-100">
                    <div>
                        <p class="text-[10px] font-bold text-orange-400 uppercase">${d.vi}</p>
                        <h4 class="text-xl font-black text-slate-800">${d.en}</h4>
                    </div>
                    <button onclick="deleteNote('${d.id}')" class="text-red-300">Xóa</button>
                </div>`;
        });
    }, err => console.error("Lỗi fetch:", err));
}

window.deleteNote = (id) => {
    const path = `artifacts/${appId}/public/data/notebook`;
    db.collection(path).doc(id).delete();
};
