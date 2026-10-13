'use client';

import { usePathname } from 'next/navigation';
import { PublicNavbar } from '@/components/layout/public-navbar';

export function Navbar() {
  const pathname = usePathname();

  // Hide on all dashboard routes
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/reviewer') ||
    pathname.startsWith('/applicant') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/review')
  ) {
    return null;
  }

  return <PublicNavbar />;
}
