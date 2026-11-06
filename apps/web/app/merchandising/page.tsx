'use client';
// The old native merchandising module was removed. Any old link to /merchandising lands on the real module.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function MerchandisingRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/merchandising-bulk'); }, [router]);
  return null;
}
