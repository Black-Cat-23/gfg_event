import { QuizConfigSchema, MarketConfigSchema, ActivityType } from '@recruitquest/types';
import { z } from 'zod';

export const activitySchemas: Record<ActivityType, z.ZodSchema<any>> = {
  quiz: QuizConfigSchema,
  'market-simulation': MarketConfigSchema
};

export function validateActivityConfig(type: ActivityType, config: any) {
  const schema = activitySchemas[type];
  if (!schema) {
    throw new Error(`Unknown activity type: ${type}`);
  }
  return schema.parse(config);
}
