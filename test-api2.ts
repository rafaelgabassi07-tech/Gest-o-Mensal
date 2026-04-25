const { GoogleGenAI } = require("@google/genai");
async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Olá",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    console.log("SUCCESS =>", response.text);
  } catch(e) {
    console.log("ERROR ==>", e.message);
  }
}
run();
