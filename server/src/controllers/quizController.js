const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');
const gamificationService = require('../services/gamificationService');

const GROQ_MODELS = ['groq/compound-mini', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b', 'groq/compound'];

const callGroqAi = async (messages) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured in server environment.');
  }

  let lastError = null;
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
          messages: messages
        })
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.choices[0]?.message?.content || '';
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        return content;
      } else {
        const errText = await response.text();
        console.warn(`Groq model ${model} failed (${response.status}):`, errText);
        lastError = new Error(`Groq API Error (${response.status}): ${errText}`);
      }
    } catch (err) {
      console.warn(`Groq model ${model} error:`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error('All Groq AI models failed');
};

const parseAndValidateAiJson = (rawText, requiredKeys = []) => {
  let cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(cleaned);
  for (const key of requiredKeys) {
    if (parsed[key] === undefined) {
      throw new Error(`Missing required AI JSON key: ${key}`);
    }
  }
  return parsed;
};

const clampScore = (val) => {
  const num = Number(val);
  if (isNaN(num)) return 50;
  return Math.min(100, Math.max(0, Math.round(num)));
};

const startQuiz = async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ message: 'Please provide a valid topic.' });
    }

    const cleanTopic = topic.trim();
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Mark any existing incomplete attempts as completed/abandoned
    await QuizAttempt.updateMany(
      { user: user._id, topic: cleanTopic, status: 'in_progress' },
      { $set: { status: 'completed' } }
    );

    // Get previous mastery level for topic
    let previousMastery = 0;
    if (user.skillMastery && user.skillMastery.get) {
      const topicStats = user.skillMastery.get(cleanTopic);
      if (topicStats && typeof topicStats.masteryLevel === 'number') {
        previousMastery = topicStats.masteryLevel;
      }
    }

    // Prompt AI to generate Question 1
    const prompt = `You are the DevArena AI Coding Coach generating a conceptual Socratic quiz question on topic: "${cleanTopic}".
The user has a current mastery level of ${previousMastery}% on this topic.

Generate Question 1 of a multi-step diagnostic challenge.
Provide a clear question testing deep conceptual understanding, algorithm design, or edge cases. Include an optional short code snippet if relevant.

Return ONLY a valid JSON object with exact keys:
{
  "questionText": "string",
  "codeSnippet": "string (or empty string if not applicable)"
}`;

    const aiRaw = await callGroqAi([{ role: 'user', content: prompt }]);
    const parsedQuestion = parseAndValidateAiJson(aiRaw, ['questionText']);

    const firstQuestion = {
      questionId: `q_1_${Date.now()}`,
      questionText: parsedQuestion.questionText,
      codeSnippet: parsedQuestion.codeSnippet || '',
      stepState: 'awaiting_initial_answer'
    };

    const attempt = await QuizAttempt.create({
      user: user._id,
      topic: cleanTopic,
      totalQuestions: 3,
      currentQuestionIndex: 0,
      status: 'in_progress',
      aiModel: 'groq/compound',
      promptVersion: 'v1.0',
      previousMastery: previousMastery,
      questions: [firstQuestion]
    });

    res.json({ quiz: attempt });
  } catch (error) {
    console.error('startQuiz Error:', error);
    res.status(500).json({ message: error.message || 'Failed to start quiz' });
  }
};

