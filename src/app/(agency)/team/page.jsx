import { prisma } from "@/lib/prisma";
import ConfirmButton from "@/components/ConfirmButton";
import MemberAccess from "@/components/MemberAccess";
import { Card, StackBar, Empty } from "@/components/ui";
import { createMember, setMemberActive } from "@/lib/actions";
import { split } from "@/lib/metrics";
import { today, isOverdue } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const from = today();
  const [members, tasks] = await Promise.all([
    prisma.member.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.task.findMany({ select: { assigneeId: true, status: true, dueDate: true } }),
  ]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Team</h1>
          <p className="sub">
            Who work gets assigned to, how loaded each person is, and who can sign in.
            Members see only their own tasks; admins see everything.
          </p>
        </div>
      </header>

      <div className="stack-v">
        <Card title="Add team member">
          <form action={createMember} className="form-grid">
            <label className="field span-2">
              <span>Name</span>
              <input type="text" name="name" required placeholder="Krithveek" />
            </label>
            <label className="field span-2">
              <span>Role</span>
              <input type="text" name="role" placeholder="Performance marketing" />
            </label>
            <div className="span-4">
              <button className="btn primary" type="submit">Add member</button>
            </div>
          </form>
        </Card>

        <Card title="Members" bodyless>
          {members.length ? (
            <div className="table-wrap">
              <table className="tbl stack-mobile">
                <thead>
                  <tr>
                    <th>Name</th><th>Role</th><th>Sign-in</th><th className="num-cell">Open</th>
                    <th className="num-cell">Late</th><th style={{ width: 180 }}>Mix</th><th />
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const mine = tasks.filter((t) => t.assigneeId === m.id);
                    const s = split(mine, from);
                    const open = mine.filter((t) => t.status !== "Completed").length;
                    const late = mine.filter((t) => isOverdue(t, from)).length;
                    return (
                      <tr key={m.id} style={{ opacity: m.active ? 1 : 0.55 }}>
                        <td data-label="" className="t-title">{m.name}</td>
                        <td data-label="Role" className="small muted">{m.role || "—"}</td>
                        <td data-label="Sign-in">
                          {m.isAdmin ? (
                            <span className="pill brand">Admin</span>
                          ) : m.passwordHash ? (
                            <span className="pill green">Member</span>
                          ) : (
                            <span className="pill slate">No password</span>
                          )}
                        </td>
                        <td data-label="Open" className="num-cell">{open}</td>
                        <td data-label="Late" className="num-cell">
                          {late ? <span className="pill red">{late}</span> : <span className="muted">0</span>}
                        </td>
                        <td data-label="Mix"><StackBar {...s} /></td>
                        <td data-label="" className="nowrap">
                          <MemberAccess member={m} />
                          <ConfirmButton
                            action={setMemberActive}
                            className="btn sm ghost"
                            hidden={{ id: m.id, active: m.active ? "no" : "yes" }}
                            message={
                              m.active
                                ? `Mark ${m.name} inactive? They stop appearing in assignee dropdowns; existing tasks keep them.`
                                : null
                            }
                          >
                            {m.active ? "Deactivate" : "Reactivate"}
                          </ConfirmButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No team members yet.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
