/**
 * ⚡️ FILE LOGIC SPEAKREAL - ĐÃ CẤU HÌNH SẴN CHO MÀY
 * Copy hết đống này dán vào script.js trên GitHub là CHẠY LUÔN!
 */

// 1. Firebase Config của mày nè (Tèo đã dán hộ)
const firebaseConfig = {
  apiKey: "AIzaSyA5FbN-2Gx5ZnvIx0r4Dc6W741Y_gVxk4M",
  authDomain: "speakreal-a5f44.firebaseapp.com",
  projectId: "speakreal-a5f44",
  storageBucket: "speakreal-a5f44.firebasestorage.app",
  messagingSenderId: "318441420730",
  appId: "1:318441420730:web:c40ae61784f66778f44f83",
  measurementId: "G-PWGYCTQDM7"
};

// 2. Gemini API Key của mày luôn (Tèo cũng dán hộ luôn)
const GEMINI_API_KEY = "AIzaSyDO6ZVI4nHZBTZRUoAp0U6JDlVpnEFsqSg";

// --- KHỞI TẠO HỆ THỐNG ---
try {
    firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.error("❌ Lỗi khởi tạo Firebase:", e);
}

const auth = firebase.auth();
const db = firebase.firestore();
const appId = "speakreal-web-teo";

let user = null;

// UI Elements
const btnTabTranslate = document.getElementById('btn-tab-translate');
const btnTabStudy = document.getElementById('btn-tab-study');
const sectionTranslate = document.getElementById('section-translate');
const sectionStudy = document.getElementById('section-study');
const inputText = document.getElementById('input-text');
const btnSubmit = document.getElementById('btn-submit');
const resultsContainer = document.getElementById('results-container');
const notebookList = document.getElementById('notebook-list');

// Đăng nhập ẩn danh để dùng được Database (Nhớ bật Anonymous trong Firebase Console!)
auth.signInAnonymously().then(() => {
    console.log("✅ Đã kết nối Firebase thành công!");
}).catch(e => {
    console.error("❌ Lỗi Auth: Hãy bật 'Anonymous' trong Firebase Console > Authentication!", e);
});

auth.onAuthStateChanged(u => {
    user = u;
    if (u) loadNotebook();
});

// Chuyển Tab
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

// Hàm dịch thuật dùng Gemini
btnSubmit.onclick = async () => {
    const val = inputText.value.trim();
    
    if (!val) return alert("Mày chưa nhập gì hết sao tao dịch!");
    
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = "Đang gồng...";

    const prompt = `You are an American English expert. Xưng mày tao, nói chuyện dân dã kiểu miền Tây.
    Dịch câu: "${val}" sang JSON theo cấu trúc này: 
    { "versions": [ { "type": "Slang/Natural/Formal", "english": "...", "tips": "..." } ] }.
    Lưu ý: Bôi đậm cấu trúc quan trọng bằng dấu **.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!response.ok) throw new Error("API Gemini có vấn đề rồi!");

        const data = await response.json();
        const res = JSON.parse(data.candidates[0].content.parts[0].text);
        
        renderResults(res);

        // Lưu vào sổ tay nếu đã đăng nhập ẩn danh thành công
        if (user) {
            const path = `artifacts/${appId}/public/data/notebook`; 
            await db.collection(path).add({ 
                userId: user.uid,
                vi: val, 
                en: res.versions[0].english.replace(/\*\*/g, ""), 
                time: Date.now() 
            });
        }
    } catch (e) {
        console.error("❌ Lỗi:", e);
        alert("Có biến rồi mày ơi! Check Console (F12) xem sao.");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = "Xuất Chiêu!";
    }
};

function renderResults(res) {
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
}

// Tải dữ liệu từ sổ tay Firestore
function loadNotebook() {
    if (!user) return;
    const path = `artifacts/${appId}/public/data/notebook`;
    
    db.collection(path).onSnapshot(snap => {
        notebookList.innerHTML = "";
        const myNotes = [];
        snap.forEach(doc => {
            const d = doc.data();
            if (d.userId === user.uid) myNotes.push({id: doc.id, ...d});
        });
        
        // Sắp xếp thời gian mới nhất lên đầu
        myNotes.sort((a, b) => b.time - a.time).forEach(d => {
            notebookList.innerHTML += `
                <div class="p-6 bg-orange-50/50 rounded-3xl flex justify-between items-center mb-4 border border-orange-100">
                    <div>
                        <p class="text-[10px] font-bold text-orange-400 uppercase">${d.vi}</p>
                        <h4 class="text-xl font-black text-slate-800">${d.en}</h4>
                    </div>
                    <button onclick="deleteNote('${d.id}')" class="text-red-400 font-bold">Xóa</button>
                </div>`;
        });
    }, err => console.error("❌ Lỗi Firestore:", err));
}

// Xóa một ghi chú
window.deleteNote = async (id) => {
    if (!confirm("Xóa thiệt hả? Tiếc lắm á!")) return;
    const path = `artifacts/${appId}/public/data/notebook`;
    try {
        await db.collection(path).doc(id).delete();
    } catch (e) {
        console.error("Lỗi xóa:", e);
    }
};
