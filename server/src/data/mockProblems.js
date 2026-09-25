const mockProblems = [
  {
    id: "two-sum",
    questionId: "1",
    title: "Two Sum",
    difficulty: "Easy",
    platform: "leetcode",
    url: "https://leetcode.com/problems/two-sum/",
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]" },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" }
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists."
    ],
    functionSignature: "function twoSum(nums, target) {\n  // your code here\n}",
    javaSignature: "class Solution {\n    public static int[] twoSum(int[] nums, int target) {\n        // your code here\n        return new int[0];\n    }\n}",
    cppSignature: "vector<int> twoSum(vector<int>& nums, int target) {\n    // your code here\n    return {};\n}",
    sampleTests: [
      { input: "[ [2,7,11,15], 9 ]", expected: "[0,1]" },
      { input: "[ [3,2,4], 6 ]", expected: "[1,2]" }
    ],
    hiddenTests: [
      { input: "[ [3,3], 6 ]", expected: "[0,1]" },
      { input: "[ [-1,-2,-3,-4,-5], -8 ]", expected: "[2,4]" }
    ]
  },
  {
    id: "reverse-string",
    questionId: "344",
    title: "Reverse String",
    difficulty: "Easy",
    platform: "leetcode",
    url: "https://leetcode.com/problems/reverse-string/",
    description: `Write a function that reverses a string. The input string is given as an array of characters \`s\`.

You must do this by modifying the input array in-place with O(1) extra memory.`,
    examples: [
      { input: 's = ["h","e","l","l","o"]', output: '["o","l","l","e","h"]' },
      { input: 's = ["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]' }
    ],
    constraints: [
      "1 <= s.length <= 10^5",
      "s[i] is a printable ascii character."
    ],
    functionSignature: "function reverseString(s) {\n  // your code here\n}",
    javaSignature: "class Solution {\n    public static void reverseString(char[] s) {\n        // your code here\n    }\n}",
    cppSignature: "void reverseString(vector<char>& s) {\n    // your code here\n}",
    sampleTests: [
      { input: "[ ['h','e','l','l','o'] ]", expected: "['o','l','l','e','h']" }
    ],
    hiddenTests: [
      { input: "[ ['a'] ]", expected: "['a']" },
      { input: "[ ['a','b'] ]", expected: "['b','a']" }
    ]
  },
  {
    id: "palindrome-number",
    questionId: "9",
    title: "Palindrome Number",
    difficulty: "Easy",
    platform: "leetcode",
    url: "https://leetcode.com/problems/palindrome-number/",
    description: `Given an integer x, return true if x is a palindrome, and false otherwise.`,
    examples: [
      { input: "x = 121", output: "true" },
      { input: "x = -121", output: "false" }
    ],
    constraints: [
      "-2^31 <= x <= 2^31 - 1"
    ],
    functionSignature: "function isPalindrome(x) {\n  // your code here\n}",
    javaSignature: "class Solution {\n    public static boolean isPalindrome(int x) {\n        // your code here\n        return false;\n    }\n}",
    cppSignature: "bool isPalindrome(int x) {\n    // your code here\n    return false;\n}",
    sampleTests: [
      { input: "[ 121 ]", expected: "true" },
      { input: "[ -121 ]", expected: "false" }
    ],
    hiddenTests: [
      { input: "[ 10 ]", expected: "false" },
      { input: "[ 0 ]", expected: "true" }
    ]
  },
  {
    id: "valid-parentheses",
    questionId: "20",
    title: "Valid Parentheses",
    difficulty: "Easy",
    platform: "leetcode",
    url: "https://leetcode.com/problems/valid-parentheses/",
    description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.`,
    examples: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" }
    ],
    constraints: [
      "1 <= s.length <= 10^4"
    ],
    functionSignature: "function isValid(s) {\n  // your code here\n}",
    javaSignature: "class Solution {\n    public static boolean isValid(String s) {\n        // your code here\n        return false;\n    }\n}",
    cppSignature: "bool isValid(string s) {\n    // your code here\n    return false;\n}",
    sampleTests: [
      { input: "[ '()' ]", expected: "true" },
      { input: "[ '()[]{}' ]", expected: "true" }
    ],
    hiddenTests: [
      { input: "[ '(]' ]", expected: "false" },
      { input: "[ '{[]}' ]", expected: "true" }
    ]
  }
];

module.exports = mockProblems;