const submitAnswer = async (req, res) => {
  try {
    const { quizId, answer } = req.body;
    if (!quizId || !answer || !answer.trim()) {
      return res.status(400).json({ message: 'Quiz ID and initial answer are required.' });
    }

    const attempt = await QuizAttempt.findOne({ _id: quizId, user: req.user.id });
    if (!attempt) return res.status(404).json({ message: 'Quiz attempt not found.' });

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ message: 'This quiz session has already ended.' });
    }

    const currentQ = attempt.questions[attempt.currentQuestionIndex];
    if (!currentQ) {
      return res.status(404).json({ message: 'Current question not found in quiz attempt.' });
    }

    // Guard against duplicate submissions
    if (currentQ.stepState !== 'awaiting_initial_answer') {
      return res.status(400).json({ 
        message: 'Initial answer has already been submitted for this question.',
        quiz: attempt
      });
    }

    currentQ.studentAnswer = answer.trim();
    currentQ.studentAnswerSubmittedAt = new Date();

    // Call AI to analyze initial answer reasoning & formulate a targeted Socratic Challenge
    const prompt = `You are the DevArena AI Coding Coach conducting a Socratic quiz session.
Topic: "${attempt.topic}"
Question: "${currentQ.questionText}"
${currentQ.codeSnippet ? `Code Context:\n${currentQ.codeSnippet}\n` : ''}

Student's Initial Answer & Reasoning:
"${currentQ.studentAnswer}"

Evaluation Rules:
1. For any genuine attempt, explanation, or proposed logic by the student, set isIncorrect = false, score initialAnswerScore (50-100), provide a concise aiAnalysis, and formulate a direct, probing Socratic challenge in socraticChallenge testing edge cases, complexity, or trade-offs.
2. ONLY set isIncorrect = true if the input is total gibberish, empty, or completely non-attempted spam (e.g. "asdf", "idk", "asdfghjk").

Return ONLY a valid JSON object with exact keys:
{
  "isIncorrect": boolean,
  "initialAnswerScore": number (0-100),
  "aiAnalysis": "string",
  "socraticChallenge": "string",
  "incorrectExplanation": "string",
  "misconceptions": ["string"]
}`;

    const aiRaw = await callGroqAi([{ role: 'user', content: prompt }]);
    const parsed = parseAndValidateAiJson(aiRaw, ['isIncorrect']);

    const initialScore = clampScore(parsed.initialAnswerScore !== undefined ? parsed.initialAnswerScore : (parsed.isIncorrect ? 10 : 75));
    const isWrong = Boolean(parsed.isIncorrect) || initialScore < 40;

    if (isWrong) {
      // Immediately mark as evaluated & wrong for invalid/gibberish/incorrect answers
      const misconceptions = Array.isArray(parsed.misconceptions) ? parsed.misconceptions.map(m => String(m)) : [];

      currentQ.aiAnalysis = parsed.aiAnalysis || 'No valid reasoning provided.';
      currentQ.socraticChallenge = 'N/A - Initial answer was empty or invalid.';
      currentQ.studentDefense = 'N/A';
      currentQ.evaluation = {
        initialAnswerScore: initialScore,
        defenseScore: 0,
        finalScore: initialScore,
        understanding: 'No conceptual attempt detected.',
        misconceptions: misconceptions.length > 0 ? misconceptions : ['No valid attempt made'],
        feedback: parsed.incorrectExplanation || parsed.aiAnalysis || 'Please provide a conceptual explanation for the question.',
        masteryImpact: -5
      };
      currentQ.stepState = 'evaluated';

      const user = await User.findById(req.user.id);
      if (user) {
        await gamificationService.awardXP(user, 10, `Quiz question completion: ${attempt.topic}`);
      }
      attempt.pointsEarned += 10;

      const nextIdx = attempt.currentQuestionIndex + 1;
      if (nextIdx < attempt.totalQuestions) {
        try {
          const nextPrompt = `You are the DevArena AI Coding Coach generating Question ${nextIdx + 1} of 3 on topic: "${attempt.topic}".
Generate a new, distinct conceptual question testing ${attempt.topic}.

Return ONLY a valid JSON object:
{
  "questionText": "string",
  "codeSnippet": "string (optional)"
}`;

          const nextAiRaw = await callGroqAi([{ role: 'user', content: nextPrompt }]);
          const nextParsed = parseAndValidateAiJson(nextAiRaw, ['questionText']);

          attempt.questions.push({
            questionId: `q_${nextIdx + 1}_${Date.now()}`,
            questionText: nextParsed.questionText,
            codeSnippet: nextParsed.codeSnippet || '',
            stepState: 'awaiting_initial_answer'
          });
          // Do not auto-advance currentQuestionIndex here; let student view evaluation first!
        } catch (err) {
          console.warn('Next question generation failed:', err.message);
        }
      } else {
        attempt.status = 'completed';
        const totalScoreSum = attempt.questions.reduce((sum, q) => sum + (q.evaluation?.finalScore || 0), 0);
        attempt.score = Math.round(totalScoreSum / attempt.questions.length);

        const previousMastery = attempt.previousMastery || 0;
        const newMastery = Math.min(100, Math.max(0, Math.round(previousMastery * 0.7 + attempt.score * 0.3)));
        attempt.masteryLevel = newMastery;
        attempt.masteryGained = newMastery - previousMastery;

        if (user) {
          if (!user.skillMastery) user.skillMastery = new Map();
          const existingTopicData = user.skillMastery.get(attempt.topic) || { masteryLevel: 0, quizzesTaken: 0, points: 0 };
          user.skillMastery.set(attempt.topic, {
            masteryLevel: newMastery,
            quizzesTaken: (existingTopicData.quizzesTaken || 0) + 1,
            points: (existingTopicData.points || 0) + attempt.pointsEarned,
            lastUpdated: new Date()
          });
          user.markModified('skillMastery');
          await user.save();
        }
      }
    } else {
      currentQ.aiAnalysis = parsed.aiAnalysis || 'Initial answer received.';
      currentQ.socraticChallenge = parsed.socraticChallenge || 'How would your logic handle edge cases or larger input constraints?';
      currentQ.stepState = 'awaiting_defense';
    }

    attempt.markModified('questions');
    await attempt.save();

    res.json({ quiz: attempt });
  } catch (error) {
    console.error('submitAnswer Error:', error);
    res.status(500).json({ message: error.message || 'Failed to analyze answer' });
  }
};

