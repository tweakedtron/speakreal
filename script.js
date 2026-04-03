const API_KEY = "AIzaSyDO6ZVI4nHZBTZRUoAp0U6JDlVpnEFsqSg"; // 👈 thay bằng key thật

const btn = document.getElementById("btn");
const input = document.getElementById("input");
const output = document.getElementById("output");

btn.onclick = async () => {
  const text = input.value.trim();
  if (!text) return;

  output.innerText = "Đang gồng...";

  try {
    const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `Dịch câu này sang tiếng Anh tự nhiên: "${text}"` }]
            }
          ]
        })
      }
    );

    const data = await res.json();
    console.log(data);

    if (!data.candidates) {
      output.innerText = "API lỗi rồi m ơi:\n" + JSON.stringify(data, null, 2);
      return;
    }

    const result = data.candidates[0].content.parts[0].text;
    output.innerText = result;

  } catch (err) {
    console.error(err);
    output.innerText = "Toang rồi: " + err.message;
  }
};
