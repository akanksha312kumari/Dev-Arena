const assert = require('assert');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Set environment variables for tests
process.env.JWT_SECRET = 'test_secret';
process.env.JDOODLE_CLIENT_ID = 'test_client_id';
process.env.JDOODLE_CLIENT_SECRET = 'test_client_secret';
process.env.JDOODLE_API_URL = 'https://api.jdoodle.com/v1/execute';

// Mock mongoose models
const User = require('./src/models/User');
const Problem = require('./src/models/Problem');
const Duel = require('./src/models/Duel');

const testUser = {
  _id: 'user_123',
  username: 'test_coder',
  xp: 100,
  solvedPotds: [],
  stats: {
    globalRating: 1200,
    dailyStreak: 3,
    problemsSolved: { easy: 2, medium: 1, hard: 0 },
    duels: { total: 2, wins: 1, losses: 1 }
  },
  badges: ['Novice'],
  recentSubmissions: [],
  toJSON: function() { return this; },
  markModified: () => {},
  save: async function() { return this; }
};

const testProblem = {
  _id: 'prob_456',
  id: 'two-sum',
  title: 'Two Sum',
  difficulty: 'Easy',
  platform: 'leetcode',
  sampleTests: [{ input: '[[2,7,11,15],9]', expected: '[0,1]' }],
  hiddenTests: [{ input: '[[3,3],6]', expected: '[0,1]' }]
};

const mockActiveDuels = new Map();
const connectedUsers = new Map();

// Save original DB methods
const originalUserFindById = User.findById;
const originalProblemFindById = Problem.findById;
const originalDuelCreate = Duel.create;

// Override DB methods with mocks
User.findById = (id) => ({
  exec: async () => testUser,
  then: (cb) => Promise.resolve(cb(testUser)),
  ...testUser
});
Problem.findById = (id) => ({
  exec: async () => testProblem,
  then: (cb) => Promise.resolve(cb(testProblem))
});
Duel.create = async (data) => data;

// Setup custom mock for axios.post
let mockPostResponse = null;
let mockPostError = null;
axios.post = async (url, data, config) => {
  if (mockPostError) throw mockPostError;
  return mockPostResponse;
};

// Import duelHandler socket initiator
const initDuelHandler = require('./src/socket/duelHandler');
const judgingService = require('./src/services/judgingService');
const { solvePOTD } = require('./src/controllers/problemController');

// Test suite framework
const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

// Helpers
function createMockSocket(userId) {
  const emits = {};
  return {
    id: 'socket_xyz',
    userId: userId,
    emit: (event, payload) => {
      emits[event] = payload;
    },
    join: () => {},
    getEmits: () => emits
  };
}

const mockIo = {
  to: () => ({
    emit: () => {}
  })
};

// ==========================================
// TEST DEFINITIONS (1 to 16)
// ==========================================

// 1. Successful sample execution
addTest('1. Successful sample execution', async () => {
  mockPostResponse = {
    data: {
      output: '[0,1]',
      statusCode: 200,
      cpuTime: '0.01',
      memory: '2000'
    }
  };
  mockPostError = null;

  const result = await judgingService.executeCode('function twoSum() {}', testProblem.sampleTests, 'javascript', 'two-sum');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.passed, 1);
  assert.strictEqual(result.status, 'accepted');
});

// 2. Successful hidden-test execution
addTest('2. Successful hidden-test execution', async () => {
  mockPostResponse = {
    data: {
      output: '[0,1]',
      statusCode: 200,
      cpuTime: '0.01',
      memory: '2000'
    }
  };
  mockPostError = null;

  const result = await judgingService.executeCode('function twoSum() {}', testProblem.hiddenTests, 'javascript', 'two-sum');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.passed, 1);
  assert.strictEqual(result.status, 'accepted');
});

// 3. Compile error
addTest('3. Compile error', async () => {
  mockPostResponse = {
    data: {
      error: 'SyntaxError: Unexpected token',
      statusCode: 400
    }
  };
  mockPostError = null;

  const result = await judgingService.executeCode('const a =', testProblem.sampleTests, 'javascript', 'two-sum');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'compile_error');
});

