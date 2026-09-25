require('dotenv').config({ override: true });
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Test failed: GEMINI_API_KEY is not configured in the environment.");
    process.exit(1);
  }
  
  console.log("Testing Gemini API with key:", process.env.GEMINI_API_KEY.substring(0, 5) + "...");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Hello world',
    });
    console.log("Success! Response:", response.text);
  } catch (error) {
    console.error("API Error encountered:");
    console.error(error.message);
  }
}

test();
