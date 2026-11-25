import {
  Baby,
  BarChart3,
  Bell,
  CalendarCheck,
  Banknote,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  QrCode,
  WalletCards,
  ContactRound,
  Palette,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

import type { IconName } from "@/lib/nav";

const ICONS: Record<IconName, LucideIcon> = {
  home: LayoutDashboard,
  megaphone: Megaphone,
  users: Users,
  classes: GraduationCap,
  attendance: CalendarCheck,
  grades: ClipboardList,
  tasks: ListChecks,
  children: Baby,
  reports: BarChart3,
  bell: Bell,
  settings: Settings,
  shield: ShieldCheck,
  upload: Upload,
  qr: QrCode,
  tuition: WalletCards,
  directory: ContactRound,
  calendar: CalendarDays,
  cashier: Banknote,
  branding: Palette,
  programs: BookOpen,
};

export function Icon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  const Component = ICONS[name];
  return <Component className={className} aria-hidden />;
}
