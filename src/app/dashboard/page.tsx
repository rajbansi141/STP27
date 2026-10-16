import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/rbac';

export default async function DashboardPage() {
  // Enforce server-side authenticated session
  const currentUser = await requireAuth('/dashboard');

  // Seamlessly route each role to their dedicated, clean command center
  if (currentUser.role === 'ADMIN') {
    redirect('/admin');
  } else if (currentUser.role === 'REVIEWER') {
    redirect('/reviewer');
  } else {
    redirect('/applicant');
  }
}
