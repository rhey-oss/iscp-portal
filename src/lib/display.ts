import type { Tone } from "@/components/ui";
import type { AttendanceStatus, TaskStatus } from "@/lib/constants";

export function attendanceTone(status: string): Tone {
  switch (status) {
    case "PRESENT":
      return "success";
    case "LATE":
      return "warning";
    case "ABSENT":
      return "danger";
    case "EXCUSED":
      return "info";
    default:
      return "neutral";
  }
}

export function taskTone(status: string): Tone {
  switch (status) {
    case "SUBMITTED":
    case "GRADED":
      return "success";
    case "MISSING":
      return "danger";
    case "NEEDED":
      return "warning";
    default:
      return "neutral";
  }
}

export function priorityTone(priority: string): Tone {
  switch (priority) {
    case "URGENT":
      return "danger";
    case "IMPORTANT":
      return "warning";
    default:
      return "neutral";
  }
}

export type { AttendanceStatus, TaskStatus };
