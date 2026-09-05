"use client";

import { useState, useTransition } from "react";
import { sendWhatsAppReminder } from "@/lib/actions";

/**
 * Sends one person's reminder through Interakt.
 *
 * Until an API key is configured this reports exactly what would be sent
 * rather than failing quietly, so the template and number can be checked
 * before any message actually goes out.
 */
export default function SendWhatsApp({ memberId, name, hasPhone }) {
  const [state, setState] = useState(null);
  const [pending, start] = useTransition();

  if (!memberId) return null;

  const send = () =>
    start(async () => {
      setState(null);
      const fd = new FormData();
      fd.append("memberId", String(memberId));
      setState(await sendWhatsAppReminder(fd));
    });

  return (
    <>
      <button
        className="btn sm"
        onClick={send}
        disabled={pending || !hasPhone}
        title={hasPhone ? `Send ${name} their reminder on WhatsApp` : "No WhatsApp number saved — add one on the Team page"}
      >
        {pending ? "Sending…" : "WhatsApp"}
      </button>

      {state?.error ? <span className="pill red">{state.error}</span> : null}
      {state?.ok ? <span className="pill green">Sent to {state.sentTo}</span> : null}
      {state?.preview ? (
        <span className="pill amber" title={`template: ${state.template}\nvalues: ${state.bodyValues.join(" | ")}`}>
          Not configured — would send: {state.bodyValues.join(" · ")}
        </span>
      ) : null}
    </>
  );
}
