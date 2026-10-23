"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, Loader2, Star, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { FormAlert } from "@/components/forms/form-status";
import { useRouter } from "@/i18n/navigation";
import {
  changePrice,
  decidePriceRequest,
  deleteDraftVehicle,
  deleteVehicleMedia,
  reorderVehicleMedia,
  saveVehiclePrivate,
  setPublication,
  transitionVehicle,
  updateMediaMeta,
  uploadVehicleMedia,
} from "@/lib/actions/inventory";
import type { MediaRow } from "@/lib/data/admin";
import { MEDIA_KINDS, type VehicleStatus } from "@/lib/domain";
import { formatPrice } from "@/lib/format";
import { ActionButton, adminButton, Field, inputClass, Saved, SubmitButton, useAction, useFieldError } from "./admin-client";

type Ref = { id: string; version: number };

const TRANSITIONS: Record<string, { to: VehicleStatus; key: string; permission: "update" | "delete"; tone?: "danger" }[]> = {
  draft: [{ to: "available", key: "toAvailable", permission: "update" }, { to: "archived", key: "toArchived", permission: "delete", tone: "danger" }],
  available: [{ to: "draft", key: "toDraft", permission: "update" }, { to: "archived", key: "toArchived", permission: "delete", tone: "danger" }],
  reserved: [{ to: "available", key: "release", permission: "update" }],
  sold: [{ to: "archived", key: "toArchived", permission: "delete", tone: "danger" }],
  archived: [{ to: "draft", key: "restore", permission: "update" }],
};

export function LifecycleControls({ vehicle, status, canUpdate, canDelete }: { vehicle: Ref; status: string; canUpdate: boolean; canDelete: boolean }) {
  const t = useTranslations("admin.inventory");
  const options = (TRANSITIONS[status] ?? []).filter((item) => (item.permission === "update" ? canUpdate : canDelete));
  if (options.length === 0) return <p className="text-xs text-muted">{t("noTransitions")}</p>;
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => (
        <ActionButton
          key={option.to + option.key}
          variant={option.tone ?? "outline"}
          confirm={option.to === "archived" ? t("archiveConfirm") : undefined}
          action={() => transitionVehicle({ id: vehicle.id, status: option.to, version: vehicle.version })}
        >
          {t(option.key)}
        </ActionButton>
      ))}
    </div>
  );
}

export function PublicationControls({ vehicle, status, published, featured }: { vehicle: Ref; status: string; published: boolean; featured: boolean }) {
  const t = useTranslations("admin.inventory");
  const publishable = ["available", "reserved", "sold"].includes(status);
  const featurable = published && ["available", "reserved"].includes(status);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <ActionButton variant={published ? "outline" : "primary"} action={() => setPublication({ ...vehicle, published: !published, featured: published ? false : featured })}>
          {published ? t("unpublish") : t("publish")}
        </ActionButton>
        {featurable && (
          <ActionButton action={() => setPublication({ ...vehicle, published, featured: !featured })}>{featured ? t("unfeature") : t("feature")}</ActionButton>
        )}
      </div>
      {!publishable && <p className="text-xs text-muted">{t("publishHint")}</p>}
    </div>
  );
}