// 4. Runtime error
addTest('4. Runtime error', async () => {
  mockPostResponse = {
    data: {
      output: 'TypeError: undefined is not a function',
      statusCode: 500,
      error: 'Runtime Error'
    }
  };
  mockPostError = null;

  const result = await judgingService.executeCode('foo()', testProblem.sampleTests, 'javascript', 'two-sum');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'runtime_error');
});

// 5. Provider 401
addTest('5. Provider 401 response', async () => {
  mockPostResponse = null;
  mockPostError = {
    message: 'Request failed with status code 401',
    response: { status: 401 }
  };

  const result = await judgingService.executeCode('function twoSum() {}', testProblem.sampleTests, 'javascript', 'two-sum');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'provider_error');
  assert.ok(result.output.includes('unauthorized'));
});

// 6. Provider 429
addTest('6. Provider 429 rate limit response', async () => {
  mockPostResponse = null;
  mockPostError = {
    message: 'Request failed with status code 429',
    response: { status: 429 }
  };

  const result = await judgingService.executeCode('function twoSum() {}', testProblem.sampleTests, 'javascript', 'two-sum');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'provider_error');
  assert.ok(result.output.includes('concurrent'));
});

// 7. Provider 5xx / Network failure
addTest('7. Provider 5xx or network failure', async () => {
  mockPostResponse = null;
  mockPostError = {
    message: 'Network Error'
  };

  const result = await judgingService.executeCode('function twoSum() {}', testProblem.sampleTests, 'javascript', 'two-sum');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'provider_error');
  assert.ok(result.output.includes('service unavailable'));
});

// 8. Malformed provider response
addTest('8. Malformed provider response', async () => {
  mockPostResponse = {
    data: {} // No statusCode or output
  };
  mockPostError = null;

  const result = await judgingService.executeCode('function twoSum() {}', testProblem.sampleTests, 'javascript', 'two-sum');
  // It handles it safely by checking statusCode === 200 (which is false if undefined)
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'runtime_error');
});

// 9. Oversized source rejection
addTest('9. Oversized source rejection', async () => {
  const socket = createMockSocket('user_123');
  const handlers = {};
  
  mockActiveDuels.set('duel_abc', {
    id: 'duel_abc',
    status: 'active',
    players: [{ id: 'user_123', status: 'Ready', maxPassed: 0 }],
    problem: testProblem
  });

  const customSocket = {
    id: 'socket_xyz',
    userId: 'user_123',
    on: (evt, cb) => { handlers[evt] = cb; },
    emit: socket.emit,
    join: () => {}
  };

  initDuelHandler(mockIo, customSocket, connectedUsers);

  // Large code payload
  const oversizedCode = 'a'.repeat(60000);
  await handlers['run_code']({ duelId: 'duel_abc', code: oversizedCode, language: 'javascript' });
  
  const emits = socket.getEmits();
  assert.ok(emits['run_code_result']);
  assert.strictEqual(emits['run_code_result'].error, true);
  assert.ok(emits['run_code_result'].output.includes('exceeds maximum length'));
});

// 10. Unsupported language rejection
addTest('10. Unsupported language rejection', async () => {
  const socket = createMockSocket('user_123');
  const handlers = {};
  
  mockActiveDuels.set('duel_abc', {
    id: 'duel_abc',
    status: 'active',
    players: [{ id: 'user_123', status: 'Ready', maxPassed: 0 }],
    problem: testProblem
  });

  const customSocket = {
    id: 'socket_xyz',
    userId: 'user_123',
    on: (evt, cb) => { handlers[evt] = cb; },
    emit: socket.emit,
    join: () => {}
  };

  initDuelHandler(mockIo, customSocket, connectedUsers);

  await handlers['run_code']({ duelId: 'duel_abc', code: 'print("hi")', language: 'python3' });
  
  const emits = socket.getEmits();
  assert.ok(emits['run_code_result']);
  assert.strictEqual(emits['run_code_result'].error, true);
  assert.ok(emits['run_code_result'].output.includes('Unsupported language'));
});

