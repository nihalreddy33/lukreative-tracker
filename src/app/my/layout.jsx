import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function MyLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <div className="nav-bar" style={{ position: "sticky" }}>
        <span className="nav-brand" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="Lukreative Studio" className="brand-logo" />
          <span className="brand-sub">My tasks</span>
        </span>
        <span className="row tight">
          {session.isAdmin ? (
            <a className="btn sm" href="/">Full dashboard</a>
          ) : null}
          <form action={logoutAction}>
            <button className="btn sm" type="submit">Sign out</button>
          </form>
        </span>
      </div>
      <main className="portal portal-body">{children}</main>
    </>
  );
}
