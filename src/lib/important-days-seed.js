/**
 * The starter set of dates an Indian agency plans around, loaded once on first
 * run. Everything here is editable and deletable in the app.
 *
 * `annual: true` is only used for dates that genuinely fall on the same day
 * every year. Lunar and Islamic festivals are stored against a specific year —
 * repeating them annually would silently put them on the wrong date.
 *
 * Dates were cross-checked against the DoPT gazetted list and the user's own
 * calendar. Where the two disagreed (Milad-un-Nabi) the user's calendar wins.
 */

export const SEED_DAYS = [
  // ---- Same date every year -------------------------------------------------
  { name: "New Year's Day", date: "2026-01-01", annual: true, kind: "Public holiday" },
  { name: "Makar Sankranti / Sankranti", date: "2026-01-14", annual: true, kind: "Festival" },
  { name: "Republic Day", date: "2026-01-26", annual: true, kind: "Public holiday" },
  { name: "Labour Day", date: "2026-05-01", annual: true, kind: "Public holiday" },
  { name: "Telangana Formation Day", date: "2026-06-02", annual: true, kind: "Public holiday" },
  { name: "Independence Day", date: "2026-08-15", annual: true, kind: "Public holiday" },
  { name: "Gandhi Jayanti", date: "2026-10-02", annual: true, kind: "Public holiday" },
  { name: "Christmas Day", date: "2026-12-25", annual: true, kind: "Public holiday" },

  // ---- 2026 only: these move each year --------------------------------------
  { name: "Holi", date: "2026-03-04", kind: "Festival" },
  { name: "Ugadi", date: "2026-03-19", kind: "Festival" },
  { name: "Eid ul-Fitr (Ramzan)", date: "2026-03-21", kind: "Festival" },
  { name: "Ram Navami", date: "2026-03-26", kind: "Festival" },
  { name: "Mahavir Jayanti", date: "2026-03-31", kind: "Festival" },
  { name: "Good Friday", date: "2026-04-03", kind: "Public holiday" },
  { name: "Buddha Purnima", date: "2026-05-01", kind: "Festival" },
  { name: "Bakrid (Eid al-Adha)", date: "2026-05-27", kind: "Festival" },
  { name: "Muharram", date: "2026-06-26", kind: "Observance" },
  { name: "Parsi New Year", date: "2026-08-16", kind: "Festival" },
  { name: "Milad-un-Nabi", date: "2026-08-24", kind: "Festival", note: "Gazette lists 26 Aug; your calendar shows 24 Aug" },
  { name: "Onam", date: "2026-08-26", kind: "Festival" },
  { name: "Raksha Bandhan", date: "2026-08-28", kind: "Festival" },
  { name: "Janmashtami", date: "2026-09-04", kind: "Festival" },
  { name: "Ganesh Chaturthi", date: "2026-09-14", kind: "Festival" },
  { name: "Dussehra (Vijaya Dashami)", date: "2026-10-20", kind: "Festival" },
  { name: "Diwali (Deepavali)", date: "2026-11-08", kind: "Festival" },
  { name: "Guru Nanak Jayanti", date: "2026-11-24", kind: "Festival" },
];

export const DAY_KINDS = ["Festival", "Public holiday", "Observance", "Custom"];

export const KIND_TONE = {
  Festival: "brand",
  "Public holiday": "red",
  Observance: "amber",
  Custom: "slate",
};
