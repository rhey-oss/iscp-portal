import "server-only";

import type { Role } from "@/lib/constants";
import { ROLE_LABEL } from "@/lib/constants";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type DirectoryGroup = "TEACHER" | "STUDENT" | "STAFF" | "PARENT";

export type DirectoryUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  roleLabel: string;
  group: DirectoryGroup;
  rank: string;
  detail: string;
  section: string;
  status: "Active" | "Disabled";
  canEdit: boolean;
};

function groupFor(role: Role): DirectoryGroup {
  if (role === "ADMIN" || role === "PRINCIPAL" || role === "CASHIER") return "STAFF";
  return role;
}

export async function directoryUsers(viewer: CurrentUser): Promise<DirectoryUser[]> {
  const isStaff = viewer.role === "ADMIN" || viewer.role === "PRINCIPAL";

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: {
      teacherProfile: {
        select: { employeeNo: true, department: true },
      },
      studentProfile: {
        select: {
          studentNo: true,
          class: { select: { name: true, gradeLevel: true, section: true } },
        },
      },
    },
  });

  return users
    .filter((user): user is typeof user & { role: Role } =>
      ["ADMIN", "PRINCIPAL", "TEACHER", "CASHIER", "STUDENT", "PARENT"].includes(
        user.role,
      ),
    )
    .map((user) => {
      const isSelf = user.id === viewer.id;
      const canSeeContact = isStaff || isSelf;
      const group = groupFor(user.role);

      let rank = ROLE_LABEL[user.role];
      let detail = ROLE_LABEL[user.role];
      let section = ROLE_LABEL[user.role];

      if (user.teacherProfile) {
        rank = user.teacherProfile.department || "Instructor";
        if (user.teacherProfile.employeeNo) {
          rank += ` · ${user.teacherProfile.employeeNo}`;
        }
        detail = user.teacherProfile.department || "No department set";
        section = user.teacherProfile.department || "Instructors";
      } else if (user.studentProfile) {
        const cls = user.studentProfile.class;
        rank = cls?.gradeLevel || "Unassigned";
        detail = [cls?.name, user.studentProfile.studentNo]
          .filter(Boolean)
          .join(" · ");
        section = cls?.name || "Unassigned";
      }

      return {
        id: user.id,
        name: user.name,
        email: canSeeContact ? user.email : null,
        phone: canSeeContact ? user.phone : null,
        role: user.role,
        roleLabel: ROLE_LABEL[user.role],
        group,
        rank,
        detail,
        section,
        status: user.isActive ? ("Active" as const) : ("Disabled" as const),
        canEdit: isSelf || isStaff,
      };
    });
}
