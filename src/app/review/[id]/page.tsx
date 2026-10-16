import { redirect } from 'next/navigation';

interface ReviewLegacyPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Backward-compatible redirect from legacy /review/[id] to canonical /reviewer/[id]
 */
export default async function ReviewLegacyRedirectPage({ params }: ReviewLegacyPageProps) {
  const { id } = await params;
  redirect(`/reviewer/${id}`);
}
