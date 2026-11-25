import { CheckboxField, Field, SelectField, TextAreaField } from "@/components/forms";
import {
  ANNOUNCEMENT_CATEGORY,
  ANNOUNCEMENT_PRIORITY,
  ROLES,
  ROLE_LABEL,
} from "@/lib/constants";

function inputDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 16) : "";
}

export function AnnouncementFields({
  classes,
  canPostGlobally,
  item,
}: {
  classes: { id: string; name: string }[];
  canPostGlobally: boolean;
  item?: {
    id: string;
    title: string;
    body: string;
    audience: string;
    classId: string | null;
    targetRole: string | null;
    category: string;
    priority: string;
    status: string;
    publishAt: Date;
    expiresAt: Date | null;
    eventStartsAt: Date | null;
    eventEndsAt: Date | null;
    location: string | null;
    isPinned: boolean;
  } | null;
}) {
  const audience = item?.audience ?? (canPostGlobally ? "SCHOOL" : "CLASS");

  return (
    <>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <Field label="Title" name="title" required defaultValue={item?.title} placeholder="College activity or advisory" />
      <TextAreaField
        label="Message"
        name="body"
        required
        rows={7}
        defaultValue={item?.body}
        placeholder="Write the full announcement hereâ€¦"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Audience"
          name="audience"
          defaultValue={audience}
          options={
            canPostGlobally
              ? [
                  { value: "SCHOOL", label: "Whole college" },
                  { value: "CLASS", label: "One class" },
                  { value: "ROLE", label: "One role" },
                  { value: "ALL", label: "Everyone" },
                ]
              : [{ value: "CLASS", label: "My class" }]
          }
        />
        <SelectField
          label="Class"
          name="classId"
          defaultValue={item?.classId ?? ""}
          options={[
            { value: "", label: "No class" },
            ...classes.map((cls) => ({ value: cls.id, label: cls.name })),
          ]}
        />
        <SelectField
          label="Role"
          name="targetRole"
          defaultValue={item?.targetRole ?? "PARENT"}
          options={ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] }))}
        />
        <SelectField
          label="Category"
          name="category"
          defaultValue={item?.category ?? "GENERAL"}
          options={ANNOUNCEMENT_CATEGORY.map((category) => ({
            value: category,
            label: category.charAt(0) + category.slice(1).toLowerCase(),
          }))}
        />
        <SelectField
          label="Priority"
          name="priority"
          defaultValue={item?.priority ?? "NORMAL"}
          options={ANNOUNCEMENT_PRIORITY.map((priority) => ({
            value: priority,
            label: priority.charAt(0) + priority.slice(1).toLowerCase(),
          }))}
        />
        <SelectField
          label="Status"
          name="status"
          defaultValue={item?.status ?? "PUBLISHED"}
          options={[
            { value: "PUBLISHED", label: "Publish now" },
            { value: "SCHEDULED", label: "Scheduled" },
            { value: "DRAFT", label: "Draft" },
          ]}
        />
        <Field label="Publish at" name="publishAt" type="datetime-local" defaultValue={inputDate(item?.publishAt)} />
        <Field label="Expires at" name="expiresAt" type="datetime-local" defaultValue={inputDate(item?.expiresAt)} />
        <Field label="Event starts" name="eventStartsAt" type="datetime-local" defaultValue={inputDate(item?.eventStartsAt)} />
        <Field label="Event ends" name="eventEndsAt" type="datetime-local" defaultValue={inputDate(item?.eventEndsAt)} />
        <Field label="Location" name="location" defaultValue={item?.location ?? ""} />
      </div>

      <CheckboxField label="Pin to the top of the announcement list" name="isPinned" defaultChecked={item?.isPinned ?? false} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Cover image</span>
          <input type="file" name="cover" accept="image/jpeg,image/png,image/gif,image/webp" className="w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-brand" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Gallery images</span>
          <input type="file" name="gallery" accept="image/jpeg,image/png,image/gif,image/webp" multiple className="w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-brand" />
        </label>
      </div>
    </>
  );
}