const evaluateDefense = async (req, res) => {
  try {
    const { quizId, defense } = req.body;
    if (!quizId || !defense || !defense.trim()) {
      return res.status(400).json({ message: 'Quiz ID and defense explanation are required.' });
    }

    const attempt = await QuizAttempt.findOne({ _id: quizId, user: req.user.id });
    if (!attempt) return res.status(404).json({ message: 'Quiz attempt not found.' });

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ message: 'This quiz session has already ended.' });
    }

    const currentQ = attempt.questions[attempt.currentQuestionIndex];
    if (!currentQ) {
      return res.status(404).json({ message: 'Current question not found.' });
    }

    // Guard against duplicate defense evaluations
    if (currentQ.stepState !== 'awaiting_defense') {
      return res.status(400).json({
        message: 'Defense has already been evaluated for this question.',
        quiz: attempt
      });
    }

    currentQ.studentDefense = defense.trim();
    currentQ.studentDefenseSubmittedAt = new Date();

    // Call Groq AI to evaluate initial answer + defense
    const prompt = `You are a strict, harsh, and uncompromising DevArena AI Coding Coach evaluating a student's Socratic defense.

Topic: "${attempt.topic}"
Original Question: "${currentQ.questionText}"
Student's Initial Answer: "${currentQ.studentAnswer}"
Socratic Probing Challenge: "${currentQ.socraticChallenge}"
Student's Defense / Explanation: "${currentQ.studentDefense}"

STRICT EVALUATION INSTRUCTIONS:
1. GROUND EVERYTHING IN THE STUDENT'S EXACT SUBMITTED TEXT. Evaluate ONLY what the student actually wrote in their initial answer and defense.
2. BE HARSH, BLUNT, AND DIRECT. DO NOT use soft language, praise, or diplomatic fluff (NEVER say "Good job", "Great effort", "Nice try", "To improve, consider", or "Keep practicing").
3. CRITIQUE THE DEFENSE DIRECTLY. If the student failed to answer the probing challenge, dodged the question, hand-waved, or gave a surface-level response, call out their exact failure harshly and explain why their logic falls apart.
4. DO NOT invent claims or list generic textbook points. Every misconception and feedback point MUST directly reference the student's submitted text and identify their specific conceptual flaws, gaps, or hand-waving.
5. If defenseScore is low (<50), explicitly explain why their defense failed to prove their understanding and why hand-waving is unacceptable.

Return ONLY a valid JSON object with exact keys:
{
  "initialAnswerScore": number (0-100),
  "defenseScore": number (0-100),
  "understanding": "string (A sharp, blunt, 1-2 sentence assessment of their actual demonstrated understanding vs hand-waving)",
  "misconceptions": ["string (Direct, harsh statements of flaws/gaps in their submitted text)"],
  "feedback": "string (Harsh, direct, technical critique referencing their exact response and calling out missing logic, hand-waving, or wrong assumptions)"
}`;

    const aiRaw = await callGroqAi([{ role: 'user', content: prompt }]);
    const evalParsed = parseAndValidateAiJson(aiRaw, ['initialAnswerScore', 'defenseScore', 'feedback']);

    // Backend Score Clamping & Calculation
    const initialAnswerScore = clampScore(evalParsed.initialAnswerScore);
    const defenseScore = clampScore(evalParsed.defenseScore);
    const finalScore = Math.round(initialAnswerScore * 0.4 + defenseScore * 0.6);
    const masteryImpact = Math.round((finalScore - 50) * 0.2);

    const misconceptions = Array.isArray(evalParsed.misconceptions) 
      ? evalParsed.misconceptions.map(m => String(m)) 
      : [];

    currentQ.evaluation = {
      initialAnswerScore,
      defenseScore,
      finalScore,
      understanding: evalParsed.understanding || 'Evaluated reasoning and defense.',
      misconceptions,
      feedback: evalParsed.feedback || 'Keep up the effort!',
      masteryImpact
    };
    currentQ.stepState = 'evaluated';

    // Award XP to User
    const user = await User.findById(req.user.id);
    const questionXp = Math.max(10, Math.round(finalScore * 0.5));
    if (user) {
      await gamificationService.awardXP(user, questionXp, `Quiz question completion: ${attempt.topic}`);
    }

    attempt.pointsEarned += questionXp;
    attempt.markModified('questions');
    await attempt.save();

    // Check if next question is needed or if quiz is completed
    const nextIdx = attempt.currentQuestionIndex + 1;
    let nextQuestionFailed = false;

    if (nextIdx < attempt.totalQuestions) {
      // Attempt generating next question
      try {
        const nextPrompt = `You are the DevArena AI Coding Coach generating Question ${nextIdx + 1} of 3 on topic: "${attempt.topic}".
Previous question score: ${finalScore}/100.
Generate a new, distinct conceptual question testing a complementary aspect of ${attempt.topic}.

Return ONLY a valid JSON object:
{
  "questionText": "string",
  "codeSnippet": "string (optional)"
}`;

        const nextAiRaw = await callGroqAi([{ role: 'user', content: nextPrompt }]);
        const nextParsed = parseAndValidateAiJson(nextAiRaw, ['questionText']);

        attempt.questions.push({
          questionId: `q_${nextIdx + 1}_${Date.now()}`,
          questionText: nextParsed.questionText,
          codeSnippet: nextParsed.codeSnippet || '',
          stepState: 'awaiting_initial_answer'
        });
        // Do not auto-advance currentQuestionIndex here; let student view evaluation first!
        attempt.markModified('questions');
        await attempt.save();
      } catch (err) {
        console.warn('Next question generation failed, keeping evaluation intact:', err.message);
        nextQuestionFailed = true;
      }
    } else {
      // Quiz Finished! Calculate aggregate scores & weighted mastery
      attempt.status = 'completed';
      const totalScoreSum = attempt.questions.reduce((sum, q) => sum + (q.evaluation?.finalScore || 0), 0);
      attempt.score = Math.round(totalScoreSum / attempt.questions.length);

      const previousMastery = attempt.previousMastery || 0;
      // Weighted mastery formula: 70% historical mastery + 30% current quiz score
      const newMastery = Math.min(100, Math.max(0, Math.round(previousMastery * 0.7 + attempt.score * 0.3)));
      attempt.masteryLevel = newMastery;
      attempt.masteryGained = newMastery - previousMastery;

      await attempt.save();

      // Update User skillMastery & quizStats
      if (user) {
        if (!user.skillMastery) user.skillMastery = new Map();
        
        const existingTopicData = user.skillMastery.get(attempt.topic) || { masteryLevel: 0, quizzesTaken: 0, points: 0 };
        user.skillMastery.set(attempt.topic, {
          masteryLevel: newMastery,
          quizzesTaken: (existingTopicData.quizzesTaken || 0) + 1,
          points: (existingTopicData.points || 0) + attempt.pointsEarned,
          lastUpdated: new Date()
        });

        if (!user.quizStats) {
          user.quizStats = { totalQuizzes: 0, totalQuestionsAnswered: 0, totalPointsEarned: 0, averageScore: 0 };
        }

        const prevTotalQuizzes = user.quizStats.totalQuizzes || 0;
        const prevAvgScore = user.quizStats.averageScore || 0;
        const newTotalQuizzes = prevTotalQuizzes + 1;
        const newAvgScore = Math.round(((prevAvgScore * prevTotalQuizzes) + attempt.score) / newTotalQuizzes);

        user.quizStats.totalQuizzes = newTotalQuizzes;
        user.quizStats.totalQuestionsAnswered = (user.quizStats.totalQuestionsAnswered || 0) + attempt.questions.length;
        user.quizStats.totalPointsEarned = (user.quizStats.totalPointsEarned || 0) + attempt.pointsEarned;
        user.quizStats.averageScore = newAvgScore;

        user.markModified('skillMastery');
        await user.save();
      }
    }

    res.json({
      quiz: attempt,
      nextQuestionFailed
    });
  } catch (error) {
    console.error('evaluateDefense Error:', error);
    res.status(500).json({ message: error.message || 'Failed to evaluate defense' });
  }
};

