import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import kk from "../../messages/kk.json";
import ru from "../../messages/ru.json";
import { routing } from "@/i18n/routing";

type Tree = { [key: string]: Tree | string | string[] };

const flatten = (tree: Tree, prefix = ""): string[] =>
  Object.entries(tree).flatMap(([key, value]) =>
    value && typeof value === "object" && !Array.isArray(value) ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );

const lookup = (tree: Tree, path: string) =>
  path.split(".").reduce<Tree | string | string[] | undefined>((node, key) => (node && typeof node === "object" && !Array.isArray(node) ? node[key] : undefined), tree);

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(name) ? [path] : [];
  });

describe("localization", () => {
  it("uses Kazakh as the default locale with Russian and English available", () => {
    expect(routing.defaultLocale).toBe("kk");
    expect([...routing.locales]).toEqual(["kk", "ru", "en"]);
  });

  it("keeps the same message keys in every language", () => {
    const keys = flatten(en as Tree).sort();
    expect(flatten(ru as Tree).sort()).toEqual(keys);
    expect(flatten(kk as Tree).sort()).toEqual(keys);
  });

  it("has no empty translations", () => {
    for (const messages of [en, ru, kk] as Tree[]) {
      for (const key of flatten(messages)) {
        const value = lookup(messages, key);
        expect(typeof value === "string" ? value.trim().length > 0 || key.endsWith("imageAlt") : true, key).toBe(true);
      }
    }
  });

  it("resolves every static translation key used in the source", () => {
    const missing: string[] = [];
    for (const file of sourceFiles(join(__dirname, "../../src"))) {
      const source = readFileSync(file, "utf8");
      const namespaces = new Map<string, Set<string>>();
      const bind = (variable: string, namespace: string) => namespaces.set(variable, (namespaces.get(variable) ?? new Set<string>()).add(namespace));
      for (const match of source.matchAll(/const (\w+) = (?:await )?(?:useTranslations|getTranslations)\("([\w.]+)"\)/g)) bind(match[1], match[2]);
      for (const match of source.matchAll(/const (\w+) = await getTranslations\(\{[^}]*namespace: "([\w.]+)" \}\)/g)) bind(match[1], match[2]);
      for (const match of source.matchAll(/const \[([^\]]+)\] = await Promise\.all\(\[([\s\S]*?)\]\);/g)) {
        const names = match[1].split(",").map((name) => name.trim());
        match[2].split(/,\s*\n/).forEach((item, index) => {
          const namespace = item.match(/getTranslations\("([\w.]+)"\)/)?.[1];
          if (namespace && names[index]) bind(names[index], namespace);
        });
      }
      for (const [variable, bound] of namespaces) {
        for (const call of source.matchAll(new RegExp(`\\b${variable}\\("([\\w.-]+)"`, "g"))) {
          if (![...bound].some((namespace) => lookup(en as Tree, `${namespace}.${call[1]}`) !== undefined)) {
            missing.push(`${file.split("src")[1]}: ${[...bound].join("|")}.${call[1]}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("uses Kazakh-specific letters in the Kazakh catalogue", () => {
    expect(JSON.stringify(kk)).toMatch(/[әғқңөұүһі]/);
  });
});
