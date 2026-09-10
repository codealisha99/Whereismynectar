"use client";

import React, { useState } from "react";
import type { Pin } from "@/lib/types";

interface StickyNoteDetailModalProps {
  pin: Pin | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (pin: Pin) => void;
  onDelete: (id: string) => void;
}

export default function StickyNoteDetailModal({
  pin,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: StickyNoteDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"note" | "knowledge">("note");

  if (!isOpen || !pin) return null;

  const sticky = pin.sticky;
  const stickyType = sticky?.stickyType;
  const study = sticky?.study;
  const personal = sticky?.personal;
  const web = sticky?.web;
  const title = sticky?.title || pin.content || "Untitled Note";

  const dateStr = pin.createdAt
    ? new Date(pin.createdAt).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  let webHref: string | undefined = undefined;
  if (web?.url) {
    webHref = web.url.startsWith("http") ? web.url : `https://${web.url}`;
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-white/20 bg-stone-900/95 text-stone-100 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-lg">
              {stickyType === "study"
                ? "📚"
                : stickyType === "personal"
                ? "🎬"
                : stickyType === "web"
                ? "🌐"
                : "📝"}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-stone-300">
                  {stickyType ? `${stickyType} note` : pin.type}
                </span>
                <span className="text-xs text-stone-400">{dateStr}</span>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch */}
            <div className="flex rounded-lg bg-black/40 p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("note")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  activeTab === "note"
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                Physical Note
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("knowledge")}
                className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition ${
                  activeTab === "knowledge"
                    ? "bg-emerald-500/30 text-emerald-300 shadow-sm"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                <span>Knowledge Graph</span>
                {sticky?.relationships && sticky.relationships.length > 0 && (
                  <span className="rounded-full bg-emerald-500/30 px-1.5 py-0.2 text-[10px] font-mono text-emerald-300">
                    {sticky.relationships.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "note" ? (
            <div className="space-y-6">
              {/* TYPE 1: STUDY / LECTURE NOTE DETAIL */}
              {stickyType === "study" && (
                <div
                  style={{ backgroundColor: pin.color }}
                  className="rounded-xl border border-stone-800/10 p-6 text-stone-900 shadow-lg"
                >
                  <div className="border-b border-stone-800/20 pb-3">
                    <div className="flex items-center justify-between font-mono text-xs text-stone-700">
                      <span className="font-bold tracking-wider uppercase">
                        {study?.class || "COURSE NOTE"}
                      </span>
                      <span>{dateStr}</span>
                    </div>
                    <h1 className="mt-1 text-xl font-bold tracking-tight">{title}</h1>
                    {study?.topic && (
                      <p className="mt-0.5 text-sm font-medium text-stone-700">
                        Topic: {study.topic}
                      </p>
                    )}
                  </div>

                  {/* 2-Column Cornell Layout */}
                  <div className="my-4 grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* Left Column: Questions */}
                    <div className="border-b md:border-b-0 md:border-r border-stone-800/20 pb-4 md:pb-0 md:pr-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                        Questions & Cues
                      </h4>
                      {study?.questions ? (
                        <div className="mt-2 space-y-2 text-xs italic text-stone-800 leading-relaxed whitespace-pre-line">
                          {study.questions}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs italic text-stone-500">No questions recorded.</p>
                      )}
                    </div>

                    {/* Right Column: Main Notes */}
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                          Main Lecture Notes
                        </h4>
                        <div className="mt-2 text-sm leading-relaxed text-stone-900 whitespace-pre-line">
                          {study?.mainNotes || pin.content}
                        </div>
                      </div>

                      {/* Attached Diagram / Image */}
                      {pin.media && (
                        <div className="overflow-hidden rounded-lg border border-stone-800/20 bg-black/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/media/${pin.media}`}
                            alt="Lecture diagram"
                            className="max-h-80 w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Summary */}
                  {study?.summary && (
                    <div className="rounded-lg border border-stone-800/15 bg-black/5 p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                        Summary Takeaway
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-stone-800 font-medium">
                        {study.summary}
                      </p>
                    </div>
                  )}

                  {/* Key Concepts */}
                  {study?.keyConcepts && study.keyConcepts.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-3 border-t border-stone-800/15">
                      <span className="text-xs font-semibold text-stone-700">Concepts:</span>
                      {study.keyConcepts.map((c, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-stone-900/10 px-2.5 py-0.5 text-xs font-medium text-stone-800"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TYPE 2: PERSONAL / SERIES NOTE DETAIL */}
              {stickyType === "personal" && (
                <div
                  style={{ backgroundColor: pin.color }}
                  className="rounded-xl border border-stone-800/10 p-6 text-stone-900 shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-stone-800/20 pb-3">
                    <span className="rounded-md bg-stone-900/10 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-stone-800 font-mono">
                      {personal?.category || "PERSONAL"}
                    </span>
                    {personal?.rating && (
                      <span className="text-lg text-amber-700">
                        {"★".repeat(personal.rating)}
                        {"☆".repeat(5 - personal.rating)}
                      </span>
                    )}
                  </div>

                  <h1 className="mt-3 text-xl font-bold tracking-tight">{title}</h1>

                  <div className="my-4 rounded-lg bg-white/40 p-4 border border-stone-800/10">
                    <p className="text-base italic leading-relaxed text-stone-800 font-serif">
                      &ldquo;{personal?.shortNote || pin.content}&rdquo;
                    </p>
                  </div>

                  {pin.media && (
                    <div className="mb-4 overflow-hidden rounded-lg border border-stone-800/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/media/${pin.media}`}
                        alt="Personal note attachment"
                        className="max-h-72 w-full object-cover"
                      />
                    </div>
                  )}

                  {personal?.people && personal.people.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs font-semibold text-stone-700">People:</span>
                      {personal.people.map((p, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-stone-900/10 px-2 py-0.5 text-xs font-medium text-stone-800"
                        >
                          @{p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TYPE 3: WEB CLIPPING DETAIL */}
              {stickyType === "web" && (
                <div
                  style={{ backgroundColor: pin.color }}
                  className="rounded-xl border border-stone-800/10 p-6 text-stone-900 shadow-lg space-y-4"
                >
                  <div className="border-b border-stone-800/20 pb-3">
                    <div className="flex items-center justify-between text-xs font-mono text-stone-700">
                      <span className="font-bold tracking-wider uppercase">
                        🌐 {web?.website || "WEB SOURCE"}
                      </span>
                      {webHref && (
                        <a
                          href={webHref}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-emerald-800 font-semibold hover:underline"
                        >
                          <span>Visit Source</span>
                          <span>↗</span>
                        </a>
                      )}
                    </div>
                    <h1 className="mt-2 text-xl font-bold tracking-tight">{title}</h1>
                    {web?.author && (
                      <p className="mt-0.5 text-xs text-stone-700 italic">by {web.author}</p>
                    )}
                  </div>

                  {/* Excerpt */}
                  {web?.excerpt && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                        Source Excerpt
                      </h4>
                      <blockquote className="mt-1 border-l-4 border-stone-800/40 bg-black/5 p-3 italic text-stone-800 leading-relaxed text-sm">
                        &ldquo;{web.excerpt}&rdquo;
                      </blockquote>
                    </div>
                  )}

                  {/* User Annotation */}
                  {web?.annotation && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        My Note / Annotation
                      </h4>
                      <div className="mt-1 rounded-lg bg-white/50 p-3 text-stone-900 leading-relaxed text-sm font-medium border border-emerald-800/20">
                        {web.annotation}
                      </div>
                    </div>
                  )}

                  {pin.media && (
                    <div className="overflow-hidden rounded-lg border border-stone-800/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/media/${pin.media}`}
                        alt="Web clipping screenshot"
                        className="max-h-72 w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Standard text note fallback */}
              {!stickyType && (
                <div
                  style={{ backgroundColor: pin.color }}
                  className="rounded-xl p-6 text-stone-900 shadow-lg whitespace-pre-line text-sm leading-relaxed"
                >
                  {pin.content}
                  {pin.media && (
                    <div className="mt-4 overflow-hidden rounded-lg border border-stone-800/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/media/${pin.media}`}
                        alt="Pinned photo"
                        className="max-h-72 w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {sticky?.tags && sticky.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-stone-400 font-medium">Tags:</span>
                  {sticky.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-stone-300"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* KNOWLEDGE GRAPH & SEMANTIC MEMORY TAB */
            <div className="space-y-6">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <span>🧠 Nectar Knowledge Graph Representation</span>
                </h3>
                <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                  Nectar stores this note as a structured knowledge object with explicit entities
                  and semantic connections across your memory.
                </p>
              </div>

              {/* Extracted Entities */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                  Extracted Entities ({sticky?.entities?.length || 0})
                </h4>
                {sticky?.entities && sticky.entities.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {sticky.entities.map((ent, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col rounded-lg border border-white/10 bg-white/5 p-2.5"
                      >
                        <span className="text-[9px] font-mono font-bold uppercase text-emerald-400">
                          {ent.type}
                        </span>
                        <span className="text-xs font-semibold text-white truncate">
                          {ent.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-stone-500">No entities extracted.</p>
                )}
              </div>

              {/* Semantic Relationships */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                  Semantic Relationships ({sticky?.relationships?.length || 0})
                </h4>
                {sticky?.relationships && sticky.relationships.length > 0 ? (
                  <div className="space-y-2">
                    {sticky.relationships.map((rel, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-mono"
                      >
                        <span className="font-bold text-stone-100">{rel.source}</span>
                        <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                          <span>───</span>
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 border border-emerald-400/30">
                            {rel.predicate}
                          </span>
                          <span>───►</span>
                        </span>
                        <span className="text-stone-300 font-semibold">{rel.target}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-stone-500">No explicit relationships mapped.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              onDelete(pin.id);
              onClose();
            }}
            className="rounded-full px-4 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
          >
            Delete Note
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-xs font-medium text-stone-300 hover:bg-white/10"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(pin);
              }}
              className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-stone-950 shadow-md transition hover:bg-emerald-400"
            >
              Edit Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