const nextQuestion = async (req, res) => {
  try {
    const { quizId } = req.body;
    const attempt = await QuizAttempt.findOne({ _id: quizId, user: req.user.id });
    if (!attempt) return res.status(404).json({ message: 'Quiz attempt not found.' });

    if (attempt.currentQuestionIndex + 1 < attempt.questions.length) {
      attempt.currentQuestionIndex += 1;
      await attempt.save();
    } else if (attempt.status !== 'completed') {
      attempt.status = 'completed';
      await attempt.save();
    }

    res.json({ quiz: attempt });
  } catch (error) {
    console.error('nextQuestion Error:', error);
    res.status(500).json({ message: error.message || 'Failed to advance to next question' });
  }
};

const retryNextQuestion = async (req, res) => {
  try {
    const { quizId } = req.body;
    const attempt = await QuizAttempt.findOne({ _id: quizId, user: req.user.id });
    if (!attempt) return res.status(404).json({ message: 'Quiz attempt not found.' });

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ message: 'Quiz is already completed.' });
    }

    const currentQ = attempt.questions[attempt.currentQuestionIndex];
    if (!currentQ || currentQ.stepState !== 'evaluated') {
      return res.status(400).json({ message: 'Current question is not in evaluated state.' });
    }

    const nextIdx = attempt.currentQuestionIndex + 1;
    if (nextIdx >= attempt.totalQuestions) {
      return res.status(400).json({ message: 'No remaining questions to generate.' });
    }

    const nextPrompt = `You are the DevArena AI Coding Coach generating Question ${nextIdx + 1} of 3 on topic: "${attempt.topic}".
Generate a new, distinct conceptual question testing ${attempt.topic}.

Return ONLY a valid JSON object:
{
  "questionText": "string",
  "codeSnippet": "string (optional)"
}`;

    const nextAiRaw = await callGroqAi([{ role: 'user', content: nextPrompt }]);
    const nextParsed = parseAndValidateAiJson(nextAiRaw, ['questionText']);

    attempt.questions.push({
      questionId: `q_${nextIdx + 1}_${Date.now()}`,
      questionText: nextParsed.questionText,
      codeSnippet: nextParsed.codeSnippet || '',
      stepState: 'awaiting_initial_answer'
    });
    attempt.currentQuestionIndex = nextIdx;
    attempt.markModified('questions');
    await attempt.save();

    res.json({ quiz: attempt });
  } catch (error) {
    console.error('retryNextQuestion Error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate next question' });
  }
};

