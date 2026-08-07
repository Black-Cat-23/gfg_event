import { z } from 'zod';

export type DecisionAction = 'buy' | 'sell' | 'hold';

export const CompanySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Company name is required"),
  initialPrice: z.number().positive("Price must be positive")
});

export type Company = z.infer<typeof CompanySchema>;

export const MarketScenarioSchema = z.object({
  round: z.number().int().positive(),
  title: z.string().min(1, "Scenario title is required"),
  description: z.string(),
  decisionSeconds: z.number().int().positive().default(45),
  effects: z.record(z.string(), z.number()) // company name -> price multiplier change e.g. 0.15 for +15%
});

export type MarketScenario = z.infer<typeof MarketScenarioSchema>;

export const MarketConfigSchema = z.object({
  startingCash: z.number().positive().default(10000),
  companies: z.array(CompanySchema).min(1, "At least one company is required"),
  rounds: z.array(MarketScenarioSchema).min(1, "At least one round scenario is required"),
  decision: z.object({
    default: z.enum(['buy', 'sell', 'hold']).default('hold')
  }).default({ default: 'hold' }),
  mode: z.enum(['reactive', 'predict-first']).default('reactive')
});

export type MarketConfig = z.infer<typeof MarketConfigSchema>;

export interface MarketSubmissionPayload {
  roundIndex: number;
  decisions: Record<string, DecisionAction>; // company name/id -> action
}

export interface Portfolio {
  cash: number;
  holdings: Record<string, number>; // company name -> number of shares
  totalValue: number;
}
