import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma";

const ADMIN_COOKIE = "lk_admin";
const YEAR = 60 * 60 * 24 * 365;

function secret() {
  return process.env.APP_SECRET || "lukreative-dev-secret";
}

function sign(value) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

/** Constant-time compare that tolerates length mismatch. */
function sameString(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

export function newShareToken() {
  return randomBytes(18).toString("base64url");
}

// ---------------------------------------------------------------- agency side

export async function isAdmin() {
  const jar = await cookies();
  const c = jar.get(ADMIN_COOKIE)?.value;
  return !!c && sameString(c, sign("admin"));
}

export async function signInAdmin(password) {
  if (!sameString(password ?? "", secret())) return false;
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, sign("admin"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR,
  });
  return true;
}

export async function signOutAdmin() {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** Throws unless the caller holds a valid agency session. */
export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not authorised");
}

// ---------------------------------------------------------------- client side
// A client proves itself with the share token, either in the URL (?k=…) on
// first visit or in a per-client cookie afterwards. Cookies are namespaced by
// slug so one browser can hold sessions for several clients at once.

const clientCookie = (slug) => `lk_c_${slug}`;

export async function grantClientSession(slug, token) {
  const jar = await cookies();
  jar.set(clientCookie(slug), sign(`client:${slug}:${token}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/c/${slug}`,
    maxAge: YEAR,
  });
}

/**
 * Resolve the client for a portal request. `token` is the ?k= value when
 * present. Returns null when the caller has neither a valid token nor a
 * valid cookie — callers should render "link not valid" in that case.
 */
export async function resolveClient(slug, token) {
  const client = await prisma.client.findUnique({ where: { slug } });
  if (!client || client.archived) return null;

  if (token && sameString(token, client.shareToken)) return client;

  const jar = await cookies();
  const c = jar.get(clientCookie(slug))?.value;
  if (c && sameString(c, sign(`client:${slug}:${client.shareToken}`))) return client;

  return null;
}

/** Same as resolveClient but for actions, where only the cookie is available. */
export async function requireClient(slug) {
  const client = await resolveClient(slug, null);
  if (!client) throw new Error("Not authorised");
  return client;
}

export async function revokeClientSessions(slug) {
  (await cookies()).delete(clientCookie(slug));
}
