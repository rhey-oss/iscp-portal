import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-brand";

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required = false,
  hint,
  step,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  step?: string;
  min?: string | number;
  max?: string | number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </span>
      <input
        className={inputClass}
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        step={step}
        min={min}
        max={max}
      />
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextAreaField({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 5,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        className={inputClass}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <select
        className={inputClass}
        name={name}
        defaultValue={defaultValue}
        required={required}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CheckboxField({
  label,
  name,
  defaultChecked = false,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-border accent-brand"
      />
      {label}
    </label>
  );
}

export function FormFeedback({
  state,
  className,
}: {
  state: { ok?: boolean; error?: string; message?: string } | undefined;
  className?: string;
}) {
  if (!state?.error && !state?.message) return null;

  return state.error ? (
    <p
      role="alert"
      className={cn(
        "flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger",
        className,
      )}
    >
      <AlertCircle className="size-4 shrink-0" aria-hidden />
      {state.error}
    </p>
  ) : (
    <p
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm text-success",
        className,
      )}
    >
      <CheckCircle2 className="size-4 shrink-0" aria-hidden />
      {state.message}
    </p>
  );
}

export function FormCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-5">{children}</div>
      {footer ? <div className="mt-5 flex flex-wrap gap-2">{footer}</div> : null}
    </div>
  );
}
