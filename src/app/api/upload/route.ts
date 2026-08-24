import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { UPLOADS_DIR, addPin, extForMime } from "@/lib/store";

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: "Expected multipart form data" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  const captionRaw = form.get("caption");

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/") || file.size === 0) {
    return Response.json(
      { error: "Only non-empty image files are supported" },
      { status: 400 },
    );
  }
  if (file.size > 16 * 1024 * 1024) {
    return Response.json(
      { error: "File too large (max 16MB)" },
      { status: 413 },
    );
  }

  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const name = `${randomUUID()}${extForMime(file.type)}`;
  await fs.writeFile(
    path.join(UPLOADS_DIR, name),
    Buffer.from(await file.arrayBuffer()),
  );

  const caption = typeof captionRaw === "string" ? captionRaw.slice(0, 1000) : "";
  const pin = await addPin({ type: "photo", media: name, content: caption });
  return Response.json(pin, { status: 201 });
}
