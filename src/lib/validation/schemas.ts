import { z } from "zod";
import { CONTACT_TOPICS, LOAN_TERMS, SERVICE_TYPES, TRADE_IN_CONDITIONS } from "@/lib/domain";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const today = () => new Date().toLocaleDateString("en-CA");
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toLocaleDateString("en-CA");

const name = z.string().trim().min(2, "name").max(120, "name");
const email = z.string().trim().max(254, "email").regex(EMAIL, "email");
const phone = z.string().trim().regex(PHONE, "phone");
const optionalPhone = z.string().trim().refine((value) => value === "" || PHONE.test(value), "phone");
const futureDate = z
  .string()
  .regex(ISO_DATE, "date")
  .refine((value) => value >= today(), "dateFuture")
  .refine((value) => value <= inDays(365), "dateFuture");
const slot = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time");
const consent = z.literal(true, { error: "consent" });
const money = (key: string) => z.coerce.number(key).int(key).min(0, key).max(2_000_000_000, key);

export const contactSchema = z.object({
  name,
  email,
  phone: optionalPhone,
  topic: z.enum(CONTACT_TOPICS, { error: "topic" }),
  message: z.string().trim().min(10, "message").max(4000, "message"),
  consent,
});

export const testDriveSchema = z.object({
  vehicleId: z.string().trim().min(1, "vehicle"),
  date: futureDate,
  slot,
  name,
  email,
  phone,
  notes: z.string().trim().max(1000, "notes"),
  consent,
});

export const tradeInSchema = z.object({
  brand: z.string().trim().min(2, "brand").max(60, "brand"),
  model: z.string().trim().min(1, "model").max(80, "model"),
  year: z.coerce.number("year").int("year").min(1980, "year").max(new Date().getFullYear() + 1, "year"),
  mileage: z.coerce.number("mileage").int("mileage").min(0, "mileage").max(2_000_000, "mileage"),
  condition: z.enum(TRADE_IN_CONDITIONS, { error: "condition" }),
  name,
  email,
  phone,
  consent,
});

export const financingSchema = z
  .object({
    vehicleId: z.string().trim(),
    price: money("price").min(1_000_000, "price"),
    downPayment: money("down"),
    term: z.coerce.number("term").refine((value) => (LOAN_TERMS as readonly number[]).includes(value), "term"),
    name,
    email,
    phone,
    consent,
  })
  .refine((value) => value.downPayment < value.price, { path: ["downPayment"], message: "down" });

export const serviceSchema = z.object({
  vehicleDescription: z.string().trim().min(2, "vehicleDescription").max(160, "vehicleDescription"),
  serviceType: z.enum(SERVICE_TYPES, { error: "serviceType" }),
  date: futureDate,
  slot,
  name,
  email,
  phone,
  notes: z.string().trim().max(1000, "notes"),
  consent,
});

export const reservationSchema = z.object({
  vehicleId: z.string().trim().min(1, "vehicle"),
  phone: optionalPhone,
  message: z.string().trim().max(1000, "message"),
  consent,
});

export const signInSchema = z.object({ email, password: z.string().min(1, "password") });
export const signUpSchema = z.object({ name, email, password: z.string().min(8, "passwordLength").max(72, "passwordLength") });
export const resetRequestSchema = z.object({ email });
export const updatePasswordSchema = z.object({ password: z.string().min(8, "passwordLength").max(72, "passwordLength") });

export const profileSchema = z.object({
  fullName: name,
  phone: optionalPhone,
  locale: z.enum(["kk", "ru", "en"], { error: "required" }),
});

export type FieldErrors = Record<string, string>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}
