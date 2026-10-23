"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormAlert } from "@/components/forms/form-status";
import { useRouter } from "@/i18n/navigation";
import { anonymizeCustomer, assignLead, createLead, logActivity, updateCustomer, updateLead } from "@/lib/actions/crm";
import { cancelSale, completeSale, correctSale, recordSale } from "@/lib/actions/operations";
import { ACTIVITY_KINDS, LEAD_STAGES, MANUAL_LEAD_SOURCES } from "@/lib/domain";
import { ActionButton, Field, inputClass, Saved, SubmitButton, useAction, useFieldError } from "./admin-client";

type Option = { id: string; label: string };

const formValues = (event: React.FormEvent<HTMLFormElement>) => Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;

export function LeadCreateForm({ vehicles, staff, canAssign }: { vehicles: Option[]; staff: Option[]; canAssign: boolean }) {
  const t = useTranslations("admin.leads");
  const tc = useTranslations("admin.common");
  const router = useRouter();
  const { pending, error, fields, run } = useAction();
  const fieldError = useFieldError(fields);
  return (
    <form
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        const v = formValues(event);
        run(() => createLead({ ...v, assignee: v.assignee ?? "" }), (data) => router.push(`/admin/leads/${data.id}`));
      }}
    >
      <Field label={tc("name")} error={fieldError("name")}>
        <input name="name" required maxLength={120} className={inputClass} />
      </Field>
      <Field label={tc("email")} error={fieldError("email")}>
        <input name="email" type="email" maxLength={254} className={inputClass} />
      </Field>
      <Field label={tc("phone")} error={fieldError("phone")}>
        <input name="phone" type="tel" maxLength={20} className={inputClass} />
      </Field>
      <Field label={t("source")}>
        <select name="source" defaultValue="phone" className={inputClass}>
          {MANUAL_LEAD_SOURCES.map((source) => (
            <option key={source} value={source}>
              {t(`sources.${source}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={tc("vehicle")}>
        <select name="vehicleId" defaultValue="" className={inputClass}>
          <option value="">{t("noVehicle")}</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.label}
            </option>
          ))}
        </select>
      </Field>
      {canAssign && (
        <Field label={tc("assignee")}>
          <select name="assignee" defaultValue="" className={inputClass}>
            <option value="">{tc("unassigned")}</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label={t("note")} className="md:col-span-2 xl:col-span-3">
        <textarea name="note" rows={2} maxLength={4000} className={`${inputClass} h-auto py-2`} />
      </Field>
      <div className="md:col-span-2 xl:col-span-3">
        <SubmitButton pending={pending}>{t("create")}</SubmitButton>
        <div className="mt-3">
          <FormAlert code={error} />
        </div>
      </div>
    </form>
  );
}

export function LeadEditor({
  lead,
  vehicles,
  followUpLocal,
}: {
  lead: { id: string; version: number; stage: string; vehicleId: string | null; negotiationPrice: number | null; lostReason: string | null };
  vehicles: Option[];
  followUpLocal: string;
}) {
  const t = useTranslations("admin.leads");
  const tc = useTranslations("admin.common");
  const tStage = useTranslations("statuses.stage");
  const { pending, error, fields, done, run } = useAction();
  const fieldError = useFieldError(fields);
  const [stage, setStage] = useState(lead.stage);
  const won = lead.stage === "won";

  return (
    <form
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const v = formValues(event);
        run(() => updateLead({ id: lead.id, version: lead.version, stage: v.stage, followUpAt: v.followUpAt ?? "", vehicleId: v.vehicleId ?? "", negotiationPrice: v.negotiationPrice ?? "", lostReason: v.lostReason ?? "" }));
      }}
    >
      <Field label={t("stage")} error={fieldError("stage")}>
        <select name="stage" value={stage} onChange={(event) => setStage(event.target.value)} disabled={won} className={inputClass}>
          {LEAD_STAGES.filter((value) => value !== "won" || won).map((value) => (
            <option key={value} value={value}>
              {tStage(value)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("followUp")} error={fieldError("followUpAt")}>
        <input name="followUpAt" type="datetime-local" defaultValue={followUpLocal} disabled={won} className={inputClass} />
      </Field>
      <Field label={tc("vehicle")}>
        <select name="vehicleId" defaultValue={lead.vehicleId ?? ""} disabled={won} className={inputClass}>
          <option value="">{t("noVehicle")}</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("negotiationPrice")} error={fieldError("negotiationPrice")}>
        <input name="negotiationPrice" type="number" min={1} defaultValue={lead.negotiationPrice ?? ""} disabled={won} className={inputClass} />
      </Field>
      {stage === "lost" && (
        <Field label={t("lostReason")} error={fieldError("lostReason")} className="sm:col-span-2">
          <input name="lostReason" required defaultValue={lead.lostReason ?? ""} maxLength={500} className={inputClass} />
        </Field>
      )}
      {won ? (
        <p className="text-xs text-muted sm:col-span-2">{t("wonLocked")}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <SubmitButton pending={pending}>{tc("save")}</SubmitButton>
          <Saved show={done} />
          <span className="text-xs text-muted">{t("wonHint")}</span>
        </div>
      )}
      <div className="sm:col-span-2">
        <FormAlert code={error} />
      </div>
    </form>
  );
}

export function AssignSelect({ id, assignee, staff }: { id: string; assignee: string | null; staff: Option[] }) {
  const tc = useTranslations("admin.common");
  const { pending, error, run } = useAction();
  return (
    <div className="space-y-2">
      <select
        aria-label={tc("assignee")}
        value={assignee ?? ""}
        disabled={pending}
        onChange={(event) => run(() => assignLead({ id, assignee: event.target.value }))}
        className={inputClass}
      >
        <option value="">{tc("unassigned")}</option>
        {staff.map((member) => (
          <option key={member.id} value={member.id}>
            {member.label}
          </option>
        ))}
      </select>
      <FormAlert code={error} />
    </div>
  );
}

export function ActivityForm({ leadId }: { leadId: string }) {
  const t = useTranslations("admin.leads");
  const { pending, error, fields, run } = useAction();
  const fieldError = useFieldError(fields);
  const [key, setKey] = useState(0);
  return (
    <form
      key={key}
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const v = formValues(event);
        run(() => logActivity({ leadId, kind: v.kind, body: v.body }), () => setKey((value) => value + 1));
      }}
    >
      <div className="flex flex-wrap gap-3">
        <select name="kind" defaultValue="call" aria-label={t("activityType")} className={`${inputClass} w-auto`}>
          {ACTIVITY_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`activityKinds.${kind}`)}
            </option>
          ))}
        </select>
      </div>
      <Field label={t("logActivity")} error={fieldError("body")}>
        <textarea name="body" required rows={3} maxLength={4000} placeholder={t("activityPlaceholder")} className={`${inputClass} h-auto py-2`} />
      </Field>
      <SubmitButton pending={pending}>{t("addActivity")}</SubmitButton>
      <FormAlert code={error} />
    </form>
  );
}

export function SaleForm({
  vehicles,
  customers,
  staff,
  defaults,
  today,
}: {
  vehicles: Option[];
  customers: Option[];
  staff: Option[];
  defaults: { vehicleId?: string | null; customerId?: string; leadId?: string; salespersonId?: string; price?: number | null };
  today: string;
}) {
  const t = useTranslations("admin.sales");
  const tc = useTranslations("admin.common");
  const router = useRouter();
  const { pending, error, fields, run } = useAction();
  const fieldError = useFieldError(fields);
  return (
    <form
      className="grid grid-cols-1 gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const v = formValues(event);
        run(() => recordSale({ ...v, leadId: defaults.leadId ?? "", salespersonId: v.salespersonId ?? "" }), (data) => router.push(`/admin/sales/${data.id}`));
      }}
    >
      <Field label={tc("vehicle")} error={fieldError("vehicleId")}>
        <select name="vehicleId" required defaultValue={defaults.vehicleId ?? ""} className={inputClass}>
          <option value="" disabled>
            {t("selectVehicle")}
          </option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.label}
            </option>
          ))}
        </select>
      </Field>
      {defaults.customerId ? (
        <input type="hidden" name="customerId" value={defaults.customerId} />
      ) : (
        <Field label={tc("customer")} error={fieldError("customerId")}>
          <select name="customerId" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              {t("selectCustomer")}
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label={t("price")} error={fieldError("price")}>
        <input name="price" type="number" min={1} required defaultValue={defaults.price ?? ""} className={inputClass} />
      </Field>
      <Field label={t("date")} error={fieldError("saleDate")}>
        <input name="saleDate" type="date" required defaultValue={today} max={today} className={inputClass} />
      </Field>
      <Field label={t("salesperson")}>
        <select name="salespersonId" defaultValue={defaults.salespersonId ?? ""} className={inputClass}>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={tc("status")}>
        <select name="status" defaultValue="completed" className={inputClass}>
          <option value="completed">{t("statuses.completed")}</option>
          <option value="pending">{t("statuses.pending")}</option>
        </select>
      </Field>
      <Field label={tc("notes")} className="md:col-span-2">
        <textarea name="notes" rows={2} maxLength={4000} className={`${inputClass} h-auto py-2`} />
      </Field>
      <p className="text-xs text-muted md:col-span-2">{t("recordHint")}</p>
      <div className="md:col-span-2">
        <SubmitButton pending={pending}>{t("record")}</SubmitButton>
        <div className="mt-3">
          <FormAlert code={error} />
        </div>
      </div>
    </form>
  );
}

export function SaleActions({
  sale,
  staff,
  canUpdate,
  canCancel,
}: {
  sale: { id: string; version: number; status: string; price: number; saleDate: string; salespersonId: string | null; notes: string | null };
  staff: Option[];
  canUpdate: boolean;
  canCancel: boolean;
}) {
  const t = useTranslations("admin.sales");
  const tc = useTranslations("admin.common");
  const correction = useAction();
  const cancel = useAction();
  const correctionError = useFieldError(correction.fields);
  const cancelError = useFieldError(cancel.fields);
  if (sale.status === "cancelled") return <p className="text-sm text-muted">{t("cancelledLocked")}</p>;

  return (
    <div className="space-y-8">
      {canUpdate && sale.status === "pending" && (
        <ActionButton variant="primary" confirm={t("completeConfirm")} action={() => completeSale(sale.id, sale.version)}>
          {t("complete")}
        </ActionButton>
      )}
      {canUpdate && (
        <form
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const v = formValues(event);
            correction.run(() => correctSale({ ...v, id: sale.id, version: sale.version }));
          }}
        >
          <p className="eyebrow md:col-span-2">{t("correct")}</p>
          <Field label={t("price")} error={correctionError("price")}>
            <input name="price" type="number" min={1} required defaultValue={sale.price} className={inputClass} />
          </Field>
          <Field label={t("date")} error={correctionError("saleDate")}>
            <input name="saleDate" type="date" required defaultValue={sale.saleDate} className={inputClass} />
          </Field>
          <Field label={t("salesperson")}>
            <select name="salespersonId" defaultValue={sale.salespersonId ?? ""} className={inputClass}>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tc("reason")} error={correctionError("reason")}>
            <input name="reason" required minLength={3} maxLength={500} className={inputClass} />
          </Field>
          <Field label={tc("notes")} className="md:col-span-2">
            <textarea name="notes" defaultValue={sale.notes ?? ""} rows={2} maxLength={4000} className={`${inputClass} h-auto py-2`} />
          </Field>
          <div className="flex items-center gap-4 md:col-span-2">
            <SubmitButton pending={correction.pending}>{t("saveCorrection")}</SubmitButton>
            <Saved show={correction.done} />
          </div>
          <div className="md:col-span-2">
            <FormAlert code={correction.error} />
          </div>
        </form>
      )}
      {canCancel && (
        <form
          className="space-y-3 border-t border-line pt-6"
          onSubmit={(event) => {
            event.preventDefault();
            const v = formValues(event);
            if (window.confirm(t("cancelConfirm"))) cancel.run(() => cancelSale({ id: sale.id, version: sale.version, reason: v.reason }));
          }}
        >
          <p className="eyebrow">{t("cancel")}</p>
          <Field label={tc("reason")} error={cancelError("reason")}>
            <input name="reason" required minLength={3} maxLength={500} className={inputClass} />
          </Field>
          <SubmitButton pending={cancel.pending} variant="danger">
            {t("cancel")}
          </SubmitButton>
          <FormAlert code={cancel.error} />
        </form>
      )}
    </div>
  );
}

export function CustomerEditor({ customer }: { customer: { id: string; version: number; fullName: string; email: string | null; phone: string | null; locale: string; notes: string | null } }) {
  const tc = useTranslations("admin.common");
  const tLang = useTranslations("account.languages");
  const t = useTranslations("admin.customers");
  const { pending, error, fields, done, run } = useAction();
  const fieldError = useFieldError(fields);
  return (
    <form
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const v = formValues(event);
        run(() => updateCustomer({ ...v, id: customer.id, version: customer.version }));
      }}
    >
      <Field label={tc("name")} error={fieldError("fullName")}>
        <input name="fullName" required defaultValue={customer.fullName} maxLength={120} className={inputClass} />
      </Field>
      <Field label={tc("email")} error={fieldError("email")}>
        <input name="email" type="email" defaultValue={customer.email ?? ""} maxLength={254} className={inputClass} />
      </Field>
      <Field label={tc("phone")} error={fieldError("phone")}>
        <input name="phone" type="tel" defaultValue={customer.phone ?? ""} className={inputClass} />
      </Field>
      <Field label={t("language")}>
        <select name="locale" defaultValue={customer.locale} className={inputClass}>
          {(["kk", "ru", "en"] as const).map((lang) => (
            <option key={lang} value={lang}>
              {tLang(lang)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={tc("notes")} className="sm:col-span-2">
        <textarea name="notes" defaultValue={customer.notes ?? ""} rows={3} maxLength={4000} className={`${inputClass} h-auto py-2`} />
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

export function AnonymizeButton({ customerId }: { customerId: string }) {
  const t = useTranslations("admin.customers");
  return (
    <ActionButton variant="danger" confirm={t("anonymizeConfirm")} action={() => anonymizeCustomer(customerId)}>
      {t("anonymize")}
    </ActionButton>
  );
}
