import { z } from 'zod';

// Nepal phone format: 98XXXXXXXX, 97XXXXXXXX, +977-98XXXXXXXX, +977-97XXXXXXXX
export const nepalPhoneRegex = /^(?:\+977[- ]?)?(?:98|97)\d{8}$/;

export const createReviewerSchema = z.object({
  username: z
    .string()
    .min(4, 'Username must be between 4 and 20 characters')
    .max(20, 'Username must be between 4 and 20 characters')
    .regex(/^[a-zA-Z0-9._]+$/, 'Username can only contain letters, numbers, dots (.), and underscores (_)'),
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  phone: z
    .string()
    .trim()
    .regex(nepalPhoneRegex, 'Enter a valid Nepal mobile number (e.g. 98XXXXXXXX or +977-98XXXXXXXX)'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  sendCredentialsEmail: z.boolean(),
});

export type CreateReviewerInput = z.infer<typeof createReviewerSchema>;

export const updateReviewerSchema = z.object({
  id: z.string().min(1, 'Reviewer ID is required'),
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  phone: z
    .string()
    .trim()
    .regex(nepalPhoneRegex, 'Enter a valid Nepal mobile number (e.g. 98XXXXXXXX or +977-98XXXXXXXX)'),
});

export type UpdateReviewerInput = z.infer<typeof updateReviewerSchema>;
