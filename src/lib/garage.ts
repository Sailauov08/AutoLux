"use client";

import { useSyncExternalStore } from "react";

export const MAX_COMPARE = 3;

const STORAGE_KEY = "autolux.garage";

type Garage = { favorites: string[]; compare: string[] };

const EMPTY: Garage = { favorites: [], compare: [] };

let garage: Garage = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function readStorage(): Garage {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Garage>;
    const clean = (value: unknown) =>
      Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
    return { favorites: clean(parsed.favorites), compare: clean(parsed.compare).slice(0, MAX_COMPARE) };
  } catch {
    return EMPTY;
  }
}

function writeStorage(next: Garage) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return;
  }
}

function getSnapshot() {
  if (!hydrated) {
    garage = readStorage();
    hydrated = true;
  }
  return garage;
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    garage = readStorage();
    listeners.forEach((notify) => notify());
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function commit(update: (current: Garage) => Garage) {
  const next = update(getSnapshot());
  if (next === garage) return;
  garage = next;
  writeStorage(next);
  listeners.forEach((notify) => notify());
}

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

export function useGarage() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function toggleFavorite(id: string) {
  commit((current) => ({ ...current, favorites: toggle(current.favorites, id) }));
}

export function toggleCompare(id: string) {
  commit((current) => {
    if (current.compare.includes(id)) {
      return { ...current, compare: current.compare.filter((item) => item !== id) };
    }
    if (current.compare.length >= MAX_COMPARE) return current;
    return { ...current, compare: [...current.compare, id] };
  });
}

export function clearCompare() {
  commit((current) => ({ ...current, compare: [] }));
}
