const { GoogleGenAI } = require('@google/genai');

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

/**
 * Call Google Gemini API using @google/genai SDK
 * @param {Array|string} promptOrMessages - Prompt string or array of {role, content} objects
 * @param {string} systemInstruction - Optional system instruction string
 * @returns {Promise<string>} Model response text
 */
const callGeminiAPI = async (promptOrMessages, systemInstruction = '') => {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  // 1. Try Gemini API via @google/genai
  if (geminiApiKey) {
    let combinedSystem = systemInstruction;
    let mainPrompt = '';

    if (Array.isArray(promptOrMessages)) {
      for (const msg of promptOrMessages) {
        if (msg.role === 'system') {
          combinedSystem = (combinedSystem ? combinedSystem + '\n' : '') + msg.content;
        } else if (msg.role === 'user') {
          mainPrompt += (mainPrompt ? '\n\n' : '') + msg.content;
        }
      }
    } else {
      mainPrompt = String(promptOrMessages);
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    let lastError = null;
    for (const model of GEMINI_MODELS) {
      try {
        const config = {};
        if (combinedSystem) {
          config.systemInstruction = combinedSystem;
        }

        const response = await ai.models.generateContent({
          model: model,
          contents: mainPrompt || 'Hello',
          config: Object.keys(config).length ? config : undefined
        });

        if (response && response.text) {
          let content = response.text.trim();
          content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          return content;
        }
      } catch (err) {
        console.warn(`Gemini Model ${model} failed:`, err.message);
        lastError = err;
      }
    }

    console.warn("Gemini API models failed or API key error. Checking Groq fallback...", lastError?.message);
  }

  // 2. Fallback to Groq API if available
  if (process.env.GROQ_API_KEY) {
    const GROQ_MODELS = ['groq/compound', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b', 'groq/compound-mini'];
    let formattedMessages = [];

    if (Array.isArray(promptOrMessages)) {
      formattedMessages = promptOrMessages;
    } else {
      if (systemInstruction) {
        formattedMessages.push({ role: 'system', content: systemInstruction });
      }
      formattedMessages.push({ role: 'user', content: String(promptOrMessages) });
    }

    for (const model of GROQ_MODELS) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: formattedMessages
          })
        });

        if (response.ok) {
          const data = await response.json();
          let content = data.choices[0]?.message?.content || '';
          content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          return content;
        }
      } catch (err) {
        console.warn(`Groq fallback model ${model} failed:`, err.message);
      }
    }
  }

  throw new Error('All AI service providers (Gemini & Groq) failed or missing valid API keys.');
};

module.exports = { callGeminiAPI };
