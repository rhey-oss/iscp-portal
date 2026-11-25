import {
  BRANDING_IMAGES,
  getBranding,
  type BrandingImageField,
} from "@/lib/branding";
import { prisma } from "@/lib/prisma";
import { getFile } from "@/lib/storage";

/** Publicly serves only the images selected in School Branding. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ field: string }> },
) {
  const { field } = await params;
  if (!(field in BRANDING_IMAGES)) {
    return new Response("Not found", { status: 404 });
  }

  const branding = await getBranding();
  const mediaId =
    branding[BRANDING_IMAGES[field as BrandingImageField]] ?? null;
  if (!mediaId) return new Response("Not found", { status: 404 });

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) return new Response("Not found", { status: 404 });

  try {
    const bytes = await getFile(media.storedPath);
    if (!bytes) return new Response("File missing", { status: 404 });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}
