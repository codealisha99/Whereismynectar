import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { UPLOADS_DIR, addPin, extForMime } from "@/lib/store";

const GRAPH_VERSION = "v21.0";

interface WAText {
  body?: string;
}

interface WAImage {
  id?: string;
  caption?: string;
}

interface WAMessage {
  from?: string;
  type?: string;
  text?: WAText;
  image?: WAImage;
}

interface WAChange {
  value?: { messages?: WAMessage[] };
}

interface WAEntry {
  changes?: WAChange[];
}

interface WAPayload {
  entry?: WAEntry[];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN ?? "";

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new Response(challenge, {
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WAPayload;
    const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (message) await processMessage(message);
  } catch (error) {
    console.error("[whatsapp-webhook]", error);
  }
  return Response.json({ received: true });
}

function isAllowed(from: string | undefined): boolean {
  const allowed = process.env.WHATSAPP_ALLOWED_FROM?.replace(/\D/g, "");
  if (!allowed) return true;
  return Boolean(from) && (from ?? "").replace(/\D/g, "").endsWith(allowed);
}

async function processMessage(message: WAMessage): Promise<void> {
  if (!isAllowed(message.from)) return;

  if (message.type === "text" && message.text?.body) {
    await addPin({
      type: "text",
      content: message.text.body.slice(0, 4000),
      source: "whatsapp",
    });
    return;
  }

  if (message.type === "image" && message.image?.id) {
    await saveImagePin(message.image.id, message.image.caption);
  }
}

async function saveImagePin(mediaId: string, caption?: string): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    console.error("[whatsapp-webhook] WHATSAPP_ACCESS_TOKEN missing, cannot download media");
    return;
  }

  const metaRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!metaRes.ok) {
    console.error("[whatsapp-webhook] media metadata fetch failed:", metaRes.status);
    return;
  }
  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!meta.url) return;

  const mediaRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!mediaRes.ok) {
    console.error("[whatsapp-webhook] media download failed:", mediaRes.status);
    return;
  }

  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const name = `${randomUUID()}${extForMime(meta.mime_type)}`;
  await fs.writeFile(
    path.join(UPLOADS_DIR, name),
    Buffer.from(await mediaRes.arrayBuffer()),
  );

  await addPin({
    type: "photo",
    media: name,
    content: typeof caption === "string" ? caption.slice(0, 1000) : "",
    source: "whatsapp",
  });
}
