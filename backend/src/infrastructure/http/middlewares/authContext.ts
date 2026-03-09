import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../../config";

export interface AuthContext {
  userId: number;
  tgId?: number;
  username?: string;
  roles?: string[];
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
  }
}

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, config.jwtSecret) as any;
    req.auth = {
      userId: payload.sub,
      tgId: payload.tgId,
      username: payload.username,
      roles: payload.roles || [],
    };
  } catch {
    // ignore invalid token, treat as guest
  }

  next();
}

