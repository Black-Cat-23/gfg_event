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

// Case D: Correct answer within 15s
const fastCorrectScore = calculateQuizQuestionScore(testQ1, 'KICKSTART', 8000, { timeWindow: 0.25, fullPointsWindow: true });
assert(fastCorrectScore === 100, 'Fast correct answer (<=15s) receives 100 points (Got: ' + fastCorrectScore + ')');

// Case E: Correct answer between 15s-30s
const medCorrectScore = calculateQuizQuestionScore(testQ1, 'kickstart', 22000, { timeWindow: 0.25, fullPointsWindow: true });
assert(medCorrectScore === 75, 'Medium speed correct answer (15s-30s) receives 75 points (Got: ' + medCorrectScore + ')');

// Case F: Correct answer between 30s-45s
const slowCorrectScore = calculateQuizQuestionScore(testQ1, '  KICKSTART  ', 38000, { timeWindow: 0.25, fullPointsWindow: true });
assert(slowCorrectScore === 50, 'Slow correct answer (30s-45s) receives 50 points (Got: ' + slowCorrectScore + ')');


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
// Expected: 5000 (cash) + 2*400 (800) + 1*380 (380) + 10*0 (0) = 6180
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
