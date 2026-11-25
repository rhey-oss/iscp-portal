import { getCurrentUser } from "@/lib/auth";
import { canAccessMedia } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { getFile } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!(await canAccessMedia(user.id, user.role, id))) {
    return new Response("Forbidden", { status: 403 });
  }

  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return new Response("Not found", { status: 404 });

  try {
    const bytes = await getFile(media.storedPath);
    if (!bytes) return new Response("File missing", { status: 404 });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "Vary": "Cookie",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}
