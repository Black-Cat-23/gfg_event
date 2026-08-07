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
    // Tiered time-decay scoring for 45s questions:
    // 0s - 15s: Full points (100% = 100 pts)
    // 15s - 30s: 75% points (75 pts)
    // 30s - 45s: 50% points (50 pts)
    const responseTimeSecs = responseTimeMs / 1000;
    const maxPoints = question.points || 100;
    if (responseTimeSecs <= 15) {
        return maxPoints;
    }
    else if (responseTimeSecs <= 30) {
        return Math.round(maxPoints * 0.75);
    }
    else {
        return Math.round(maxPoints * 0.50);
    }
}
