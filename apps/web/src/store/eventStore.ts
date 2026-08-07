import { create } from 'zustand';
import { ActivityType, NextUpInfo, DecisionAction, TeamSummary, LeaderboardRow } from '@recruitquest/types';

export interface EventState {
  // Event
  eventId?: string;
  eventName?: string;
  eventStatus?: string;

  // Team
  teamId?: string;
  teamName?: string;
  leaderName?: string;
  member2Name?: string;
  teamCode?: string;
  teamTotalScore?: number;
  teamRank?: number;
  rankDelta?: number;
  totalTeams?: number;
  newlyCreatedCode?: string;

  // Admin Data
  teamsList: TeamSummary[];
  perActLeaderboard: LeaderboardRow[];
  overallLeaderboard: LeaderboardRow[];

  // Activity
  currentActivity?: {
    id: string;
    type: ActivityType;
    seq: number;
    status: string;
    title: string;
  };
  nextUp?: NextUpInfo;

  // Connection
  isConnected: boolean;
  isReconnecting: boolean;
  takeoverReason?: string;

  // Quiz State
  quiz?: {
    index: number;
    questionNumber?: number;
    total: number;
    question?: {
      text: string;
      options?: string[];
      correctAnswer?: string;
      timerSeconds: number;
      points: number;
      imageUrl?: string;
      revealImageUrl?: string;
    };
    deadline?: string;
    lockedAnswer?: number | string;
    isComplete?: boolean;
    reveal?: {
      index: number;
      questionNumber?: number;
      correctAnswer: string | number;
      submittedAnswer?: string | number;
      revealSeconds: number;
      isCorrect?: boolean;
      pointsEarned?: number;
      totalTeamScore?: number;
      rank?: number;
      rankDelta?: number;
      totalTeams?: number;
      revealImageUrl?: string;
    };
    completion?: {
      message: string;
      teamScore?: number;
      rank?: number;
      totalTeams?: number;
    };
  };

  // Market State
  market?: {
    round: number;
    total: number;
    phase: 'trading' | 'reveal';
    scenario?: {
      title: string;
      description: string;
      decisionSeconds: number;
    };
    companies?: { id: string; name: string; price: number; isBankrupt?: boolean }[];
    portfolio?: { cash: number; holdings: Record<string, number>; totalValue: number };
    assignedCompany?: string;
    deadline?: string;
    submittedDecisions?: Record<string, DecisionAction>;
    isFinished?: boolean;
    finalValue?: number;
    reveal?: {
      round: number;
      newsTitle: string;
      newsDescription: string;
      impacts: { company: string; pctChange: number; oldPrice: number; newPrice: number; isBankrupt?: boolean }[];
      newPrices: Record<string, number>;
      portfolio: { cash: number; holdings: Record<string, number>; totalValue: number };
      rank?: number;
      rankDelta?: number;
      totalTeams?: number;
      revealSeconds: number;
      deadline?: string;
    };
  };

  // Actions
  setConnection: (status: { isConnected: boolean; isReconnecting?: boolean; takeoverReason?: string }) => void;
  setTeamInfo: (info: { teamId: string; name: string; leaderName?: string; member2Name?: string; code: string; totalScore?: number }) => void;
  setTeamScoreUpdate: (payload: { teamTotalScore: number; rank?: number; rankDelta?: number; totalTeams?: number }) => void;
  setNewlyCreatedCode: (code?: string) => void;
  setEventState: (state: any) => void;
  setActivityStarted: (payload: any) => void;
  setActivityPaused: (payload: any) => void;
  setActivityResumed: (payload: any) => void;
  setActivityEnded: (payload: any) => void;
  setTeamsList: (teams: TeamSummary[]) => void;
  setPerActLeaderboard: (rows: LeaderboardRow[]) => void;
  setOverallLeaderboard: (rows: LeaderboardRow[]) => void;
  setQuizQuestion: (payload: any) => void;
  setQuizLocked: (index: number, answer: number | string) => void;
  setQuizReveal: (payload: any) => void;
  setQuizComplete: (payload: any) => void;
  setMarketScenario: (payload: any) => void;
  setMarketReveal: (payload: any) => void;
  setMarketDecisionClosed: (payload: any) => void;
  setMarketFinished: (payload: any) => void;
  resetState: () => void;
}

