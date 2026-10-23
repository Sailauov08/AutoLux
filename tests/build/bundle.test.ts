import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const STATIC = join(__dirname, "../../.next/static");

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(js|css|json|map)$/.test(name) ? [path] : [];
  });

const PATTERNS: [string, RegExp][] = [
  ["service_role key name", /service_role/i],
  ["secret key prefix", /sb_secret_[A-Za-z0-9]/],
  ["service key env var", /SUPABASE_SERVICE/],
  ["postgres connection string", /postgres(?:ql)?:\/\/[^"'\s]+@/],
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

describe.skipIf(!existsSync(STATIC))("client bundle", () => {
  it("contains no server secrets", () => {
    const leaks: string[] = [];
    for (const file of files(STATIC)) {
      const text = readFileSync(file, "utf8");
      for (const [label, pattern] of PATTERNS) if (pattern.test(text)) leaks.push(`${label}: ${file.split(".next")[1]}`);
    }
    expect(leaks).toEqual([]);
  });
});
