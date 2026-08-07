import { ActivityType, LeaderboardRow, NextUpInfo } from './event';
import { DecisionAction } from './activities/market';

export interface ServerToTeamEvents {
  'event:state': (state: {
    event: { id: string; name: string; status: string };
    activity?: { id: string; type: ActivityType; seq: number; status: string; title: string };
    timer?: { deadline?: string; pausedAt?: string; remainingMs?: number };
    nextUp?: NextUpInfo;
    teamState?: any;
  }) => void;
  'activity:started': (payload: { activityId: string; type: ActivityType; title: string; config: any; deadline?: string }) => void;
  'activity:paused': (payload: { pausedAt: string; remainingMs: number }) => void;
  'activity:resumed': (payload: { deadline: string }) => void;
  'activity:ended': (payload: { activityId: string }) => void;
  'activity:next-up': (payload: NextUpInfo) => void;
  'timer:sync': (payload: { now: string; deadline?: string; remainingMs?: number }) => void;

  'quiz:question': (payload: {
    index: number;
    questionNumber?: number;
    total: number;
    question: {
      text: string;
      options?: string[];
      timerSeconds: number;
      points: number;
      imageUrl?: string;
      revealImageUrl?: string;
    };
    deadline: string;
    lockedAnswer?: number | string;
  }) => void;
  'quiz:locked': (payload: { index: number; answer: number | string }) => void;
  'quiz:reveal': (payload: {
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
  }) => void;
  'quiz:complete': (payload: {
    message: string;
    teamScore?: number;
    rank?: number;
    totalTeams?: number;
  }) => void;

  'team:score-update': (payload: {
    teamTotalScore: number;
    pointsEarned?: number;
    activityId: string;
    rank?: number;
    rankDelta?: number;
    totalTeams?: number;
  }) => void;

  'market:scenario': (payload: {
    round: number;
    total: number;
    phase: 'trading' | 'reveal';
    scenario: { title: string; description: string; decisionSeconds: number };
    companies: { id: string; name: string; price: number; isBankrupt?: boolean }[];
    portfolio: { cash: number; holdings: Record<string, number>; totalValue: number };
    assignedCompany?: string;
    deadline: string;
    submittedDecisions?: Record<string, DecisionAction>;
  }) => void;
  'market:reveal': (payload: {
    round: number;
    total: number;
    phase: 'reveal';
    newsTitle: string;
    newsDescription: string;
    impacts: { company: string; pctChange: number; oldPrice: number; newPrice: number; isBankrupt?: boolean }[];
    newPrices: Record<string, number>;
    portfolio: { cash: number; holdings: Record<string, number>; totalValue: number };
    rank?: number;
    rankDelta?: number;
    totalTeams?: number;
    revealSeconds: number;
    deadline: string;
  }) => void;
  'market:decision-closed': (payload: {
    round: number;
    newPrices: Record<string, number>;
    portfolio: { cash: number; holdings: Record<string, number>; totalValue: number };
  }) => void;
  'market:finished': (payload: { finalValue: number; rank?: number; totalTeams?: number; message?: string }) => void;

  'team:takeover': (payload: { reason: string }) => void;
  'session:inactive': (payload: { reason: string }) => void;
}

export interface TeamSummary {
  id: string;
  name: string;
  leaderName?: string;
  member2Name?: string;
  teamCode: string;
  totalScore: number;
  isOnline: boolean;
  activeConn?: string;
  createdAt: string;
}

export interface ServerToAdminEvents {
  'teams:list': (teams: TeamSummary[]) => void;
  'team:joined': (team: { id: string; name: string; code: string }) => void;
  'team:left': (payload: { teamId: string }) => void;
  'team:online': (payload: { teamId: string }) => void;
  'team:offline': (payload: { teamId: string }) => void;
  'submission:received': (payload: { activityId: string; teamId: string; at: string }) => void;
  'activity:scored': (payload: { activityId: string }) => void;
  'leaderboard:per-activity': (payload: { activityId: string; rows:LeaderboardRow[] }) => void;
  'leaderboard:act1': (payload: { rows: LeaderboardRow[] }) => void;
  'leaderboard:act2': (payload: { rows: LeaderboardRow[] }) => void;
  'leaderboard:overall': (payload: { rows: LeaderboardRow[] }) => void;
  'score:override-applied': (payload: { teamId: string; newValue: number; note?: string }) => void;
  'admin:auth-result': (payload: { success: boolean; token?: string; error?: string }) => void;
  'admin:config-saved': (payload: { success: boolean; error?: string }) => void;
}

export interface ClientToServerEvents {
  'team:create': (payload: { name: string; leaderName: string; member2Name: string }, callback: (res: { success: boolean; teamCode?: string; team?: any; error?: string }) => void) => void;
  'team:join': (payload: { code: string }, callback: (res: { success: boolean; team?: { id: string; name: string; leaderName?: string; member2Name?: string; code: string; totalScore?: number }; error?: string }) => void) => void;
  'team:submit': (payload: { activityId: string; payload: any }, callback?: (res: { success: boolean; error?: string }) => void) => void;

  'admin:auth': (payload: { passcode: string }, callback: (res: { success: boolean; token?: string; error?: string }) => void) => void;
  'admin:start-activity': (payload: { activityId: string }) => void;
  'admin:pause-activity': (payload: { activityId: string }) => void;
  'admin:resume-activity': (payload: { activityId: string }) => void;
  'admin:end-activity': (payload: { activityId: string }) => void;
  'admin:reset-event': (payload: { eventId?: string }, callback?: (res: { success: boolean; error?: string }) => void) => void;
  'admin:next-scenario': (payload: { activityId: string }) => void;
  'admin:override-score': (payload: { activityId?: string; teamId: string; value: number; note?: string }) => void;
  'admin:reveal-leaderboard': (payload: { activityId?: string; scope: 'per-activity' | 'overall' }) => void;
  'admin:reload-config': (payload: { eventId: string; newConfig?: any }, callback?: (res: { success: boolean; error?: string }) => void) => void;
}
