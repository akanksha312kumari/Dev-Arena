<div>  
  <h1>🚀 DevArena</h1>
  <p><strong>The Next-Generation AI-Powered Coding Platform & Personalized Learning Coach</strong></p>
  <p><i>Official Submission for HACKNEX SEASON 2</i></p>
</div>

<hr />

## 🎯 The Problem
Learning Data Structures and Algorithms (DSA) is overwhelming because the learning ecosystem is completely fragmented. Students are forced to juggle scattered coding platforms for reading tutorials, practicing problems, and tracking progress. On top of this, most platforms provide static generic solutions, leaving students stuck without personalized guidance.

## 💡 The Solution: DevArena
DevArena is an all-in-one, unified educational platform that eliminates the need for scattered tools. It integrates competitive programming tracking, real-time multiplayer code duels, and uses AI as a 24/7 personal coding coach. Through our Socratic learning methods, AI voices (ElevenLabs), and code execution sandboxes (JDoodle), DevArena creates an immersive learning experience.

---

## ✨ Key Features
- **Live Coding Duels & Anti-Cheat System:** Compete with friends in real-time coding arenas. The system includes server-authoritative matchmaking, automated JDoodle test evaluation, and anti-cheat monitors for window/fullscreen focus.
- **AI Coach & Socratic Quizzes:** Generate personalized roadmaps and analyze your skills. The AI guides you through Socratic reasoning, converting speech-to-text (STT) for natural conversations and reading out responses using ElevenLabs Text-to-Speech (TTS).
- **Secure Code Execution:** Integrated with JDoodle API for sandboxed execution of JavaScript, Java, and C++ code directly in the browser.
- **User Profiles & Social Features:** View detailed profiles, manage friends list, and climb the global leaderboards.
- **Unified Coding Hub:** Seamlessly integrates coding practice and tracking in one place.

---

## 💻 Tech Stack

**Frontend:**
- React.js + Vite
- CSS (Modern Glassmorphism & Micro-animations)
- Socket.io-client (Real-time events)
- Web MediaRecorder API (Microphone/Voice)

**Backend & Architecture:**
- Node.js & Express
- MongoDB & Mongoose (Database and Schema validation)
- Socket.io (WebSocket multiplayer state machine)

**APIs & Integrations:**
- **Groq Cloud API:** For blazing-fast live LLM inference and AI Coach responses.
- **ElevenLabs API:** High-fidelity TTS (Text-to-Speech) and STT (Speech-to-Text) for immersive voice coaching.
- **JDoodle API:** Secure compiler and code execution engine for Live Duels.

---

## 🚀 How to Run the Web App Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/akanksha312kumari/Dev-Arena.git
   cd Dev-Arena
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd server
   npm install
   ```

4. **Set up Environment Variables**
   Create a `.env` file in the `/server` directory and add your API keys. Reference `.env.example`:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_atlas_uri_here
   JDOODLE_CLIENT_ID=your_id
   JDOODLE_CLIENT_SECRET=your_secret
   JDOODLE_API_URL=https://api.jdoodle.com/v1/execute
   ELEVENLABS_API_KEY=your_elevenlabs_key
   ELEVENLABS_TTS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
   ELEVENLABS_TTS_MODEL_ID=eleven_multilingual_v2
   ANTI_CHEAT_VIOLATION_THRESHOLD=3
   ```

5. **Start the Development Servers**
   Open two terminals.
   In Terminal 1 (Frontend):
   ```bash
   npm run dev
   ```
   In Terminal 2 (Backend):
   ```bash
   cd server
   npm start
   ```

6. Open your browser and navigate to `http://localhost:5173` to meet your new AI Coach!

---

<div align="center">
  <p>Built with ❤️ for <strong>HACKNEX SEASON 2</strong></p>
  <p><strong>Place:</strong> JIS COLLEGE OF ENGINEERING</p>
  <h3>Team: MuttonBiryani</h3>
  <p><strong>Team Leader:</strong> Biswaranjan Nag</p>
  <p><strong>Members:</strong> Akanksha Kumari, Tushar Vaskar Sharma, Aniket Chaudhary, Raja Banerjee, Shraya Saha</p>
</div>
