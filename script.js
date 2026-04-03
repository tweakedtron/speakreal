// ===== CONFIG =====
const apiKey = "AIzaSyDO6ZVI4nHZBTZRUoAp0U6JDlVpnEFsqSg"; // 👈 thay key của m

// ===== ELEMENTS =====
const btnSubmit = document.getElementById("btn-submit");
const inputText = document.getElementById("input-text");
const resultsContainer = document.getElementById("results-container");

// ===== HELPER =====
const formatBold = (text) => {
  return text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
};

// ===== MAIN =====
btnSubmit.addEventListener("click", async () => {
  const val = inputText.value.trim();
  if (!val) return;

  btnSubmit.disabled = true;
  btnSubmit.innerText = "Đang gồng...";
  resultsContainer.innerHTML = "";
  resultsContainer.classList.add("hidden");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
Dịch câu sau sang tiếng Anh với 3 version:

"${val}"

Yêu cầu:
- Super Casual (slang)
- Natural
- Formal
- Có grammar đơn giản
- Có tips

Trả về JSON dạng:

{
  "versions": [
    {
      "type": "...",
      "english": "...",
      "grammar": "...",
      "tips": "..."
    }
  ]
}
                  `,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    console.log("API response:", data);

    // ❌ API lỗi
    if (!data.candidates) {
      throw new Error(JSON.stringify(data, null, 2));
    }

    const rawText = data.candidates[0].content.parts[0].text;

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error("Model trả về không phải JSON:\n" + rawText);
    }

    // ===== RENDER =====
    resultsContainer.classList.remove("hidden");

    parsed.versions.forEach((v) => {
      const div = document.createElement("div");

      div.className = "bg-white p-6 rounded-xl shadow mb-4";

      div.innerHTML = `
        <h3 class="font-bold text-lg mb-2">${v.type}</h3>
        <p><b>English:</b> ${formatBold(v.english)}</p>
        <p><b>Grammar:</b> ${formatBold(v.grammar)}</p>
        <p><b>Tips:</b> ${v.tips}</p>
      `;

      resultsContainer.appendChild(div);
    });

  } catch (err) {
    console.error("ERROR:", err);

    resultsContainer.classList.remove("hidden");
    resultsContainer.innerHTML = `
      <div class="text-red-500">
        Toang rồi:<br/>
        <pre>${err.message}</pre>
      </div>
    `;
  }

  btnSubmit.disabled = false;
  btnSubmit.innerText = "Xuất Chiêu!";
});
