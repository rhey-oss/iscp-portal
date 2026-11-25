import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, KeyRound } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { Field, FormCard, SelectField } from "@/components/forms";
import { Badge, Card, PageHeader, SectionHeading } from "@/components/ui";
import { updateProfileAction } from "@/lib/actions/directory";
import { requireUser } from "@/lib/auth";
import { ROLES, ROLE_LABEL } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { initials } from "@/lib/utils";

export const metadata = { title: "Profile" };

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireUser();
  const { id } = await params;

  const target = await prisma.user.findUnique({
    where: { id },
    include: {
      teacherProfile: true,
      studentProfile: { include: { class: { select: { name: true, gradeLevel: true } } } },
    },
  });
  if (!target) notFound();

  const isSelf = target.id === viewer.id;
  const isStaffViewer = viewer.role === "ADMIN" || viewer.role === "PRINCIPAL";
  const canEdit = isSelf || (isStaffViewer && !(viewer.role === "PRINCIPAL" && target.role === "ADMIN"));
  const staffEditingOther = isStaffViewer && !isSelf;

  const classes = staffEditingOther
    ? await prisma.class.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const rank = target.teacherProfile
    ? target.teacherProfile.department || "Instructor"
    : target.studentProfile
      ? target.studentProfile.class?.gradeLevel || "Unassigned"
      : ROLE_LABEL[target.role as keyof typeof ROLE_LABEL] ?? target.role;

  const roleOptions = ROLES.filter((role) =>
    viewer.role === "ADMIN" ? true : role !== "ADMIN",
  ).map((role) => ({ value: role, label: ROLE_LABEL[role] }));

  return (
    <>
      <Link
        href="/directory"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Directory
      </Link>

      <div className="mt-4">
        <PageHeader
          title={target.name}
          description={`${rank} · ${ROLE_LABEL[target.role as keyof typeof ROLE_LABEL] ?? target.role}`}
          actions={
            <>
              <Badge tone={target.isActive ? "success" : "danger"}>
                {target.isActive ? "Active" : "Disabled"}
              </Badge>
              {isSelf ? (
                <Link
                  href="/account/password"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium hover:bg-surface-2"
                >
                  <KeyRound className="size-4" aria-hidden />
                  Change password
                </Link>
              ) : null}
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="p-5">
          <div className="flex flex-col items-center text-center">
            <span className="grid size-20 place-items-center rounded-full bg-brand-soft text-2xl font-semibold text-brand">
              {initials(target.name)}
            </span>
            <h2 className="mt-3 font-semibold">{target.name}</h2>
            <p className="text-sm text-muted">
              {ROLE_LABEL[target.role as keyof typeof ROLE_LABEL] ?? target.role}
            </p>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <SectionHeading title="At a glance" />
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Rank / position</dt>
                <dd className="text-right font-medium">{rank}</dd>
              </div>
              {target.teacherProfile ? (
                <>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Employee no.</dt>
                    <dd className="font-medium">{target.teacherProfile.employeeNo ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Department</dt>
                    <dd className="text-right font-medium">{target.teacherProfile.department ?? "—"}</dd>
                  </div>
                </>
              ) : null}
              {target.studentProfile ? (
                <>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Student no.</dt>
                    <dd className="font-medium">{target.studentProfile.studentNo}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Class</dt>
                    <dd className="text-right font-medium">{target.studentProfile.class?.name ?? "Unassigned"}</dd>
                  </div>
                </>
              ) : null}
              {(isStaffViewer || isSelf) && target.email ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Email</dt>
                  <dd className="break-all text-right text-xs font-medium">{target.email}</dd>
                </div>
              ) : null}
              {(isStaffViewer || isSelf) && target.phone ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Phone</dt>
                  <dd className="font-medium">{target.phone}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </Card>

        <div>
          {canEdit ? (
            <FormCard
              title={isSelf ? "Edit my profile" : `Edit ${target.name}'s profile`}
              description={
                staffEditingOther
                  ? "Update identity, rank, and college details."
                  : "Keep your contact details current."
              }
            >
              <ActionForm action={updateProfileAction} submitLabel="Save profile">
                <input type="hidden" name="targetId" value={target.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" name="name" defaultValue={target.name} required />
                  <Field label="Email" name="email" type="email" defaultValue={target.email} required />
                  <Field label="Phone" name="phone" defaultValue={target.phone ?? ""} placeholder="Optional" />
                  {staffEditingOther ? (
                    <>
                      <SelectField
                        label="Rank / role"
                        name="role"
                        defaultValue={target.role}
                        options={roleOptions}
                      />
                      <div className="sm:col-span-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="isActive"
                            defaultChecked={target.isActive}
                            className="size-4 accent-brand"
                          />
                          Account active
                        </label>
                      </div>
                    </>
                  ) : null}
                </div>

                {staffEditingOther && target.teacherProfile ? (
                  <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                    <Field
                      label="Employee number"
                      name="employeeNo"
                      defaultValue={target.teacherProfile.employeeNo ?? ""}
                    />
                    <Field
                      label="Department"
                      name="department"
                      defaultValue={target.teacherProfile.department ?? ""}
                    />
                  </div>
                ) : null}

                {staffEditingOther && target.studentProfile ? (
                  <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                    <Field
                      label="Student number"
                      name="studentNo"
                      defaultValue={target.studentProfile.studentNo}
                    />
                    <SelectField
                      label="Class"
                      name="classId"
                      defaultValue={target.studentProfile.classId ?? ""}
                      options={[
                        { value: "", label: "Unassigned" },
                        ...classes.map((cls) => ({ value: cls.id, label: cls.name })),
                      ]}
                    />
                    <Field
                      label="Guardian name"
                      name="guardianName"
                      defaultValue={target.studentProfile.guardianName ?? ""}
                    />
                    <Field
                      label="Guardian phone"
                      name="guardianPhone"
                      defaultValue={target.studentProfile.guardianPhone ?? ""}
                    />
                  </div>
                ) : null}
              </ActionForm>
            </FormCard>
          ) : (
            <Card className="p-5">
              <p className="text-sm text-muted">
                Only this person or a college administrator can edit this profile.
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
