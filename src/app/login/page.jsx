import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/");
  return (
    <div className="centered">
      <div className="auth-card stack-v">
        <div className="row" style={{ justifyContent: "center", gap: 10 }}>
          <span className="nav-mark">L</span>
          <div>
            <strong style={{ fontSize: 16 }}>Lukreative Solutions</strong>
            <div className="small muted">Task Tracker</div>
          </div>
        </div>
        <LoginForm />
        <p className="small muted" style={{ textAlign: "center" }}>
          Clients don&apos;t sign in here — they use the share link you send them.
        </p>
      </div>
    </div>
  );
}
