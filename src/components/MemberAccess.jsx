"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMemberAccount, removeMemberPassword } from "@/lib/actions";

/**
 * Sign-in settings for one member.
 *
 * Rendered as an overlay rather than inside the table row: a card that wide
 * inside a <td> bursts the table's layout and gets clipped at the edge.
 */
export default function MemberAccess({ member }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(member.isAdmin ? "yes" : "no");
  const [pending, start] = useTransition();
  const router = useRouter();

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const openPanel = () => {
    // Re-seed from the row each time, so the panel always opens showing what
    // is actually stored rather than a stale choice from last time.
    setIsAdmin(member.isAdmin ? "yes" : "no");
    setError(null);
    setOpen(true);
  };

  const save = (fd) =>
    start(async () => {
      const res = await updateMemberAccount(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      close();
    });

  const clearPassword = () =>
    start(async () => {
      if (!window.confirm(`Remove ${member.name}'s password? They won't be able to sign in until you set a new one. Their tasks are untouched.`)) return;
      const fd = new FormData();
      fd.append("id", String(member.id));
      await removeMemberPassword(fd);
      router.refresh();
      close();
    });

  if (!open) {
    return (
      <button className="btn sm" onClick={openPanel}>
        {member.passwordHash ? "Access" : "Set password"}
      </button>
    );
  }

  return (
    <>
      <div className="modal-scrim" onClick={close} />
      <div className="modal" role="dialog" aria-label={`Sign-in for ${member.name}`}>
        <header className="card-head">
          <h2>{member.name}</h2>
          <button className="btn ghost sm" onClick={close}>Close</button>
        </header>

        <form className="modal-body form-grid" action={save}>
          <input type="hidden" name="id" value={member.id} />

          <label className="field span-2">
            <span>{member.passwordHash ? "New password" : "Password"}</span>
            <input
              type="text"
              name="password"
              autoComplete="off"
              placeholder={member.passwordHash ? "Leave blank to keep the current one" : "At least 6 characters"}
            />
          </label>

          <label className="field span-2">
            <span>Email (optional)</span>
            <input
              type="email"
              name="email"
              defaultValue={member.email}
              placeholder="Can also be used to sign in"
            />
          </label>

          <label className="field span-4">
            <span>Access level</span>
            <select name="isAdmin" value={isAdmin} onChange={(e) => setIsAdmin(e.target.value)}>
              <option value="no">Member — sees only their own tasks</option>
              <option value="yes">Admin — full dashboard</option>
            </select>
          </label>

          <p className="small muted span-4">
            {member.name} signs in with their name and password.
            {member.passwordHash
              ? " Setting a new password signs them out everywhere."
              : " They can't sign in until a password is set."}
          </p>

          {error ? <div className="notice err span-4">{error}</div> : null}

          <div className="span-4 spread">
            <span className="row tight">
              <button className="btn primary" type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </button>
              <button className="btn ghost" type="button" onClick={close}>Cancel</button>
            </span>
            {member.passwordHash ? (
              <button className="btn danger sm" type="button" onClick={clearPassword} disabled={pending}>
                Remove password
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </>
  );
}
