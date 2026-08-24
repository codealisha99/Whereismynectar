import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import path from "path";
import type { Pin, PinType } from "./types";
import { PIN_COLORS } from "./colors";

export type { Pin, PinType };

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "board.json");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function extForMime(mime: string | undefined): string {
  if (mime && MIME_EXT[mime]) return MIME_EXT[mime];
  return ".jpg";
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function readPins(): Promise<Pin[]> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Pin[]) : [];
  } catch {
    return [];
  }
}

async function writePins(pins: Pin[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DB_FILE, JSON.stringify(pins, null, 2));
}

export function randomColor(): string {
  return PIN_COLORS[Math.floor(Math.random() * PIN_COLORS.length)];
}

function spawnPoint(): { x: number; y: number } {
  return {
    x: Math.round(70 + Math.random() * 420),
    y: Math.round(100 + Math.random() * 280),
  };
}

export interface AddPinInput {
  type: PinType;
  content?: string;
  media?: string;
  x?: number;
  y?: number;
  color?: string;
  source?: "manual" | "whatsapp";
}

export async function addPin(input: AddPinInput): Promise<Pin> {
  const pins = await readPins();
  const fallback = spawnPoint();
  const pin: Pin = {
    id: randomUUID(),
    type: input.type,
    content: input.content ?? "",
    media: input.media,
    x: input.x ?? fallback.x,
    y: input.y ?? fallback.y,
    color: input.color ?? randomColor(),
    source: input.source ?? "manual",
    createdAt: new Date().toISOString(),
  };
  pins.push(pin);
  await writePins(pins);
  return pin;
}

export async function updatePin(
  id: string,
  patch: Partial<Pick<Pin, "x" | "y" | "content" | "color">>,
): Promise<Pin | null> {
  const pins = await readPins();
  const idx = pins.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated: Pin = { ...pins[idx], ...patch };
  pins[idx] = updated;
  await writePins(pins);
  return updated;
}

export async function deletePin(id: string): Promise<boolean> {
  const pins = await readPins();
  const pin = pins.find((p) => p.id === id);
  if (!pin) return false;
  await writePins(pins.filter((p) => p.id !== id));
  if (pin.media) {
    try {
      await fs.unlink(path.join(UPLOADS_DIR, pin.media));
    } catch {
      return true;
    }
  }
  return true;
}