// 11. Unauthorized socket submission
addTest('11. Unauthorized socket submission', async () => {
  const socket = createMockSocket(null); // Unauthenticated
  const handlers = {};
  
  const customSocket = {
    id: 'socket_xyz',
    userId: null,
    on: (evt, cb) => { handlers[evt] = cb; },
    emit: socket.emit,
    join: () => {}
  };

  initDuelHandler(mockIo, customSocket, connectedUsers);

  await handlers['run_code']({ duelId: 'duel_abc', code: 'console.log()', language: 'javascript' });
  
  const emits = socket.getEmits();
  assert.ok(emits['run_code_result']);
  assert.strictEqual(emits['run_code_result'].error, true);
  assert.ok(emits['run_code_result'].output.includes('Unauthorized'));
});

// 12. Non-participant attempting to submit to a duel
addTest('12. Non-participant submission check', async () => {
  const socket = createMockSocket('stranger_id');
  const handlers = {};

  mockActiveDuels.set('duel_abc', {
    id: 'duel_abc',
    status: 'active',
    players: [{ id: 'user_123', status: 'Ready', maxPassed: 0 }],
    problem: testProblem
  });

  const customSocket = {
    id: 'socket_xyz',
    userId: 'stranger_id',
    on: (evt, cb) => { handlers[evt] = cb; },
    emit: socket.emit,
    join: () => {}
  };

  initDuelHandler(mockIo, customSocket, connectedUsers);

  await handlers['run_code']({ duelId: 'duel_abc', code: 'console.log()', language: 'javascript' });
  
  const emits = socket.getEmits();
  assert.ok(emits['run_code_result']);
  assert.strictEqual(emits['run_code_result'].error, true);
  assert.ok(emits['run_code_result'].output.includes('Access denied'));
});

// 13. Duplicate final submission does not award twice
addTest('13. Duplicate final submission guard', async () => {
  const socket = createMockSocket('user_123');
  const handlers = {};

  mockActiveDuels.set('duel_abc', {
    id: 'duel_abc',
    status: 'active',
    players: [{ id: 'user_123', status: 'Ready', maxPassed: 0 }],
    problem: testProblem
  });

  const customSocket = {
    id: 'socket_xyz',
    userId: 'user_123',
    on: (evt, cb) => { handlers[evt] = cb; },
    emit: socket.emit,
    join: () => {}
  };

  initDuelHandler(mockIo, customSocket, connectedUsers);

  mockPostResponse = {
    data: {
      output: '[0,1]',
      statusCode: 200
    }
  };
  mockPostError = null;

  // Run first submission
  const p1 = handlers['verify_submission']({ duelId: 'duel_abc', code: 'function twoSum() {}', language: 'javascript' });
  
  // Run concurrent second submission
  const p2 = handlers['verify_submission']({ duelId: 'duel_abc', code: 'function twoSum() {}', language: 'javascript' });

  await Promise.all([p1, p2]);
  
  const emits = socket.getEmits();
  // Second submission should fail with 'Evaluation in progress' or similar
  assert.ok(emits['submission_failed']);
  assert.strictEqual(emits['submission_failed'].message, 'Evaluation in progress for this duel. Please wait.');
});

// 14. Client-supplied winner/pass count is ignored
addTest('14. Client-supplied winner/pass count is ignored', async () => {
  const socket = createMockSocket('user_123');
  const handlers = {};

  mockActiveDuels.set('duel_abc', {
    id: 'duel_abc',
    status: 'active',
    players: [{ id: 'user_123', status: 'Ready', maxPassed: 0 }],
    problem: testProblem
  });

  const customSocket = {
    id: 'socket_xyz',
    userId: 'user_123',
    on: (evt, cb) => { handlers[evt] = cb; },
    emit: socket.emit,
    join: () => {}
  };

  initDuelHandler(mockIo, customSocket, connectedUsers);

  mockPostResponse = {
    data: {
      output: 'wrong output', // Expect failure
      statusCode: 200
    }
  };
  mockPostError = null;

  // We send a client-supplied win or state but the server relies on executeCode output
  await handlers['verify_submission']({ 
    duelId: 'duel_abc', 
    code: 'function twoSum() {}', 
    language: 'javascript',
    winner: 'user_123', // Injecting cheat winner
    passedCount: 10 // Injecting fake pass count
  });
  
  const emits = socket.getEmits();
  // Server-side check failed, so the event emitted is submission_failed
  assert.ok(emits['submission_failed']);
  assert.ok(!emits['duel_finished']); // Did not finish since code verification failed
});

