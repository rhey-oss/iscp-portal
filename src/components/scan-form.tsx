"use client";

import { useState } from "react";

import { ActionForm } from "@/components/action-form";
import { QrScanner } from "@/components/qr-scanner";
import type { ActionState } from "@/lib/form";
import { extractScanCode } from "@/lib/utils";

export function ScanForm({
  action,
  fieldName,
  hidden,
  buttonLabel,
  placeholder,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fieldName: string;
  hidden?: Record<string, string>;
  buttonLabel: string;
  placeholder: string;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="space-y-3">
      <QrScanner onDetect={(raw) => setValue(extractScanCode(raw))} />
      <ActionForm action={action} submitLabel={buttonLabel} className="space-y-2">
        {Object.entries(hidden ?? {}).map(([name, hiddenValue]) => (
          <input key={name} type="hidden" name={name} value={hiddenValue} />
        ))}
        <input
          name={fieldName}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          required
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      </ActionForm>
    </div>
  );
}
