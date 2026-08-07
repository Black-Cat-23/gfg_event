import { z } from 'zod';

export const QuizQuestionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "Question text is required"),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  correct: z.number().int().min(0).optional(),
  timerSeconds: z.number().int().positive().default(30),
  points: z.number().int().positive().default(100),
  imageUrl: z.string().optional(),
  revealImageUrl: z.string().optional()
});

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuizScoringSchema = z.object({
  timeWindow: z.number().min(0).max(1).default(0.25),
  fullPointsWindow: z.boolean().default(true)
}).default({ timeWindow: 0.25, fullPointsWindow: true });

export const QuizConfigSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(1, "At least 1 question is required"),
  scoring: QuizScoringSchema,
  tieBreaker: z.enum(['total-response-time', 'total-correct', 'earlier-registration']).default('total-response-time')
});

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
  answers: Record<number, { selectedOption?: number; textAnswer?: string; lockedAt: string }>;
  isComplete: boolean;
}
