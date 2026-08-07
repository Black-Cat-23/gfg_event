import { z } from 'zod';
export declare const QuizQuestionSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    text: z.ZodString;
    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    correctAnswer: z.ZodOptional<z.ZodString>;
    correct: z.ZodOptional<z.ZodNumber>;
    timerSeconds: z.ZodDefault<z.ZodNumber>;
    points: z.ZodDefault<z.ZodNumber>;
    imageUrl: z.ZodOptional<z.ZodString>;
    revealImageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    text: string;
    timerSeconds: number;
    points: number;
    options?: string[] | undefined;
    id?: string | undefined;
    correctAnswer?: string | undefined;
    correct?: number | undefined;
    imageUrl?: string | undefined;
    revealImageUrl?: string | undefined;
}, {
    text: string;
    options?: string[] | undefined;
    id?: string | undefined;
    correctAnswer?: string | undefined;
    correct?: number | undefined;
    timerSeconds?: number | undefined;
    points?: number | undefined;
    imageUrl?: string | undefined;
    revealImageUrl?: string | undefined;
}>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export declare const QuizScoringSchema: z.ZodDefault<z.ZodObject<{
    timeWindow: z.ZodDefault<z.ZodNumber>;
    fullPointsWindow: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    timeWindow: number;
    fullPointsWindow: boolean;
}, {
    timeWindow?: number | undefined;
    fullPointsWindow?: boolean | undefined;
}>>;
export declare const QuizConfigSchema: z.ZodObject<{
    questions: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        text: z.ZodString;
        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        correctAnswer: z.ZodOptional<z.ZodString>;
        correct: z.ZodOptional<z.ZodNumber>;
        timerSeconds: z.ZodDefault<z.ZodNumber>;
        points: z.ZodDefault<z.ZodNumber>;
        imageUrl: z.ZodOptional<z.ZodString>;
        revealImageUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        timerSeconds: number;
        points: number;
        options?: string[] | undefined;
        id?: string | undefined;
        correctAnswer?: string | undefined;
        correct?: number | undefined;
        imageUrl?: string | undefined;
        revealImageUrl?: string | undefined;
    }, {
        text: string;
        options?: string[] | undefined;
        id?: string | undefined;
        correctAnswer?: string | undefined;
        correct?: number | undefined;
        timerSeconds?: number | undefined;
        points?: number | undefined;
        imageUrl?: string | undefined;
        revealImageUrl?: string | undefined;
    }>, "many">;
    scoring: z.ZodDefault<z.ZodObject<{
        timeWindow: z.ZodDefault<z.ZodNumber>;
        fullPointsWindow: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        timeWindow: number;
        fullPointsWindow: boolean;
    }, {
        timeWindow?: number | undefined;
        fullPointsWindow?: boolean | undefined;
    }>>;
    tieBreaker: z.ZodDefault<z.ZodEnum<["total-response-time", "total-correct", "earlier-registration"]>>;
}, "strip", z.ZodTypeAny, {
    questions: {
        text: string;
        timerSeconds: number;
        points: number;
        options?: string[] | undefined;
        id?: string | undefined;
        correctAnswer?: string | undefined;
        correct?: number | undefined;
        imageUrl?: string | undefined;
        revealImageUrl?: string | undefined;
    }[];
    scoring: {
        timeWindow: number;
        fullPointsWindow: boolean;
    };
    tieBreaker: "total-response-time" | "total-correct" | "earlier-registration";
}, {
    questions: {
        text: string;
        options?: string[] | undefined;
        id?: string | undefined;
        correctAnswer?: string | undefined;
        correct?: number | undefined;
        timerSeconds?: number | undefined;
        points?: number | undefined;
        imageUrl?: string | undefined;
        revealImageUrl?: string | undefined;
    }[];
    scoring?: {
        timeWindow?: number | undefined;
        fullPointsWindow?: boolean | undefined;
    } | undefined;
    tieBreaker?: "total-response-time" | "total-correct" | "earlier-registration" | undefined;
}>;
export type QuizConfig = z.infer<typeof QuizConfigSchema>;
export interface QuizSubmissionPayload {
    questionIndex: number;
    selectedOption?: number;
    textAnswer?: string;
    responseTimeMs: number;
}
export interface TeamQuizState {
    currentQuestionIndex: number;
    totalQuestions: number;
    answers: Record<number, {
        selectedOption?: number;
        textAnswer?: string;
        lockedAt: string;
    }>;
    isComplete: boolean;
}
//# sourceMappingURL=quiz.d.ts.map