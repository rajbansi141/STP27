import { z } from 'zod';

/**
 * Counts words separated by whitespace.
 * Works uniformly for both English and Nepali (Devanagari uses spaces between words).
 */
export function countWords(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export const MIN_ESSAY_WORDS = 150;

// Section 1: Personal Info
export const personalInfoSchema = z.object({
  fullName: z.string().min(2, 'Full name is required.').trim(),
  dob: z.string().min(1, 'Date of birth is required.'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  nationality: z.string().min(1, 'Nationality is required.').default('Nepali'),
  contactNumber: z.string().min(7, 'Please provide a valid contact number.').trim(),
  email: z.string().email(),
  // Current Address
  currentCountry: z.string().min(1, 'Country is required.').default('Nepal'),
  currentProvince: z.string().min(1, 'State/Province is required.'),
  currentMunicipality: z.string().min(1, 'Municipality is required.'),
  currentWard: z.string().min(1, 'Ward number is required.'),
  // Permanent Address
  sameAsCurrent: z.boolean().default(false),
  permanentCountry: z.string().min(1, 'Permanent country is required.').default('Nepal'),
  permanentProvince: z.string().min(1, 'Permanent province is required.'),
  permanentMunicipality: z.string().min(1, 'Permanent municipality is required.'),
  permanentWard: z.string().min(1, 'Permanent ward number is required.'),
});

// Section 2: Education
export const educationSchema = z.object({
  highestLevel: z.string().min(1, 'Highest level of education is required.'),
  fieldOfStudy: z.string().min(1, 'Field of study is required.').trim(),
  university: z.string().min(1, 'University or college name is required.').trim(),
  gradYear: z.string().min(4, 'Graduation year is required.').trim(),
  slcDivision: z.string().min(1, 'SLC/SEE division or GPA is required.').trim(),
});

// Section 3: Work Experience row
export const experienceRowSchema = z.object({
  organization: z.string().min(1, 'Organization name is required.'),
  role: z.string().min(1, 'Position / Role is required.'),
  durationYears: z.string().min(1, 'Duration is required.'),
  description: z.string().min(1, 'Description of responsibilities is required.'),
});

export const experienceSectionSchema = z.object({
  experiences: z.array(experienceRowSchema).min(1, 'Please add your experience or write NA.'),
});

// Section 4: Essays (min 150 words each)
export const essaysSchema = z.object({
  essay1: z
    .string()
    .min(1, 'Essay 1 is required.')
    .refine((val) => countWords(val) >= MIN_ESSAY_WORDS, {
      message: `Essay 1 must be at least ${MIN_ESSAY_WORDS} words (currently ${MIN_ESSAY_WORDS} min required).`,
    }),
  essay2: z
    .string()
    .min(1, 'Essay 2 is required.')
    .refine((val) => countWords(val) >= MIN_ESSAY_WORDS, {
      message: `Essay 2 must be at least ${MIN_ESSAY_WORDS} words (currently ${MIN_ESSAY_WORDS} min required).`,
    }),
  essay3: z
    .string()
    .min(1, 'Essay 3 is required.')
    .refine((val) => countWords(val) >= MIN_ESSAY_WORDS, {
      message: `Essay 3 must be at least ${MIN_ESSAY_WORDS} words (currently ${MIN_ESSAY_WORDS} min required).`,
    }),
});

// Section 5: Commitment & CV
export const commitmentSchema = z.object({
  commitment2Years: z.enum(['yes', 'no']),
  preServiceTraining: z.enum(['yes', 'no']),
  villageEmpowerment: z.enum(['yes', 'no']).optional(),
  opportunityDistribution: z.enum(['yes', 'no']).optional(),
  teachingSubject: z.enum(['english', 'math', 'grade_teaching']),
  cvFileName: z.string().min(1, 'Please attach your CV.'),
  cvFileUrl: z.string().min(1, 'CV file attachment is required.'),
});

// Full Application Schema
export const fullApplicationSchema = personalInfoSchema
  .merge(educationSchema)
  .merge(experienceSectionSchema)
  .merge(essaysSchema)
  .merge(commitmentSchema)
  .extend({
    declarationAgreed: z.literal(true),
  });

export type FullApplicationInput = z.infer<typeof fullApplicationSchema>;
export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type ExperienceRowInput = z.infer<typeof experienceRowSchema>;
export type EssaysInput = z.infer<typeof essaysSchema>;
export type CommitmentInput = z.infer<typeof commitmentSchema>;
