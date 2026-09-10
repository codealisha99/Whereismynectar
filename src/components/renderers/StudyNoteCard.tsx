"use client";

import React from "react";
import type { Pin } from "@/lib/types";

interface StudyNoteCardProps {
  pin: Pin;
  onOpenDetail?: () => void;
}

export default function StudyNoteCard({ pin, onOpenDetail }: StudyNoteCardProps) {
  const sticky = pin.sticky;
  const study = sticky?.study;
  const title = sticky?.title || pin.content || "Untitled Study Note";
  const dateStr = pin.createdAt
    ? new Date(pin.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const questionsList = study?.questions
    ? study.questions
        .split(/\r?\n/)
        .map((q) => q.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const mainNotesExcerpt = study?.mainNotes || "";
  const keyConcepts = study?.keyConcepts || [];
  const connectionCount = sticky?.relationships?.length ?? 0;
  const mediaAttachment = pin.media || (study?.attachments && study.attachments[0]);

  return (
    <div
      onClick={onOpenDetail}
      className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[4px] p-3 text-stone-800 transition-all select-none"
    >
      {/* Top Academic Header */}
      <div className="border-b border-stone-800/15 pb-1.5">
        <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider text-stone-600/80">
          <span className="truncate font-semibold text-stone-700">
            {study?.class || "ACADEMIC NOTE"}
          </span>
          <span className="shrink-0">{dateStr}</span>
        </div>
        <h3 className="mt-0.5 truncate text-[13px] font-bold tracking-tight text-stone-900">
          {title}
        </h3>
        {study?.topic && study.topic !== title && (
          <p className="truncate text-[11px] font-medium text-stone-600">
            Topic: {study.topic}
          </p>
        )}
      </div>

      {/* 2-Column Cornell-style Body */}
      <div className="my-1.5 grid grid-cols-5 gap-2 overflow-hidden text-[11px] leading-tight">
        {/* Left Column: Questions / Cues */}
        <div className="col-span-2 border-r border-stone-800/15 pr-1.5">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-stone-500">
            Cues / Questions
          </span>
          {questionsList.length > 0 ? (
            <ul className="mt-1 space-y-1 text-stone-700">
              {questionsList.map((q, i) => (
                <li key={i} className="line-clamp-2 italic">
                  {q.replace(/^[-*•\d.]\s*/, "• ")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[10px] italic text-stone-400">No questions recorded</p>
          )}
        </div>

        {/* Right Column: Main Notes & Diagram */}
        <div className="col-span-3 flex flex-col justify-between pl-0.5">
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-stone-500">
              Main Notes
            </span>
            <p className="mt-1 line-clamp-3 text-stone-800 font-normal">
              {mainNotesExcerpt || "Double-click to add main lecture notes…"}
            </p>
          </div>

          {mediaAttachment && (
            <div className="mt-1.5 overflow-hidden rounded border border-stone-800/10 bg-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/${mediaAttachment}`}
                alt="Diagram thumbnail"
                className="h-10 w-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Summary Block & Entity Badges */}
      <div className="border-t border-stone-800/15 pt-1.5">
        {study?.summary && (
          <div className="mb-1 rounded bg-stone-900/5 px-1.5 py-1 text-[10px] text-stone-700">
            <span className="font-bold text-stone-800">Summary: </span>
            <span className="line-clamp-1">{study.summary}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-1 text-[9px]">
          <div className="flex flex-wrap gap-1 overflow-hidden">
            {keyConcepts.slice(0, 3).map((concept, idx) => (
              <span
                key={idx}
                className="rounded bg-stone-900/10 px-1.5 py-0.5 font-medium text-stone-800"
              >
                {concept}
              </span>
            ))}
            {keyConcepts.length > 3 && (
              <span className="text-stone-500 font-mono">+{keyConcepts.length - 3}</span>
            )}
          </div>

          {connectionCount > 0 && (
            <span
              title={`${connectionCount} Knowledge Graph connection(s)`}
              className="shrink-0 flex items-center gap-0.5 rounded-full bg-stone-900/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-stone-700"
            >
              ☍ {connectionCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