const getQuizHistory = async (req, res) => {
  try {
    const history = await QuizAttempt.find({ user: req.user.id, status: 'completed' })
      .sort({ updatedAt: -1 })
      .limit(15);

    res.json(history);
  } catch (error) {
    console.error('getQuizHistory Error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getQuizStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const attempts = await QuizAttempt.find({ user: req.user.id, status: 'completed' });

    let totalScoreSum = 0;
    let totalMasteryGainedSum = 0;
    let totalPointsEarnedSum = 0;
    let totalQuestionsCompleted = 0;
    let correctCount = 0;
    let incorrectCount = 0;

    const misconceptionsMap = {};

    attempts.forEach(att => {
      totalScoreSum += (att.score || 0);
      totalMasteryGainedSum += (att.masteryGained || 0);
      totalPointsEarnedSum += (att.pointsEarned || 0);

      att.questions.forEach(q => {
        if (q.stepState === 'evaluated') {
          totalQuestionsCompleted++;
          if ((q.evaluation?.finalScore || 0) >= 60) {
            correctCount++;
          } else {
            incorrectCount++;
          }
          if (q.evaluation?.misconceptions && Array.isArray(q.evaluation.misconceptions)) {
            q.evaluation.misconceptions.forEach(m => {
              misconceptionsMap[m] = (misconceptionsMap[m] || 0) + 1;
            });
          }
        }
      });
    });

    const averageScore = attempts.length > 0 ? Math.round(totalScoreSum / attempts.length) : 0;
    const skillMasteryObj = user.skillMastery ? Object.fromEntries(user.skillMastery) : {};

    res.json({
      totalQuizzes: attempts.length,
      averageScore,
      totalMasteryGained: Math.round(totalMasteryGainedSum),
      totalPointsEarned: totalPointsEarnedSum,
      totalQuestionsCompleted,
      correctCount,
      incorrectCount,
      skillMastery: skillMasteryObj,
      recentMisconceptions: Object.entries(misconceptionsMap).map(([text, count]) => ({ text, count }))
    });
  } catch (error) {
    console.error('getQuizStats Error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  startQuiz,
  submitAnswer,
  evaluateDefense,
  nextQuestion,
  retryNextQuestion,
  getQuizHistory,
  getQuizStats
};
