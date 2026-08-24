"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Pin } from "@/lib/types";
import { PIN_COLORS } from "@/lib/colors";

const POLL_MS = 4000;
const BOARD_W = 3200;
const BOARD_H = 2200;

function rotationFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return ((hash % 9) - 4) * 0.6;
}

export default function Board() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const interactRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/pins", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      setPins(data);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (!interactRef.current) void refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const startDrag = useCallback((pin: Pin, e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, textarea, input, a")) return;
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    dragRef.current = {
      id: pin.id,
      offsetX: e.clientX - rect.left - pin.x,
      offsetY: e.clientY - rect.top - pin.y,
    };
    interactRef.current = true;
    setDraggingId(pin.id);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (pin: Pin, e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const board = boardRef.current;
      if (!drag || !board || drag.id !== pin.id) return;
      const rect = board.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - rect.left - drag.offsetX, 8), BOARD_W - 240);
      const y = Math.min(Math.max(e.clientY - rect.top - drag.offsetY, 8), BOARD_H - 120);
      setPins((prev) =>
        prev.map((p) =>
          p.id === pin.id ? { ...p, x: Math.round(x), y: Math.round(y) } : p,
        ),
      );
    },
    [],
  );

  const endDrag = useCallback((pin: Pin) => {
    if (dragRef.current?.id !== pin.id) return;
    dragRef.current = null;
    setDraggingId(null);
    interactRef.current = false;
    setPins((prev) => {
      const current = prev.find((p) => p.id === pin.id);
      if (current) {
        void fetch(`/api/pins/${pin.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x: current.x, y: current.y }),
        });
      }
      return prev;
    });
  }, []);

  const beginEdit = useCallback((pin: Pin) => {
    interactRef.current = true;
    setEditingId(pin.id);
    setDraftText(pin.content);
  }, []);

  const saveEdit = useCallback(() => {
    const id = editingId;
    if (!id) return;
    const content = draftText.trim();
    setEditingId(null);
    setDraftText("");
    interactRef.current = false;
    setPins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, content } : p)),
    );
    void fetch(`/api/pins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }, [editingId, draftText]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setDraftText("");
    interactRef.current = false;
  }, []);

  const addNote = useCallback(async () => {
    setBusy(true);
    interactRef.current = true;
    try {
      const res = await fetch("/api/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", content: "" }),
      });
      if (res.ok) {
        const pin: Pin = await res.json();
        setPins((prev) => [...prev, pin]);
        setDraftText("");
        setEditingId(pin.id);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    interactRef.current = true;
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("caption", "");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const pin: Pin = await res.json();
        setPins((prev) => [...prev, pin]);
      }
    } finally {
      setBusy(false);
      interactRef.current = false;
    }
  }, []);

  const removePin = useCallback((id: string) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) cancelEdit();
    void fetch(`/api/pins/${id}`, { method: "DELETE" });
  }, [editingId, cancelEdit]);

  const cycleColor = useCallback((pin: Pin) => {
    const idx = PIN_COLORS.indexOf(pin.color as (typeof PIN_COLORS)[number]);
    const color = PIN_COLORS[(idx + 1) % PIN_COLORS.length];
    setPins((prev) => prev.map((p) => (p.id === pin.id ? { ...p, color } : p)));
    void fetch(`/api/pins/${pin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
  }, []);

  return (
    <div className="fixed inset-0 overflow-auto bg-[#f5f1e8]">
      <div
        ref={boardRef}
        className="board-dots relative"
        style={{ width: BOARD_W, height: BOARD_H }}
      >
        {pins.map((pin, index) => {
          const isDragging = draggingId === pin.id;
          const isEditing = editingId === pin.id;
          const rotation = rotationFor(pin.id);
          return (
            <div
              key={pin.id}
              className={`group absolute w-56 touch-none select-none rounded-lg p-3 transition-shadow ${
                isDragging ? "shadow-2xl" : "shadow-md hover:shadow-lg"
              }`}
              style={{
                left: pin.x,
                top: pin.y,
                backgroundColor: pin.type === "photo" ? "#ffffff" : pin.color,
                transform: `rotate(${isDragging ? 0 : rotation}deg)`,
                zIndex: isDragging ? 1000 : index + 1,
              }}
              onPointerDown={(e) => startDrag(pin, e)}
              onPointerMove={(e) => onPointerMove(pin, e)}
              onPointerUp={() => endDrag(pin)}
              onDoubleClick={() => beginEdit(pin)}
            >
              <div className="absolute -top-2 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {pin.type === "text" && (
                  <button
                    type="button"
                    title="Change colour"
                    onClick={() => cycleColor(pin)}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] shadow ring-1 ring-black/10"
                  >
                    ◑
                  </button>
                )}
                <button
                  type="button"
                  title="Delete pin"
                  onClick={() => removePin(pin.id)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-stone-500 shadow ring-1 ring-black/10 hover:text-red-600"
                >
                  ✕
                </button>
              </div>

              {pin.type === "photo" && pin.media && (
                <a href={`/api/media/${pin.media}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/${pin.media}`}
                    alt={pin.content || "Pinned photo"}
                    draggable={false}
                    className="mb-2 max-h-48 w-full rounded-md object-cover"
                  />
                </a>
              )}

              {isEditing ? (
                <textarea
                  autoFocus
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  placeholder={
                    pin.type === "photo" ? "Add a caption…" : "Write something…"
                  }
                  className={`w-full resize-none rounded bg-white/60 p-1 leading-snug outline-none ring-2 ring-stone-400 ${
                    pin.type === "photo" ? "h-16 text-sm" : "h-32"
                  }`}
                />
              ) : (
                <p
                  className={`cursor-text break-words whitespace-pre-wrap leading-snug ${
                    pin.type === "photo" ? "min-h-4 text-sm text-stone-700" : "min-h-24"
                  } ${!pin.content ? "italic text-stone-500/70" : ""}`}
                >
                  {pin.content ||
                    (pin.type === "photo" ? "Double-click to caption" : "Double-click to write")}
                </p>
              )}

              <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-black/35">
                <span>{new Date(pin.createdAt).toLocaleDateString()}</span>
                {pin.source === "whatsapp" && <span>via WhatsApp</span>}
              </div>
            </div>
          );
        })}
      </div>

      <header className="pointer-events-none fixed inset-x-0 top-0 z-[2000] flex items-start justify-between gap-3 px-4 py-3">
        <h1 className="pointer-events-auto rounded-full bg-white/85 px-4 py-2 text-sm font-semibold tracking-tight text-stone-800 shadow backdrop-blur">
          Softboard
        </h1>
        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={addNote}
            disabled={busy}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-stone-700 disabled:opacity-50"
          >
            + Note
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-stone-800 shadow backdrop-blur transition hover:bg-white disabled:opacity-50"
          >
            + Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      {loaded && pins.length === 0 && (
        <div className="pointer-events-none fixed inset-0 z-[1500] flex items-center justify-center">
          <div className="max-w-sm rounded-2xl bg-white/85 p-8 text-center shadow backdrop-blur">
            <p className="text-base font-medium text-stone-800">Your softboard is empty</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Add a note or photo above — or send a WhatsApp message to your bot
              number and it will show up here automatically.
            </p>
          </div>
        </div>
      )}

      <footer className="pointer-events-none fixed inset-x-0 bottom-3 z-[2000] flex justify-center">
        <span className="rounded-full bg-white/80 px-4 py-1.5 text-xs text-stone-500 shadow backdrop-blur">
          Drag to move · Double-click to edit · Messages sent to your WhatsApp bot land here
        </span>
      </footer>
    </div>
  );
}
