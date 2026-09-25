const axios = require('axios');

const LANGUAGE_MAP = {
  'javascript': { language: 'nodejs', versionIndex: '5' }, // Node.js 20.9.0
  'cpp': { language: 'cpp20', versionIndex: '0' },        // GCC 15.2.1
  'java': { language: 'java', versionIndex: '5' }         // JDK 21.0.0
};

// Safe JSON parse helper
const safeParseJson = (str) => {
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    try {
      return JSON.parse(str.replace(/'/g, '"'));
    } catch (e2) {
      if (str.trim() === 'true') return true;
      if (str.trim() === 'false') return false;
      return str.trim();
    }
  }
};

const formatInputForCppJava = (problemId, jsonInputStr) => {
  const parsed = safeParseJson(jsonInputStr);
  
  if (problemId === 'two-sum') {
    // expected: [ [2,7,11,15], 9 ]
    const arr = parsed[0];
    const target = parsed[1];
    return `${arr.length}\n${arr.join(' ')}\n${target}`;
  }
  if (problemId === 'reverse-string') {
    // expected: [ ['h','e','l','l','o'] ]
    const arr = parsed[0];
    return `${arr.length}\n${arr.join(' ')}`;
  }
  if (problemId === 'palindrome-number') {
    const val = Array.isArray(parsed) ? parsed[0] : parsed;
    return `${val}`;
  }
  if (problemId === 'valid-parentheses') {
    const val = Array.isArray(parsed) ? parsed[0] : parsed;
    return `${val}`;
  }
  
  // Generic fallback
  if (Array.isArray(parsed)) {
    return parsed.map(item => Array.isArray(item) ? `${item.length}\n${item.join(' ')}` : item).join('\n');
  }
  return String(parsed);
};

const wrapJavascript = (userCode) => {
  return `
${userCode}

const fs = require('fs');
try {
  const inputData = fs.readFileSync(0, 'utf-8').trim();
  if (!inputData) {
    console.error("Empty input data");
    process.exit(1);
  }
  const args = JSON.parse(inputData);
  const fnMatch = \`${userCode.replace(/\\`/g, '\\\\`').replace(/\$/g, '\\$')}\`.match(/function\\s+([a-zA-Z0-9_]+)\\s*\\(/);
  if (!fnMatch) {
    throw new Error("No function signature found. Please write a function like 'function solve(...)'.");
  }
  const fnName = fnMatch[1];
  const actual = eval(fnName + '(...args)');
  console.log(JSON.stringify(actual));
} catch (err) {
  console.error("Runtime error: " + err.message);
  process.exit(1);
}
`;
};

const wrapCpp = (problemId, userCode) => {
  if (problemId === 'two-sum') {
    return `
#include <iostream>
#include <vector>
using namespace std;

${userCode}

int main() {
    int n;
    if (!(cin >> n)) return 1;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }
    int target;
    cin >> target;
    
    vector<int> result = twoSum(nums, target);
    cout << "[" << result[0] << "," << result[1] << "]" << endl;
    return 0;
}
`;
  }
  if (problemId === 'reverse-string') {
    return `
#include <iostream>
#include <vector>
using namespace std;

${userCode}

int main() {
    int n;
    if (!(cin >> n)) return 1;
    vector<char> s(n);
    for (int i = 0; i < n; i++) {
        cin >> s[i];
    }
    reverseString(s);
    cout << "[";
    for (int i = 0; i < n; i++) {
        cout << "\\"" << s[i] << "\\"" << (i == n - 1 ? "" : ",");
    }
    cout << "]" << endl;
    return 0;
}
`;
  }
  if (problemId === 'palindrome-number') {
    return `
#include <iostream>
using namespace std;

${userCode}

int main() {
    int x;
    if (!(cin >> x)) return 1;
    bool result = isPalindrome(x);
    cout << (result ? "true" : "false") << endl;
    return 0;
}
`;
  }
  if (problemId === 'valid-parentheses') {
    return `
#include <iostream>
#include <string>
using namespace std;

${userCode}

int main() {
    string s;
    if (!(cin >> s)) return 1;
    bool result = isValid(s);
    cout << (result ? "true" : "false") << endl;
    return 0;
}
`;
  }
  if (userCode.includes('int main')) {
    return userCode;
  }
  return userCode;
};

const wrapJava = (problemId, userCode) => {
  const cleanCode = userCode.replace(/public\s+class\s+Solution/g, 'class Solution');
  
  if (problemId === 'two-sum') {
    return `
import java.util.*;

${cleanCode}

public class SolutionRunner {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = sc.nextInt();
        }
        int target = sc.nextInt();
        int[] result = Solution.twoSum(nums, target);
        System.out.println(Arrays.toString(result).replace(" ", ""));
    }
}
`;
  }
  if (problemId === 'reverse-string') {
    return `
import java.util.*;

${cleanCode}

public class SolutionRunner {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        char[] s = new char[n];
        for (int i = 0; i < n; i++) {
            s[i] = sc.next().charAt(0);
        }
        Solution.reverseString(s);
        System.out.print("[");
        for (int i = 0; i < n; i++) {
            System.out.print("\\"" + s[i] + "\\"" + (i == n - 1 ? "" : ","));
        }
        System.out.println("]");
    }
}
`;
  }
  if (problemId === 'palindrome-number') {
    return `
import java.util.*;

${cleanCode}

public class SolutionRunner {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int x = sc.nextInt();
        boolean result = Solution.isPalindrome(x);
        System.out.println(result);
    }
}
`;
  }
  if (problemId === 'valid-parentheses') {
    return `
import java.util.*;

${cleanCode}

public class SolutionRunner {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNext()) return;
        String s = sc.next();
        boolean result = Solution.isValid(s);
        System.out.println(result);
    }
}
`;
  }
  return userCode;
};

