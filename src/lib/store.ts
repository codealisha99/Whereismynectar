import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import path from "path";
import type { Pin, PinType, StickyNoteData } from "./types";
import { PIN_COLORS } from "./colors";
import { extractKnowledge } from "./knowledge";

export type { Pin, PinType, StickyNoteData };

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
  sticky?: StickyNoteData;
}

export async function addPin(input: AddPinInput): Promise<Pin> {
  const pins = await readPins();
  const fallback = spawnPoint();

  let stickyData = input.sticky;
  if (stickyData) {
    // Run knowledge extraction
    const { entities, relationships } = extractKnowledge(stickyData);
    stickyData = {
      ...stickyData,
      entities: stickyData.entities && stickyData.entities.length > 0 ? stickyData.entities : entities,
      relationships: stickyData.relationships && stickyData.relationships.length > 0 ? stickyData.relationships : relationships,
    };
  }

  // Derive fallback content string if not provided
  let content = input.content ?? "";
  if (!content && stickyData) {
    if (stickyData.stickyType === "study") {
      content = `${stickyData.title} · ${stickyData.study?.topic || stickyData.study?.class || ""}`;
    } else if (stickyData.stickyType === "personal") {
      content = `${stickyData.title} · ${stickyData.personal?.shortNote || ""}`;
    } else if (stickyData.stickyType === "web") {
      content = `${stickyData.title} · ${stickyData.web?.website || ""}`;
    }
  }

  const pin: Pin = {
    id: randomUUID(),
    type: input.type,
    content,
    media: input.media,
    x: input.x ?? fallback.x,
    y: input.y ?? fallback.y,
    color: input.color ?? randomColor(),
    source: input.source ?? "manual",
    createdAt: new Date().toISOString(),
    sticky: stickyData,
  };

  pins.push(pin);
  await writePins(pins);
  return pin;
}

export interface UpdatePinInput {
  x?: number;
  y?: number;
  content?: string;
  color?: string;
  media?: string;
  sticky?: StickyNoteData;
}

export async function updatePin(
  id: string,
  patch: UpdatePinInput,
): Promise<Pin | null> {
  const pins = await readPins();
  const idx = pins.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  const current = pins[idx];
  let updatedSticky = patch.sticky !== undefined ? patch.sticky : current.sticky;

  if (updatedSticky) {
    const { entities, relationships } = extractKnowledge(updatedSticky);
    updatedSticky = {
      ...updatedSticky,
      entities: updatedSticky.entities && updatedSticky.entities.length > 0 ? updatedSticky.entities : entities,
      relationships: updatedSticky.relationships && updatedSticky.relationships.length > 0 ? updatedSticky.relationships : relationships,
    };
  }

  let content = patch.content !== undefined ? patch.content : current.content;
  if (updatedSticky && patch.content === undefined && current.type === "sticky") {
    if (updatedSticky.stickyType === "study") {
      content = `${updatedSticky.title} · ${updatedSticky.study?.topic || updatedSticky.study?.class || ""}`;
    } else if (updatedSticky.stickyType === "personal") {
      content = `${updatedSticky.title} · ${updatedSticky.personal?.shortNote || ""}`;
    } else if (updatedSticky.stickyType === "web") {
      content = `${updatedSticky.title} · ${updatedSticky.web?.website || ""}`;
    }
  }

  const updated: Pin = {
    ...current,
    ...patch,
    content,
    sticky: updatedSticky,
    updatedAt: new Date().toISOString(),
  };

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
