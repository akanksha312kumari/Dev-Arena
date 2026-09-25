const { io } = require('socket.io-client');
const axios = require('axios');
const mongoose = require('mongoose');

const API_URL = 'http://127.0.0.1:5000/api';
const SOCKET_URL = 'http://127.0.0.1:5000';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runTests() {
  console.log('--- Starting Anti-Cheat Verification ---');

  const u1Name = `player1_${Date.now()}`;
  const u2Name = `player2_${Date.now()}`;
  const u3Name = `player3_${Date.now()}`;
  const p1Email = `${u1Name}@test.com`;
  const p2Email = `${u2Name}@test.com`;
  const p3Email = `${u3Name}@test.com`;
  
  let p1Token, p2Token, p3Token;
  let p1Id, p2Id, p3Id;
  let p1Socket, p2Socket, p3Socket;

  try {
    // 1. Register users
    const res1 = await axios.post(`${API_URL}/auth/register`, { username: u1Name, email: p1Email, password: 'pw' });
    const res2 = await axios.post(`${API_URL}/auth/register`, { username: u2Name, email: p2Email, password: 'pw' });
    const res3 = await axios.post(`${API_URL}/auth/register`, { username: u3Name, email: p3Email, password: 'pw' });
    const jwt = require('jsonwebtoken');
    p1Token = res1.data.token; p1Id = jwt.decode(p1Token).id || jwt.decode(p1Token)._id;
    p2Token = res2.data.token; p2Id = jwt.decode(p2Token).id || jwt.decode(p2Token)._id;
    p3Token = res3.data.token; p3Id = jwt.decode(p3Token).id || jwt.decode(p3Token)._id;

    // Connect Sockets
    const connectSocket = (token) => {
      return new Promise((resolve) => {
        const s = io(SOCKET_URL, { auth: { token } });
        s.on('connect', () => resolve(s));
      });
    };
    p1Socket = await connectSocket(p1Token);
    p2Socket = await connectSocket(p2Token);
    p3Socket = await connectSocket(p3Token);

    // Join Matchmaking
    console.log('Waiting for match...');
    let p1Match, p2Match;
    
    const waitForMatch = (socket) => new Promise(resolve => {
      socket.once('match_found', (data) => resolve(data));
    });

    p1Socket.emit('find_random_match');
    p2Socket.emit('find_random_match');

    [p1Match, p2Match] = await Promise.all([waitForMatch(p1Socket), waitForMatch(p2Socket)]);
    console.log('Match found! Duel ID:', p1Match.id);
    
    // Join Duel
    p1Socket.emit('join_duel', p1Match.id);
    p2Socket.emit('join_duel', p2Match.id);

    // Wait for start
    await new Promise(resolve => p1Socket.once('duel_started', resolve));
    console.log('Duel started active state.');

    // --- TEST 1: Deduplication (2-second cooldown) ---
    console.log('Test: Send two FULLSCREEN_EXIT events immediately');
    let warningCount = 0;
    p1Socket.on('anti_cheat_warning', () => warningCount++);
    
    p1Socket.emit('report_anti_cheat', { duelId: p1Match.id, eventType: 'FULLSCREEN_EXIT' });
    p1Socket.emit('report_anti_cheat', { duelId: p1Match.id, eventType: 'FULLSCREEN_EXIT' }); // Should be ignored by dedup
    
    await delay(500);
    if (warningCount !== 1) throw new Error(`Expected 1 warning, got ${warningCount}`);
    console.log('✅ Deduplication successful');

    // --- TEST 2: AI Detection/Suspicious Paste (Should not forfeit) ---
    console.log('Test: Send SUSPICIOUS_PASTE event');
    let signalCount = 0;
    p1Socket.on('anti_cheat_signal', () => signalCount++);
    
    await delay(2000); // clear cooldown
    p1Socket.emit('report_anti_cheat', { duelId: p1Match.id, eventType: 'SUSPICIOUS_PASTE' });
    await delay(500);
    if (signalCount !== 1) throw new Error(`Expected 1 signal, got ${signalCount}`);
    console.log('✅ AI/Paste signal logged correctly without forfeiture');

    // --- TEST 3: Outsider rejection ---
    console.log('Test: Non-participant reporting cheat on the duel');
    p3Socket.emit('report_anti_cheat', { duelId: p1Match.id, eventType: 'FULLSCREEN_EXIT' });
    await delay(500);
    if (warningCount !== 1) throw new Error('Outsider successfully reported a cheat (violation)!');
    console.log('✅ Non-participant rejection successful');

    // --- TEST 4: Threshold & Forfeiture (Total 3 violations) ---
    console.log('Test: Reaching threshold to forfeit');
    await delay(1600); // clear cooldown from AI paste (it still updates lastEventTime)
    p1Socket.emit('report_anti_cheat', { duelId: p1Match.id, eventType: 'TAB_HIDDEN' });
    
    await delay(2100); // clear cooldown
    p1Socket.emit('report_anti_cheat', { duelId: p1Match.id, eventType: 'FULLSCREEN_EXIT' });

    // This should trigger forfeiture
    const forfeitData = await new Promise((resolve) => {
      p1Socket.once('duel_forfeited', resolve);
    });

    if (forfeitData.reason !== 'Anti-Cheat Violation') throw new Error(`Wrong forfeit reason: ${forfeitData.reason}`);
    if (forfeitData.winner !== p2Id) throw new Error(`Winner is not Player 2! Got: ${forfeitData.winner}`);
    console.log('✅ Threshold hit and correct winner declared');

    await delay(1500); // Allow async DB write to finish

    // --- TEST 5: Verify Persistence ---
    console.log('Test: Checking MongoDB persistence');
    require('dotenv').config({ path: '.env', override: true });
    await mongoose.connect(process.env.MONGO_URI);
    const Duel = require('./src/models/Duel');
    const duelDoc = await Duel.findOne({ problem: { $ne: null } }).sort({ createdAt: -1 });
    
    if (duelDoc.antiCheatEvents.length !== 4) throw new Error(`Expected 4 persisted events, got ${duelDoc.antiCheatEvents.length}`);
    if (duelDoc.forfeitedBy.toString() !== p1Id) throw new Error('forfeitedBy is not set correctly');
    console.log('✅ MongoDB Persistence verified');

    console.log('\n✅ ALL ANTI-CHEAT VERIFICATIONS PASSED');
    
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.response?.data || err);
  } finally {
    if (p1Socket) p1Socket.disconnect();
    if (p2Socket) p2Socket.disconnect();
    if (p3Socket) p3Socket.disconnect();
    try {
      const User = require('./src/models/User');
      await User.deleteMany({ email: { $in: [p1Email, p2Email, p3Email] } });
      await mongoose.disconnect();
    } catch (e) {}
  }
}

runTests();
