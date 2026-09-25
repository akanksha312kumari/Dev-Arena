require('dotenv').config({ path: __dirname + '/.env', override: true });
const { GoogleGenAI } = require('@google/genai');
console.log("Key starts with:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 5) : "undefined");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
(async () => {
  try {
    const response = await ai.models.list();
    for await (const model of response) {
      console.log(model.name);
    }
  } catch (e) {
    console.error(e);
  }
})();
