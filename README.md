
<div>  
  <h1>🚀 DevArena</h1>
  <p><strong>The Next-Generation AI-Powered Coding Platform & Personalized Learning Coach</strong></p>
  <p><i>Official Submission for the "VibeForge 1.0" Hackathon 2026</i></p>
</div>

<hr />

## 🎯 The Problem
Learning Data Structures and Algorithms (DSA) is overwhelming because the learning ecosystem is completely fragmented. Students are forced to juggle **scattered coding platforms**—using one site for reading tutorials, another for practicing problems, and yet another for tracking progress. On top of this scattered experience, most platforms provide static generic solutions, leaving students stuck without personalized guidance.

## 💡 The Solution: DevArena
DevArena is an all-in-one, unified educational platform that eliminates the need for scattered tools. **It integrates all major coding platforms into one single hub.** By acting as a central dashboard, DevArena brings together practice problems, competitive programming tracking, and—most importantly—uses **Gemma** as a 24/7 personal coding coach. Instead of just giving users the answer, DevArena analyzes their coding statistics across all integrated platforms, identifies their weakest topics, and generates a dynamic, personalized learning roadmap to guide them to success within a single ecosystem.
---

## ✨ Key Features
- **Live Coding Duels & Private Rooms:** Compete with friends in real-time coding arenas, manage room members, and view live updates via WebSockets.
- **Personalized Learning & Skill Analysis:** The Gemma-powered AI Coach generates personalized roadmaps and analyzes your skills based on your past performance.
- **User Profiles & Social Features:** View detailed profiles, manage your friends list, and climb the global leaderboards.
- **Unified Coding Hub:** Seamlessly integrates coding practice and tracking in one place.

---

## 🧠 The AI Architecture (Built with Gemma)

Our AI pipeline is designed to be highly modular and production-ready. While our live React web application handles the UI and dynamic state, our AI Research & Architecture was built and tested entirely on Kaggle using the **Gemma** family of models.

### 🔬 [View our Kaggle AI Research Lab Notebook Here](https://www.kaggle.com/code/aakaaankshaa/notebook9fbea3b67f)
### 🌐 [Play with the Live DevArena Web App Here](https://devarena-frontend.onrender.com/)

In our Kaggle notebook, we successfully engineered and proved the following V2 backend systems:
1. **LoRA Fine-Tuning:** We fine-tuned the highly efficient **Gemma 2B** model to act as a specialized coding coach, demonstrating the ability to handle custom instructional datasets. *(Note: Our architecture is designed for the Gemma 4 E4B model, but due to bleeding-edge library incompatibilities in the Hugging Face PEFT library with Gemma 4's custom ClippableLinear layers, we deployed the stable 2B architecture to guarantee a working production pipeline).*
2. **Mathematical RAG Pipeline:** Built a Retrieval-Augmented Generation (RAG) system from scratch using TF-IDF and Cosine Similarity to mathematically retrieve the correct algorithmic definitions before generation.
3. **Structured AI Code Judge:** Implemented strict structured prompting to force Gemma to act as an automated code evaluator, outputting deterministic JSON (Score, Bug Type, Feedback) that can be easily parsed by our Node.js backend.
4. **Data Analytics:** Built a simulation pipeline to analyze the weakest coding topics across 1,000 DevArena users and fed those insights back into Gemma for dynamic platform-strategy generation.

---

## 💻 Tech Stack

**Frontend:**
- React.js + Vite
- Tailwind CSS / Vanilla CSS (Modern Glassmorphism & Micro-animations)
- State Management for dynamic user tracking

**Backend & API:**
- Node.js & Express
- Groq Cloud API (For blazing-fast live model inference in the V1 Web App)

**AI Research & Model Engineering (Kaggle):**
- **Model:** Google DeepMind Gemma 
- **Libraries:** PyTorch, Transformers, PEFT, Scikit-learn, Pandas, Matplotlib

---

## 🚀 How to Run the Web App Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/DevArena.git
   cd DevArena
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
   Create a `.env` file in the `/server` directory and add your API keys:
   ```env
   GROQ_API_KEY=your_api_key_here
   PORT=5000
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
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5173` to meet your new AI Coach!

---

<div align="center">
  <p>Built with ❤️ for VIBEFORGE 1.0</p>
  <h3>Team: NEURAL PAIR</h3>
  <p><strong>Members:</strong> Akanksha Kumari and Tushar Vaskar Sharma</p>
</div>
