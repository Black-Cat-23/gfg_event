"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizActivityEngine = void 0;
const repository_1 = require("../../db/repository");
const TimerService_1 = require("../../engine/TimerService");
const activities_1 = require("@recruitquest/activities");
class QuizActivityEngine {
    activity;
    config;
    io;
    currentQuestionIndex = 0;
    lockedAnswers = new Map(); // key: `${qIndex}_${teamId}`
    previousRanks = new Map(); // key: teamId, value: rank
    constructor(activity, io) {
        this.activity = activity;
        this.config = activity.config;
        this.io = io;
    }
    async onStart() {
        this.currentQuestionIndex = 0;
        this.lockedAnswers.clear();
        this.previousRanks.clear();
        await this.sendQuestion(this.currentQuestionIndex);
    }
    async sendQuestion(index) {
        const questions = this.config.questions;
        if (index >= questions.length) {
            await this.onQuizFinished();
            return;
        }
        this.currentQuestionIndex = index;
        const q = questions[index];
        const timerSecs = q.timerSeconds || 30;
        const deadlineEpoch = TimerService_1.timerService.startTimer(this.activity.id, timerSecs, () => this.handleQuestionTimeout(index));
        const deadlineISO = new Date(deadlineEpoch).toISOString();
        const questionsPayload = {
            index: index,
            questionNumber: index + 1,
            total: questions.length,
            question: {
                text: q.text,
                options: q.options,
                timerSeconds: timerSecs,
                points: q.points || 100,
                imageUrl: q.imageUrl,
                revealImageUrl: q.revealImageUrl
            },
            deadline: deadlineISO
        };
        this.io.emit('quiz:question', questionsPayload);
        const teams = await repository_1.repo.listTeams(this.activity.eventId);
        for (const team of teams) {
            const locked = this.lockedAnswers.get(`${index}_${team.id}`);
            this.io.to(`team:${team.id}`).emit('quiz:question', {
                ...questionsPayload,
                lockedAnswer: locked
            });
        }
    }
    sendQuestionToSocket(socket) {
        const questions = this.config.questions;
        const q = questions[this.currentQuestionIndex];
        if (!q)
            return;
        const remainingMs = TimerService_1.timerService.getRemainingMs(this.activity.id);
        const deadlineISO = new Date(Date.now() + remainingMs).toISOString();
        socket.emit('quiz:question', {
            index: this.currentQuestionIndex,
            questionNumber: this.currentQuestionIndex + 1,
            total: questions.length,
            question: {
                text: q.text,
                options: q.options,
                timerSeconds: q.timerSeconds || 30,
                points: q.points || 100,
                imageUrl: q.imageUrl,
                revealImageUrl: q.revealImageUrl
            },
            deadline: deadlineISO
        });
    }
    async onSubmit(teamId, payload) {
        const answer = payload.answer ?? payload.selectedOption ?? payload.textAnswer;
        if (answer === undefined) {
            return { success: false, error: 'Answer payload required' };
        }
        const normalizedIdx = this.currentQuestionIndex;
        const key = `${normalizedIdx}_${teamId}`;
        this.lockedAnswers.set(key, answer);
        this.io.to(`team:${teamId}`).emit('quiz:locked', {
            index: normalizedIdx,
            answer
        });
        const currentSub = await repository_1.repo.getSubmission(this.activity.id, teamId);
        let answers = {};
        if (currentSub) {
            answers = currentSub.payload.answers || {};
        }
        const subData = {
            answer,
            responseTimeMs: payload.responseTimeMs || 1000,
            submittedAt: new Date().toISOString()
        };
        // STRICTLY Key by exact 0-indexed question index
        answers[normalizedIdx] = subData;
        const sub = {
            id: `sub_${this.activity.id}_${teamId}`,
            activityId: this.activity.id,
            teamId,
            payload: { answers },
            submittedAt: new Date().toISOString()
        };
        await repository_1.repo.saveSubmission(sub);
        return { success: true };
    }
    async handleQuestionTimeout(index) {
        await this.closeQuestionAndAdvance(index);
    }
    async closeQuestionAndAdvance(index) {
        TimerService_1.timerService.clearTimer(this.activity.id);
        const q = this.config.questions[index];
        if (!q)
            return;
        // 1. Calculate & store live scores up to this question strictly
        await this.calculateAndStoreScoresUpTo(index);
        // 2. Broadcast live updated leaderboards to all admin & projector rooms after EVERY question
        const perActBoard = await repository_1.repo.getPerActivityLeaderboard(this.activity.id);
        const overallBoard = await repository_1.repo.getOverallLeaderboard(this.activity.eventId);
        this.io.to(`event:${this.activity.eventId}:admin`).emit('leaderboard:per-activity', {
            activityId: this.activity.id,
            rows: perActBoard
        });
        this.io.to(`event:${this.activity.eventId}:admin`).emit('leaderboard:act1', {
            rows: perActBoard
        });
        this.io.to(`event:${this.activity.eventId}:admin`).emit('leaderboard:overall', {
            rows: overallBoard
        });
        // 3. Emit live score & rank updates to team devices
        const teams = await repository_1.repo.listTeams(this.activity.eventId);
        const submissions = await repository_1.repo.listSubmissions(this.activity.id);
        const subMap = new Map(submissions.map(s => [s.teamId, s.payload.answers || {}]));
        const scoringCfg = this.config.scoring || { timeWindow: 0.25, fullPointsWindow: true };
        const totalTeams = teams.length;
        for (const team of teams) {
            const teamAnsRecord = subMap.get(team.id) || {};
            const teamAnsObj = teamAnsRecord[index]; // STRICTLY check question index
            let submittedAns = teamAnsObj ? teamAnsObj.answer : undefined;
            if (typeof submittedAns === 'number' && q.options && q.options[submittedAns]) {
                submittedAns = q.options[submittedAns];
            }
            const respMs = teamAnsObj ? (teamAnsObj.responseTimeMs || 1000) : 1000;
            const rawSubmittedForScore = teamAnsObj ? teamAnsObj.answer : undefined;
            const pts = (0, activities_1.calculateQuizQuestionScore)(q, rawSubmittedForScore, respMs, scoringCfg);
            const teamPerActObj = perActBoard.find(r => r.teamId === team.id);
            const quizScore = teamPerActObj ? teamPerActObj.score : 0;
            const quizRank = teamPerActObj ? teamPerActObj.rank : totalTeams;
            // Calculate Rank & Rank Shift (Delta) for Quiz Activity ONLY
            const prevRank = this.previousRanks.get(team.id) ?? quizRank;
            const rankDelta = prevRank - quizRank; // Positive = climbed up ranks in Quiz!
            this.previousRanks.set(team.id, quizRank);
            // Emit direct score and rank update to team socket (QUIZ ONLY)
            this.io.to(`team:${team.id}`).emit('team:score-update', {
                teamTotalScore: quizScore,
                pointsEarned: pts,
                activityId: this.activity.id,
                rank: quizRank,
                rankDelta,
                totalTeams
            });
            // Emit reveal payload to team socket (QUIZ ONLY)
            this.io.to(`team:${team.id}`).emit('quiz:reveal', {
                index: index,
                questionNumber: index + 1,
                correctAnswer: q.correctAnswer,
                submittedAnswer: submittedAns !== undefined ? String(submittedAns) : 'No Answer Submitted',
                revealSeconds: 5,
                isCorrect: pts > 0,
                pointsEarned: pts,
                totalTeamScore: quizScore,
                rank: quizRank,
                rankDelta,
                totalTeams,
                revealImageUrl: q.revealImageUrl
            });
        }
        // Generic reveal broadcast for public view
        this.io.emit('quiz:reveal', {
            index: index,
            questionNumber: index + 1,
            correctAnswer: q.correctAnswer,
            revealSeconds: 5,
            revealImageUrl: q.revealImageUrl
        });
        // 4. Wait 5s reveal pause before next question
        setTimeout(() => {
            this.sendQuestion(index + 1);
        }, 5000);
    }
    async onPause() {
        TimerService_1.timerService.pauseTimer(this.activity.id);
        const remainingMs = TimerService_1.timerService.getRemainingMs(this.activity.id);
        this.io.emit('activity:paused', {
            pausedAt: new Date().toISOString(),
            remainingMs
        });
    }
    async onResume() {
        const deadline = TimerService_1.timerService.resumeTimer(this.activity.id, () => {
            this.handleQuestionTimeout(this.currentQuestionIndex);
        });
        if (deadline) {
            this.io.emit('activity:resumed', {
                deadline: new Date(deadline).toISOString()
            });
        }
    }
    async onQuizFinished() {
        TimerService_1.timerService.clearTimer(this.activity.id);
        await this.calculateAndStoreScoresUpTo(this.config.questions.length - 1);
        await repository_1.repo.updateActivityStatus(this.activity.id, 'scored');
        const teams = await repository_1.repo.listTeams(this.activity.eventId);
        const perActBoard = await repository_1.repo.getPerActivityLeaderboard(this.activity.id);
        const totalTeams = teams.length;
        for (const team of teams) {
            const teamRow = perActBoard.find(r => r.teamId === team.id);
            const teamScore = teamRow ? teamRow.score : 0;
            const rank = teamRow ? teamRow.rank : totalTeams;
            this.io.to(`team:${team.id}`).emit('quiz:complete', {
                message: `🎉 Outstanding Job, ${team.name}! Quiz Challenge Completed.`,
                teamScore,
                rank,
                totalTeams
            });
        }
        this.io.emit('quiz:complete', {
            message: '🎉 Quiz Challenge Completed!'
        });
        this.io.to(`event:${this.activity.eventId}:admin`).emit('activity:scored', { activityId: this.activity.id });
        const overallBoard = await repository_1.repo.getOverallLeaderboard(this.activity.eventId);
        this.io.to(`event:${this.activity.eventId}:admin`).emit('leaderboard:per-activity', {
            activityId: this.activity.id,
            rows: perActBoard
        });
        this.io.to(`event:${this.activity.eventId}:admin`).emit('leaderboard:act1', {
            rows: perActBoard
        });
        this.io.to(`event:${this.activity.eventId}:admin`).emit('leaderboard:overall', {
            rows: overallBoard
        });
    }
    async onEnd() {
        TimerService_1.timerService.clearTimer(this.activity.id);
        await this.onQuizFinished();
    }
    async calculateAndStoreScoresUpTo(upToQuestionIndex) {
        const teams = await repository_1.repo.listTeams(this.activity.eventId);
        const submissions = await repository_1.repo.listSubmissions(this.activity.id);
        const subMap = new Map(submissions.map(s => [s.teamId, s.payload.answers || {}]));
        const scoringCfg = this.config.scoring || { timeWindow: 0.25, fullPointsWindow: true };
        for (const team of teams) {
            const teamAnswers = subMap.get(team.id) || {};
            let totalScore = 0;
            for (let i = 0; i <= upToQuestionIndex; i++) {
                const q = this.config.questions[i];
                if (q) {
                    // STRICTLY check question i
                    const ansRecord = teamAnswers[i];
                    if (ansRecord && ansRecord.answer !== undefined) {
                        const respMs = ansRecord.responseTimeMs || 1000;
                        const score = (0, activities_1.calculateQuizQuestionScore)(q, ansRecord.answer, respMs, scoringCfg);
                        totalScore += score;
                    }
                }
            }
            const scoreObj = {
                id: `score_${this.activity.id}_${team.id}`,
                activityId: this.activity.id,
                teamId: team.id,
                value: totalScore,
                source: 'auto',
                adjustedAt: new Date().toISOString()
            };
            await repository_1.repo.saveScore(scoreObj);
        }
    }
    getCurrentState() {
        const q = this.config.questions[this.currentQuestionIndex];
        return {
            currentQuestionIndex: this.currentQuestionIndex,
            questionNumber: this.currentQuestionIndex + 1,
            totalQuestions: this.config.questions.length,
            question: q ? {
                text: q.text,
                options: q.options,
                timerSeconds: q.timerSeconds || 30,
                points: q.points || 100,
                imageUrl: q.imageUrl,
                revealImageUrl: q.revealImageUrl
            } : undefined,
            remainingMs: TimerService_1.timerService.getRemainingMs(this.activity.id)
        };
    }
}
exports.QuizActivityEngine = QuizActivityEngine;
