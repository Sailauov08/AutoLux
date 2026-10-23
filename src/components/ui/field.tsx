import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const control =
  "w-full rounded-none border-0 border-b border-line bg-transparent px-0 py-3.5 text-[16px] text-ink outline-none transition-colors duration-500 placeholder:text-muted/60 focus:border-ink aria-[invalid=true]:border-red-500 disabled:opacity-40 [color-scheme:inherit]";

type Common = { id: string; label: string; error?: string; className?: string };

function Shell({ id, label, error, className, children }: Common & { children: ReactNode }) {
  return (
    <div className={`group flex flex-col ${className ?? ""}`}>
      <label htmlFor={id} className="text-[11px] font-medium tracking-[0.24em] uppercase text-muted">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({ id, label, error, className, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Shell id={id} label={label} error={error} className={className}>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={control} {...props} />
    </Shell>
  );
}

export function TextAreaField({ id, label, error, className, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Shell id={id} label={label} error={error} className={className}>
      <textarea
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${control} min-h-28 resize-none`}
        {...props}
      />
    </Shell>
  );
}

export function SelectField({
  id,
  label,
  error,
  className,
  children,
  ...props
}: Common & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <Shell id={id} label={label} error={error} className={className}>
      <select id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={`${control} cursor-pointer`} {...props}>
        {children}
      </select>
    </Shell>
  );
}
