"use client";

import { useState } from "react";

export default function CopyTeamMessage({ message }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this message:", message);
    }
  };

  return (
    <button className="btn" onClick={copy}>
      {copied ? "Copied ✓" : "Copy whole team"}
    </button>
  );
}
