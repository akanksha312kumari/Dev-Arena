require('dotenv').config({ override: true });
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  console.log("Testing Gemini API with key:", process.env.GEMINI_API_KEY.substring(0, 8) + "...");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'Hello world',
    });
    console.log("Success! Response:", response.text);
  } catch (error) {
    console.error("API Error encountered:");
    console.error(error.message);
  }
}

test();
