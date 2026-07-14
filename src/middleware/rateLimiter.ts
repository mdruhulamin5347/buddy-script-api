import { NextFunction, Request, Response } from "express";
import config from "../config";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

type RateLimitStore = Record<string, RateLimitEntry>;

const globalStore: RateLimitStore = {};
const loginStore: RateLimitStore = {};

const createRateLimiter = (
  store: RateLimitStore,
  windowMs: number,
  maxRequests: number
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();

    let entry = store[key];

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };

      store[key] = entry;
    }

    entry.count++;

    const remaining = Math.max(0, maxRequests - entry.count);

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader(
      "X-RateLimit-Reset",
      Math.ceil(entry.resetTime / 1000)
    );

    if (entry.count > maxRequests) {
      res.setHeader(
        "Retry-After",
        Math.ceil((entry.resetTime - now) / 1000)
      );

      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
      });
    }

    next();
  };
};

export const rateLimiter = createRateLimiter(
  globalStore,
  config.rateLimit.windowMs,
  config.rateLimit.maxRequests
);

export const loginRateLimiter = createRateLimiter(
  loginStore,
  config.loginRateLimit.windowMs,
  config.loginRateLimit.maxRequests
);