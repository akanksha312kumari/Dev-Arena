const { executeSingleTestCase, compareOutputs } = require('./jdoodleService');
const crypto = require('crypto');

const judgingService = {
  /**
   * Executes user code against a set of test cases using JDoodle.
   */
  async executeCode(userCode, testCases, language = 'javascript', problemId = 'two-sum') {
    const requestId = crypto.randomBytes(8).toString('hex');
    
    // Validate inputs
    if (!userCode || !testCases || !Array.isArray(testCases)) {
      return {
        success: false,
        passed: 0,
        total: 0,
        output: 'Invalid submission data',
        error: true
      };
    }

    let passedCount = 0;
    const details = [];
    let combinedOutput = '';
    let globalStatus = 'accepted';

    // Loop through each test case sequentially (to avoid parallel credit exhaustion/race issues)
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      if (!tc || tc.input === undefined || tc.expected === undefined) {
        details.push({ testIndex: i, status: 'ERROR', message: 'Malformed test case' });
        continue;
      }

      // Execute single test case via JDoodle
      const res = await executeSingleTestCase(userCode, tc, language, problemId, `${requestId}_${i}`);
      
      // If we encounter a compile/provider error, we stop and report
      if (res.status === 'compile_error') {
        return {
          success: false,
          passed: 0,
          total: testCases.length,
          output: 'Compilation Error:\n' + res.output,
          error: true,
          status: 'compile_error'
        };
      }
      
      if (res.status === 'provider_error') {
        return {
          success: false,
          passed: 0,
          total: testCases.length,
          output: 'Judgement System Error:\n' + res.output,
          error: true,
          status: 'provider_error'
        };
      }

      // Compare actual vs expected
      const passed = compareOutputs(res.output, tc.expected);
      if (passed) {
        passedCount++;
        details.push({ testIndex: i, status: 'PASS' });
      } else {
        details.push({ 
          testIndex: i, 
          status: 'FAIL', 
          expected: tc.expected, 
          actual: res.output 
        });
      }

      combinedOutput += `Test ${i + 1}:\nInput: ${tc.input}\nOutput: ${res.output}\n`;
      if (!res.isExecutionSuccess) {
        globalStatus = res.status; // e.g. runtime_error, timeout
      }
    }

    return {
      success: passedCount === testCases.length,
      passed: passedCount,
      total: testCases.length,
      details,
      output: combinedOutput.trim(),
      error: passedCount !== testCases.length,
      status: passedCount === testCases.length ? 'accepted' : globalStatus
    };
  }
};

module.exports = judgingService;
