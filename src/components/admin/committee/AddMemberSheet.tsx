'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Sparkles,
  UserPlus,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  createReviewer,
  updateReviewer,
  generateSecurePassword,
  checkUsernameAvailability,
} from '@/app/api/admin/committee/actions';
import {
  createReviewerSchema,
  updateReviewerSchema,
} from '@/lib/validations/reviewer';
import type { z } from 'zod';

interface AddMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (credentials: { username: string; email: string; password: string }) => void;
  initialData?: {
    id: string;
    username: string | null;
    email: string;
    reviewerProfile?: {
      phone?: string | null;
    } | null;
  } | null;
}

type CreateFormValues = z.infer<typeof createReviewerSchema>;

function computePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  hasLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
} {
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  let score = 0;
  if (hasLength) score += 25;
  if (hasUpper) score += 25;
  if (hasLower) score += 25;
  if (hasNumber) score += 25;

  let label = 'Weak';
  let color = 'bg-red-500';

  if (score >= 100) {
    label = 'Strong';
    color = 'bg-emerald-500';
  } else if (score >= 75) {
    label = 'Good';
    color = 'bg-teal-500';
  } else if (score >= 50) {
    label = 'Fair';
    color = 'bg-amber-500';
  }

  return {
    score,
    label,
    color,
    hasLength,
    hasUpper,
    hasLower,
    hasNumber,
  };
}