// 15. Secret values do not appear in logs or response bodies
addTest('15. Secrets not exposed in responses', async () => {
  mockPostResponse = null;
  mockPostError = {
    message: 'Request failed with 401 Unauthorized',
    response: { status: 401 }
  };

  const result = await judgingService.executeCode('function twoSum() {}', testProblem.sampleTests, 'javascript', 'two-sum');
  
  // Inspect result fields
  const bodyString = JSON.stringify(result);
  
  // Secrets should not be present in output or errors
  assert.ok(!bodyString.includes('test_client_secret'));
  assert.ok(!bodyString.includes('test_client_id'));
});

// 16. No local child-process execution is used by production judging code
addTest('16. Verify no local child_process calls are imported or used in judging service', async () => {
  const fs = require('fs');
  const path = require('path');
  const serviceCode = fs.readFileSync(path.join(__dirname, './src/services/judgingService.js'), 'utf-8');
  const helperCode = fs.readFileSync(path.join(__dirname, './src/services/jdoodleService.js'), 'utf-8');
  
  assert.ok(!serviceCode.includes('child_process'));
  assert.ok(!serviceCode.includes('exec('));
  assert.ok(!serviceCode.includes('spawn('));
  assert.ok(!serviceCode.includes('eval('));
  assert.ok(!serviceCode.includes('new Function('));
  
  assert.ok(!helperCode.includes('child_process'));
  assert.ok(!helperCode.includes('exec('));
  assert.ok(!helperCode.includes('spawn('));
});

// 17. Java execution and compile errors
addTest('17. Java compile error reports failure', async () => {
  mockPostResponse = {
    data: {
      error: 'Solution.java:2: compile error: reached end of file while parsing',
      statusCode: 400
    }
  };
  mockPostError = null;

  const result = await judgingService.executeCode('class Solution {', testProblem.sampleTests, 'java', 'two-sum');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'compile_error');
});

// 18. C++ execution and compile errors
addTest('18. C++ compile error reports failure', async () => {
  mockPostResponse = {
    data: {
      error: 'syntax error: expected ‘}’ at end of input',
      statusCode: 400
    }
  };
  mockPostError = null;

  const result = await judgingService.executeCode('int main() {', testProblem.sampleTests, 'cpp', 'two-sum');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'compile_error');
});

// 19. Provider timeout
addTest('19. Provider timeout reports failure', async () => {
  mockPostResponse = null;
  mockPostError = {
    code: 'ECONNABORTED',
    message: 'timeout of 8000ms exceeded'
  };

  const result = await judgingService.executeCode('while(true){}', testProblem.sampleTests, 'cpp', 'two-sum');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'timeout');
});

// 20. Unsupported MongoDB ObjectId fails closed
addTest('20. Unsupported judge key fails closed', async () => {
  const socket = createMockSocket('user_999');
  const handlers = {};
  
  mockActiveDuels.set('duel_unsupported', {
    id: 'duel_unsupported',
    status: 'active',
    players: [{ id: 'user_999', status: 'Ready', maxPassed: 0 }],
    problem: { ...testProblem, id: '65b4c4f3e4b0', questionId: undefined }
  });

  const customSocket = {
    id: 'socket_xyz',
    userId: 'user_999',
    on: (evt, cb) => { handlers[evt] = cb; },
    emit: socket.emit,
    join: () => {}
  };

  initDuelHandler(mockIo, customSocket, connectedUsers);

  await handlers['run_code']({ duelId: 'duel_unsupported', code: 'console.log()', language: 'javascript' });
  
  const emits = socket.getEmits();
  assert.ok(emits['run_code_result']);
  assert.strictEqual(emits['run_code_result'].error, true);
  assert.ok(emits['run_code_result'].output.includes('Provider configuration error'));
});

