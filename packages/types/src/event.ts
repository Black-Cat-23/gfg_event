import { z } from 'zod';

export type EventStatus = 'draft' | 'waiting' | 'running' | 'ended';
export type ActivityStatus = 'waiting' | 'running' | 'paused' | 'completed' | 'scored';
export type ActivityType = 'quiz' | 'market-simulation';

export interface Event {
  id: string;
  name: string;
  config: EventConfig;
  passcodeHash: string;
  status: EventStatus;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
  leaderName?: string;
  member2Name?: string;
  teamCode: string;
  totalScore: number;
  activeConn?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  eventId: string;
  seq: number;
  type: ActivityType;
  config: any;
  status: ActivityStatus;
  startedAt?: string;
  endedAt?: string;
}

export interface Submission {
  id: string;
  activityId: string;
  teamId: string;
  payload: any;
  submittedAt: string;
}

export interface Score {
  id: string;
  activityId: string;
  teamId: string;
  value: number;
  source: 'auto' | 'admin_override';
  note?: string;
  adjustedAt: string;
}

export interface LeaderboardRow {
  rank: number;
  teamId: string;
  name: string;
  teamCode?: string;
  score: number;
  totalScore?: number;
}

export interface NextUpInfo {
  seq: number;
  type: ActivityType;
  title: string;
  durationMinutes: number;
}

export interface EventConfigCopy {
  eventName?: string;
  welcomeMessage?: string;
}

export const EventConfigSchema = z.object({
  passcode: z.string().min(4, "Passcode must be at least 4 characters"),
  copy: z.object({
    eventName: z.string().default("RecruitQuest Event"),
    welcomeMessage: z.string().optional()
  }).default({ eventName: "RecruitQuest Event" }),
  activities: z.array(
    z.object({
      seq: z.number().int().positive(),
      type: z.enum(['quiz', 'market-simulation']),
      title: z.string(),
      config: z.any()
    })
  )
});

export type EventConfig = z.infer<typeof EventConfigSchema>;
