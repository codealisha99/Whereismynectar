"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Pin, StickyNoteData } from "@/lib/types";
import { PIN_COLORS } from "@/lib/colors";
import { buildSearchIndex } from "@/lib/knowledge";
import StickyNoteModal from "./StickyNoteModal";
import StickyNoteDetailModal from "./StickyNoteDetailModal";
import StudyNoteCard from "./renderers/StudyNoteCard";
import PersonalNoteCard from "./renderers/PersonalNoteCard";
import WebClipCard from "./renderers/WebClipCard";

const POLL_MS = 4000;
const BOARD_W = 3200;
const BOARD_H = 2200;

type FilterType = "all" | "study" | "personal" | "web" | "text" | "photo";

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function rotationFor(id: string): number {
  return ((hashId(id) % 21) - 10) * 0.18;
}

function paperRadii(id: string): string {
  const h = hashId(id);
  const a = 2 + (h % 4);
  const b = 4 + ((h >> 3) % 5);
  const c = 2 + ((h >> 6) % 4);
  const d = 3 + ((h >> 9) % 4);
  return `${a}px ${b}px ${c}px ${d}px / ${d}px ${a}px ${b}px ${c}px`;
}

export default function Board() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Inline Editing (for simple text notes)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Modals State
  const [isStickyModalOpen, setIsStickyModalOpen] = useState(false);
  const [modalEditPin, setModalEditPin] = useState<Pin | null>(null);
  const [detailPin, setDetailPin] = useState<Pin | null>(null);

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
      if (!interactRef.current && !isStickyModalOpen && !detailPin) {
        void refresh();
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, isStickyModalOpen, detailPin]);

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
      const x = Math.min(Math.max(e.clientX - rect.left - drag.offsetX, 8), BOARD_W - 380);
      const y = Math.min(Math.max(e.clientY - rect.top - drag.offsetY, 8), BOARD_H - 280);
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
    if (pin.type === "sticky") {
      setModalEditPin(pin);
      setIsStickyModalOpen(true);
    } else {
      interactRef.current = true;
      setEditingId(pin.id);
      setDraftText(pin.content);
    }
  }, []);

  const saveInlineEdit = useCallback(() => {
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

  const cancelInlineEdit = useCallback(() => {
    setEditingId(null);
    setDraftText("");
    interactRef.current = false;
  }, []);

  const addSimpleNote = useCallback(async () => {
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

  const handleSaveStickyNote = useCallback(
    async (payload: {
      type: "sticky";
      color: string;
      media?: string;
      sticky: StickyNoteData;
      id?: string;
    }) => {
      setBusy(true);
      try {
        if (payload.id) {
          // Edit existing
          const res = await fetch(`/api/pins/${payload.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              color: payload.color,
              media: payload.media,
              sticky: payload.sticky,
            }),
          });
          if (res.ok) {
            const updated: Pin = await res.json();
            setPins((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            if (detailPin?.id === updated.id) {
              setDetailPin(updated);
            }
          }
        } else {
          // Create new
          const res = await fetch("/api/pins", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "sticky",
              color: payload.color,
              media: payload.media,
              sticky: payload.sticky,
            }),
          });
          if (res.ok) {
            const created: Pin = await res.json();
            setPins((prev) => [...prev, created]);
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [detailPin],
  );

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
    if (editingId === id) cancelInlineEdit();
    if (detailPin?.id === id) setDetailPin(null);
    void fetch(`/api/pins/${id}`, { method: "DELETE" });
  }, [editingId, detailPin, cancelInlineEdit]);

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

  // Filter and Search
  const queryLower = searchQuery.trim().toLowerCase();

  const filteredPins = useMemo(() => {
    return pins.filter((pin) => {
      // Type filter
      if (filterType === "study") {
        if (pin.type !== "sticky" || pin.sticky?.stickyType !== "study") return false;
      } else if (filterType === "personal") {
        if (pin.type !== "sticky" || pin.sticky?.stickyType !== "personal") return false;
      } else if (filterType === "web") {
        if (pin.type !== "sticky" || pin.sticky?.stickyType !== "web") return false;
      } else if (filterType === "text") {
        if (pin.type !== "text") return false;
      } else if (filterType === "photo") {
        if (pin.type !== "photo") return false;
      }

      return true;
    });
  }, [pins, filterType]);

  return (
    <div className="fixed inset-0 overflow-auto bg-[#2b4e3f]">
      {/* Softboard Canvas */}
      <div
        ref={boardRef}
        className="board-grid relative"
        style={{ width: BOARD_W, height: BOARD_H }}
      >
        {filteredPins.map((pin, index) => {
          const isDragging = draggingId === pin.id;
          const isEditing = editingId === pin.id;
          const rotation = rotationFor(pin.id);

          const isSticky = pin.type === "sticky";
          const stickyType = pin.sticky?.stickyType;

          // Search match
          const searchIndex = buildSearchIndex(pin);
          const isSearchMatch = !queryLower || searchIndex.includes(queryLower);

          let pinClass = "sticky-pin";
          if (pin.type === "photo") {
            pinClass = "sticky-pin sticky-pin--photo";
          } else if (isSticky) {
            if (stickyType === "study") pinClass = "sticky-pin sticky-pin--study";
            else if (stickyType === "personal") pinClass = "sticky-pin sticky-pin--personal";
            else if (stickyType === "web") pinClass = "sticky-pin sticky-pin--web";
          }

          return (
            <div
              key={pin.id}
              title={new Date(pin.createdAt).toLocaleString()}
              className={`${pinClass} group absolute touch-none select-none transition-all ${
                isDragging || isEditing ? "sticky-pin--lifted" : ""
              } ${!isSearchMatch ? "opacity-25 grayscale-[60%] blur-[0.3px]" : "opacity-100"}`}
              style={{
                left: pin.x,
                top: pin.y,
                backgroundColor: pin.color,
                borderRadius: paperRadii(pin.id),
                ["--pin-rot" as string]:
                  isDragging || isEditing ? "0deg" : `${rotation}deg`,
                zIndex: isDragging ? 1000 : index + 1,
              }}
              onPointerDown={(e) => startDrag(pin, e)}
              onPointerMove={(e) => onPointerMove(pin, e)}
              onPointerUp={() => endDrag(pin)}
              onDoubleClick={() => {
                if (isSticky) {
                  setDetailPin(pin);
                } else {
                  beginEdit(pin);
                }
              }}
            >
              {/* Card Hover Action Bar */}
              <div className="absolute -top-3 right-1 z-20 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                {isSticky && (
                  <button
                    type="button"
                    title="View & Inspect Knowledge Graph"
                    onClick={() => setDetailPin(pin)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-[11px] text-white shadow-md ring-1 ring-white/20 hover:bg-emerald-600 transition"
                  >
                    👁
                  </button>
                )}
                {isSticky && (
                  <button
                    type="button"
                    title="Edit Note"
                    onClick={() => beginEdit(pin)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] text-stone-700 shadow-md ring-1 ring-black/10 hover:text-emerald-700 transition"
                  >
                    ✎
                  </button>
                )}
                <button
                  type="button"
                  title="Change color"
                  onClick={() => cycleColor(pin)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] text-stone-700 shadow-md ring-1 ring-black/10 hover:text-black transition"
                >
                  ◑
                </button>
                <button
                  type="button"
                  title="Delete note"
                  onClick={() => removePin(pin.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] text-stone-500 shadow-md ring-1 ring-black/10 hover:text-red-600 transition"
                >
                  ✕
                </button>
              </div>

              {/* CARD RENDERERS */}
              {isSticky && stickyType === "study" && (
                <StudyNoteCard pin={pin} onOpenDetail={() => setDetailPin(pin)} />
              )}

              {isSticky && stickyType === "personal" && (
                <PersonalNoteCard pin={pin} onOpenDetail={() => setDetailPin(pin)} />
              )}

              {isSticky && stickyType === "web" && (
                <WebClipCard pin={pin} onOpenDetail={() => setDetailPin(pin)} />
              )}

              {/* Legacy Photo Pin */}
              {pin.type === "photo" && pin.media && (
                <div className="w-full">
                  <a href={`/api/media/${pin.media}`} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/media/${pin.media}`}
                      alt={pin.content || "Pinned photo"}
                      draggable={false}
                      className="mb-1.5 max-h-40 w-full rounded-[2px] object-cover"
                    />
                  </a>
                  {isEditing ? (
                    <textarea
                      autoFocus
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      onBlur={saveInlineEdit}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveInlineEdit();
                        if (e.key === "Escape") cancelInlineEdit();
                      }}
                      placeholder="Add a caption…"
                      className="h-10 w-full resize-none bg-transparent px-0.5 py-0 text-[12px] leading-snug text-stone-800 outline-none"
                    />
                  ) : (
                    <p className="px-0.5 text-[12px] text-stone-800 font-medium line-clamp-2">
                      {pin.content || "Double-click to caption"}
                    </p>
                  )}
                </div>
              )}

              {/* Legacy Text Pin */}
              {pin.type === "text" && (
                <div className="w-full">
                  {isEditing ? (
                    <textarea
                      autoFocus
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      onBlur={saveInlineEdit}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveInlineEdit();
                        if (e.key === "Escape") cancelInlineEdit();
                      }}
                      placeholder="Write something…"
                      className="h-10 w-full resize-none bg-transparent px-0.5 py-0 text-[13px] leading-snug text-stone-800 outline-none text-center"
                    />
                  ) : (
                    <p
                      className={`cursor-text px-0.5 text-[13px] leading-snug text-stone-800 text-center line-clamp-2 ${
                        !pin.content ? "italic text-stone-500/70" : ""
                      }`}
                    >
                      {pin.content || "Double-click to write"}
                    </p>
                  )}
                  {pin.source === "whatsapp" && (
                    <span className="mt-0.5 block text-center text-[9px] tracking-wide text-stone-500/70">
                      via WhatsApp
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Header UI */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[2000] flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        {/* Left: Brand & Search */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-sm font-semibold tracking-tight text-white shadow backdrop-blur-md border border-white/15">
            <span className="text-emerald-400">✦</span>
            <span>Nectar Softboard</span>
          </div>

          {/* Search Box */}
          <div className="relative flex items-center">
            <span className="absolute left-3 text-xs text-stone-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts, notes, entities…"
              className="h-9 w-44 rounded-full border border-white/15 bg-black/40 pl-8 pr-7 text-xs text-white placeholder-stone-400 backdrop-blur-md transition-all focus:w-64 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 sm:w-56"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-xs text-stone-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Center: Lightweight Type Filter */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/40 p-1 backdrop-blur-md border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              filterType === "all"
                ? "bg-white/20 text-white shadow-sm"
                : "text-stone-300 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterType("study")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              filterType === "study"
                ? "bg-amber-500/30 text-amber-200 shadow-sm"
                : "text-stone-300 hover:text-white"
            }`}
          >
            📚 Study
          </button>
          <button
            type="button"
            onClick={() => setFilterType("personal")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              filterType === "personal"
                ? "bg-purple-500/30 text-purple-200 shadow-sm"
                : "text-stone-300 hover:text-white"
            }`}
          >
            🎬 Personal
          </button>
          <button
            type="button"
            onClick={() => setFilterType("web")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              filterType === "web"
                ? "bg-sky-500/30 text-sky-200 shadow-sm"
                : "text-stone-300 hover:text-white"
            }`}
          >
            🌐 Web
          </button>
          <button
            type="button"
            onClick={() => setFilterType("text")}
            className={`hidden sm:inline-block rounded-full px-2.5 py-1 font-medium transition ${
              filterType === "text"
                ? "bg-white/20 text-white shadow-sm"
                : "text-stone-300 hover:text-white"
            }`}
          >
            📝 Notes
          </button>
          <button
            type="button"
            onClick={() => setFilterType("photo")}
            className={`hidden sm:inline-block rounded-full px-2.5 py-1 font-medium transition ${
              filterType === "photo"
                ? "bg-white/20 text-white shadow-sm"
                : "text-stone-300 hover:text-white"
            }`}
          >
            📷 Photos
          </button>
        </div>

        {/* Right: Primary Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Core Action: + Sticky Note */}
          <button
            type="button"
            onClick={() => {
              setModalEditPin(null);
              setIsStickyModalOpen(true);
            }}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-stone-950 shadow-md transition hover:bg-emerald-400 hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <span>+</span>
            <span>Sticky Note</span>
          </button>

          <button
            type="button"
            onClick={addSimpleNote}
            disabled={busy}
            className="rounded-full bg-black/40 px-3.5 py-2 text-xs font-medium text-stone-200 shadow backdrop-blur-md border border-white/10 transition hover:bg-black/60 hover:text-white disabled:opacity-50"
          >
            + Quick Note
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="rounded-full bg-black/40 px-3.5 py-2 text-xs font-medium text-stone-200 shadow backdrop-blur-md border border-white/10 transition hover:bg-black/60 hover:text-white disabled:opacity-50"
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

      {/* Empty State */}
      {loaded && filteredPins.length === 0 && (
        <div className="pointer-events-none fixed inset-0 z-[1500] flex items-center justify-center">
          <div className="max-w-md rounded-2xl bg-black/50 p-8 text-center shadow-2xl backdrop-blur-xl border border-white/15">
            <span className="text-3xl">📚</span>
            <p className="mt-3 text-base font-bold text-white">
              {searchQuery ? "No matching knowledge found" : "Your softboard is empty"}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-stone-300">
              {searchQuery
                ? `No notes matching "${searchQuery}". Try searching concepts, authors, or topics.`
                : "Capture structured Study Notes, Personal observations, or Web Clippings using the '+ Sticky Note' button above."}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setModalEditPin(null);
                  setIsStickyModalOpen(true);
                }}
                className="pointer-events-auto mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-stone-950 shadow hover:bg-emerald-400"
              >
                + Create Sticky Note
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="pointer-events-none fixed inset-x-0 bottom-3 z-[2000] flex justify-center">
        <span className="rounded-full bg-black/40 px-4 py-1.5 text-xs text-stone-300 shadow backdrop-blur-md border border-white/10">
          Drag to move · Double-click sticky note to inspect Knowledge Graph · Real-time search enabled
        </span>
      </footer>

      {/* Sticky Note Creator & Editor Modal */}
      <StickyNoteModal
        isOpen={isStickyModalOpen}
        onClose={() => {
          setIsStickyModalOpen(false);
          setModalEditPin(null);
        }}
        onSave={handleSaveStickyNote}
        editPin={modalEditPin}
      />

      {/* Sticky Note Detail & Knowledge Graph Inspector */}
      <StickyNoteDetailModal
        pin={detailPin}
        isOpen={Boolean(detailPin)}
        onClose={() => setDetailPin(null)}
        onEdit={(p) => {
          setModalEditPin(p);
          setIsStickyModalOpen(true);
        }}
        onDelete={removePin}
      />
    </div>
  );
}
