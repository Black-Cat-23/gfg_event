"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketActivityEngine = void 0;
const repository_1 = require("../../db/repository");
const TimerService_1 = require("../../engine/TimerService");
const MASTER_PRICE_LEDGER = {
    'TechHub': [400, 400, 400, 400, 400, 440, 440, 396, 396, 317, 317, 317, 222],
    'GoldCraft': [380, 380, 418, 418, 376, 376, 376, 376, 376, 376, 376, 376, 376],
    'SteelWorks': [360, 360, 360, 360, 360, 360, 432, 432, 432, 432, 475, 523, 732],
    'ChipWare': [340, 340, 340, 340, 374, 411, 411, 411, 452, 452, 452, 452, 316],
    'GameZone': [320, 320, 320, 320, 320, 320, 320, 288, 288, 0, 0, 0, 0],
    'PowerGrid': [300, 300, 300, 300, 300, 300, 360, 324, 292, 292, 292, 292, 409],
    'AutoDrive': [280, 280, 280, 280, 280, 280, 280, 280, 308, 308, 308, 308, 308],
    'WoodWorks': [260, 286, 286, 229, 229, 229, 229, 229, 229, 229, 229, 229, 229],
    'QuickCart': [240, 240, 216, 216, 216, 216, 216, 216, 216, 173, 190, 209, 0],
    'UrbanRise': [220, 242, 242, 194, 194, 194, 388, 388, 388, 388, 970, 970, 970]
};
class MarketActivityEngine {
    activity;
    config;
    io;
    currentRoundIndex = 0;
    currentPrices = {};
    teamPortfolios = new Map();
    assignedCompanies = new Map(); // key: teamId, value: companyName
    previousRanks = new Map(); // key: teamId, value: rank
    currentPhase = 'trading';
    constructor(activity, io) {
        this.activity = activity;
        this.config = activity.config;
        this.io = io;
    }
    async onStart() {
        this.currentRoundIndex = 0;
        this.currentPrices = {};
        this.teamPortfolios.clear();
        this.assignedCompanies.clear();
        this.previousRanks.clear();
        this.currentPhase = 'trading';
        const companies = this.config.companies;
        // Init R0 initial prices
        for (const c of companies) {
            this.currentPrices[c.name] = MASTER_PRICE_LEDGER[c.name]?.[0] ?? c.initialPrice;
        }
        // Init portfolios for all registered teams with Random 1 Share Asset Assignment
        const teams = await repository_1.repo.listTeams(this.activity.eventId);
        for (let i = 0; i < teams.length; i++) {
            const team = teams[i];
            // Deterministic pseudo-random pick based on team index or random
            const assignedComp = companies[i % companies.length];
            const r0Price = MASTER_PRICE_LEDGER[assignedComp.name][0];
            const holdings = {};
            for (const c of companies) {
                holdings[c.name] = c.name === assignedComp.name ? 1 : 0;
            }
            const startingCash = 10000 - r0Price;
            this.assignedCompanies.set(team.id, assignedComp.name);
            this.teamPortfolios.set(team.id, {
                cash: startingCash,
                holdings,
                totalValue: 10000
            });
        }
        await this.sendTradingPhase(this.currentRoundIndex);
    }
    async sendTradingPhase(index) {
        const rounds = this.config.rounds;
        if (index >= rounds.length) {
            await this.onMarketFinished();
            return;
        }
        this.currentRoundIndex = index;
        this.currentPhase = 'trading';
        const scenario = rounds[index];
        // Current prices during Phase 1 (0:00 - 0:30) are prices at ledger index `index`
        const companies = this.config.companies;
        for (const c of companies) {
            this.currentPrices[c.name] = MASTER_PRICE_LEDGER[c.name]?.[index] ?? c.initialPrice;
        }
        const deadlineEpoch = TimerService_1.timerService.startTimer(this.activity.id, 30, // Phase 1: exactly 30s
        () => this.handleTradingPhaseTimeout(index));
        const deadlineISO = new Date(deadlineEpoch).toISOString();
        const companiesPayload = companies.map(c => ({
            id: c.id || c.name,
            name: c.name,
            price: this.currentPrices[c.name],
            isBankrupt: this.currentPrices[c.name] === 0
        }));
        const scenarioPayload = {
            round: index + 1,
            total: rounds.length,
            phase: 'trading',
            scenario: {
                title: scenario.title,
                description: scenario.description,
                decisionSeconds: 30
            },
            companies: companiesPayload,
            portfolio: { cash: 10000, holdings: {}, totalValue: 10000 },
            deadline: deadlineISO
        };
        this.io.emit('market:scenario', scenarioPayload);
        const teams = await repository_1.repo.listTeams(this.activity.eventId);
        for (const team of teams) {
            let pf = this.teamPortfolios.get(team.id);
            if (!pf) {
                const assignedComp = companies[0];
                const r0Price = MASTER_PRICE_LEDGER[assignedComp.name][0];
                const holdings = {};
                for (const c of companies)
                    holdings[c.name] = c.name === assignedComp.name ? 1 : 0;
                pf = { cash: 10000 - r0Price, holdings, totalValue: 10000 };
                this.assignedCompanies.set(team.id, assignedComp.name);
                this.teamPortfolios.set(team.id, pf);
            }
            const sub = await repository_1.repo.getSubmission(this.activity.id, team.id);
            let submittedDecisions = undefined;
            if (sub && sub.payload.rounds && sub.payload.rounds[index]) {
                submittedDecisions = sub.payload.rounds[index].decisions;
            }
            this.io.to(`team:${team.id}`).emit('market:scenario', {
                ...scenarioPayload,
                assignedCompany: this.assignedCompanies.get(team.id),
                portfolio: pf,
                submittedDecisions
            });
        }
    }
    sendScenarioToSocket(socket, teamId) {
        const rounds = this.config.rounds;
        const scenario = rounds[this.currentRoundIndex];
        if (!scenario)
            return;
        const remainingMs = TimerService_1.timerService.getRemainingMs(this.activity.id);
        const deadlineISO = new Date(Date.now() + remainingMs).toISOString();
        const companiesPayload = this.config.companies.map(c => ({
            id: c.id || c.name,
            name: c.name,
            price: this.currentPrices[c.name] ?? c.initialPrice,
            isBankrupt: (this.currentPrices[c.name] ?? c.initialPrice) === 0
        }));
        let pf = teamId ? this.teamPortfolios.get(teamId) : undefined;
        if (!pf) {
            pf = { cash: 10000, holdings: {}, totalValue: 10000 };
        }
        socket.emit('market:scenario', {
            round: this.currentRoundIndex + 1,
            total: rounds.length,
            phase: this.currentPhase,
            scenario: {
                title: scenario.title,
                description: scenario.description,
                decisionSeconds: 30
            },
            companies: companiesPayload,
            assignedCompany: teamId ? this.assignedCompanies.get(teamId) : undefined,
            portfolio: pf,
            deadline: deadlineISO
        });
    }
    async onSubmit(teamId, payload) {
        if (this.currentPhase !== 'trading') {
            return { success: false, error: 'Trading window is closed for this round' };
        }
        if (payload.roundIndex !== this.currentRoundIndex) {
            return { success: false, error: 'Round index mismatch' };
        }
        const pf = this.teamPortfolios.get(teamId);
        if (!pf)
            return { success: false, error: 'Team portfolio not initialized' };
        // Validate decisions: single-share limit & cash/holding constraints
        const sanitizedDecisions = {};
        let tempCash = pf.cash;
        const tempHoldings = { ...pf.holdings };
        for (const c of this.config.companies) {
            const requestedAction = payload.decisions[c.name] || 'hold';
            const price = this.currentPrices[c.name] || 0;
            if (price === 0) { // Bankrupt stock
                sanitizedDecisions[c.name] = 'hold';
                continue;
            }
            if (requestedAction === 'buy') {
                if (tempCash >= price) {
                    tempCash -= price;
                    tempHoldings[c.name] = (tempHoldings[c.name] || 0) + 1;
                    sanitizedDecisions[c.name] = 'buy';
                }
                else {
                    sanitizedDecisions[c.name] = 'hold'; // Insufficient cash fallback
                }
            }
            else if (requestedAction === 'sell') {
                if ((tempHoldings[c.name] || 0) > 0) {
                    tempCash += price;
                    tempHoldings[c.name] = Math.max(0, (tempHoldings[c.name] || 0) - 1);
                    sanitizedDecisions[c.name] = 'sell';
                }
                else {
                    sanitizedDecisions[c.name] = 'hold'; // No share fallback
                }
            }
            else {
                sanitizedDecisions[c.name] = 'hold';
            }
        }
        const currentSub = await repository_1.repo.getSubmission(this.activity.id, teamId);
        let rounds = {};
        if (currentSub) {
            rounds = currentSub.payload.rounds || {};
        }
        rounds[payload.roundIndex] = {
            decisions: sanitizedDecisions,
            submittedAt: new Date().toISOString()
        };
        const sub = {
            id: `sub_${this.activity.id}_${teamId}`,
            activityId: this.activity.id,
            teamId,
            payload: { rounds },
            submittedAt: new Date().toISOString()
        };
        await repository_1.repo.saveSubmission(sub);
        return { success: true };
    }
    async handleTradingPhaseTimeout(index) {
        await this.closeTradingPhaseAndReveal(index);
    }
    async closeRoundAndAdvance(index) {
        if (this.currentPhase === 'trading') {
            await this.closeTradingPhaseAndReveal(index);
        }
        else {
            TimerService_1.timerService.clearTimer(this.activity.id);
            await this.sendTradingPhase(index + 1);
        }
    }
    async closeTradingPhaseAndReveal(index) {
        TimerService_1.timerService.clearTimer(this.activity.id);
        this.currentPhase = 'reveal';
        const scenario = this.config.rounds[index];
        if (!scenario)
            return;
        // 1. Get new prices from ledger index `index + 1`
        const oldPrices = { ...this.currentPrices };
        const newPrices = {};
        const impacts = [];
        for (const c of this.config.companies) {
            const oldP = oldPrices[c.name] ?? c.initialPrice;
            const newP = MASTER_PRICE_LEDGER[c.name]?.[index + 1] ?? oldP;
            newPrices[c.name] = newP;
            const pctChange = oldP > 0 ? Math.round(((newP - oldP) / oldP) * 100) : 0;
            impacts.push({
                company: c.name,
                pctChange,
                oldPrice: oldP,
                newPrice: newP,
                isBankrupt: newP === 0
            });
        }
        this.currentPrices = newPrices;
        // 2. Process submitted trades for all teams using Phase 1 oldPrices
        const teams = await repository_1.repo.listTeams(this.activity.eventId);
        const submissions = await repository_1.repo.listSubmissions(this.activity.id);
        const subMap = new Map(submissions.map(s => [s.teamId, s.payload.rounds || {}]));
        for (const team of teams) {
            let pf = this.teamPortfolios.get(team.id);
            if (!pf) {
                const holdings = {};
                for (const c of this.config.companies)
                    holdings[c.name] = 0;
                pf = { cash: 10000, holdings, totalValue: 10000 };
            }
            const teamRounds = subMap.get(team.id) || {};
            const roundSubmission = teamRounds[index];
            const decisions = roundSubmission?.decisions || {};
            let cash = pf.cash;
            const holdings = { ...pf.holdings };
            // Apply decisions per company using oldPrices
            for (const c of this.config.companies) {
                const action = decisions[c.name] || 'hold';
                const price = oldPrices[c.name];
                if (price > 0 && action === 'buy' && cash >= price) {
                    cash -= price;
                    holdings[c.name] = (holdings[c.name] || 0) + 1;
                }
                else if (price > 0 && action === 'sell' && (holdings[c.name] || 0) > 0) {
                    cash += price;
                    holdings[c.name] = Math.max(0, (holdings[c.name] || 0) - 1);
                }
            }
            // Recompute Net Worth using newPrices (bankrupt stocks at ₹0 contribute ₹0)
            let portfolioVal = cash;
            for (const c of this.config.companies) {
                const shares = holdings[c.name] || 0;
                const newP = newPrices[c.name] || 0;
                portfolioVal += shares * newP;
            }
            const updatedPortfolio = {
                cash: Math.round(cash),
                holdings,
                totalValue: Math.round(portfolioVal)
            };
            this.teamPortfolios.set(team.id, updatedPortfolio);
            // Save score to DB
            const scoreObj = {
                id: `score_${this.activity.id}_${team.id}`,
                activityId: this.activity.id,
                teamId: team.id,
                value: updatedPortfolio.totalValue,
                source: 'auto',
                adjustedAt: new Date().toISOString()
            };
            await repository_1.repo.saveScore(scoreObj);
        }
        // 3. Broadcast updated leaderboards to Admin Dashboard & Projector
        const perActBoard = await repository_1.repo.getPerActivityLeaderboard(this.activity.id);
        const overallBoard = await repository_1.repo.getOverallLeaderboard(this.activity.eventId);
        this.io.to(`event:${this.activity.eventId}:admin`).emit('leaderboard:per-activity', {
            activityId: this.activity.id,
            rows: perActBoard
        });
        this.io.to(`event:${this.activity.eventId}:admin`).emit('leaderboard:act2', {
            rows: perActBoard
        });
        this.io.to(`event:${this.activity.eventId}:admin`).emit('leaderboard:overall', {
            rows: overallBoard
        });
        // 4. Start Phase 2 Reveal Gap (30s)
        const deadlineEpoch = TimerService_1.timerService.startTimer(this.activity.id, 30, // Phase 2: 30s reveal gap
        () => this.handleRevealPhaseTimeout(index));
        const deadlineISO = new Date(deadlineEpoch).toISOString();
        const totalTeams = teams.length;
        for (const team of teams) {
            const pf = this.teamPortfolios.get(team.id);
            const currentRankObj = perActBoard.find(r => r.teamId === team.id);
            const newRank = currentRankObj ? currentRankObj.rank : totalTeams;
            const prevRank = this.previousRanks.get(team.id) ?? newRank;
            const rankDelta = prevRank - newRank;
            this.previousRanks.set(team.id, newRank);
            this.io.to(`team:${team.id}`).emit('market:reveal', {
                round: index + 1,
                total: this.config.rounds.length,
                phase: 'reveal',
                newsTitle: scenario.title,
                newsDescription: scenario.description,
                impacts,
                newPrices,
                portfolio: pf,
                rank: newRank,
                rankDelta,
                totalTeams,
                revealSeconds: 30,
                deadline: deadlineISO
            });
        }
    }
    async handleRevealPhaseTimeout(index) {
        TimerService_1.timerService.clearTimer(this.activity.id);
        // Advance to next round
        await this.sendTradingPhase(index + 1);
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
            if (this.currentPhase === 'trading') {
                this.handleTradingPhaseTimeout(this.currentRoundIndex);
            }
            else {
                this.handleRevealPhaseTimeout(this.currentRoundIndex);
            }
        });
        if (deadline) {
            this.io.emit('activity:resumed', {
                deadline: new Date(deadline).toISOString()
            });
        }
    }
    async onMarketFinished() {
        TimerService_1.timerService.clearTimer(this.activity.id);
        await repository_1.repo.updateActivityStatus(this.activity.id, 'scored');
        const teams = await repository_1.repo.listTeams(this.activity.eventId);
        const perActBoard = await repository_1.repo.getPerActivityLeaderboard(this.activity.id);
        const totalTeams = teams.length;
        for (const team of teams) {
            const pf = this.teamPortfolios.get(team.id);
            const teamRow = perActBoard.find(r => r.teamId === team.id);
            const finalValue = pf ? pf.totalValue : (teamRow ? teamRow.score : 10000);
            const rank = teamRow ? teamRow.rank : totalTeams;
            this.io.to(`team:${team.id}`).emit('market:finished', {
                finalValue,
                rank,
                totalTeams,
                message: `🏆 Simulation Complete! Final Net Worth: ₹${finalValue.toLocaleString()}`
            });
        }
        this.io.to(`event:${this.activity.eventId}:admin`).emit('activity:scored', { activityId: this.activity.id });
        const overallBoard = await repository_1.repo.getOverallLeaderboard(this.activity.eventId);
        this.io.to(`event:${this.activity.eventId}:admin`).emit('leaderboard:per-activity', {
            activityId: this.activity.id,
            rows: perActBoard
        });
        this.io.to(`event:${this.activity.eventId}:admin`).emit('leaderboard:act2', {
            rows: perActBoard
        });
        this.io.to(`event:${this.activity.eventId}:admin`).emit('leaderboard:overall', {
            rows: overallBoard
        });
    }
    async onEnd() {
        TimerService_1.timerService.clearTimer(this.activity.id);
        await this.onMarketFinished();
    }
    getCurrentState() {
        const scenario = this.config.rounds[this.currentRoundIndex];
        return {
            currentRoundIndex: this.currentRoundIndex,
            roundNumber: this.currentRoundIndex + 1,
            totalRounds: this.config.rounds.length,
            currentPhase: this.currentPhase,
            scenario: scenario ? {
                title: scenario.title,
                description: scenario.description,
                decisionSeconds: 30
            } : undefined,
            currentPrices: this.currentPrices,
            remainingMs: TimerService_1.timerService.getRemainingMs(this.activity.id)
        };
    }
}
exports.MarketActivityEngine = MarketActivityEngine;
