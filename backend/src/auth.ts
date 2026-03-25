import type { NextFunction, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { SESSION_TTL_SECONDS } from "./constants.js";
import { readStore } from "./store.js";
import type { SessionPayload, User } from "./types.js";

function getSecret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? "local-development-session-secret",
  );
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, getSecret());

  return {
    sub: String(payload.sub),
    role: payload.role as SessionPayload["role"],
    email: String(payload.email),
    name: String(payload.name),
  } satisfies SessionPayload;
}

export interface AuthenticatedRequest extends Request {
  session: SessionPayload;
  currentUser: User;
}

function getBearerToken(request: Request) {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.replace("Bearer ", "").trim();
}

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      response.status(401).json({ error: "Missing authorization token." });
      return;
    }

    const session = await verifySession(token);
    const data = await readStore();
    const user = data.users.find((item) => item.id === session.sub);

    if (!user) {
      response.status(401).json({ error: "Your account could not be found." });
      return;
    }

    (request as AuthenticatedRequest).session = {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    };
    (request as AuthenticatedRequest).currentUser = user;
    next();
  } catch {
    response.status(401).json({ error: "Your session is invalid or expired." });
  }
}

export function requireAdmin(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const authRequest = request as AuthenticatedRequest;

  if (authRequest.currentUser.role !== "admin") {
    response.status(403).json({ error: "Administrator access is required." });
    return;
  }

  next();
}

export function requireActiveSubscription(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const authRequest = request as AuthenticatedRequest;

  if (
    authRequest.currentUser.role === "subscriber" &&
    authRequest.currentUser.subscription.status !== "active"
  ) {
    response.status(403).json({
      error: "An active subscription is required for this action.",
    });
    return;
  }

  next();
}
