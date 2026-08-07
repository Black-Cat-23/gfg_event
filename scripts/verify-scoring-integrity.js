import { calculateQuizQuestionScore } from '../packages/activities/dist/quiz/scoring.js';
import { calculatePortfolioValue } from '../packages/activities/dist/market/scoring.js';

console.log('----------------------------------------------------');
console.log('🔍 SCORING INTEGRITY & MATHEMATICAL FAIRNESS AUDIT');
console.log('----------------------------------------------------\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failCount++;
  }
}

// 1. QUIZ SCORING INTEGRITY AUDIT
console.log('--- 1. Quiz Question Scoring Audit ---');

const testQ1 = {
  id: 'q1',
  text: 'Decode Morse Code',
  correctAnswer: 'KICKSTART',
  timerSeconds: 45,
  points: 100
};

// Case A: Wrong answer submitted
const wrongScore = calculateQuizQuestionScore(testQ1, 'WRONG_ANSWER', 5000, { timeWindow: 0.25, fullPointsWindow: true });
assert(wrongScore === 0, 'Wrong answer receives strictly 0 points (Got: ' + wrongScore + ')');

// Case B: Empty string / whitespace submitted
const emptyScore = calculateQuizQuestionScore(testQ1, '   ', 5000, { timeWindow: 0.25, fullPointsWindow: true });
assert(emptyScore === 0, 'Empty string receives strictly 0 points (Got: ' + emptyScore + ')');

// Case C: Null / Undefined submitted (No answer)
const noAnswerScore = calculateQuizQuestionScore(testQ1, undefined, 5000, { timeWindow: 0.25, fullPointsWindow: true });
assert(noAnswerScore === 0, 'Unanswered question receives strictly 0 points (Got: ' + noAnswerScore + ')');

// Case D: Answered with 45s-30s left on timer (0s-15s elapsed) -> 100 pts
const tier1Score = calculateQuizQuestionScore(testQ1, 'KICKSTART', 8000, { timeWindow: 0.25, fullPointsWindow: true });
assert(tier1Score === 100, 'Answered with 45s-30s left (8s elapsed) receives 100 points (Got: ' + tier1Score + ')');

// Case E: Answered with 30s-20s left on timer (15s-25s elapsed) -> 75 pts
const tier2Score = calculateQuizQuestionScore(testQ1, 'kickstart', 20000, { timeWindow: 0.25, fullPointsWindow: true });
assert(tier2Score === 75, 'Answered with 30s-20s left (20s elapsed) receives 75 points (Got: ' + tier2Score + ')');

// Case F: Answered with 20s-10s left on timer (25s-35s elapsed) -> 50 pts
const tier3Score = calculateQuizQuestionScore(testQ1, '  KICKSTART  ', 30000, { timeWindow: 0.25, fullPointsWindow: true });
assert(tier3Score === 50, 'Answered with 20s-10s left (30s elapsed) receives 50 points (Got: ' + tier3Score + ')');

// Case G: Answered with < 10s left on timer (>35s elapsed) -> 25 pts
const tier4Score = calculateQuizQuestionScore(testQ1, 'KICKSTART', 40000, { timeWindow: 0.25, fullPointsWindow: true });
assert(tier4Score === 25, 'Answered with <10s left (40s elapsed) receives 25 points (Got: ' + tier4Score + ')');


// 2. MARKETMAYHEM PORTFOLIO & BANKRUPT SCORING AUDIT
console.log('\n--- 2. MarketMayhem Portfolio Valuation Audit ---');

const companies = [
  { id: 'c1', name: 'TechHub', initialPrice: 400 },
  { id: 'c2', name: 'GoldCraft', initialPrice: 380 },
  { id: 'c3', name: 'SteelWorks', initialPrice: 360 },
  { id: 'c5', name: 'GameZone', initialPrice: 320 }
];

const prices = {
  TechHub: 400,
  GoldCraft: 380,
  SteelWorks: 360,
  GameZone: 0 // Bankrupt stock
};

const holdings = {
  TechHub: 2,
  GoldCraft: 1,
  SteelWorks: 0,
  GameZone: 10 // Owned bankrupt shares
};

const cash = 5000;
const totalVal = calculatePortfolioValue(cash, holdings, companies, prices);
assert(totalVal === 6180, 'Portfolio Valuation correctly values bankrupt stock at 0 (Expected: 6180, Got: ' + totalVal + ')');

console.log('\n----------------------------------------------------');
if (failCount === 0) {
  console.log(`🎉 ALL ${passCount} SCORING INTEGRITY CHECKS PASSED 100% CLEANLY!`);
  console.log('No fake points, no illegal rewards, 100% mathematical precision.');
  process.exit(0);
} else {
  console.error(`❌ ${failCount} CHECKS FAILED!`);
  process.exit(1);
}