export function AddMemberSheet({
  open,
  onOpenChange,
  onSuccess,
  initialData = null,
}: AddMemberSheetProps) {
  const { t, locale } = useI18n();
  const isEditing = Boolean(initialData);

  const [showPassword, setShowPassword] = React.useState(false);
  const [copiedPass, setCopiedPass] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Live username availability state
  const [isCheckingUsername, setIsCheckingUsername] = React.useState(false);
  const [usernameStatus, setUsernameStatus] = React.useState<{
    available?: boolean;
    message?: string;
  } | null>(null);

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createReviewerSchema),
    defaultValues: {
      username: '',
      email: '',
      phone: '',
      password: '',
      sendCredentialsEmail: true,
    },
    mode: 'onTouched',
  });

  const { watch, setValue, reset, trigger } = form;
  const watchedPassword = watch('password') || '';
  const watchedUsername = watch('username') || '';
  const strength = computePasswordStrength(watchedPassword);

  // Live username check with debounce
  React.useEffect(() => {
    if (isEditing) return;
    const trimmed = watchedUsername.trim();
    if (!trimmed || trimmed.length < 4) {
      setUsernameStatus(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const result = await checkUsernameAvailability(trimmed);
        setUsernameStatus(result);
      } catch {
        setUsernameStatus(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [watchedUsername, isEditing]);

  // Reset form when sheet opens/closes or initialData changes
  React.useEffect(() => {
    if (open) {
      setServerError(null);
      setUsernameStatus(null);
      if (initialData) {
        reset({
          username: initialData.username || '',
          email: initialData.email || '',
          phone: initialData.reviewerProfile?.phone || '',
          password: 'TemporaryPassword123!', // Placeholder for edit mode
          sendCredentialsEmail: false,
        });
      } else {
        reset({
          username: '',
          email: '',
          phone: '',
          password: '',
          sendCredentialsEmail: true,
        });
      }
    }
  }, [open, initialData, reset]);

  const handleGeneratePassword = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateSecurePassword();
      setValue('password', generated, { shouldValidate: true, shouldDirty: true });
      setShowPassword(true);
    } catch (err) {
      console.error('Password generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPassword = () => {
    if (!watchedPassword) return;
    navigator.clipboard.writeText(watchedPassword);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const onSubmit = async (values: CreateFormValues) => {
    setServerError(null);
    try {
      if (isEditing && initialData) {
        await updateReviewer({
          id: initialData.id,
          email: values.email,
          phone: values.phone,
        });
        onOpenChange(false);
      } else {
        const res = await createReviewer(values);
        if (res.success && res.credentials) {
          onOpenChange(false);
          onSuccess(res.credentials);
        }
      }
    } catch (err: any) {
      setServerError(err?.message || 'An unexpected error occurred while saving.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col h-full bg-background"
      >
        <SheetHeader className="p-6 border-b border-border/60">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <UserPlus className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {locale === 'ne' ? 'छनोट समिति' : 'Selection Committee'}
            </span>
          </div>
          <SheetTitle className="text-xl font-bold">
            {isEditing
              ? locale === 'ne'
                ? 'मूल्याङ्कनकर्ता सम्पादन'
                : 'Edit Reviewer'
              : locale === 'ne'
              ? 'नयाँ मूल्याङ्कनकर्ता थप्नुहोस्'
              : 'Add Reviewer'}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {isEditing
              ? locale === 'ne'
                ? 'मूल्याङ्कनकर्ताको इमेल र फोन नम्बर अद्यावधिक गर्नुहोस्।'
                : 'Update phone number and email address for this reviewer.'
              : locale === 'ne'
              ? 'छनोट प्रक्रियाका सबै चरणहरू मूल्याङ्कन गर्न नयाँ समिति सदस्य खाता बनाउनुहोस् (भूमिका: REVIEWER)।'
              : 'Create a new reviewer account to evaluate candidates across all selection stages (Role: REVIEWER).'}
          </SheetDescription>
        </SheetHeader>

        {serverError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <Form {...form}>
            <form id="reviewer-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* 1. Username Field */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {locale === 'ne' ? 'प्रयोगकर्ता नाम (Username)' : 'Username'}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          disabled={isEditing}
                          placeholder="e.g. rev.sharma"
                          autoCapitalize="none"
                          className="pr-9"
                        />
                        {isCheckingUsername && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                        {!isCheckingUsername && usernameStatus && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {usernameStatus.available ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    {!isEditing && usernameStatus && (
                      <p
                        className={`text-[11px] font-medium ${
                          usernameStatus.available ? 'text-emerald-600' : 'text-destructive'
                        }`}
                      >
                        {usernameStatus.available
                          ? locale === 'ne'
                            ? 'प्रयोगकर्ता नाम उपलब्ध छ'
                            : 'Username is available'
                          : locale === 'ne'
                          ? 'यो प्रयोगकर्ता नाम पहिले नै लिइसकिएको छ'
                          : 'Username is already taken'}
                      </p>
                    )}
                    <FormDescription>
                      {locale === 'ne'
                        ? '४-२० अक्षर, अङ्क, डट (.) वा अन्डरस्कोर (_)'
                        : '4-20 chars: letters, numbers, dot (.), or underscore (_)'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 2. Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{locale === 'ne' ? 'इमेल (Email)' : 'Email'}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="reviewer@example.com"
                        autoCapitalize="none"
                      />
                    </FormControl>
                    <FormDescription>
                      {locale === 'ne'
                        ? 'प्रमाणीकरण र सूचनाका लागि अद्वितीय इमेल'
                        : 'Unique email address for portal access and notifications'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 3. Phone Field */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{locale === 'ne' ? 'सम्पर्क नम्बर (Phone)' : 'Phone'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="98XXXXXXXX or +977-98XXXXXXXX" />
                    </FormControl>
                    <FormDescription>
                      {locale === 'ne'
                        ? 'नेपाल मोबाइल ढाँचा (९८XXXXXXXX वा +९७७-९८XXXXXXXX)'
                        : 'Nepal mobile format (98XXXXXXXX or +977-98XXXXXXXX)'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 4. Password Field (only in create mode) */}
              {!isEditing && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormLabel>
                          {locale === 'ne' ? 'अस्थायी पासवर्ड (Password)' : 'Password'}
                        </FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleGeneratePassword}
                          disabled={isGenerating}
                          className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2 gap-1"
                        >
                          {isGenerating ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          <span>{locale === 'ne' ? 'स्वतः सिर्जना' : 'Generate'}</span>
                        </Button>
                      </div>

                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Min 8 characters with upper, lower, number"
                            className="pr-20 font-mono text-xs"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {watchedPassword && (
                              <button
                                type="button"
                                onClick={handleCopyPassword}
                                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy password"
                              >
                                {copiedPass ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                              title={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </FormControl>

                      {/* Password Strength Meter */}
                      {watchedPassword && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">
                              {locale === 'ne' ? 'पासवर्ड सामर्थ्य:' : 'Password strength:'}
                            </span>
                            <span className="font-semibold text-foreground">
                              {strength.label}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${strength.color}`}
                              style={{ width: `${strength.score}%` }}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground pt-0.5">
                            <span className={strength.hasLength ? 'text-emerald-600 font-medium' : ''}>
                              {strength.hasLength ? '✓' : '•'} 8+ characters
                            </span>
                            <span className={strength.hasUpper ? 'text-emerald-600 font-medium' : ''}>
                              {strength.hasUpper ? '✓' : '•'} Uppercase (A-Z)
                            </span>
                            <span className={strength.hasLower ? 'text-emerald-600 font-medium' : ''}>
                              {strength.hasLower ? '✓' : '•'} Lowercase (a-z)
                            </span>
                            <span className={strength.hasNumber ? 'text-emerald-600 font-medium' : ''}>
                              {strength.hasNumber ? '✓' : '•'} Number (0-9)
                            </span>
                          </div>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* 5. Checkbox: Send Credentials Email */}
              {!isEditing && (
                <FormField
                  control={form.control}
                  name="sendCredentialsEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-border/80 p-4 bg-muted/30">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-600 mt-0.5 cursor-pointer accent-emerald-600"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer text-xs font-semibold">
                          {locale === 'ne'
                            ? 'यी विवरणहरू मूल्याङ्कनकर्तालाई इमेल गर्नुहोस्'
                            : 'Email these credentials to the reviewer'}
                        </FormLabel>
                        <FormDescription className="text-[11px]">
                          {locale === 'ne'
                            ? 'लगइन निर्देशन सहितको स्वचालित इमेल पठाइनेछ'
                            : 'An automated onboarding email will be queued immediately'}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </form>
          </Form>
        </div>

        <SheetFooter className="p-6 border-t border-border/60 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={form.formState.isSubmitting}
          >
            {locale === 'ne' ? 'रद्द गर्नुहोस्' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            form="reviewer-form"
            disabled={form.formState.isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[130px]"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>{locale === 'ne' ? 'सुरक्षित गर्दै...' : 'Saving...'}</span>
              </>
            ) : isEditing ? (
              locale === 'ne' ? 'अपडेट गर्नुहोस्' : 'Save Changes'
            ) : (
              locale === 'ne' ? 'सिर्जना गर्नुहोस्' : 'Create Reviewer'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
