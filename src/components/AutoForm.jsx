"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * A form that submits itself as soon as a control inside it changes, and shows
 * a subtle pending state. Used for the inline edits in the task table so a
 * status change is one click rather than click-edit-save.
 *
 * The action is awaited and followed by an explicit refresh: a transition that
 * doesn't await leaves React unaware the action is still running, so the
 * revalidation never reaches the router and derived UI — overdue badges,
 * sidebar counts, the completion date — stays stale until a manual reload.
 */
export default function AutoForm({ action, children, className, style }) {
  const ref = useRef(null);
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <form
      ref={ref}
      className={className}
      style={{ ...style, opacity: pending ? 0.5 : 1 }}
      action={(fd) =>
        start(async () => {
          await action(fd);
          router.refresh();
        })
      }
      onChange={() => ref.current?.requestSubmit()}
    >
      {children}
    </form>
  );
}
