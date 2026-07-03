import { createHash, randomInt } from "crypto";

// Codes are stored hashed with a pepper + the user id, so a database read
// alone can't be replayed as a code, and a code can't be used across users.
const PEPPER = "adt-fa-2fa-v1-9f3c71d2e8b44a06";

export const CODE_TTL_MINUTES = 10;
export const MAX_ATTEMPTS = 5;

export function generateLoginCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashLoginCode(userId: string, code: string): string {
  return createHash("sha256").update(`${PEPPER}:${userId}:${code}`).digest("hex");
}
