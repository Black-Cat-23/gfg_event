import { ActivityType } from '@recruitquest/types';
import { z } from 'zod';
export declare const activitySchemas: Record<ActivityType, z.ZodSchema<any>>;
export declare function validateActivityConfig(type: ActivityType, config: any): any;
//# sourceMappingURL=registry.d.ts.map