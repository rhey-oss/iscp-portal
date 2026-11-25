import type { Role } from "@/lib/constants";

export const ICON_NAMES = [
  "home",
  "megaphone",
  "users",
  "classes",
  "attendance",
  "grades",
  "tasks",
  "children",
  "reports",
  "bell",
  "settings",
  "shield",
  "upload",
  "qr",
  "tuition",
  "directory",
  "calendar",
  "cashier",
  "branding",
  "programs",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

const ANNOUNCEMENTS: NavItem = {
  href: "/announcements",
  label: "Announcements",
  icon: "megaphone",
};

const TUITION: NavItem = {
  href: "/tuition/manage",
  label: "Tuition",
  icon: "tuition",
};

const MY_TUITION: NavItem = {
  href: "/tuition",
  label: "My tuition",
  icon: "tuition",
};

const DIRECTORY: NavItem = {
  href: "/directory",
  label: "Directory",
  icon: "directory",
};

const CALENDAR: NavItem = {
  href: "/calendar",
  label: "Calendar",
  icon: "calendar",
};

const SCHEDULE: NavItem = {
  href: "/schedule",
  label: "My schedule",
  icon: "calendar",
};

const CASHIER_DESK: NavItem = {
  href: "/cashier",
  label: "Cashier desk",
  icon: "cashier",
};

const HELP: NavItem = {
  href: "/help",
  label: "Help & FAQ",
  icon: "bell",
};

const PROGRAMS: NavItem = {
  href: "/courses",
  label: "Courses",
  icon: "programs",
};

export function navForRole(role: Role): NavItem[] {
  switch (role) {
    case "ADMIN":
      return [
        { href: "/admin", label: "Overview", icon: "home" },
        { href: "/admin/students", label: "Students", icon: "users" },
        { href: "/admin/classes", label: "Classes", icon: "classes" },
        { href: "/admin/users", label: "Accounts", icon: "users" },
        { href: "/admin/import", label: "Import CSV", icon: "upload" },
        { href: "/audit", label: "Audit log", icon: "shield" },
        { href: "/admin/settings", label: "Settings", icon: "settings" },
        { href: "/branding", label: "College branding", icon: "branding" },
        TUITION,
        CASHIER_DESK,
        DIRECTORY,
        PROGRAMS,
        SCHEDULE,
        CALENDAR,
        HELP,
        { href: "/notifications", label: "Notifications", icon: "bell" },
        ANNOUNCEMENTS,
      ];
    case "PRINCIPAL":
      return [
        { href: "/principal", label: "Overview", icon: "home" },
        { href: "/principal/reports", label: "Reports", icon: "reports" },
        { href: "/audit", label: "Audit log", icon: "shield" },
        { href: "/branding", label: "College branding", icon: "branding" },
        TUITION,
        CASHIER_DESK,
        DIRECTORY,
        PROGRAMS,
        SCHEDULE,
        CALENDAR,
        HELP,
        { href: "/notifications", label: "Notifications", icon: "bell" },
        ANNOUNCEMENTS,
      ];
    case "TEACHER":
      return [
        { href: "/teacher", label: "Overview", icon: "home" },
        { href: "/teacher/attendance", label: "Attendance", icon: "attendance" },
        { href: "/teacher/grades", label: "Grades", icon: "grades" },
        { href: "/teacher/tasks", label: "Tasks", icon: "tasks" },
        { href: "/teacher/classes", label: "My classes", icon: "classes" },
        TUITION,
        DIRECTORY,
        PROGRAMS,
        SCHEDULE,
        CALENDAR,
        HELP,
        { href: "/notifications", label: "Notifications", icon: "bell" },
        ANNOUNCEMENTS,
      ];
    case "CASHIER":
      return [
        CASHIER_DESK,
        {
          href: "/cashier/collect",
          label: "Record payment",
          icon: "cashier",
        },
        {
          href: "/cashier/payments",
          label: "Payment records",
          icon: "reports",
        },
        {
          href: "/cashier/reports",
          label: "Collections report",
          icon: "reports",
        },
        DIRECTORY,
        PROGRAMS,
        SCHEDULE,
        CALENDAR,
        HELP,
        { href: "/notifications", label: "Notifications", icon: "bell" },
        ANNOUNCEMENTS,
      ];
    case "STUDENT":
      return [
        { href: "/student", label: "Overview", icon: "home" },
        { href: "/check-in", label: "Check in", icon: "qr" },
        { href: "/student/attendance", label: "Attendance", icon: "attendance" },
        { href: "/student/grades", label: "Grades", icon: "grades" },
        { href: "/student/tasks", label: "Tasks", icon: "tasks" },
        MY_TUITION,
        DIRECTORY,
        PROGRAMS,
        SCHEDULE,
        CALENDAR,
        HELP,
        { href: "/notifications", label: "Notifications", icon: "bell" },
        ANNOUNCEMENTS,
      ];
    case "PARENT":
      return [
        { href: "/parent", label: "Overview", icon: "home" },
        { href: "/parent/children", label: "My children", icon: "children" },
        MY_TUITION,
        DIRECTORY,
        PROGRAMS,
        SCHEDULE,
        CALENDAR,
        HELP,
        { href: "/notifications", label: "Notifications", icon: "bell" },
        ANNOUNCEMENTS,
      ];
  }
}
