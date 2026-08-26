"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="card card-body stack-v">
      <label className="field">
        <span>Your name</span>
        <input
          type="text"
          name="identifier"
          autoFocus
          autoComplete="username"
          placeholder="e.g. Pavan"
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input type="password" name="password" required autoComplete="current-password" />
      </label>
      {state?.error ? <div className="notice err">{state.error}</div> : null}
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
