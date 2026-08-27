"use client";

import { useState } from "react";
import { WEEKDAYS, describeRule, nextOccurrence } from "@/lib/recurrence";
import { today } from "@/lib/dates";
import { fmt } from "@/lib/dates";

/**
 * The repeat controls, shared by the new-task form and the series editor.
 * Shows the pattern in words plus the next date, so "every 2 weeks on Thursday"
 * can be sanity-checked before it starts generating work.
 */
export default function RepeatFields({ value = {}, showNever = true }) {
  const [frequency, setFrequency] = useState(value.frequency || (showNever ? "Never" : "Weekly"));
  const [weekdays, setWeekdays] = useState(
    new Set(String(value.weekdays || "").split(",").filter(Boolean).map(Number))
  );
  const [interval, setInterval] = useState(value.interval || 1);
  const [monthDay, setMonthDay] = useState(value.monthDay || Number(today().slice(8, 10)));
  const [startDate, setStartDate] = useState(value.startDate || today());

  const on = frequency !== "Never";

  const toggleDay = (d) =>
    setWeekdays((prev) => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });

  const rule = {
    frequency,
    weekdays: [...weekdays].join(","),
    interval,
    monthDay,
    startDate,
  };
  const preview = on ? nextOccurrence(rule, today()) : null;
  const incomplete = on && frequency === "Weekly" && weekdays.size === 0;

  return (
    <>
      <label className="field span-2">
        <span>Repeat</span>
        <select name="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
          {showNever ? <option value="Never">Doesn&apos;t repeat</option> : null}
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
        </select>
      </label>

      {on ? (
        <label className="field span-2">
          <span>Every</span>
          <select name="interval" value={interval} onChange={(e) => setInterval(Number(e.target.value))}>
            {[1, 2, 3, 4, 6, 8, 12].map((n) => (
              <option key={n} value={n}>
                {n === 1
                  ? `Every ${frequency === "Daily" ? "day" : frequency === "Weekly" ? "week" : "month"}`
                  : `Every ${n} ${frequency === "Daily" ? "days" : frequency === "Weekly" ? "weeks" : "months"}`}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {on && frequency === "Weekly" ? (
        <div className="field span-4">
          <span>On these days</span>
          <div className="row tight">
            {WEEKDAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                className={`btn sm${weekdays.has(d.value) ? " primary" : ""}`}
                onClick={() => toggleDay(d.value)}
                aria-pressed={weekdays.has(d.value)}
              >
                {d.short}
              </button>
            ))}
          </div>
          {[...weekdays].map((d) => (
            <input key={d} type="hidden" name="weekdays" value={d} />
          ))}
        </div>
      ) : null}

      {on && frequency === "Monthly" ? (
        <label className="field span-2">
          <span>Day of the month</span>
          <input
            type="number"
            min="1"
            max="31"
            name="monthDay"
            value={monthDay}
            onChange={(e) => setMonthDay(Number(e.target.value))}
          />
        </label>
      ) : null}

      {on ? (
        <>
          <label className="field span-2">
            <span>Starting</span>
            <input
              type="date"
              name="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="field span-2">
            <span>Until (optional)</span>
            <input type="date" name="endDate" defaultValue={value.endDate || ""} />
          </label>
          <label className="field span-2">
            <span>Create how far ahead?</span>
            <select name="leadDays" defaultValue={value.leadDays ?? 7}>
              <option value="0">On the day</option>
              <option value="3">3 days before</option>
              <option value="7">A week before</option>
              <option value="14">2 weeks before</option>
            </select>
          </label>
          <label className="field span-2">
            <span>If the last one isn&apos;t finished</span>
            <select name="skipIfOpen" defaultValue={value.skipIfOpen === false ? "no" : "yes"}>
              <option value="yes">Wait — don&apos;t create the next one</option>
              <option value="no">Create it anyway</option>
            </select>
          </label>

          <div className="span-4">
            {incomplete ? (
              <div className="notice err">Pick at least one day of the week.</div>
            ) : (
              <div className="notice info">
                <strong>{describeRule(rule)}</strong>
                {preview ? ` · next on ${fmt(preview)}` : " · no dates in range"}
              </div>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
