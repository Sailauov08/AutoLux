"use client";

import Image from "next/image";
import { Plus, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { FormAlert } from "@/components/forms/form-status";
import { useRouter } from "@/i18n/navigation";
import { saveSettings, uploadLogo } from "@/lib/actions/team";
import type { AdminSettings } from "@/lib/data/admin";
import { SERVICE_TYPES } from "@/lib/domain";
import { adminButton, Field, inputClass, Saved, SubmitButton, useAction, useFieldError } from "./admin-client";

const LANGS = ["kk", "ru", "en"] as const;
const HOURS = ["weekdays", "saturday", "sunday"] as const;

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-4 accent-[var(--color-champagne)]" />
      <span>
        {label}
        {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function SettingsForm({ settings }: { settings: AdminSettings }) {
  const t = useTranslations("admin.settings");
  const tc = useTranslations("admin.common");
  const tLang = useTranslations("account.languages");
  const tHours = useTranslations("dealership");
  const tService = useTranslations("admin.requests.serviceTypes");
  const { pending, error, fields, done, run } = useAction();
  const fieldError = useFieldError(fields);
  const [socials, setSocials] = useState(settings.socials ?? []);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const on = (name: string) => data.get(name) === "on";
    run(() =>
      saveSettings({
        name: value("name"),
        legalName: value("legalName"),
        phone: value("phone"),
        email: value("email"),
        whatsapp: value("whatsapp"),
        address: Object.fromEntries(LANGS.map((lang) => [lang, { line1: value(`address.${lang}.line1`), line2: value(`address.${lang}.line2`) }])),
        mapsUrl: value("mapsUrl"),
        hours: Object.fromEntries(HOURS.map((key) => [key, value(`hours.${key}`)])),
        socials: socials.filter((item) => item.label && item.href),
        services: SERVICE_TYPES.filter((type) => on(`service.${type}`)),
        currency: value("currency").toUpperCase(),
        timezone: value("timezone"),
        showSoldVehicles: on("showSoldVehicles"),
        priceApprovalRequired: on("priceApprovalRequired"),
        bookingSlots: value("bookingSlots").split(/[\s,;]+/).filter(Boolean),
        bookingWindowDays: value("bookingWindowDays"),
        reservationHoldHours: value("reservationHoldHours"),
        serviceCapacity: value("serviceCapacity"),
        serviceEnabled: on("serviceEnabled"),
        testDriveEnabled: on("testDriveEnabled"),
        notifyNewLeads: on("notifyNewLeads"),
        notificationEmail: value("notificationEmail"),
        retentionMonths: value("retentionMonths"),
      }),
    );
  };

  return (
    <form onSubmit={submit} className="space-y-10" noValidate>
      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <legend className="eyebrow mb-4">{t("identity")}</legend>
        <Field label={t("name")} error={fieldError("name")}>
          <input name="name" required defaultValue={settings.name} maxLength={120} className={inputClass} />
        </Field>
        <Field label={t("legalName")} error={fieldError("legalName")}>
          <input name="legalName" defaultValue={settings.legal_name ?? ""} maxLength={160} className={inputClass} />
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <legend className="eyebrow mb-4">{t("contacts")}</legend>
        <Field label={t("phone")} error={fieldError("phone")}>
          <input name="phone" type="tel" defaultValue={settings.phone ?? ""} className={inputClass} />
        </Field>
        <Field label={t("email")} error={fieldError("email")}>
          <input name="email" type="email" defaultValue={settings.email ?? ""} className={inputClass} />
        </Field>
        <Field label={t("whatsapp")} error={fieldError("whatsapp")}>
          <input name="whatsapp" defaultValue={settings.whatsapp ?? ""} placeholder="+77011234567" className={inputClass} />
        </Field>
        {LANGS.map((lang) => (
          <div key={lang} className="space-y-3">
            <Field label={`${t("address")} · ${tLang(lang)}`}>
              <input name={`address.${lang}.line1`} defaultValue={settings.address?.[lang]?.line1 ?? ""} maxLength={160} className={inputClass} />
            </Field>
            <input aria-label={`${t("addressLine2")} · ${tLang(lang)}`} name={`address.${lang}.line2`} defaultValue={settings.address?.[lang]?.line2 ?? ""} maxLength={160} className={inputClass} />
          </div>
        ))}
        <Field label={t("mapsUrl")} error={fieldError("mapsUrl")} className="md:col-span-3">
          <input name="mapsUrl" type="url" defaultValue={settings.maps_url ?? ""} placeholder="https://" className={inputClass} />
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <legend className="eyebrow mb-4">{t("hours")}</legend>
        {HOURS.map((key) => (
          <Field key={key} label={tHours(key)}>
            <input name={`hours.${key}`} defaultValue={settings.hours?.[key] ?? ""} placeholder="9:00 – 19:00" maxLength={40} className={inputClass} />
          </Field>
        ))}
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-4">{t("socials")}</legend>
        <ul className="space-y-3">
          {socials.map((item, index) => (
            <li key={index} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <Field label={t("socialLabel")}>
                <input value={item.label} maxLength={40} onChange={(event) => setSocials((list) => list.map((row, i) => (i === index ? { ...row, label: event.target.value } : row)))} className={inputClass} />
              </Field>
              <Field label={t("socialUrl")}>
                <input value={item.href} type="url" onChange={(event) => setSocials((list) => list.map((row, i) => (i === index ? { ...row, href: event.target.value } : row)))} className={inputClass} />
              </Field>
              <button type="button" aria-label={tc("remove")} onClick={() => setSocials((list) => list.filter((_, i) => i !== index))} className={adminButton("ghost")}>
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        {socials.length < 8 && (
          <button type="button" onClick={() => setSocials((list) => [...list, { label: "", href: "https://" }])} className={`${adminButton("outline")} mt-3`}>
            <Plus className="size-4" aria-hidden />
            {t("addSocial")}
          </button>
        )}
        {fieldError("socials") && <p className="mt-2 text-xs text-red-600">{fieldError("socials")}</p>}
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <legend className="eyebrow mb-4">{t("booking")}</legend>
        <Field label={t("slots")} error={fieldError("bookingSlots")} className="md:col-span-2">
          <input name="bookingSlots" defaultValue={settings.booking_slots.join(", ")} className={inputClass} />
        </Field>
        <p className="-mt-2 text-xs text-muted md:col-span-2">{t("slotsHint")}</p>
        <Field label={t("window")} error={fieldError("bookingWindowDays")}>
          <input name="bookingWindowDays" type="number" min={1} max={365} defaultValue={settings.booking_window_days} className={inputClass} />
        </Field>
        <Field label={t("hold")} error={fieldError("reservationHoldHours")}>
          <input name="reservationHoldHours" type="number" min={1} max={720} defaultValue={settings.reservation_hold_hours} className={inputClass} />
        </Field>
        <Field label={t("capacity")} error={fieldError("serviceCapacity")}>
          <input name="serviceCapacity" type="number" min={1} max={50} defaultValue={settings.service_capacity} className={inputClass} />
        </Field>
        <div className="space-y-3">
          <Toggle name="testDriveEnabled" label={t("testDriveEnabled")} defaultChecked={settings.test_drive_enabled} />
          <Toggle name="serviceEnabled" label={t("serviceEnabled")} defaultChecked={settings.service_enabled} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-3 text-[10px] font-medium tracking-[0.18em] uppercase text-muted">{t("services")}</p>
          <div className="flex flex-wrap gap-3">
            {SERVICE_TYPES.map((type) => (
              <label key={type} className="inline-flex items-center gap-2 border border-line px-3 py-2 text-sm">
                <input type="checkbox" name={`service.${type}`} defaultChecked={settings.services.includes(type)} className="accent-[var(--color-champagne)]" />
                {tService(type)}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <legend className="eyebrow mb-4">{t("inventory")}</legend>
        <Toggle name="showSoldVehicles" label={t("showSold")} hint={t("showSoldHint")} defaultChecked={settings.show_sold_vehicles} />
        <Toggle name="priceApprovalRequired" label={t("priceApproval")} hint={t("priceApprovalHint")} defaultChecked={settings.price_approval_required} />
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <legend className="eyebrow mb-4">{t("regional")}</legend>
        <Field label={t("currency")} error={fieldError("currency")}>
          <input name="currency" defaultValue={settings.currency} maxLength={3} className={`${inputClass} uppercase`} />
        </Field>
        <Field label={t("timezone")} error={fieldError("timezone")}>
          <input name="timezone" defaultValue={settings.timezone} className={inputClass} />
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <legend className="eyebrow mb-4">{t("notifications")}</legend>
        <Toggle name="notifyNewLeads" label={t("notifyNewLeads")} defaultChecked={settings.notify_new_leads} />
        <Field label={t("notificationEmail")} error={fieldError("notificationEmail")}>
          <input name="notificationEmail" type="email" defaultValue={settings.notification_email ?? ""} className={inputClass} />
        </Field>
        <p className="text-xs text-muted md:col-span-2">{t("notificationEmailHint")}</p>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <legend className="eyebrow mb-4">{t("privacy")}</legend>
        <Field label={t("retention")} error={fieldError("retentionMonths")}>
          <input name="retentionMonths" type="number" min={6} max={120} defaultValue={settings.retention_months} className={inputClass} />
        </Field>
        <p className="self-end text-xs text-muted">{t("retentionHint")}</p>
      </fieldset>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-4 border-t border-line bg-card py-4">
        <SubmitButton pending={pending}>{tc("save")}</SubmitButton>
        <Saved show={done}>{t("saved")}</Saved>
        <FormAlert code={error} />
      </div>
    </form>
  );
}

export function LogoUpload({ logoUrl }: { logoUrl: string | null }) {
  const t = useTranslations("admin.settings");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative flex h-20 w-40 items-center justify-center border border-line bg-obsidian">
        {logoUrl ? <Image src={logoUrl} alt={t("logo")} fill sizes="160px" className="object-contain p-2" /> : <span className="text-xs text-white/50">{t("noLogo")}</span>}
      </div>
      <label className={`${adminButton("outline")} cursor-pointer`}>
        <Upload className="size-4" aria-hidden />
        {pending ? t("uploading") : t("uploadLogo")}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const data = new FormData();
            data.set("file", file);
            start(async () => {
              const result = await uploadLogo(data);
              setError(result.ok ? null : tErrors.has(result.error) ? tErrors(result.error) : tErrors("generic"));
              if (result.ok) router.refresh();
            });
          }}
        />
      </label>
      <p className="w-full text-xs text-muted">{t("logoHint")}</p>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
