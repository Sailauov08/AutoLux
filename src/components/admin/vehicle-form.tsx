"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormAlert } from "@/components/forms/form-status";
import { useRouter } from "@/i18n/navigation";
import { createVehicle, updateVehicle } from "@/lib/actions/inventory";
import type { AdminVehicle } from "@/lib/data/admin";
import { BADGES, BODY_TYPES, CONDITIONS, DRIVETRAINS, FUELS, TRANSMISSIONS } from "@/lib/domain";
import { adminButton, Field, inputClass, Saved, SubmitButton, useAction, useFieldError } from "./admin-client";

type Localized = { en: string; ru: string; kk: string };
const LANGS = ["kk", "ru", "en"] as const;
const empty = (): Localized => ({ en: "", ru: "", kk: "" });

export function VehicleForm({ vehicle, equipment = [] }: { vehicle?: AdminVehicle; equipment?: Partial<Localized>[] }) {
  const t = useTranslations("admin.inventory");
  const tc = useTranslations("admin.common");
  const tEnum = useTranslations("enums");
  const tBadge = useTranslations("badges");
  const tLang = useTranslations("account.languages");
  const router = useRouter();
  const { pending, error, fields, done, run } = useAction();
  const fieldError = useFieldError(fields);
  const [items, setItems] = useState<Localized[]>(equipment.map((item) => ({ ...empty(), ...item })));
  const [badges, setBadges] = useState<string[]>(vehicle?.badges ?? []);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "");
    const payload = {
      slug: value("slug"),
      make: value("make"),
      model: value("model"),
      generation: value("generation"),
      trimLevel: value("trimLevel"),
      year: value("year"),
      mileage: value("mileage"),
      fuel: value("fuel"),
      transmission: value("transmission"),
      drivetrain: value("drivetrain"),
      bodyType: value("bodyType"),
      engine: value("engine"),
      horsepower: value("horsepower"),
      exteriorColor: value("exteriorColor"),
      interiorColor: value("interiorColor"),
      condition: value("condition"),
      badges,
      description: Object.fromEntries(LANGS.map((lang) => [lang, value(`description.${lang}`)])),
      equipment: items.filter((item) => item.en || item.ru || item.kk),
    };
    if (vehicle) run(() => updateVehicle({ ...payload, id: vehicle.id, version: vehicle.version }));
    else run(() => createVehicle({ ...payload, price: value("price") }), (created) => router.push(`/admin/inventory/${created.id}`));
  };

  const text = (name: string, label: string, defaultValue?: string | number | null, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field label={label} error={fieldError(name)}>
      <input name={name} defaultValue={defaultValue ?? ""} aria-invalid={Boolean(fields[name])} className={inputClass} {...extra} />
    </Field>
  );

  const select = (name: string, label: string, options: readonly string[], defaultValue: string | undefined, render: (value: string) => string) => (
    <Field label={label} error={fieldError(name)}>
      <select name={name} defaultValue={defaultValue ?? options[0]} className={inputClass}>
        {options.map((option) => (
          <option key={option} value={option}>
            {render(option)}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <form onSubmit={submit} className="space-y-8" noValidate>
      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <legend className="eyebrow mb-4">{t("identity")}</legend>
        {text("make", t("make"), vehicle?.make, { required: true, maxLength: 60 })}
        {text("model", t("model"), vehicle?.model, { required: true, maxLength: 80 })}
        {text("generation", t("generation"), vehicle?.generation, { maxLength: 60 })}
        {text("trimLevel", t("trimLevel"), vehicle?.trim_level, { maxLength: 80 })}
        {text("year", t("year"), vehicle?.year, { type: "number", min: 1950, max: 2100, required: true })}
        {text("slug", t("slug"), vehicle?.slug, { required: true, pattern: "[a-z0-9][a-z0-9-]{2,79}" })}
        {!vehicle && text("price", t("priceInitial"), "", { type: "number", min: 1, required: true })}
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <legend className="eyebrow mb-4">{t("specs")}</legend>
        {select("bodyType", t("bodyType"), BODY_TYPES, vehicle?.body_type, (value) => tEnum(`bodyType.${value}`))}
        {select("fuel", t("fuel"), FUELS, vehicle?.fuel, (value) => tEnum(`fuel.${value}`))}
        {select("transmission", t("transmission"), TRANSMISSIONS, vehicle?.transmission, (value) => tEnum(`transmission.${value}`))}
        {select("drivetrain", t("drivetrain"), DRIVETRAINS, vehicle?.drivetrain, (value) => tEnum(`drivetrain.${value}`))}
        {text("engine", t("engine"), vehicle?.engine, { required: true, maxLength: 80 })}
        {text("horsepower", t("horsepower"), vehicle?.horsepower, { type: "number", min: 1, max: 3000, required: true })}
        {text("mileage", t("mileage"), vehicle?.mileage ?? 0, { type: "number", min: 0, required: true })}
        {text("exteriorColor", t("exteriorColor"), vehicle?.exterior_color, { required: true, maxLength: 60 })}
        {text("interiorColor", t("interiorColor"), vehicle?.interior_color, { maxLength: 60 })}
        {select("condition", t("condition"), CONDITIONS, vehicle?.condition ?? "used", (value) => t(`conditions.${value}`))}
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-4">{t("badges")}</legend>
        <div className="flex flex-wrap gap-3">
          {BADGES.map((badge) => (
            <label key={badge} className="inline-flex items-center gap-2 border border-line px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={badges.includes(badge)}
                onChange={(event) => setBadges((current) => (event.target.checked ? [...current, badge] : current.filter((item) => item !== badge)))}
                className="accent-[var(--color-champagne)]"
              />
              {tBadge(badge)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <legend className="eyebrow mb-1">{t("description")}</legend>
        <p className="text-xs text-muted lg:col-span-3">{t("descriptionHint")}</p>
        {LANGS.map((lang) => (
          <Field key={lang} label={tLang(lang)}>
            <textarea name={`description.${lang}`} defaultValue={vehicle?.description?.[lang] ?? ""} rows={5} maxLength={4000} className={`${inputClass} h-auto py-2`} />
          </Field>
        ))}
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-4">{t("equipment")}</legend>
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={index} className="grid grid-cols-1 items-end gap-3 border-b border-line pb-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              {LANGS.map((lang) => (
                <Field key={lang} label={`${tLang(lang)}${lang === "en" ? " *" : ""}`}>
                  <input
                    value={item[lang]}
                    maxLength={160}
                    onChange={(event) => setItems((current) => current.map((row, i) => (i === index ? { ...row, [lang]: event.target.value } : row)))}
                    className={inputClass}
                  />
                </Field>
              ))}
              <button type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} aria-label={t("remove")} className={adminButton("ghost")}>
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setItems((current) => [...current, empty()])} className={`${adminButton("outline")} mt-4`} disabled={items.length >= 60}>
          <Plus className="size-4" aria-hidden />
          {t("addEquipment")}
        </button>
        {fieldError("equipment") && <p className="mt-2 text-xs text-red-600">{fieldError("equipment")}</p>}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <SubmitButton pending={pending}>{vehicle ? tc("save") : t("createDraft")}</SubmitButton>
        <Saved show={done && Boolean(vehicle)} />
      </div>
      <FormAlert code={error} />
    </form>
  );
}
