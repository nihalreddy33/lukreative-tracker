import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma";

const ADMIN_COOKIE = "lk_admin";
const MEMBER_COOKIE = "lk_member";
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
  return checkAdminCookie(jar.get(ADMIN_COOKIE)?.value);
}

/**
 * Same check, reading the cookie off a NextRequest.
 *
 * Route Handlers get their cookies from the request; calling next/headers'
 * cookies() there throws "called outside a request scope" once the body has
 * been touched, so upload routes use this instead.
 */
export function isAdminRequest(request) {
  return checkAdminCookie(request.cookies.get(ADMIN_COOKIE)?.value);
}

function checkAdminCookie(value) {
  return !!value && sameString(value, sign("admin"));
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
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  jar.delete(MEMBER_COOKIE);
}

/** Throws unless the caller is the owner or a member flagged as admin. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.isAdmin) throw new Error("Not authorised");
  return session;
}

// ------------------------------------------------------------------ members

/** scrypt with a per-password salt. Stored as "salt:hash". */
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, expected] = stored.split(":");
  const actual = scryptSync(password, salt, 64).toString("hex");
  return sameString(actual, expected);
}

/**
 * The member session is `id.signature`, where the signature covers the password
 * hash — so changing someone's password signs them out everywhere, which is
 * what you want when you reset it because they left or lost it.
 */
function memberCookieValue(member) {
  return `${member.id}.${sign(`member:${member.id}:${member.passwordHash}`)}`;
}

export async function signInMember(identifier, password) {
  const id = String(identifier ?? "").trim();
  if (!id || !password) return null;

  const member = await prisma.member.findFirst({
    where: {
      active: true,
      OR: [
        { name: { equals: id } },
        { email: { equals: id } },
      ],
    },
  });

  // Hash anyway when there's no match, so a wrong name and a wrong password
  // take a similar amount of time.
  if (!member || !member.passwordHash) {
    verifyPassword(password, `${"0".repeat(32)}:${"0".repeat(128)}`);
    return null;
  }
  if (!verifyPassword(password, member.passwordHash)) return null;

  const jar = await cookies();
  jar.set(MEMBER_COOKIE, memberCookieValue(member), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR,
  });
  return member;
}

async function memberFromCookie(value) {
  if (!value || !value.includes(".")) return null;
  const [rawId, signature] = value.split(".");
  const id = Number(rawId);
  if (!id || Number.isNaN(id)) return null;

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member || !member.active) return null;
  if (!sameString(signature, sign(`member:${member.id}:${member.passwordHash}`))) return null;
  return member;
}

/**
 * Who is making this request.
 *
 *   { kind: "owner" }                     — the APP_SECRET break-glass login
 *   { kind: "member", member, isAdmin }   — a named account
 *   null                                  — signed out
 */
export async function getSession(request = null) {
  const jar = request ? null : await cookies();
  const read = (name) =>
    request ? request.cookies.get(name)?.value : jar.get(name)?.value;

  if (checkAdminCookie(read(ADMIN_COOKIE))) {
    return { kind: "owner", isAdmin: true, name: "Admin", memberId: null };
  }

  const member = await memberFromCookie(read(MEMBER_COOKIE));
  if (member) {
    return {
      kind: "member",
      isAdmin: member.isAdmin,
      name: member.name,
      memberId: member.id,
      member,
    };
  }
  return null;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Not authorised");
  return session;
}

export async function signOutMember() {
  (await cookies()).delete(MEMBER_COOKIE);
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
export async function resolveClient(slug, token, request = null) {
  const client = await prisma.client.findUnique({ where: { slug } });
  if (!client || client.archived) return null;

  if (token && sameString(token, client.shareToken)) return client;

  // As above: prefer the request's own cookies when we have them.
  const value = request
    ? request.cookies.get(clientCookie(slug))?.value
    : (await cookies()).get(clientCookie(slug))?.value;

  if (value && sameString(value, sign(`client:${slug}:${client.shareToken}`))) return client;

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
