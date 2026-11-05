import { SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";

export interface SessionData {
  isAdmin?: boolean;
}

export const defaultSession: SessionData = {
  isAdmin: false,
};

// SESSION_PASSWORD must be set (32+ characters) in production.
// The fallback is for local development only.
const devFallback = "local_dev_only_password_at_least_32_chars_long!!";

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_PASSWORD ||
    (process.env.NODE_ENV === "production" ? "" : devFallback),
  cookieName: "church_planner_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // stay signed in for 7 days
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return !!session.isAdmin;
}
