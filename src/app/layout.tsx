import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { getServerLocale } from '@/lib/i18n/server';
import { I18nProvider } from '@/lib/i18n/context';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { Footer } from '@/components/layout/Footer';
import { cn } from "@/lib/utils";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Saathi Teachers Programme (STP) 2027 | साथी शिक्षक कार्यक्रम २०२७',
  description:
    'Saathi Teacher Recruitment and Selection Management Portal for Saathi Teachers Programme Cohort 2027.',
  icons: {
    icon: [
      { url: '/saathi-logo.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/saathi-logo.png',
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/saathi-logo.png' },
    ],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      className={cn("h-full", "antialiased", plusJakartaSans.variable, notoSansDevanagari.variable, inter.variable, "font-sans")}
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200"
      >
        <I18nProvider initialLocale={locale}>
          <PublicNavbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
