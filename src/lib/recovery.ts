import "server-only";
import { randomBytes, createHash } from "crypto";

// Crockford-ish alphabet: no 0/O/1/I/L, all uppercase, easy to read back after
// copying down. ~100 bits of entropy at 20 chars — brute force isn't the
// realistic risk here, so a plain sha256 (not a slow KDF) is fine.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateRecoveryCode(): string {
  const bytes = randomBytes(20);
  let code = "";
  for (let i = 0; i < bytes.length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
    if (i % 4 === 3 && i !== bytes.length - 1) code += "-";
  }
  return code;
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeCode(code)).digest("hex");
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