export const useEventStore = create<EventState>((set) => ({
  isConnected: false,
  isReconnecting: false,
  teamsList: [],
  perActLeaderboard: [],
  overallLeaderboard: [],

  setConnection: (status) =>
    set((state) => ({
      isConnected: status.isConnected,
      isReconnecting: status.isReconnecting ?? false,
      takeoverReason: status.takeoverReason ?? state.takeoverReason
    })),

  setTeamInfo: (info) =>
    set((state) => ({
      teamId: info.teamId,
      teamName: info.name,
      leaderName: info.leaderName ?? state.leaderName,
      member2Name: info.member2Name ?? state.member2Name,
      teamCode: info.code,
      teamTotalScore: info.totalScore ?? state.teamTotalScore ?? 0
    })),

  setTeamScoreUpdate: (payload) =>
    set((state) => ({
      teamTotalScore: payload.teamTotalScore,
      teamRank: payload.rank ?? state.teamRank,
      rankDelta: payload.rankDelta ?? state.rankDelta,
      totalTeams: payload.totalTeams ?? state.totalTeams
    })),

  setNewlyCreatedCode: (code) => set({ newlyCreatedCode: code }),

  setEventState: (snapshot) =>
    set((state) => ({
      eventId: snapshot.event?.id || state.eventId,
      eventName: snapshot.event?.name || state.eventName,
      eventStatus: snapshot.event?.status || state.eventStatus,
      currentActivity: snapshot.activity || state.currentActivity,
      nextUp: snapshot.nextUp || state.nextUp,
      teamId: snapshot.teamState?.teamId || state.teamId,
      teamName: snapshot.teamState?.name || state.teamName,
      leaderName: snapshot.teamState?.leaderName || state.leaderName,
      member2Name: snapshot.teamState?.member2Name || state.member2Name,
      teamCode: snapshot.teamState?.teamCode || state.teamCode,
      teamTotalScore: snapshot.teamState?.totalScore ?? state.teamTotalScore ?? 0,
      teamRank: snapshot.teamState?.rank ?? state.teamRank,
      totalTeams: snapshot.teamState?.totalTeams ?? state.totalTeams
    })),

  setActivityStarted: (payload) =>
    set((state) => ({
      teamTotalScore: payload.type === 'market-simulation' ? 10000 : 0,
      teamRank: undefined,
      rankDelta: 0,
      currentActivity: {
        id: payload.activityId,
        type: payload.type,
        seq: state.currentActivity?.seq || 1,
        status: 'running',
        title: payload.title
      }
    })),

  setActivityPaused: () =>
    set((state) => ({
      currentActivity: state.currentActivity
        ? { ...state.currentActivity, status: 'paused' }
        : undefined
    })),

  setActivityResumed: (payload) =>
    set((state) => ({
      currentActivity: state.currentActivity
        ? { ...state.currentActivity, status: 'running' }
        : undefined,
      quiz: state.quiz && payload?.deadline ? { ...state.quiz, deadline: payload.deadline } : state.quiz,
      market: state.market && payload?.deadline ? { ...state.market, deadline: payload.deadline } : state.market
    })),

  setActivityEnded: () =>
    set((state) => ({
      currentActivity: state.currentActivity
        ? { ...state.currentActivity, status: 'completed' }
        : undefined
    })),

  setTeamsList: (teams) => set({ teamsList: teams }),
  setPerActLeaderboard: (rows) => set({ perActLeaderboard: rows }),
  setOverallLeaderboard: (rows) => set({ overallLeaderboard: rows }),

  setQuizQuestion: (payload) =>
    set((state) => ({
      quiz: {
        ...state.quiz,
        index: payload.index,
        questionNumber: payload.questionNumber,
        total: payload.total,
        question: payload.question,
        deadline: payload.deadline,
        lockedAnswer: payload.lockedAnswer,
        reveal: undefined,
        isComplete: false
      }
    })),

  setQuizLocked: (index, answer) =>
    set((state) => ({
      quiz: {
        ...state.quiz!,
        index,
        lockedAnswer: answer
      }
    })),

  setQuizReveal: (payload) =>
    set((state) => ({
      teamTotalScore: payload.totalTeamScore ?? state.teamTotalScore,
      teamRank: payload.rank ?? state.teamRank,
      rankDelta: payload.rankDelta ?? state.rankDelta,
      totalTeams: payload.totalTeams ?? state.totalTeams,
      quiz: {
        ...state.quiz!,
        reveal: payload
      }
    })),

  setQuizComplete: (payload) =>
    set((state) => ({
      quiz: {
        ...state.quiz!,
        isComplete: true,
        completion: payload
      }
    })),

  setMarketScenario: (payload) =>
    set((state) => ({
      market: {
        ...state.market,
        round: payload.round,
        total: payload.total,
        phase: payload.phase || 'trading',
        scenario: payload.scenario,
        companies: payload.companies,
        portfolio: payload.portfolio || state.market?.portfolio || { cash: 10000, holdings: {}, totalValue: 10000 },
        assignedCompany: payload.assignedCompany || state.market?.assignedCompany,
        deadline: payload.deadline,
        submittedDecisions: payload.submittedDecisions || state.market?.submittedDecisions,
        reveal: undefined,
        isFinished: false
      }
    })),

  setMarketReveal: (payload) =>
    set((state) => ({
      teamTotalScore: payload.portfolio?.totalValue ?? state.teamTotalScore,
      teamRank: payload.rank ?? state.teamRank,
      rankDelta: payload.rankDelta ?? state.rankDelta,
      totalTeams: payload.totalTeams ?? state.totalTeams,
      market: {
        ...state.market!,
        phase: 'reveal',
        portfolio: payload.portfolio,
        deadline: payload.deadline,
        reveal: payload
      }
    })),

  setMarketDecisionClosed: (payload) =>
    set((state) => ({
      market: {
        ...state.market!,
        round: payload.round,
        portfolio: payload.portfolio,
        companies: state.market?.companies?.map((c) => ({
          ...c,
          price: payload.newPrices[c.name] ?? c.price,
          isBankrupt: (payload.newPrices[c.name] ?? c.price) === 0
        }))
      }
    })),

  setMarketFinished: (payload) =>
    set((state) => ({
      market: {
        ...state.market!,
        isFinished: true,
        finalValue: typeof payload === 'number' ? payload : payload.finalValue
      }
    })),

  resetState: () =>
    set({
      teamId: undefined,
      teamName: undefined,
      leaderName: undefined,
      member2Name: undefined,
      teamCode: undefined,
      newlyCreatedCode: undefined,
      currentActivity: undefined,
      quiz: undefined,
      market: undefined,
      takeoverReason: undefined
    })
}));
