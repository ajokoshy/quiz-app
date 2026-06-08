import { z } from 'zod';

// ── LOGIN ─────────────────────────────────────────────────
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(64),
  password: z.string().min(1, 'Password is required').max(128),
});

// ── QUIZ CREATION ─────────────────────────────────────────
export const QuestionSchema = z.object({
  question_text: z.string().min(1, 'Question text is required').max(1000),
  option_a: z.string().min(1, 'Option A is required').max(500),
  option_b: z.string().min(1, 'Option B is required').max(500),
  option_c: z.string().min(1, 'Option C is required').max(500),
  option_d: z.string().min(1, 'Option D is required').max(500),
  correct_option: z.enum(['A', 'B', 'C', 'D'], {
    errorMap: () => ({ message: 'Correct option must be A, B, C, or D' }),
  }),
});

export const CreateQuizSchema = z.object({
  title: z.string().min(1, 'Quiz title is required').max(200),
  questions: z.array(QuestionSchema)
    .length(10, 'Exactly 10 questions are required'),
});

// ── QUIZ UPDATE (single question) ─────────────────────────
export const UpdateQuestionSchema = QuestionSchema;

// ── SUBMIT ATTEMPT ────────────────────────────────────────
export const SubmitAttemptSchema = z.object({
  participant_name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be under 100 characters')
    .regex(/^[a-zA-Z0-9\s\-'.,()]+$/, 'Name contains invalid characters'),
  answers: z.record(
    z.string().uuid('Invalid question ID'),
    z.enum(['A', 'B', 'C', 'D'], {
      errorMap: () => ({ message: 'Answer must be A, B, C, or D' }),
    })
  ),
});

// ── HELPER: parse and return typed error ─────────────────
export function parseBody<T>(schema: z.ZodSchema<T>, data: unknown):
  | { success: true; data: T }
  | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const first = result.error.errors[0];
  return { success: false, error: first?.message || 'Invalid input' };
}
