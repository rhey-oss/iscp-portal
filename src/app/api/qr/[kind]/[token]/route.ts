import QRCode from "qrcode";

import { canManageClass } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getParentStudentIds } from "@/lib/scope";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string; token: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { kind, token } = await params;
  let payload: string;

  if (kind === "session") {
    const session = await prisma.attendanceSession.findUnique({
      where: { qrToken: token },
      select: { classId: true },
    });
    if (!session) return new Response("Not found", { status: 404 });
    if (!(await canManageClass(user, session.classId))) {
      return new Response("Not found", { status: 404 });
    }
    payload = `${new URL(request.url).origin}/check-in?token=${encodeURIComponent(token)}`;
  } else if (kind === "student") {
    const student = await prisma.student.findUnique({
      where: { qrToken: token },
      select: { id: true, userId: true, classId: true },
    });
    if (!student) return new Response("Not found", { status: 404 });

    let allowed = false;
    if (user.role === "ADMIN" || user.role === "PRINCIPAL") {
      allowed = true;
    } else if (user.role === "TEACHER" && student.classId) {
      allowed = await canManageClass(user, student.classId);
    } else if (user.role === "STUDENT") {
      allowed = student.userId === user.id;
    } else if (user.role === "PARENT") {
      const children = await getParentStudentIds(user.id);
      allowed = children.includes(student.id);
    }
    if (!allowed) return new Response("Not found", { status: 404 });

    payload = `STUDENT:${token}`;
  } else {
    return new Response("Bad request", { status: 400 });
  }

  const png = await QRCode.toBuffer(payload, { width: 320, margin: 1 });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "Content-Disposition": "inline",
    },
  });
}
