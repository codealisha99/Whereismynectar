import { addPin, readPins } from "@/lib/store";
import type { PinType, StickyNoteData } from "@/lib/types";

export async function GET() {
  const pins = await readPins();
  return Response.json(pins);
}

export async function POST(request: Request) {
  let body: {
    type?: string;
    content?: string;
    color?: string;
    media?: string;
    x?: number;
    y?: number;
    sticky?: StickyNoteData;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let type: PinType = "text";
  if (body.type === "photo") type = "photo";
  else if (body.type === "sticky") type = "sticky";

  const content =
    typeof body.content === "string" ? body.content.slice(0, 10000) : "";

  const pin = await addPin({
    type,
    content,
    color: typeof body.color === "string" ? body.color : undefined,
    media: typeof body.media === "string" ? body.media : undefined,
    x: typeof body.x === "number" ? body.x : undefined,
    y: typeof body.y === "number" ? body.y : undefined,
    sticky: body.sticky,
  });

  return Response.json(pin, { status: 201 });
}
