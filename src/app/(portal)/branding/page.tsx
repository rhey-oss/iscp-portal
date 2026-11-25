import { ConfirmSubmit } from "@/components/confirm-submit";
import { Field, FormCard, SelectField, TextAreaField } from "@/components/forms";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, PageHeader, SectionHeading } from "@/components/ui";
import {
  removeBrandingImageAction,
  updateBrandingAction,
  uploadBrandingImageAction,
} from "@/lib/actions/branding";
import { requireRole } from "@/lib/auth";
import { getBranding, type BrandingImageField } from "@/lib/branding";

export const metadata = { title: "College branding" };

const IMAGES: {
  field: BrandingImageField;
  title: string;
  hint: string;
}[] = [
  {
    field: "logo",
    title: "College logo",
    hint: "Shown in the sidebar, sign-in page, and all headers. Square images work best (JPG, PNG, GIF or WebP, up to 12 MB).",
  },
  {
    field: "loginBackground",
    title: "Sign-in background",
    hint: "A wide photo behind the sign-in form. A soft overlay keeps the form readable (up to 12 MB).",
  },
  {
    field: "appBackground",
    title: "Dashboard background",
    hint: "A subtle photo behind the signed-in pages. Cards stay solid so text remains clear (up to 12 MB).",
  },
];

export default async function BrandingPage() {
  await requireRole("ADMIN", "PRINCIPAL");
  const branding = await getBranding();

  return (
    <>
      <PageHeader
        title="College branding"
        description="Make the portal feel like your university â€” edit the name, logo, and background photos."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <FormCard
            title="College details"
            description="These appear in the browser title, headers, and sign-in page."
          >
            <ActionForm action={updateBrandingAction} submitLabel="Save details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="College name"
                  name="schoolName"
                  defaultValue={branding.schoolName}
                  required
                />
                <Field
                  label="Short name"
                  name="shortName"
                  defaultValue={branding.shortName}
                  hint="Used in the logo badge and browser tab (max 20 characters)."
                  required
                />
              </div>
              <TextAreaField
                label="Tagline (optional)"
                name="tagline"
                rows={2}
                defaultValue={branding.tagline ?? ""}
                placeholder="A short line about your university"
              />
              <div className="mt-4 border-t border-border pt-4">
                <SelectField
                  label="Colour theme"
                  name="theme"
                  defaultValue={branding.theme}
                  options={[
                    { value: "ocean", label: "Ocean blue (ISCP default)" },
                    { value: "emerald", label: "Emerald green" },
                    { value: "royal", label: "Royal purple" },
                    { value: "amber", label: "Amber gold" },
                    { value: "rose", label: "Rose" },
                    { value: "slate", label: "Slate grey" },
                  ]}
                />
              </div>
              <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                <Field
                  label="College address"
                  name="address"
                  defaultValue={branding.address ?? ""}
                  placeholder="Street, Municipality, Province"
                />
                <Field
                  label="College phone"
                  name="phone"
                  defaultValue={branding.phone ?? ""}
                  placeholder="(000) 000 0000"
                />
                <Field
                  label="College email"
                  name="email"
                  type="email"
                  defaultValue={branding.email ?? ""}
                  placeholder="college@iscp.edu.ph"
                />
              </div>
            </ActionForm>
          </FormCard>

          <div className="space-y-4">
            {IMAGES.map((item) => {
              const mediaId =
                item.field === "logo"
                  ? branding.logoMediaId
                  : item.field === "loginBackground"
                    ? branding.loginBackgroundMediaId
                    : branding.appBackgroundMediaId;
              const preview = mediaId
                ? `/api/branding/${item.field}?v=${branding.version}`
                : null;

              return (
                <Card key={item.field} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{item.title}</h2>
                      <p className="mt-1 max-w-xl text-xs text-muted">{item.hint}</p>
                    </div>
                    <Badge tone={mediaId ? "success" : "neutral"}>
                      {mediaId ? "Uploaded" : "Using default"}
                    </Badge>
                  </div>

                  {preview ? (
                    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt={`${item.title} preview`}
                        className={
                          item.field === "logo"
                            ? "size-20 object-contain p-2"
                            : "h-36 w-full object-cover"
                        }
                      />
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <ActionForm
                      action={uploadBrandingImageAction}
                      submitLabel={mediaId ? "Replace image" : "Upload image"}
                      className="flex flex-wrap items-end gap-3"
                    >
                      <input type="hidden" name="field" value={item.field} />
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium">Choose image</span>
                        <input
                          type="file"
                          name="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          required
                          className="w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-brand"
                        />
                      </label>
                    </ActionForm>
                    {mediaId ? (
                      <form action={removeBrandingImageAction}>
                        <input type="hidden" name="field" value={item.field} />
                        <ConfirmSubmit
                          label="Remove"
                          message={`Remove the ${item.title.toLowerCase()}?`}
                          className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-2"
                        />
                      </form>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="h-fit p-5">
          <SectionHeading title="Live preview" />
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <div className="login-brand-bg flex items-center gap-3 bg-brand p-4 text-brand-fg">
              <span className="grid size-10 place-items-center overflow-hidden rounded-xl bg-white/15 text-sm font-semibold">
                {branding.logoMediaId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/branding/logo?v=${branding.version}`}
                    alt=""
                    className="size-full object-contain p-1"
                  />
                ) : (
                  branding.shortName.slice(0, 2).toUpperCase()
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{branding.shortName}</p>
                <p className="truncate text-xs text-brand-fg/80">{branding.schoolName}</p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs text-muted">{branding.tagline || "No tagline yet."}</p>
              <div className="mt-4 h-24 rounded-lg bg-surface-2" />
            </div>
          </div>
          <p className="mt-4 text-xs text-muted">
            Branding images are public so they can appear on the sign-in page. Do not
            upload student photos or private documents here.
          </p>
        </Card>
      </div>
    </>
  );
}
