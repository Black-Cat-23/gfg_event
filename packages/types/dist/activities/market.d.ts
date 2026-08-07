import { z } from 'zod';
export type DecisionAction = 'buy' | 'sell' | 'hold';
export declare const CompanySchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    initialPrice: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    initialPrice: number;
    id?: string | undefined;
}, {
    name: string;
    initialPrice: number;
    id?: string | undefined;
}>;
export type Company = z.infer<typeof CompanySchema>;
export declare const MarketScenarioSchema: z.ZodObject<{
    round: z.ZodNumber;
    title: z.ZodString;
    description: z.ZodString;
    decisionSeconds: z.ZodDefault<z.ZodNumber>;
    effects: z.ZodRecord<z.ZodString, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    title: string;
    round: number;
    description: string;
    decisionSeconds: number;
    effects: Record<string, number>;
}, {
    title: string;
    round: number;
    description: string;
    effects: Record<string, number>;
    decisionSeconds?: number | undefined;
}>;
export type MarketScenario = z.infer<typeof MarketScenarioSchema>;
export declare const MarketConfigSchema: z.ZodObject<{
    startingCash: z.ZodDefault<z.ZodNumber>;
    companies: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        initialPrice: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        initialPrice: number;
        id?: string | undefined;
    }, {
        name: string;
        initialPrice: number;
        id?: string | undefined;
    }>, "many">;
    rounds: z.ZodArray<z.ZodObject<{
        round: z.ZodNumber;
        title: z.ZodString;
        description: z.ZodString;
        decisionSeconds: z.ZodDefault<z.ZodNumber>;
        effects: z.ZodRecord<z.ZodString, z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        round: number;
        description: string;
        decisionSeconds: number;
        effects: Record<string, number>;
    }, {
        title: string;
        round: number;
        description: string;
        effects: Record<string, number>;
        decisionSeconds?: number | undefined;
    }>, "many">;
    decision: z.ZodDefault<z.ZodObject<{
        default: z.ZodDefault<z.ZodEnum<["buy", "sell", "hold"]>>;
    }, "strip", z.ZodTypeAny, {
        default: "buy" | "sell" | "hold";
    }, {
        default?: "buy" | "sell" | "hold" | undefined;
    }>>;
    mode: z.ZodDefault<z.ZodEnum<["reactive", "predict-first"]>>;
}, "strip", z.ZodTypeAny, {
    startingCash: number;
    companies: {
        name: string;
        initialPrice: number;
        id?: string | undefined;
    }[];
    rounds: {
        title: string;
        round: number;
        description: string;
        decisionSeconds: number;
        effects: Record<string, number>;
    }[];
    decision: {
        default: "buy" | "sell" | "hold";
    };
    mode: "reactive" | "predict-first";
}, {
    companies: {
        name: string;
        initialPrice: number;
        id?: string | undefined;
    }[];
    rounds: {
        title: string;
        round: number;
        description: string;
        effects: Record<string, number>;
        decisionSeconds?: number | undefined;
    }[];
    startingCash?: number | undefined;
    decision?: {
        default?: "buy" | "sell" | "hold" | undefined;
    } | undefined;
    mode?: "reactive" | "predict-first" | undefined;
}>;
export type MarketConfig = z.infer<typeof MarketConfigSchema>;
export interface MarketSubmissionPayload {
    roundIndex: number;
    decisions: Record<string, DecisionAction>;
}
export interface Portfolio {
    cash: number;
    holdings: Record<string, number>;
    totalValue: number;
}
//# sourceMappingURL=market.d.ts.map