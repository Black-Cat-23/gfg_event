export function calculateQuizQuestionScore(question, submissionAnswer, responseTimeMs, scoringConfig) {
    if (submissionAnswer === undefined || submissionAnswer === null) {
        return 0;
    }
    let isCorrect = false;
    if (typeof submissionAnswer === 'number') {
        if (question.correct !== undefined) {
            isCorrect = submissionAnswer === question.correct;
        }
        else if (question.correctAnswer !== undefined && question.options) {
            const selectedText = question.options[submissionAnswer];
            if (selectedText) {
                const normSelected = selectedText.trim().toLowerCase();
                const acceptable = question.correctAnswer.split(/[,|]/).map(a => a.trim().toLowerCase());
                isCorrect = acceptable.includes(normSelected);
            }
        }
    }
    else if (typeof submissionAnswer === 'string') {
        if (question.correctAnswer !== undefined) {
            const normSubmitted = submissionAnswer.trim().toLowerCase();
            const acceptable = question.correctAnswer.split(/[,|]/).map(a => a.trim().toLowerCase());
            isCorrect = acceptable.includes(normSubmitted);
        }
    }
    if (!isCorrect) {
        return 0;
    }
    // Dynamic Tiered Time-Decay Scoring based on Remaining Timer Seconds:
    // For standard 45s timer:
    // - 45s to 30s remaining (0s-15s elapsed): Full points 100% (100 pts)
    // - 30s to 20s remaining (15s-25s elapsed): 75% points (75 pts)
    // - 20s to 10s remaining (25s-35s elapsed): 50% points (50 pts)
    // - Less than 10s remaining (>35s elapsed): 25% points (25 pts)
    const totalSecs = question.timerSeconds || 45;
    const responseTimeSecs = Math.max(0, responseTimeMs / 1000);
    const remainingSecs = Math.max(0, totalSecs - responseTimeSecs);
    const maxPoints = question.points || 100;
    const scale = totalSecs / 45;
    const t30 = 30 * scale;
    const t20 = 20 * scale;
    const t10 = 10 * scale;
    if (remainingSecs >= t30) {
        return maxPoints;
    }
    else if (remainingSecs >= t20) {
        return Math.round(maxPoints * 0.75);
    }
    else if (remainingSecs >= t10) {
        return Math.round(maxPoints * 0.50);
    }
    else {
        return Math.round(maxPoints * 0.25);
    }
}
