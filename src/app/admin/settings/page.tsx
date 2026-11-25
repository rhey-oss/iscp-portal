import { ActionForm } from "@/components/action-form";
import { Field, FormCard } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { updateSettingAction } from "@/lib/actions/admin";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Settings" };

const DEFAULTS = [
  { key: "schoolYear", label: "Active academic year", value: "2026-2027", hint: "Shown in reports and class lists." },
  { key: "attendanceCutoffHour", label: "Absence alert hour", value: "8", hint: "Parents are alerted if a child has not checked in by this hour." },
  { key: "attendanceCutoffMinute", label: "Absence alert minute", value: "30", hint: "Use 0–59." },
];

export default async function SettingsPage() {
  await requireRole("ADMIN");
  const settings = await prisma.setting.findMany();
  const values = new Map(settings.map((setting) => [setting.key, setting.value]));

  return (
    <>
      <PageHeader title="Settings" description="University-wide options used by attendance and reports." />
      <div className="grid gap-4 md:grid-cols-2">
        {DEFAULTS.map((setting) => (
          <FormCard key={setting.key} title={setting.label} description={setting.hint}>
            <ActionForm action={updateSettingAction} submitLabel="Save setting">
              <input type="hidden" name="key" value={setting.key} />
              <Field
                label="Value"
                name="value"
                defaultValue={values.get(setting.key) ?? setting.value}
                required
              />
            </ActionForm>
          </FormCard>
        ))}
      </div>
    </>
  );
}
