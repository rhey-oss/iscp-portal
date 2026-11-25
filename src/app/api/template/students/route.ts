import { getCurrentUser } from "@/lib/auth";
import { studentCsvTemplate } from "@/lib/csv";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  return new Response(studentCsvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="students-template.csv"',
    },
  });
}
