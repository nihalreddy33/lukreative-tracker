"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask, createRecurrence } from "@/lib/actions";
import RepeatFields from "./RepeatFields";
import { uploadImages } from "@/lib/image-upload";
import { STATUSES, PRIORITIES } from "@/lib/constants";

export default function NewTaskForm({ clients, members, fixedClientId }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState(null);
  const [images, setImages] = useState([]);
  const [repeats, setRepeats] = useState(false);
  const router = useRouter();
  const ref = useRef(null);

  if (!open) {
    return (
      <button className="btn primary" onClick={() => setOpen(true)}>
        + New task
      </button>
    );
  }

  return (
    <section className="card" style={{ width: "100%" }}>
      <header className="card-head">
        <h2>New task</h2>
        <button className="btn ghost sm" onClick={() => setOpen(false)}>Close</button>
      </header>
      <form
        ref={ref}
        className="card-body form-grid"
        action={(fd) =>
          start(async () => {
            setError(null);
            // A repeating task is a series, not a one-off: creating the series
            // generates the first occurrence itself.
            const isSeries = String(fd.get("frequency") || "Never") !== "Never";
            const res = isSeries ? await createRecurrence(fd) : await createTask(fd);
            if (res?.error) {
              setError(res.error);
              return;
            }
            // Images are chosen before the task exists, so they upload once it
            // has an id.
            if (!isSeries && res?.id && images.length) {
              const problem = await uploadImages(res.id, images);
              if (problem) {
                setError(`Task created, but an image didn't upload: ${problem}`);
                setImages([]);
                router.refresh();
                return;
              }
            }
            ref.current?.reset();
            setImages([]);
            setRepeats(false);
            setOpen(false);
            router.refresh();
          })
        }
      >
        <label className="field span-2">
          <span>Task name</span>
          <input type="text" name="title" required autoFocus placeholder="Akan Brewery Beer Menu design" />
        </label>

        <label className="field">
          <span>Client</span>
          <select name="clientId" defaultValue={fixedClientId ?? ""}>
            <option value="">Internal / none</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Owner</span>
          <select name="assigneeId" defaultValue="">
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Campaign / channel</span>
          <input type="text" name="channel" placeholder="Meta Ads, SEO, Video…" />
        </label>

        <label className="field">
          <span>Priority</span>
          <select name="priority" defaultValue="Medium">
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue="Not Started">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Visible to client</span>
          <select name="visibleToClient" defaultValue="yes">
            <option value="yes">Yes — show in their portal</option>
            <option value="no">No — internal only</option>
          </select>
        </label>

        <label className="field">
          <span>Start date</span>
          <input type="date" name="startDate" />
        </label>

        <label className="field">
          <span>Due date</span>
          <input type="date" name="dueDate" />
        </label>

        <label className="field span-2">
          <span>Notes / links</span>
          <input type="text" name="notes" placeholder="Reference links, brief notes…" />
        </label>

        <div className="span-4" style={{ borderTop: "1px solid var(--line)", paddingTop: 4 }} />

        <label className="field span-2">
          <span>Reference images</span>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={repeats}
            onChange={(e) => setImages([...e.target.files])}
            style={{ fontSize: 13 }}
          />
        </label>
        <div className="field span-2">
          <span>&nbsp;</span>
          <p className="small muted">
            {repeats
              ? "Add references to each occurrence once it's created."
              : images.length
                ? `${images.length} image${images.length === 1 ? "" : "s"} — uploaded once the task is created, shrunk to keep them small.`
                : "Optional. You can also add them later from Edit."}
          </p>
        </div>

        <RepeatFields onRepeatChange={setRepeats} />

        {error ? <div className="notice err span-4">{error}</div> : null}

        <div className="span-4 row">
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add task"}
          </button>
          <button className="btn ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
