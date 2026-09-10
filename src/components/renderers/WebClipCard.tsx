"use client";

import React from "react";
import type { Pin } from "@/lib/types";

interface WebClipCardProps {
  pin: Pin;
  onOpenDetail?: () => void;
}

export default function WebClipCard({ pin, onOpenDetail }: WebClipCardProps) {
  const sticky = pin.sticky;
  const web = sticky?.web;
  const title = sticky?.title || pin.content || "Untitled Web Clipping";

  let displayDomain = "WEB SOURCE";
  if (web?.website) {
    displayDomain = web.website;
  } else if (web?.url) {
    try {
      const u = new URL(web.url.startsWith("http") ? web.url : `https://${web.url}`);
      displayDomain = u.hostname.replace(/^www\./, "");
    } catch {
      displayDomain = "WEB SOURCE";
    }
  }

  const author = web?.author;
  const excerpt = web?.excerpt || "";
  const annotation = web?.annotation || "";
  const tags = sticky?.tags || [];
  const connectionCount = sticky?.relationships?.length ?? 0;
  const mediaAttachment = pin.media;

  const capturedDate = web?.capturedAt || pin.createdAt;
  const dateStr = capturedDate
    ? new Date(capturedDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div
      onClick={onOpenDetail}
      className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[3px] p-3 text-stone-800 transition-all select-none"
    >
      {/* Top Source Banner */}
      <div>
        <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-stone-600">
          <div className="flex items-center gap-1.5 truncate">
            <span className="shrink-0 flex h-3.5 w-3.5 items-center justify-center rounded bg-stone-900/15 text-[8px] font-bold">
              🌐
            </span>
            <span className="truncate font-bold uppercase tracking-wider text-stone-800">
              {displayDomain}
            </span>
          </div>
          <span className="shrink-0 text-[9px] text-stone-500">{dateStr}</span>
        </div>

        <h3 className="mt-1 line-clamp-1 text-[13px] font-bold tracking-tight text-stone-900">
          {title}
        </h3>
        {author && (
          <p className="truncate text-[10px] text-stone-600 italic">by {author}</p>
        )}
      </div>

      {/* Structured Content: Excerpt vs User Annotation */}
      <div className="my-1.5 flex-1 space-y-1.5 overflow-hidden text-[11px]">
        {/* Source Excerpt Block */}
        {excerpt && (
          <div className="border-l-2 border-stone-800/30 pl-2 text-stone-700/90 italic">
            <p className="line-clamp-2 leading-snug">&ldquo;{excerpt}&rdquo;</p>
          </div>
        )}

        {/* User Annotation Block */}
        {annotation ? (
          <div className="rounded bg-stone-900/5 px-2 py-1">
            <span className="block text-[8px] font-bold uppercase tracking-wider text-stone-500">
              My Note
            </span>
            <p className="line-clamp-2 text-stone-900 leading-snug font-medium">
              {annotation}
            </p>
          </div>
        ) : !excerpt ? (
          <p className="line-clamp-2 text-stone-500 italic">
            Double-click to add source excerpt and annotations…
          </p>
        ) : null}

        {mediaAttachment && (
          <div className="overflow-hidden rounded border border-stone-800/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/media/${mediaAttachment}`}
              alt="Web clipping screenshot"
              className="h-10 w-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Footer Tags & Graph Connection */}
      <div className="border-t border-stone-800/10 pt-1.5 flex items-center justify-between text-[9px]">
        <div className="flex flex-wrap items-center gap-1 overflow-hidden">
          {tags.slice(0, 2).map((t, idx) => (
            <span
              key={idx}
              className="rounded bg-stone-900/10 px-1.5 py-0.2 font-medium text-stone-800"
            >
              #{t}
            </span>
          ))}
          {web?.url && (
            <span className="truncate text-stone-500 text-[8px]">
              ↗ {displayDomain}
            </span>
          )}
        </div>

        {connectionCount > 0 && (
          <span
            title={`${connectionCount} Knowledge Graph connection(s)`}
            className="shrink-0 rounded-full bg-stone-900/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-stone-700"
          >
            ☍ {connectionCount}
          </span>
        )}
      </div>
    </div>
  );
}
