import { z } from 'zod';
export const EventConfigSchema = z.object({
    passcode: z.string().min(4, "Passcode must be at least 4 characters"),
    copy: z.object({
        eventName: z.string().default("RecruitQuest Event"),
        welcomeMessage: z.string().optional()
    }).default({ eventName: "RecruitQuest Event" }),
    activities: z.array(z.object({
        seq: z.number().int().positive(),
        type: z.enum(['quiz', 'market-simulation']),
        title: z.string(),
        config: z.any()
    }))
});
