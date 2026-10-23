const group = (value: number) => new Intl.NumberFormat("en-US").format(Math.round(value)).replace(/,/g, " ");

export const formatPrice = (value: number) => `${group(value)} ₸`;

export const formatMileage = (value: number, unit: string) => `${group(value)} ${unit}`;

const pad = (value: number) => String(value).padStart(2, "0");

function parts(iso: string, timeZone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  );
  return values as Record<"year" | "month" | "day" | "hour" | "minute", string>;
}

export const formatDate = (iso: string, timeZone = "Asia/Almaty") => {
  const p = parts(iso.length === 10 ? `${iso}T12:00:00Z` : iso, timeZone);
  return `${p.day}.${p.month}.${p.year}`;
};

export const formatDateTime = (iso: string, timeZone = "Asia/Almaty") => {
  const p = parts(iso, timeZone);
  return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`;
};

export const formatTime = (iso: string, timeZone = "Asia/Almaty") => {
  const p = parts(iso, timeZone);
  return `${p.hour}:${p.minute}`;
};

export const localDateKey = (iso: string, timeZone = "Asia/Almaty") => {
  const p = parts(iso, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
};

export const toDateTimeLocal = (iso: string | null, timeZone = "Asia/Almaty") => {
  if (!iso) return "";
  const p = parts(iso, timeZone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

export const isoDay = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

export const formatMoney = (value: number, currency = "KZT") => (currency === "KZT" ? formatPrice(value) : `${group(value)} ${currency}`);

export function fromDateTimeLocal(value: string, timeZone = "Asia/Almaty") {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const p = parts(new Date(guess).toISOString(), timeZone);
  const offset = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - guess;
  return new Date(guess - offset).toISOString();
}
export const isPast = (iso: string | null | undefined) => Boolean(iso) && new Date(iso!).getTime() < Date.now();
export const dayKeyAgo = (days: number, timeZone = "Asia/Almaty") => localDateKey(new Date(Date.now() - days * 86_400_000).toISOString(), timeZone);
