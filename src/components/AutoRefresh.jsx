"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a read-only dashboard current.
 *
 * Next caches the payload for a route on the client, so arriving here from
 * elsewhere in the app could show what the page looked like earlier — someone
 * completes a task on the task list, opens reminders, and still sees it. This
 * refetches on arrival, whenever the tab is brought back to the front, and on a
 * slow interval while it is being watched.
 */
export default function AutoRefresh({ intervalMs = 60000, label }) {
  const router = useRouter();
  const [updated, setUpdated] = useState(label ?? null);
  const timer = useRef(null);

  useEffect(() => {
    const refresh = () => {
      router.refresh();
      setUpdated(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date())
      );
    };

    refresh(); // arriving from a cached navigation

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);

    if (intervalMs > 0) {
      timer.current = setInterval(() => {
        if (document.visibilityState === "visible") refresh();
      }, intervalMs);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
      if (timer.current) clearInterval(timer.current);
    };
    // Deliberately once per mount: re-running would restart the interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!updated) return null;
  return <span className="small muted nowrap">Updated {updated}</span>;
}
