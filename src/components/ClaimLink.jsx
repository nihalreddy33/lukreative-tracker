"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { claimClientLink } from "@/lib/actions";

/**
 * Trades the ?k= token in the URL for a cookie, then strips it from the
 * address bar. Keeps the secret out of screenshots, browser history and
 * anything the client pastes later, while later visits still work.
 */
export default function ClaimLink({ slug, token }) {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await claimClientLink(slug, token);
      if (!cancelled) router.replace(`/c/${slug}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, token, router]);
  return null;
}
