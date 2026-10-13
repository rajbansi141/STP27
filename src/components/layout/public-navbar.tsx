'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Menu, ArrowRight } from 'lucide-react';
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
    { href: '/vacancy', label: t?.nav?.vacancy || 'Vacancy' },
    { href: '/process', label: t?.nav?.process || 'Process' },
    { href: '/help', label: t?.nav?.help || 'Help' },
  ];

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
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <GraduationCap className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base leading-none tracking-tight">STP 2027</span>
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
            {t?.nav?.applyNow || 'Apply Now'}
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
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <GraduationCap className="size-4" />
                  </div>
                  <span>STP 2027</span>
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
                    {t?.nav?.applyNow || 'Apply Now'}
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
