"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMemberPassword, updateMemberAccess } from "@/lib/actions";

/** Sign-in settings for one team member, managed by an admin. */
export default function MemberAccess({ member }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (action, fd, note) =>
    start(async () => {
      const res = await action(fd);
      setMsg(res?.error ? { error: res.error } : { ok: note });
      if (!res?.error) router.refresh();
    });

  if (!open) {
    return (
      <button className="btn sm" onClick={() => setOpen(true)}>
        {member.passwordHash ? "Manage access" : "Set password"}
      </button>
    );
  }

  return (
    <div className="card card-body stack-v" style={{ gap: 12, marginTop: 8 }}>
      <div className="spread">
        <h3>{member.name} — sign-in</h3>
        <button className="btn ghost sm" onClick={() => setOpen(false)}>Close</button>
      </div>

      <form className="row" action={(fd) => run(setMemberPassword, fd, "Password updated.")}>
        <input type="hidden" name="id" value={member.id} />
        <input
          type="text"
          name="password"
          placeholder={member.passwordHash ? "New password" : "Set a password"}
          autoComplete="off"
          style={{ flex: 1 }}
        />
        <button className="btn primary" type="submit" disabled={pending}>Save</button>
      </form>
      <p className="small muted">
        They sign in with their name — <strong>{member.name}</strong> — and this password.
        Changing it signs them out everywhere. Saving an empty box removes their password
        and blocks sign-in, without touching their tasks.
      </p>

      <form className="row" action={(fd) => run(updateMemberAccess, fd, "Access updated.")}>
        <input type="hidden" name="id" value={member.id} />
        <input
          type="email"
          name="email"
          defaultValue={member.email}
          placeholder="Email (optional, can also be used to sign in)"
          style={{ flex: 1 }}
        />
        <select name="isAdmin" defaultValue={member.isAdmin ? "yes" : "no"} style={{ width: "auto" }}>
          <option value="no">Member — only their own tasks</option>
          <option value="yes">Admin — full dashboard</option>
        </select>
        <button className="btn" type="submit" disabled={pending}>Save</button>
      </form>

      {msg?.error ? <div className="notice err">{msg.error}</div> : null}
      {msg?.ok ? <div className="notice ok">{msg.ok}</div> : null}
    </div>
  );
}
