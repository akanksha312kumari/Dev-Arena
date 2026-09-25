require('dotenv').config({ override: true });

async function testGroq() {
  const response = await fetch('https://api.groq.com/openai/v1/models', {
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    }
  });
  const data = await response.json();
  const models = data.data.map(m => m.id);
  console.log("Available models:", models);
}

testGroq();
