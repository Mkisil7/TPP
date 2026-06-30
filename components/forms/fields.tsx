"use client";

import { cn } from "@/lib/utils";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        type={type}
        className="field-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <textarea
        className="field-input"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        className="field-input"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </label>
  );
}

export function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  const opts: { label: string; v: boolean | null }[] = [
    { label: "Yes", v: true },
    { label: "No", v: false },
    { label: "—", v: null },
  ];
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex gap-2">
        {opts.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => onChange(o.v)}
            className={cn(
              "flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition",
              value === o.v
                ? "border-adt-navy bg-adt-navy text-white"
                : "border-adt-line bg-white text-adt-navy hover:bg-adt-mist",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-adt-line bg-white px-3 py-2.5 hover:bg-adt-mist">
      <input
        type="checkbox"
        className="h-5 w-5 accent-adt-navy"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-adt-ink">{label}</span>
    </label>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-base font-extrabold uppercase tracking-wide text-adt-navy">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
