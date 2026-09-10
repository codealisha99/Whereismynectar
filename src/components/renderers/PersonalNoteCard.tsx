"use client";

import React from "react";
import type { Pin } from "@/lib/types";

interface PersonalNoteCardProps {
  pin: Pin;
  onOpenDetail?: () => void;
}

export default function PersonalNoteCard({ pin, onOpenDetail }: PersonalNoteCardProps) {
  const sticky = pin.sticky;
  const personal = sticky?.personal;
  const title = sticky?.title || pin.content || "Untitled Thought";
  const category = personal?.category || "PERSONAL";
  const note = personal?.shortNote || pin.content || "";
  const rating = personal?.rating;
  const people = personal?.people || [];
  const tags = sticky?.tags || [];
  const connectionCount = sticky?.relationships?.length ?? 0;
  const mediaAttachment = pin.media;

  const dateStr = pin.createdAt
    ? new Date(pin.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <div
      onClick={onOpenDetail}
      className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[3px] p-3 text-stone-800 transition-all select-none"
    >
      {/* Top Archival Slip Header */}
      <div>
        <div className="flex items-center justify-between gap-1 text-[10px] font-mono uppercase tracking-widest text-stone-600/90">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-700/60" />
            <span className="font-bold text-stone-800">{category}</span>
          </div>
          {rating ? (
            <span className="font-mono text-amber-700 text-[11px]">
              {"★".repeat(rating)}
              {"☆".repeat(Math.max(0, 5 - rating))}
            </span>
          ) : (
            <span className="text-[9px] text-stone-500">{dateStr}</span>
          )}
        </div>

        <h3 className="mt-1 line-clamp-1 text-[14px] font-bold tracking-tight text-stone-900">
          {title}
        </h3>
      </div>

      {/* Main Personal Note / Thought */}
      <div className="my-1.5 flex-1 overflow-hidden">
        <p className="line-clamp-3 text-[12px] italic leading-relaxed text-stone-700/95 font-serif">
          &ldquo;{note}&rdquo;
        </p>

        {mediaAttachment && (
          <div className="mt-1.5 overflow-hidden rounded-[2px] border border-stone-800/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/media/${mediaAttachment}`}
              alt="Note attachment"
              className="h-12 w-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Footer Details */}
      <div className="border-t border-stone-800/10 pt-1.5 flex items-center justify-between text-[9px]">
        <div className="flex flex-wrap items-center gap-1 overflow-hidden">
          {people.slice(0, 2).map((p, idx) => (
            <span
              key={idx}
              className="rounded-full bg-stone-900/10 px-1.5 py-0.2 font-medium text-stone-800"
            >
              @{p}
            </span>
          ))}
          {tags.slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className="rounded bg-stone-900/5 px-1 py-0.2 text-stone-600"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {rating && <span className="text-stone-500 text-[9px]">{dateStr}</span>}
          {connectionCount > 0 && (
            <span
              title={`${connectionCount} Knowledge Graph connection(s)`}
              className="rounded-full bg-stone-900/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-stone-700"
            >
              ☍ {connectionCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