export function PriceControls({
  vehicle,
  price,
  requests,
  canApprove,
  names,
}: {
  vehicle: Ref;
  price: number;
  requests: { id: string; proposed_price: number; current_price: number; reason: string; requested_by: string }[];
  canApprove: boolean;
  names: Record<string, string>;
}) {
  const t = useTranslations("admin.inventory");
  const { pending, error, fields, run } = useAction();
  const fieldError = useFieldError(fields);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  return (
    <div className="space-y-5">
      <p className="font-display text-3xl tabular-nums">{formatPrice(price)}</p>
      <form
        key={key}
        className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          run(
            () => changePrice({ id: vehicle.id, version: vehicle.version, price: data.get("price"), reason: data.get("reason") }),
            (result) => {
              setOutcome(result.outcome === "applied" ? t("priceApplied") : t("priceRequested"));
              setKey((value) => value + 1);
            },
          );
        }}
      >
        <Field label={t("newPrice")} error={fieldError("price")}>
          <input name="price" type="number" min={1} required className={inputClass} />
        </Field>
        <Field label={t("priceReason")} error={fieldError("reason")}>
          <input name="reason" maxLength={500} className={inputClass} />
        </Field>
        <SubmitButton pending={pending}>{t("changePrice")}</SubmitButton>
      </form>
      {outcome && <Saved show>{outcome}</Saved>}
      <FormAlert code={error} />

      {requests.length > 0 && (
        <div>
          <p className="eyebrow mb-2">{t("pendingRequests")}</p>
          <ul className="divide-y divide-line text-sm">
            {requests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span>
                  {formatPrice(request.current_price)} → <strong className="tabular-nums">{formatPrice(request.proposed_price)}</strong>
                  <span className="block text-xs text-muted">
                    {request.reason} · {names[request.requested_by] ?? "—"}
                  </span>
                </span>
                {canApprove && (
                  <span className="flex gap-2">
                    <ActionButton variant="primary" action={() => decidePriceRequest(request.id, true)}>
                      {t("approve")}
                    </ActionButton>
                    <ActionButton action={() => decidePriceRequest(request.id, false)}>{t("reject")}</ActionButton>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PrivateRecordForm({ vehicleId, data }: { vehicleId: string; data: { vin: string | null; stock_number: string | null; internal_notes: string | null } | null }) {
  const t = useTranslations("admin.inventory");
  const tc = useTranslations("admin.common");
  const { pending, error, fields, done, run } = useAction();
  const fieldError = useFieldError(fields);
  return (
    <form
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        run(() => saveVehiclePrivate({ vehicleId, vin: form.get("vin"), stockNumber: form.get("stockNumber"), internalNotes: form.get("internalNotes") }));
      }}
    >
      <Field label={t("vin")} error={fieldError("vin")}>
        <input name="vin" defaultValue={data?.vin ?? ""} maxLength={17} autoComplete="off" className={`${inputClass} uppercase`} />
      </Field>
      <Field label={t("stockNumber")}>
        <input name="stockNumber" defaultValue={data?.stock_number ?? ""} maxLength={40} className={inputClass} />
      </Field>
      <Field label={t("internalNotes")} className="sm:col-span-2">
        <textarea name="internalNotes" defaultValue={data?.internal_notes ?? ""} rows={3} maxLength={4000} className={`${inputClass} h-auto py-2`} />
      </Field>
      <div className="flex items-center gap-4 sm:col-span-2">
        <SubmitButton pending={pending}>{tc("save")}</SubmitButton>
        <Saved show={done} />
      </div>
      <div className="sm:col-span-2">
        <FormAlert code={error} />
      </div>
    </form>
  );
}

export function MediaManager({ vehicleId, media }: { vehicleId: string; media: MediaRow[] }) {
  const t = useTranslations("admin.inventory");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, start] = useTransition();
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [kind, setKind] = useState("exterior");
  const [source, setSource] = useState("dealer");
  const { pending, error, run } = useAction();
  const ordered = [...media].sort((a, b) => a.position - b.position);

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].slice(0, 20);
    setErrors([]);
    start(async () => {
      const failed: string[] = [];
      for (const [index, file] of list.entries()) {
        setProgress({ current: index + 1, total: list.length });
        const data = new FormData();
        data.set("vehicleId", vehicleId);
        data.set("kind", kind);
        data.set("source", source);
        data.set("file", file);
        const result = await uploadVehicleMedia(data);
        if (!result.ok) failed.push(`${file.name}: ${tErrors.has(result.error) ? tErrors(result.error) : tErrors("generic")}`);
      }
      setProgress(null);
      setErrors(failed);
      if (input.current) input.current.value = "";
      router.refresh();
    });
  };

  const move = (index: number, offset: number) => {
    const ids = ordered.map((item) => item.id);
    const [item] = ids.splice(index, 1);
    ids.splice(index + offset, 0, item);
    run(() => reorderVehicleMedia({ vehicleId, ids }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("kind")}>
          <select value={kind} onChange={(event) => setKind(event.target.value)} className={inputClass}>
            {MEDIA_KINDS.map((value) => (
              <option key={value} value={value}>
                {t(`kinds.${value}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("source")}>
          <select value={source} onChange={(event) => setSource(event.target.value)} className={inputClass}>
            <option value="dealer">{t("sources.dealer")}</option>
            <option value="representative">{t("sources.representative")}</option>
          </select>
        </Field>
        <label className={`${adminButton("primary")} cursor-pointer`}>
          {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
          {progress ? t("uploading", progress) : t("upload")}
          <input
            ref={input}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={uploading}
            onChange={(event) => upload(event.target.files)}
            className="sr-only"
          />
        </label>
      </div>
      <p className="text-xs text-muted">{t("uploadHint")}</p>
      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 text-xs text-red-600 dark:text-red-400">
          {errors.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <FormAlert code={error} />

      {ordered.length === 0 ? (
        <p className="border border-dashed border-line px-4 py-10 text-center text-sm text-muted">{t("noPhotos")}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ordered.map((item, index) => (
            <li key={item.id} className="border border-line bg-page">
              <div className="relative aspect-[4/3] bg-mist">
                <Image src={item.url} alt={t("photoAlt", { n: index + 1 })} fill sizes="(min-width: 1280px) 25vw, 50vw" className="object-cover" />
                {index === 0 && <span className="absolute top-2 left-2 bg-champagne px-2 py-1 text-[10px] font-semibold tracking-[0.16em] uppercase text-obsidian">{t("cover")}</span>}
              </div>
              <div className="space-y-2 p-3 text-xs">
                <div className="flex gap-2">
                  <select
                    aria-label={t("kind")}
                    value={item.kind}
                    disabled={pending}
                    onChange={(event) => run(() => updateMediaMeta(item.id, { kind: event.target.value, source: item.source }))}
                    className={`${inputClass} h-8 text-xs`}
                  >
                    {MEDIA_KINDS.map((value) => (
                      <option key={value} value={value}>
                        {t(`kinds.${value}`)}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={t("source")}
                    value={item.source}
                    disabled={pending}
                    onChange={(event) => run(() => updateMediaMeta(item.id, { kind: item.kind, source: event.target.value }))}
                    className={`${inputClass} h-8 text-xs`}
                  >
                    <option value="dealer">{t("sources.dealer")}</option>
                    <option value="representative">{t("sources.representative")}</option>
                  </select>
                </div>
                {item.credit && <p className="text-muted">{t("credit", { credit: item.credit })}</p>}
                <div className="flex items-center gap-1">
                  {index > 0 && (
                    <button type="button" disabled={pending} onClick={() => move(index, -index)} title={t("makeCover")} aria-label={t("makeCover")} className={adminButton("ghost", "h-8 px-2")}>
                      <Star className="size-4" aria-hidden />
                    </button>
                  )}
                  <button type="button" disabled={pending || index === 0} onClick={() => move(index, -1)} aria-label={t("moveUp")} title={t("moveUp")} className={adminButton("ghost", "h-8 px-2")}>
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button type="button" disabled={pending || index === ordered.length - 1} onClick={() => move(index, 1)} aria-label={t("moveDown")} title={t("moveDown")} className={adminButton("ghost", "h-8 px-2")}>
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                  <span className="ml-auto">
                    <ActionButton variant="ghost" className="h-8 px-2" confirm={t("removePhotoConfirm")} action={() => deleteVehicleMedia(item.id)}>
                      <Trash2 className="size-4" aria-label={t("removePhoto")} />
                    </ActionButton>
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DeleteDraftButton({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations("admin.inventory");
  const router = useRouter();
  return (
    <ActionButton variant="danger" confirm={t("deleteDraftConfirm")} action={() => deleteDraftVehicle(vehicleId)} onDone={() => router.push("/admin/inventory")}>
      {t("deleteDraft")}
    </ActionButton>
  );
}
