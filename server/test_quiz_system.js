require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const User = require('./src/models/User');
const QuizAttempt = require('./src/models/QuizAttempt');
const quizController = require('./src/controllers/quizController');

async function testQuizFlow() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for testing quiz system...');

    const user = await User.findOne({ username: 'Akanksha' });
    if (!user) {
      console.error('User Akanksha not found');
      return;
    }

    const reqMockStart = {
      user: { id: user._id.toString() },
      body: { topic: 'Dynamic Programming' }
    };

    let resData = null;
    const resMockStart = {
      json: (d) => { resData = d; },
      status: (code) => ({ json: (d) => { resData = { statusCode: code, ...d }; } })
    };

    console.log('--- STEP 1: Starting Quiz ---');
    await quizController.startQuiz(reqMockStart, resMockStart);
    console.log('Start Quiz Result:', resData?.quiz ? `Quiz ID: ${resData.quiz._id}, Q1: ${resData.quiz.questions[0].questionText.substring(0, 50)}...` : resData);

    const quizId = resData?.quiz?._id;
    if (!quizId) throw new Error('Quiz start failed');

    console.log('--- STEP 2: Submitting Genuine Initial Answer ---');
    const reqMockAnswer = {
      user: { id: user._id.toString() },
      body: {
        quizId: quizId,
        answer: 'We construct a Suffix Automaton in linear time and sum up len[v] - len[link[v]] for all states to count distinct substrings.'
      }
    };
    await quizController.submitAnswer(reqMockAnswer, resMockStart);
    const q0 = resData?.quiz?.questions[0];
    console.log('Submit Answer Result:', q0 ? `stepState: ${q0.stepState}, challenge: "${q0.socraticChallenge}"` : resData);

    console.log('--- STEP 3: Submitting Weak Evasive Defense ---');
    const reqMockDefense = {
      user: { id: user._id.toString() },
      body: {
        quizId: quizId,
        defense: 'Because the formula just works and accounts for everything naturally in O(N) time.'
      }
    };
    await quizController.evaluateDefense(reqMockDefense, resMockStart);
    const evalObj = resData?.quiz?.questions[0]?.evaluation;
    console.log('Evaluate Defense Result:', evalObj);

    console.log('--- STEP 4: Fetching Quiz Stats & History ---');
    const reqMockGet = { user: { id: user._id.toString() } };
    await quizController.getQuizStats(reqMockGet, resMockStart);
    console.log('Quiz Stats:', resData);

    await quizController.getQuizHistory(reqMockGet, resMockStart);
    console.log('Quiz History count:', Array.isArray(resData) ? resData.length : 0);

  } catch (err) {
    console.error('Test Quiz Flow Exception:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testQuizFlow();
