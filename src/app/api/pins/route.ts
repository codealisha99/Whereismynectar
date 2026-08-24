import { addPin, readPins } from "@/lib/store";

export async function GET() {
  const pins = await readPins();
  return Response.json(pins);
}

export async function POST(request: Request) {
  let body: { type?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const type = body.type === "photo" ? "photo" : "text";
  const content =
    typeof body.content === "string" ? body.content.slice(0, 4000) : "";
  const pin = await addPin({ type, content });
  return Response.json(pin, { status: 201 });
}
