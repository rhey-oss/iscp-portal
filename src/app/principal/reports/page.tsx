import { PageHeader, Badge } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { percent } from "@/lib/utils";

export default async function PrincipalReportsPage() {
  await requireRole("PRINCIPAL");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [classes, records] = await Promise.all([
    prisma.class.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { students: true } } },
    }),
    prisma.attendanceRecord.findMany({
      where: { session: { date: { gte: monthStart } } },
      select: { status: true, session: { select: { classId: true } } },
    }),
  ]);

  const byClass = new Map<string, { total: number; present: number; absent: number }>();
  for (const cls of classes) {
    byClass.set(cls.id, { total: 0, present: 0, absent: 0 });
  }
  for (const record of records) {
    const bucket = byClass.get(record.session.classId);
    if (!bucket) continue;
    bucket.total += 1;
    if (record.status === "PRESENT" || record.status === "LATE") bucket.present += 1;
    if (record.status === "ABSENT") bucket.absent += 1;
  }

  return (
    <>
      <PageHeader
        title="Attendance reports"
        description="This month, by class."
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Students</th>
                <th className="px-4 py-3 font-medium">Records</th>
                <th className="px-4 py-3 font-medium">Present</th>
                <th className="px-4 py-3 font-medium">Absent</th>
                <th className="px-4 py-3 font-medium">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classes.map((cls) => {
                const bucket = byClass.get(cls.id) ?? {
                  total: 0,
                  present: 0,
                  absent: 0,
                };
                const rate = percent(bucket.present, bucket.total);
                return (
                  <tr key={cls.id} className="hover:bg-surface-2/40">
                    <td className="px-4 py-3">
                      <p className="font-medium">{cls.name}</p>
                      <p className="text-xs text-muted">
                        {cls.gradeLevel} · {cls.schoolYear}
                      </p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{cls._count.students}</td>
                    <td className="px-4 py-3 tabular-nums">{bucket.total}</td>
                    <td className="px-4 py-3 tabular-nums">{bucket.present}</td>
                    <td className="px-4 py-3 tabular-nums">{bucket.absent}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={rate >= 90 ? "success" : rate >= 75 ? "warning" : "danger"}
                      >
                        {rate}%
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Rate counts present and late records against all attendance records this month.
      </p>
    </>
  );
}
