export const ROLES = [
  "ADMIN",
  "PRINCIPAL",
  "TEACHER",
  "CASHIER",
  "STUDENT",
  "PARENT",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  PRINCIPAL: "Dean",
  TEACHER: "Instructor",
  CASHIER: "Cashier",
  STUDENT: "Student",
  PARENT: "Parent / Guardian",
};

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  PRINCIPAL: "/principal",
  TEACHER: "/teacher",
  CASHIER: "/cashier",
  STUDENT: "/student",
  PARENT: "/parent",
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export const ATTENDANCE_STATUS = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "EXCUSED",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  LATE: "Late",
  ABSENT: "Absent",
  EXCUSED: "Excused",
};

export const ATTENDANCE_METHOD_LABEL: Record<string, string> = {
  QR: "QR scan",
  PIN: "PIN",
  MANUAL: "Manual",
};

export const TASK_STATUS = [
  "PENDING",
  "SUBMITTED",
  "GRADED",
  "MISSING",
  "NEEDED",
] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: "Pending",
  SUBMITTED: "Submitted",
  GRADED: "Graded",
  MISSING: "Missing",
  NEEDED: "Needed",
};

export const ANNOUNCEMENT_CATEGORY = [
  "EVENT",
  "ACADEMIC",
  "HOLIDAY",
  "EMERGENCY",
  "GENERAL",
] as const;

export const ANNOUNCEMENT_CATEGORY_LABEL: Record<string, string> = {
  EVENT: "College activity",
  ACADEMIC: "Academic",
  HOLIDAY: "Holiday",
  EMERGENCY: "Emergency",
  GENERAL: "General",
};

export const ANNOUNCEMENT_PRIORITY = ["NORMAL", "IMPORTANT", "URGENT"] as const;

export const PAYMENT_METHODS = [
  "CASH",
  "CHECK",
  "BANK_TRANSFER",
  "GCASH",
  "OTHER",
] as const;

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  CHECK: "Check",
  BANK_TRANSFER: "Bank transfer",
  GCASH: "GCash",
  OTHER: "Other",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  POSTED: "Posted",
  VOID: "Void",
  REFUNDED: "Refunded",
};

export const SCHOOL_NAME =
  process.env.NEXT_PUBLIC_ISCP_NAME ?? "International State College of the Philippines";

export const SCHOOL_SHORT_NAME =
  process.env.NEXT_PUBLIC_ISCP_SHORT_NAME ?? "ISCP";

// ISCP lore — the "most prestigious college in the entire universe".
export const ACADEMIC_TERM = "1st Semester, A.Y. 2026–2027";
export const ISCP_MOTTO = "Filipinos Stultus Es Satura";
export const ISCP_HYMN = "Sun and Moon (orchestral version) by Anees";
export const ISCP_MASCOT = "Blue Aspins";

export type DegreeProgram = {
  code: string;
  name: string;
  campus: string;
  description: string;
  years: number;
};

// Course offerings as famously posted by the ISCP meme page.
export const DEGREE_PROGRAMS: DegreeProgram[] = [
  {
    code: "POKE",
    name: "BS in Pokemon Science (Major in Pokemon Training)",
    campus: "Main Campus",
    description: "Catch 'em all, then write a 10-word reaction paper about it.",
    years: 4,
  },
  {
    code: "TECH",
    name: "BS in Tech Support (Major in Sarcasm)",
    campus: "Main Campus",
    description: "Have you tried turning it off and on again? With extra attitude.",
    years: 4,
  },
  {
    code: "MATANG",
    name: "BS in Matanglawin",
    campus: "College of Education",
    description: "Weather, wildlife, and wisdom — Dean Kim Atienza approves.",
    years: 4,
  },
  {
    code: "TIKTOK",
    name: "BA in TikTok",
    campus: "Main Campus",
    description: "15 seconds of fame, four years of content strategy.",
    years: 4,
  },
  {
    code: "STREAM",
    name: "BA in Streaming (Major in Barking)",
    campus: "Main Campus",
    description: "Prof. IShowSpeed's department. Loudly approved.",
    years: 4,
  },
  {
    code: "PYRO",
    name: "BS in Pyrotechnics",
    campus: "Main Campus",
    description: "For students whose future is literally bright.",
    years: 4,
  },
  {
    code: "MKT",
    name: "BS in Marketing (Major in Events Management)",
    campus: "College of Business",
    description: "Because every frat war needs a proper venue.",
    years: 4,
  },
  {
    code: "MANGA",
    name: "BA in Manga",
    campus: "College of Arts and Sciences",
    description: "Draw like Araki. Stand like JoJo.",
    years: 4,
  },
  {
    code: "MUSIC",
    name: "BA in Music",
    campus: "College of Arts and Sciences",
    description: "The hymn is mandatory. The vibes are immaculate.",
    years: 4,
  },
  {
    code: "LAW",
    name: "BA in Law",
    campus: "Atlantis Campus",
    description: "Prof. Guanzon teaches. Bring your best objection.",
    years: 4,
  },
  {
    code: "ASTRO",
    name: "BS in Astronomy and Astrology",
    campus: "Sun and Moon Campuses",
    description: "Study under the light of our twin campuses.",
    years: 4,
  },
  {
    code: "ALIEN",
    name: "BS in Alien Culture",
    campus: "Galactic Campus",
    description: "First alien-friendly program in the universe.",
    years: 4,
  },
  {
    code: "MARBIO",
    name: "BS in Marine Biology",
    campus: "Atlantis Campus",
    description: "Mermaids and sea monsters welcome.",
    years: 4,
  },
  {
    code: "FANTASY",
    name: "BS in Fantasy Arts",
    campus: "Birmingham Campus",
    description: "The campus is invisible at certain times. So is the tuition.",
    years: 4,
  },
  {
    code: "MINE",
    name: "BS in Architecture, Combat and Agriculture",
    campus: "Minecraft Campus",
    description: "Build, fight, and farm — all in one degree.",
    years: 4,
  },
  {
    code: "LANDIAN",
    name: "Online Landian (Flirting)",
    campus: "ROBLOX Campus",
    description: "MeepCity's most controversial program.",
    years: 4,
  },
  {
    code: "FAIL",
    name: "BA in Failure Management (Major in Emotional Damage)",
    campus: "Main Campus",
    description: "For the mothes— sorry, mothballs. You'll get through this.",
    years: 4,
  },
];