// 21. Java Sample Execution
addTest('21. Java Sample Execution', async () => {
  mockPostResponse = {
    data: {
      output: '[0,1]',
      statusCode: 200,
      cpuTime: '0.01',
      memory: '2000'
    }
  };
  mockPostError = null;

  const result = await judgingService.executeCode('class Solution { public static int[] twoSum(int[] nums, int target) { return new int[]{0,1}; } }', testProblem.sampleTests, 'java', 'two-sum');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.passed, 1);
});

// 22. C++ Sample Execution
addTest('22. C++ Sample Execution', async () => {
  mockPostResponse = {
    data: {
      output: '[0,1]',
      statusCode: 200,
      cpuTime: '0.01',
      memory: '2000'
    }
  };
  mockPostError = null;

  const result = await judgingService.executeCode('vector<int> twoSum(vector<int>& nums, int target) { return {0,1}; }', testProblem.sampleTests, 'cpp', 'two-sum');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.passed, 1);
});

// 23. HTTP-success but execution-failed
addTest('23. HTTP-success but execution-failed response fails safely', async () => {
  mockPostResponse = {
    data: {
      output: 'Exception in thread "main" java.lang.NullPointerException',
      statusCode: 200, // Provider returns 200 HTTP for successful request, but code crashed
      cpuTime: '0.01',
      memory: '2000'
    }
  };
  mockPostError = null;

  const result = await judgingService.executeCode('class Solution {}', testProblem.sampleTests, 'java', 'two-sum');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'runtime_error');
});

// 24. JDoodle endpoint allowlist rejects unsafe hosts
addTest('24. JDoodle endpoint allowlist rejects unsafe hosts', async () => {
  const originalApi = process.env.JDOODLE_API_URL;
  process.env.JDOODLE_API_URL = 'https://evil-hacker-site.com/execute';
  
  mockPostResponse = null;
  mockPostError = null;

  const result = await judgingService.executeCode('function twoSum() {}', testProblem.sampleTests, 'javascript', 'two-sum');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'provider_error');
  assert.ok(result.output.includes('Invalid JDoodle API configuration'));
  
  // Restore
  process.env.JDOODLE_API_URL = originalApi;
});

// ==========================================
// TEST EXECUTION RUNNER
// ==========================================
async function runAll() {
  console.log('=== Starting JDoodle Integration Tests ===\n');
  let passCount = 0;
  
  // Override activeDuels map inside duelHandler.js mock import
  // To inject our map so we can control duel states during tests,
  // let's override Map constructor or mock it.
  // Wait, let's see how activeDuels is defined in duelHandler.js.
  // It is const activeDuels = new Map() at the module scope.
  // We can modify the map contents directly by importing the module,
  // but wait, is the Map accessible? No, but we can hook into it
  // because Javascript maps are reference-based, and we can stub Map.prototype.set and Map.prototype.get!
  
  const originalGet = Map.prototype.get;
  const originalHas = Map.prototype.has;
  const originalDelete = Map.prototype.delete;
  
  Map.prototype.get = function(key) {
    if (originalHas.call(mockActiveDuels, key)) return originalGet.call(mockActiveDuels, key);
    return originalGet.call(this, key);
  };
  Map.prototype.has = function(key) {
    if (originalHas.call(mockActiveDuels, key)) return true;
    return originalHas.call(this, key);
  };
  Map.prototype.delete = function(key) {
    if (originalHas.call(mockActiveDuels, key)) return originalDelete.call(mockActiveDuels, key);
    return originalDelete.call(this, key);
  };

  for (const t of tests) {
    try {
      await t.fn();
      console.log(`[PASS] ${t.name}`);
      passCount++;
    } catch (err) {
      console.error(`[FAIL] ${t.name}`);
      console.error(err);
    }
  }

  // Restore Map methods
  Map.prototype.get = originalGet;
  Map.prototype.has = originalHas;
  Map.prototype.delete = originalDelete;

  console.log(`\n=== Results: Passed ${passCount}/${tests.length} tests ===`);
  if (passCount !== tests.length) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll().catch(e => {
  console.error(e);
  process.exit(1);
});
