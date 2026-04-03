// --- 1. THÔNG TIN FIREBASE CỦA MÀY ---
const firebaseConfig = {
    apiKey: "AIzaSyA5FbN-2Gx5ZnvIx0r4Dc6W741Y_gVxk4M",
    authDomain: "speakreal-a5f44.firebaseapp.com",
    projectId: "speakreal-a5f44",
    storageBucket: "speakreal-a5f44.firebasestorage.app",
    messagingSenderId: "318441420730",
    appId: "1:318441420730:web:c40ae61784f66778f44f83",
    measurementId: "G-PWGYCTQDM7"
};

// --- 2. CHÌA KHÓA AI STUDIO CỦA MÀY ---
const GEMINI_API_KEY = "AIzaSyDO6ZVI4nHZBTZRUoAp0U6JDlVpnEFsqSg"; 

// Khởi tạo Firebase
try {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
    console.log("Firebase đã sẵn sàng!");
} catch (e) {
    console.error("Lỗi khởi tạo Firebase:", e);
}

const btnAction = document.getElementById('btn-action');
const userInput = document.getElementById('user-input');
const responseContainer = document.getElementById('response-container');
const responseText = document.getElementById('response-text');

// Hàm gọi AI Gemini
async function callGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const systemInstruction = "Mày tên là Tèo, bạn thân của người dùng. Nói chuyện rặt phong cách miền Tây Nam Bộ: dùng mày-tao, xưng hô dân dã, thật thà, hay rủ rê đi nhậu hoặc đi câu cá. Trả lời ngắn gọn thôi, đừng viết sớ.";

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ 
                parts: [{ text: `${systemInstruction}\n\nNgười dùng nhắn: ${prompt}` }] 
            }]
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Lỗi API AI rồi cha nội!");
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

btnAction.addEventListener('click', async () => {
    const text = userInput.value.trim();
    if (!text) return;

    // Đổi trạng thái nút
    btnAction.disabled = true;
    btnAction.innerHTML = '<span class="loading-spinner"></span> Đang gồng...';
    responseContainer.classList.add('hidden');

    try {
        // 1. Gọi AI trả lời
        const reply = await callGemini(text);
        
        // 2. Hiển thị kết quả
        responseText.innerText = reply;
        responseContainer.classList.remove('hidden');

        // 3. Lưu lịch sử vô Firebase
        if (db) {
            db.collection("chat_logs").add({
                user_msg: text,
                teo_reply: reply,
                time: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                console.log("Đã lưu lịch sử thành công!");
            }).catch(err => {
                console.warn("Lưu Firebase lỗi:", err);
            });
        }

    } catch (err) {
        responseText.innerText = "Lỗi rồi: " + err.message;
        responseContainer.classList.remove('hidden');
        console.error(err);
    } finally {
        btnAction.disabled = false;
        btnAction.innerText = "Đang Gồng...";
    }
});
