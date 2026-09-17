import { scrypt } from "node:crypto";
import { promisify } from "node:util";
import { fail } from "./validation.js";
const derive = promisify(scrypt);
export function passwordHasher() {
  let activeHashes = 0;
  const passwordKey = async (password, salt) => {
    if (activeHashes >= 2)
      throw fail(429, "Sign-in is busy. Please try again shortly.");
    activeHashes++;
    try {
      return await derive(password, salt, 64, {
        N: 32768,
        r: 8,
        p: 3,
        maxmem: 64 * 1024 * 1024,
      });
    } finally {
      activeHashes--;
    }
  };
  return passwordKey;
}
