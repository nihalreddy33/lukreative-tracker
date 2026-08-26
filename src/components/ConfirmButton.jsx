"use client";

import { useTransition } from "react";

export default function ConfirmButton({ action, message, children, className = "btn sm danger", name, value, hidden = {} }) {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) => start(() => action(fd))}
      onSubmit={(e) => {
        if (message && !window.confirm(message)) e.preventDefault();
      }}
      style={{ display: "inline" }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button className={className} type="submit" name={name} value={value} disabled={pending}>
        {pending ? "…" : children}
      </button>
    </form>
  );
}
