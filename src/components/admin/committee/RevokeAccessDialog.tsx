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
import { ShieldAlert } from 'lucide-react';
import { revokeMemberAccess } from '@/app/api/admin/committee/actions';
import { useI18n } from '@/lib/i18n';

interface RevokeAccessDialogProps {
  member: { id: string; name: string; email: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RevokeAccessDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
}: RevokeAccessDialogProps) {
  const { t, locale } = useI18n();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!member) return null;

  const handleRevoke = async () => {
    setIsSubmitting(true);
    try {
      await revokeMemberAccess(member.id);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('Failed to revoke access:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 mb-2">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">
            {(t?.committee as any)?.table?.revokeAccess || 'Revoke Committee Access'}
          </DialogTitle>
          <DialogDescription className="text-center text-xs sm:text-sm">
            Are you sure you want to revoke evaluation access for{' '}
            <strong className="text-foreground">{member.name}</strong> ({member.email})?
            This will immediately terminate all active reviewer sessions.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t?.common?.cancel || 'Cancel'}
          </Button>
          <Button
            onClick={handleRevoke}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting ? 'Revoking...' : 'Confirm Revoke'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
