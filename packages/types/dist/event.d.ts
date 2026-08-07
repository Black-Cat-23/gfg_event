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
export declare const EventConfigSchema: z.ZodObject<{
    passcode: z.ZodString;
    copy: z.ZodDefault<z.ZodObject<{
        eventName: z.ZodDefault<z.ZodString>;
        welcomeMessage: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        eventName: string;
        welcomeMessage?: string | undefined;
    }, {
        eventName?: string | undefined;
        welcomeMessage?: string | undefined;
    }>>;
    activities: z.ZodArray<z.ZodObject<{
        seq: z.ZodNumber;
        type: z.ZodEnum<["quiz", "market-simulation"]>;
        title: z.ZodString;
        config: z.ZodAny;
    }, "strip", z.ZodTypeAny, {
        type: "quiz" | "market-simulation";
        seq: number;
        title: string;
        config?: any;
    }, {
        type: "quiz" | "market-simulation";
        seq: number;
        title: string;
        config?: any;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    passcode: string;
    copy: {
        eventName: string;
        welcomeMessage?: string | undefined;
    };
    activities: {
        type: "quiz" | "market-simulation";
        seq: number;
        title: string;
        config?: any;
    }[];
}, {
    passcode: string;
    activities: {
        type: "quiz" | "market-simulation";
        seq: number;
        title: string;
        config?: any;
    }[];
    copy?: {
        eventName?: string | undefined;
        welcomeMessage?: string | undefined;
    } | undefined;
}>;
export type EventConfig = z.infer<typeof EventConfigSchema>;
//# sourceMappingURL=event.d.ts.map