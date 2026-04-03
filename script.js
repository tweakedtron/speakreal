// ===== CONFIG =====
const apiKey = "AIzaSyDO6ZVI4nHZBTZRUoAp0U6JDlVpnEFsqSg"; // 

const btnSubmit = document.getElementById("btn-submit");
const inputText = document.getElementById("input-text");
const resultsContainer = document.getElementById("results-container");

// helper format bold
const formatBold = (text) => {
  return text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
};

btnSubmit.onclick = async () => {
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
- Giải thích grammar đơn giản
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
    console.log(data);

    // ❌ nếu API fail
    if (!data.candidates) {
      resultsContainer.classList.remove("hidden");
      resultsContainer.innerHTML = `
        <div style="color:red">
          API lỗi rồi m ơi:<br/>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
      `;
      return;
    }

    // lấy text trả về
    const rawText = data.candidates[0].content.parts[0].text;

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      resultsContainer.classList.remove("hidden");
      resultsContainer.innerHTML = `
        <div>
          <b>Model trả về không phải JSON:</b><br/><br/>
          <pre>${rawText}</pre>
        </div>
      `;
      return;
    }

    // render
    resultsContainer.classList.remove("hidden");

    parsed.versions.forEach((v) => {
      const div = document.createElement("div");
      div.style.marginBottom = "20px";
      div.style.padding = "20px";
      div.style.border = "1px solid #ddd";
      div.style.borderRadius = "12px";

      div.innerHTML = `
        <h3>${v.type}</h3>
        <p><b>English:</b> ${formatBold(v.english)}</p>
        <p><b>Grammar:</b> ${formatBold(v.grammar)}</p>
        <p><b>Tips:</b> ${v.tips}</p>
      `;

      resultsContainer.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    resultsContainer.classList.remove("hidden");
    resultsContainer.innerHTML = `<div style="color:red">Toang rồi: ${err.message}</div>`;
  }

  btnSubmit.disabled = false;
  btnSubmit.innerText = "Xuất Chiêu!";
};
