import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/");
  return (
    <div className="centered">
      <div className="auth-card stack-v">
        <div className="stack-v" style={{ alignItems: "center", gap: 6 }}>
          <img src="/logo.png" alt="Lukreative Studio" style={{ width: 210, height: "auto" }} />
          <div className="small muted">Task Tracker</div>
        </div>
        <LoginForm />
        <p className="small muted" style={{ textAlign: "center" }}>
          Clients don&apos;t sign in here — they use the share link you send them.
        </p>
      </div>
    </div>
  );
}
