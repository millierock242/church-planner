import { SessionOptions } from "iron-session";

export interface SessionData {
  isAdmin?: boolean;
}

export const defaultSession: SessionData = {
  isAdmin: false,
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD || "complex_password_at_least_32_characters_long_for_security!",
  cookieName: "church_planner_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    // Cookie duration is dynamically configured in the login action
  },
};