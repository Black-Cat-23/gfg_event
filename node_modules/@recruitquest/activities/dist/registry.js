import { QuizConfigSchema, MarketConfigSchema } from '@recruitquest/types';
export const activitySchemas = {
    quiz: QuizConfigSchema,
    'market-simulation': MarketConfigSchema
};
export function validateActivityConfig(type, config) {
    const schema = activitySchemas[type];
    if (!schema) {
        throw new Error(`Unknown activity type: ${type}`);
    }
    return schema.parse(config);
}
