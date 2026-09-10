import { deletePin, updatePin } from "@/lib/store";
import type { StickyNoteData, UpdatePinInput } from "@/lib/types";

interface CtxParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: CtxParams) {
  const { id } = await params;
  let body: {
    x?: unknown;
    y?: unknown;
    content?: unknown;
    color?: unknown;
    media?: unknown;
    sticky?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: UpdatePinInput = {};

  if (typeof body.x === "number" && Number.isFinite(body.x)) {
    patch.x = Math.max(0, Math.round(body.x));
  }
  if (typeof body.y === "number" && Number.isFinite(body.y)) {
    patch.y = Math.max(0, Math.round(body.y));
  }
  if (typeof body.content === "string") {
    patch.content = body.content.slice(0, 10000);
  }
  if (typeof body.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color)) {
    patch.color = body.color;
  }
  if (typeof body.media === "string" || body.media === null) {
    patch.media = body.media ? body.media : undefined;
  }
  if (body.sticky && typeof body.sticky === "object") {
    patch.sticky = body.sticky as StickyNoteData;
  }

  const pin = await updatePin(id, patch);
  if (!pin) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(pin);
}

export async function DELETE(_request: Request, { params }: CtxParams) {
  const { id } = await params;
  const ok = await deletePin(id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