const normalizeOutput = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim()
            .replace(/\s+/g, '')
            .toLowerCase();
};

const compareOutputs = (actual, expected) => {
  const normActual = normalizeOutput(actual);
  const normExpected = normalizeOutput(expected);
  const cleanActual = normActual.replace(/'/g, '"');
  const cleanExpected = normExpected.replace(/'/g, '"');
  return cleanActual === cleanExpected;
};

const executeSingleTestCase = async (userCode, testCase, language, problemId, requestId) => {
  const clientConfig = LANGUAGE_MAP[language];
  if (!clientConfig) {
    return {
      status: 'provider_error',
      output: 'Unsupported language requested',
      error: 'Unsupported language: ' + language,
      isExecutionSuccess: false
    };
  }

  // Format script and stdin based on language
  let script = '';
  let stdin = '';
  
  if (language === 'javascript') {
    script = wrapJavascript(userCode);
    stdin = testCase.input;
  } else if (language === 'cpp') {
    script = wrapCpp(problemId, userCode);
    stdin = formatInputForCppJava(problemId, testCase.input);
  } else if (language === 'java') {
    script = wrapJava(problemId, userCode);
    stdin = formatInputForCppJava(problemId, testCase.input);
  }

  // Enforce credentials checks
  const clientId = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;
  const apiURL = process.env.JDOODLE_API_URL || 'https://api.jdoodle.com/v1/execute';
  
  try {
    const parsedUrl = new URL(apiURL);
    if (parsedUrl.hostname !== 'api.jdoodle.com') {
      return {
        status: 'provider_error',
        output: 'Invalid JDoodle API configuration',
        error: 'Host must be api.jdoodle.com',
        isExecutionSuccess: false,
        requestId
      };
    }
  } catch (e) {
    return {
      status: 'provider_error',
      output: 'Invalid JDoodle API URL',
      error: 'Malformed URL',
      isExecutionSuccess: false,
      requestId
    };
  }
  
  if (!clientId || !clientSecret || clientId === 'replace_me' || clientSecret === 'replace_me') {
    console.warn(`[JDoodle WARNING] Missing credentials for requestId: ${requestId}`);
    return {
      status: 'provider_error',
      output: 'Code judge configuration error. Please contact admin.',
      error: 'JDoodle credentials not set in server env.',
      isExecutionSuccess: false,
      requestId
    };
  }

  try {
    // Post to JDoodle with an 8 second timeout
    const response = await axios.post(apiURL, {
      clientId,
      clientSecret,
      script,
      stdin,
      language: clientConfig.language,
      versionIndex: clientConfig.versionIndex,
      compileOnly: false
    }, {
      timeout: 8000
    });

    const body = response.data;

    // Handle provider-level error fields
    if (body.error) {
      const errLower = body.error.toLowerCase();
      if (errLower.includes('compile') || errLower.includes('syntax')) {
        return {
          status: 'compile_error',
          output: body.output || body.error,
          error: body.error,
          isExecutionSuccess: false,
          cpuTime: body.cpuTime || null,
          memory: body.memory || null,
          requestId
        };
      }
      return {
        status: 'runtime_error',
        output: body.output || body.error,
        error: body.error,
        isExecutionSuccess: false,
        cpuTime: body.cpuTime || null,
        memory: body.memory || null,
        requestId
      };
    }

    // Capture standard response format
    const output = body.output || '';
    
    // Check if the exit code was nonzero or output suggests runtime/compile error
    let isSuccess = body.statusCode === 200 || body.statusCode === 0;

    const lowerOutput = output.toLowerCase();
    if (isSuccess && (lowerOutput.includes('compile error') || lowerOutput.includes('syntaxerror') || lowerOutput.includes('exception in thread'))) {
      isSuccess = false;
    }

    let status = 'accepted';
    if (!isSuccess) {
      status = (lowerOutput.includes('compile') || lowerOutput.includes('syntax')) ? 'compile_error' : 'runtime_error';
    }

    // Enforce capped output to prevent unbounded data reflection
    const cappedOutput = output.length > 5000 ? output.substring(0, 5000) + '\n[Truncated...]' : output;

    return {
      status,
      output: cappedOutput,
      error: null,
      isExecutionSuccess: isSuccess,
      cpuTime: body.cpuTime || null,
      memory: body.memory || null,
      requestId
    };
  } catch (error) {
    console.error(`[JDoodle Error] requestId: ${requestId}, error: ${error.message}`);
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        status: 'timeout',
        output: 'Execution timed out (Max 8 seconds).',
        error: 'Timeout',
        isExecutionSuccess: false,
        requestId
      };
    }

    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        return {
          status: 'provider_error',
          output: 'Judgement system credentials unauthorized.',
          error: 'Unauthorized (401)',
          isExecutionSuccess: false,
          requestId
        };
      }
      if (status === 429) {
        return {
          status: 'provider_error',
          output: 'Too many concurrent code judging requests. Please retry.',
          error: 'Rate Limit (429)',
          isExecutionSuccess: false,
          requestId
        };
      }
      return {
        status: 'provider_error',
        output: `Judgement service returned HTTP ${status}.`,
        error: `HTTP Error: ${status}`,
        isExecutionSuccess: false,
        requestId
      };
    }

    return {
      status: 'provider_error',
      output: 'Judgement service unavailable.',
      error: error.message,
      isExecutionSuccess: false,
      requestId
    };
  }
};

module.exports = {
  LANGUAGE_MAP,
  compareOutputs,
  executeSingleTestCase
};
