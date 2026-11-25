import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "My grades" };

export default async function StudentGradesPage() {
  const user = await requireRole("STUDENT");
  const student = await prisma.student.findUnique({ where: { userId: user.id } });
  if (!student) {
    return (
      <>
        <PageHeader title="My grades" />
        <EmptyState title="No student record linked" />
      </>
    );
  }

  const grades = await prisma.grade.findMany({
    where: { studentId: student.id, publishedAt: { not: null } },
    orderBy: [{ term: "asc" }, { updatedAt: "desc" }],
    include: { subject: { select: { name: true, code: true } } },
  });

  const average = grades.length
    ? Math.round(
        grades.reduce((sum, grade) => sum + (grade.score / grade.maxScore) * 100, 0) /
          grades.length,
      )
    : null;

  return (
    <>
      <PageHeader
        title="My grades"
        description={average === null ? "No published grades yet." : `General average: ${average}%`}
      />
      {grades.length === 0 ? (
        <EmptyState
          title="No grades published"
          description="Your instructor's published scores will appear here."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Term</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grades.map((grade) => {
                  const pct = Math.round((grade.score / grade.maxScore) * 100);
                  return (
                    <tr key={grade.id}>
                      <td className="px-4 py-3 font-medium">{grade.subject.name}</td>
                      <td className="px-4 py-3 text-muted">{grade.term}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">{grade.score}/{grade.maxScore}</span>
                          <Badge tone={pct >= 75 ? "success" : "danger"}>{pct}%</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{grade.remarks ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
