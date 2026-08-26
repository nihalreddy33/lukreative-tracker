"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="card card-body stack-v">
      <label className="field">
        <span>Team password</span>
        <input type="password" name="password" autoFocus required />
      </label>
      {state?.error ? <div className="notice err">{state.error}</div> : null}
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
