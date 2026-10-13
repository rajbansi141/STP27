'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, Copy, KeyRound, ShieldAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Credentials {
  username: string;
  email: string;
  password: string;
}

interface OneTimeCredentialsDialogProps {
  credentials: Credentials | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OneTimeCredentialsDialog({
  credentials,
  open,
  onOpenChange,
}: OneTimeCredentialsDialogProps) {
  const { t, locale } = useI18n();
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!credentials) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyAll = () => {
    const fullText = `Saathi Teachers Selection Committee Portal Credentials:\nUsername: ${credentials.username}\nEmail: ${credentials.email}\nTemporary Password: ${credentials.password}\nLogin URL: ${window.location.origin}/login`;
    copyToClipboard(fullText, 'all');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            {t?.committee?.oneTimeModal?.title || 'One-Time Reviewer Credentials'}
          </DialogTitle>
          <DialogDescription className="text-center text-xs sm:text-sm">
            {t?.committee?.oneTimeModal?.description ||
              'Please copy and securely record these credentials now. For security purposes, this password will not be shown again.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Username */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase">
                {t?.committee?.oneTimeModal?.usernameLabel || 'Username'}
              </span>
              <p className="font-mono text-sm font-bold text-foreground">
                {credentials.username}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(credentials.username, 'user')}
            >
              {copiedKey === 'user' ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase">
                {t?.committee?.oneTimeModal?.emailLabel || 'Email Address'}
              </span>
              <p className="font-mono text-sm font-semibold text-foreground">
                {credentials.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(credentials.email, 'email')}
            >
              {copiedKey === 'email' ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Password */}
          <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div>
              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 uppercase">
                {t?.committee?.oneTimeModal?.passwordLabel || 'Temporary Password'}
              </span>
              <p className="font-mono text-base font-extrabold text-foreground tracking-wide">
                {credentials.password}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(credentials.password, 'pass')}
            >
              {copiedKey === 'pass' ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Mandatory notice */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 border border-amber-500/20">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              {t?.committee?.oneTimeModal?.warning ||
                'The reviewer must change this password immediately upon their first sign-in.'}
            </span>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={copyAll} className="w-full sm:w-auto">
            {copiedKey === 'all' ? (
              <>
                <Check className="mr-2 h-4 w-4 text-emerald-600" />
                {t?.committee?.oneTimeModal?.copied || 'Copied!'}
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy All Credentials
              </>
            )}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {t?.committee?.oneTimeModal?.confirmButton || 'I Have Saved These Credentials'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
