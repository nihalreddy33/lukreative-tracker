"use client";

import { useRef, useTransition } from "react";

/**
 * A form that submits itself as soon as a control inside it changes, and shows
 * a subtle pending state. Used for the inline edits in the task table so a
 * status change is one click rather than click-edit-save.
 */
export default function AutoForm({ action, children, className, style }) {
  const ref = useRef(null);
  const [pending, start] = useTransition();

  return (
    <form
      ref={ref}
      className={className}
      style={{ ...style, opacity: pending ? 0.5 : 1 }}
      action={(fd) => start(() => action(fd))}
      onChange={() => ref.current?.requestSubmit()}
    >
      {children}
    </form>
  );
}
