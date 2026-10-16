'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useI18n } from '@/lib/i18n';

export function PublicNavbar() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/', label: t?.nav?.home || 'Home' },
    { href: '/process', label: t?.nav?.process || 'Process' },
    { href: '/help', label: t?.nav?.help || 'Help' },
  ];

  // Hide on all console/dashboard routes
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/reviewer') ||
    pathname.startsWith('/applicant') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/review')
  ) {
    return null;
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        isScrolled
          ? 'border-b bg-background/90 backdrop-blur-md shadow-xs'
          : 'border-b border-transparent bg-background/70 backdrop-blur-xs'
      }`}
    >
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90 group">
          <div className="flex h-10 w-auto items-center">
            <Image
              src="/saathi-logo.png"
              alt="Saathi Teachers Programme Logo"
              width={130}
              height={44}
              className="h-9 w-auto object-contain dark:brightness-110"
              priority
            />
          </div>
          <div className="flex flex-col border-l border-stone-200 dark:border-stone-800 pl-3">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm leading-none tracking-tight">STP 2027</span>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-800 dark:text-emerald-300">
                Nepal
              </span>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
              {locale === 'ne' ? 'साथी शिक्षक कार्यक्रम' : 'Saathi Teachers Programme'}
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links (Max 4) */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-foreground ${
                  isActive ? 'text-emerald-600 font-semibold dark:text-emerald-400' : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Language Toggle */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`rounded-md px-2.5 py-1 transition-all ${
                locale === 'en'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale('ne')}
              className={`rounded-md px-2.5 py-1 transition-all ${
                locale === 'ne'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ने
            </button>
          </div>

          <Link
            href="/login"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            {t?.common?.login || 'Sign In'}
          </Link>

          <Link
            href="/apply"
            className={buttonVariants({
              size: 'sm',
              className: 'bg-emerald-600 font-semibold text-white shadow-xs hover:bg-emerald-700',
            })}
          >
            {t?.nav?.applyNow || 'Become A Saathi Teacher'}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Sheet */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Language Toggle */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`rounded px-1.5 py-0.5 ${locale === 'en' ? 'bg-background font-bold shadow-xs' : 'text-muted-foreground'}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale('ne')}
              className={`rounded px-1.5 py-0.5 ${locale === 'ne' ? 'bg-background font-bold shadow-xs' : 'text-muted-foreground'}`}
            >
              ने
            </button>
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-muted">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 sm:w-80">
              <SheetHeader className="text-left pb-4 border-b">
                <SheetTitle className="flex items-center gap-2.5">
                  <div className="flex h-8 w-auto items-center">
                    <Image
                      src="/saathi-logo.png"
                      alt="Saathi Teachers Programme Logo"
                      width={100}
                      height={36}
                      className="h-7 w-auto object-contain dark:brightness-110"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold leading-none">STP 2027</span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {locale === 'ne' ? 'साथी शिक्षक' : 'Saathi Teachers'}
                    </span>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 py-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-base font-medium text-foreground/80 hover:text-emerald-600 transition-colors py-1"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-4 border-t flex flex-col gap-3">
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className={buttonVariants({ variant: 'outline', className: 'w-full justify-center' })}
                  >
                    {t?.common?.login || 'Sign In'}
                  </Link>
                  <Link
                    href="/apply"
                    onClick={() => setIsOpen(false)}
                    className={buttonVariants({
                      className: 'w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white',
                    })}
                  >
                    {t?.nav?.applyNow || 'Become A Saathi Teacher'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
