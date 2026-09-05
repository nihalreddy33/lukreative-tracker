/**
 * Sending WhatsApp reminders through Interakt.
 *
 * WhatsApp only allows pre-approved templates for business-initiated messages,
 * so the wording lives in Interakt and this only supplies the variables.
 *
 * Deliberately, those variables carry a person's name, two counts and a link —
 * never task titles or client names. The messages go through a WhatsApp
 * Business account, and nothing about one client's work should end up in
 * another's message logs.
 */

const ENDPOINT = "https://api.interakt.ai/v1/public/message/";

export const interaktConfig = () => ({
  apiKey: process.env.INTERAKT_API_KEY || "",
  template: process.env.INTERAKT_TEMPLATE_NAME || "daily_task_reminder",
  languageCode: process.env.INTERAKT_TEMPLATE_LANG || "en",
  countryCode: process.env.INTERAKT_COUNTRY_CODE || "+91",
  appUrl: (process.env.APP_URL || "").replace(/\/$/, ""),
});

export const isConfigured = () => !!interaktConfig().apiKey;

/**
 * Interakt wants the number without country code or leading zeros. Accepts the
 * ways people actually type them: +91 98…, 091-98…, spaces, brackets.
 */
export function normalisePhone(raw, countryCode = "+91") {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  const cc = countryCode.replace(/\D/g, "");

  // Leading zeros come off first: people write both "091 98…" and "0091 98…",
  // so stripping the country code before the zeros would miss those.
  let local = digits.replace(/^0+/, "");
  if (cc && local.startsWith(cc) && local.length > cc.length) local = local.slice(cc.length);
  local = local.replace(/^0+/, "");

  return local.length >= 6 && local.length <= 15 ? local : null;
}

/**
 * The variables for one person's reminder, in template order:
 *   {{1}} name  {{2}} tasks needing attention  {{3}} overdue  {{4}} link
 *
 * Template variables may not contain newlines or tabs, so everything here is
 * a single short token by construction.
 */
export function buildReminderValues({ name, needsAttention, overdue, appUrl }) {
  const clean = (v) => String(v).replace(/[\r\n\t]+/g, " ").trim();
  return [
    clean(name),
    clean(needsAttention),
    clean(overdue),
    clean(appUrl ? `${appUrl}/my` : "the tracker"),
  ];
}

/** Posts one template message. Returns {ok} or {error} rather than throwing. */
export async function sendTemplate({ phone, bodyValues }) {
  const cfg = interaktConfig();
  if (!cfg.apiKey) return { error: "Interakt isn't configured (INTERAKT_API_KEY is not set)." };

  const phoneNumber = normalisePhone(phone, cfg.countryCode);
  if (!phoneNumber) return { error: "That phone number doesn't look valid." };

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        countryCode: cfg.countryCode,
        phoneNumber,
        type: "Template",
        template: {
          name: cfg.template,
          languageCode: cfg.languageCode,
          bodyValues,
        },
      }),
    });
  } catch (e) {
    return { error: `Could not reach Interakt: ${e.message}` };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.result === false) {
    return { error: data?.message || `Interakt refused the message (${res.status}).` };
  }
  return { ok: true, id: data?.id ?? null };
}
