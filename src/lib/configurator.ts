export type Option = { id: string; price: number; swatch: string };

export const CONFIG_GROUPS = {
  exterior: [
    { id: "obsidian", price: 0, swatch: "#080b10" },
    { id: "graphite", price: 0, swatch: "#20252c" },
    { id: "silver", price: 0, swatch: "#d4dce3" },
    { id: "steel", price: 1_200_000, swatch: "#283a4b" },
    { id: "ivory", price: 1_800_000, swatch: "#f3efe8" },
    { id: "champagne", price: 2_400_000, swatch: "#c5a477" },
  ],
  wheels: [
    { id: "w20", price: 0, swatch: "#9aa3ac" },
    { id: "w21", price: 950_000, swatch: "#4a5058" },
    { id: "w22", price: 2_100_000, swatch: "#1a1d22" },
  ],
  interior: [
    { id: "onyx", price: 0, swatch: "#16181b" },
    { id: "cognac", price: 1_400_000, swatch: "#8a4f2a" },
    { id: "pearl", price: 1_650_000, swatch: "#e8e1d4" },
  ],
  trim: [
    { id: "aluminium", price: 0, swatch: "#b8bec5" },
    { id: "walnut", price: 750_000, swatch: "#5b3a24" },
    { id: "carbon", price: 1_900_000, swatch: "#23262b" },
  ],
} satisfies Record<string, Option[]>;

export type ConfigGroup = keyof typeof CONFIG_GROUPS;
export type Selection = Record<ConfigGroup, string>;

export const GROUP_KEYS = Object.keys(CONFIG_GROUPS) as ConfigGroup[];

export const DEFAULT_SELECTION: Selection = { exterior: "obsidian", wheels: "w20", interior: "onyx", trim: "aluminium" };

export const optionPrice = (group: ConfigGroup, id: string) => CONFIG_GROUPS[group].find((option) => option.id === id)?.price ?? 0;

export const optionsTotal = (selection: Selection) => GROUP_KEYS.reduce((sum, group) => sum + optionPrice(group, selection[group]), 0);

export function parseSelection(value: unknown): Selection {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return Object.fromEntries(
    GROUP_KEYS.map((group) => {
      const id = source[group];
      return [group, CONFIG_GROUPS[group].some((option) => option.id === id) ? (id as string) : DEFAULT_SELECTION[group]];
    }),
  ) as Selection;
}
