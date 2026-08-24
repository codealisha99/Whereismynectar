import { promises as fs } from "fs";
import path from "path";
import { UPLOADS_DIR } from "@/lib/store";

const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

interface CtxParams {
  params: Promise<{ name: string }>;
}

export async function GET(_request: Request, { params }: CtxParams) {
  const { name } = await params;
  if (!/^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/.test(name)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const buf = await fs.readFile(path.join(UPLOADS_DIR, name));
    const type =
      EXT_MIME[name.slice(name.lastIndexOf("."))] ?? "application/octet-stream";
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
