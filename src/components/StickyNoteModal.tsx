"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import type {
  Pin,
  StickyType,
  StickyNoteData,
  StudyNoteMetadata,
  PersonalNoteMetadata,
  WebClipMetadata,
} from "@/lib/types";
import { PIN_COLORS } from "@/lib/colors";
import { extractKnowledge } from "@/lib/knowledge";

interface StickyNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pinData: {
    type: "sticky";
    color: string;
    media?: string;
    sticky: StickyNoteData;
    id?: string;
  }) => Promise<void>;
  editPin?: Pin | null;
}

const CATEGORIES = [
  "Series",
  "Movie",
  "Book",
  "Person",
  "Idea",
  "Experience",
  "Recommendation",
  "Memory",
  "Other",
];

export default function StickyNoteModal({
  isOpen,
  onClose,
  onSave,
  editPin,
}: StickyNoteModalProps) {
  // Step 1: Type Selection (if not editing), Step 2: Form
  const [selectedType, setSelectedType] = useState<StickyType | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [color, setColor] = useState<string>(PIN_COLORS[0]);
  const [media, setMedia] = useState<string | undefined>(undefined);
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Study Note Fields
  const [course, setCourse] = useState("");
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState("");
  const [mainNotes, setMainNotes] = useState("");
  const [summary, setSummary] = useState("");
  const [keyConceptsInput, setKeyConceptsInput] = useState("");

  // Personal Note Fields
  const [category, setCategory] = useState("Series");
  const [shortNote, setShortNote] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [peopleInput, setPeopleInput] = useState("");

  // Web Clip Fields
  const [url, setUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [author, setAuthor] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [annotation, setAnnotation] = useState("");

  // Initialize form when opening or editing
  useEffect(() => {
    if (!isOpen) return;

    if (editPin && editPin.sticky) {
      const s = editPin.sticky;
      setSelectedType(s.stickyType);
      setTitle(s.title || "");
      setColor(editPin.color || PIN_COLORS[0]);
      setMedia(editPin.media);
      setTagsInput(s.tags?.join(", ") || "");

      if (s.stickyType === "study" && s.study) {
        setCourse(s.study.class || "");
        setTopic(s.study.topic || "");
        setQuestions(s.study.questions || "");
        setMainNotes(s.study.mainNotes || "");
        setSummary(s.study.summary || "");
        setKeyConceptsInput(s.study.keyConcepts?.join(", ") || "");
      } else if (s.stickyType === "personal" && s.personal) {
        setCategory(s.personal.category || "Series");
        setShortNote(s.personal.shortNote || "");
        setRating(s.personal.rating || 0);
        setPeopleInput(s.personal.people?.join(", ") || "");
      } else if (s.stickyType === "web" && s.web) {
        setUrl(s.web.url || "");
        setWebsite(s.web.website || "");
        setAuthor(s.web.author || "");
        setExcerpt(s.web.excerpt || "");
        setAnnotation(s.web.annotation || "");
      }
    } else {
      // Reset defaults for new note
      setSelectedType(null);
      setTitle("");
      setColor(PIN_COLORS[Math.floor(Math.random() * PIN_COLORS.length)]);
      setMedia(undefined);
      setTagsInput("");
      setCourse("");
      setTopic("");
      setQuestions("");
      setMainNotes("");
      setSummary("");
      setKeyConceptsInput("");
      setCategory("Series");
      setShortNote("");
      setRating(0);
      setPeopleInput("");
      setUrl("");
      setWebsite("");
      setAuthor("");
      setExcerpt("");
      setAnnotation("");
    }
  }, [isOpen, editPin]);

  // Real-time parsed sticky note data
  const currentStickyData: StickyNoteData | null = useMemo(() => {
    if (!selectedType) return null;

    const tags = tagsInput
      .split(/[,#]/)
      .map((t) => t.trim())
      .filter(Boolean);

    let studyMeta: StudyNoteMetadata | undefined;
    let personalMeta: PersonalNoteMetadata | undefined;
    let webMeta: WebClipMetadata | undefined;

    if (selectedType === "study") {
      const keyConcepts = keyConceptsInput
        .split(/[,]/)
        .map((k) => k.trim())
        .filter(Boolean);

      studyMeta = {
        class: course.trim() || undefined,
        topic: topic.trim() || undefined,
        questions: questions.trim() || undefined,
        mainNotes: mainNotes.trim() || undefined,
        summary: summary.trim() || undefined,
        keyConcepts: keyConcepts.length > 0 ? keyConcepts : undefined,
        attachments: media ? [media] : undefined,
      };
    } else if (selectedType === "personal") {
      const people = peopleInput
        .split(/[,@]/)
        .map((p) => p.trim())
        .filter(Boolean);

      personalMeta = {
        category,
        shortNote: shortNote.trim() || undefined,
        rating: rating > 0 ? rating : undefined,
        people: people.length > 0 ? people : undefined,
      };
    } else if (selectedType === "web") {
      let inferredSite = website.trim();
      if (!inferredSite && url.trim()) {
        try {
          inferredSite = new URL(url.trim()).hostname.replace(/^www\./, "");
        } catch {
          // ignore
        }
      }

      webMeta = {
        url: url.trim() || undefined,
        website: inferredSite || undefined,
        author: author.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        annotation: annotation.trim() || undefined,
        capturedAt: new Date().toISOString(),
      };
    }

    const base: StickyNoteData = {
      stickyType: selectedType,
      title: title.trim() || (selectedType === "study" ? "Study Note" : selectedType === "personal" ? "Thought" : "Web Clip"),
      tags,
      study: studyMeta,
      personal: personalMeta,
      web: webMeta,
    };

    const { entities, relationships } = extractKnowledge(base);
    return {
      ...base,
      entities,
      relationships,
    };
  }, [
    selectedType,
    title,
    tagsInput,
    course,
    topic,
    questions,
    mainNotes,
    summary,
    keyConceptsInput,
    media,
    category,
    shortNote,
    rating,
    peopleInput,
    url,
    website,
    author,
    excerpt,
    annotation,
  ]);

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const pin: Pin = await res.json();
        if (pin.media) setMedia(pin.media);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStickyData) return;
    setSaving(true);
    try {
      await onSave({
        type: "sticky",
        color,
        media,
        sticky: currentStickyData,
        id: editPin?.id,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-white/20 bg-stone-900/95 text-stone-100 shadow-2xl backdrop-blur-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-sm">
              {selectedType === "study"
                ? "📚"
                : selectedType === "personal"
                ? "🎬"
                : selectedType === "web"
                ? "🌐"
                : "✦"}
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-white">
                {editPin
                  ? "Edit Knowledge Note"
                  : selectedType
                  ? `Create ${selectedType === "study" ? "Study Note" : selectedType === "personal" ? "Series / Personal Note" : "Web Clipping"}`
                  : "Create Sticky Note"}
              </h2>
              <p className="text-xs text-stone-400">
                {selectedType
                  ? "Capturing structured knowledge for Nectar"
                  : "What knowledge are you capturing into Nectar?"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* STEP 1: Type Selector */}
          {!selectedType && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Option 1: Study Note */}
                <button
                  type="button"
                  onClick={() => setSelectedType("study")}
                  className="group flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-400/50 hover:bg-emerald-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <div>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-xl text-amber-300 group-hover:scale-110 transition-transform">
                      📚
                    </div>
                    <h3 className="font-semibold text-white">Study Note</h3>
                    <p className="mt-1 text-xs leading-relaxed text-stone-400">
                      Lectures, courses, textbooks, concepts & Cornell-style academic sheets.
                    </p>
                  </div>
                  <span className="mt-3 inline-flex items-center text-[11px] font-medium text-emerald-400 group-hover:underline">
                    Capture Lecture →
                  </span>
                </button>

                {/* Option 2: Personal Note */}
                <button
                  type="button"
                  onClick={() => setSelectedType("personal")}
                  className="group flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-purple-400/50 hover:bg-purple-500/10 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <div>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-xl text-purple-300 group-hover:scale-110 transition-transform">
                      🎬
                    </div>
                    <h3 className="font-semibold text-white">Series / Personal</h3>
                    <p className="mt-1 text-xs leading-relaxed text-stone-400">
                      Movies, TV series, books, experiences, thoughts, reviews & observations.
                    </p>
                  </div>
                  <span className="mt-3 inline-flex items-center text-[11px] font-medium text-purple-400 group-hover:underline">
                    Capture Thought →
                  </span>
                </button>

                {/* Option 3: Web Clipping */}
                <button
                  type="button"
                  onClick={() => setSelectedType("web")}
                  className="group flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-sky-400/50 hover:bg-sky-500/10 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <div>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20 text-xl text-sky-300 group-hover:scale-110 transition-transform">
                      🌐
                    </div>
                    <h3 className="font-semibold text-white">Web Clipping</h3>
                    <p className="mt-1 text-xs leading-relaxed text-stone-400">
                      Webpages, articles, documentation, source excerpts & annotations.
                    </p>
                  </div>
                  <span className="mt-3 inline-flex items-center text-[11px] font-medium text-sky-400 group-hover:underline">
                    Capture Source →
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Structured Editors */}
          {selectedType && (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Back Button / Switch Type (only when creating) */}
              {!editPin && (
                <button
                  type="button"
                  onClick={() => setSelectedType(null)}
                  className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-white"
                >
                  ← Choose a different note type
                </button>
              )}

              {/* Common Top Row: Title & Paper Color */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-300">
                    {selectedType === "study"
                      ? "Lecture / Note Title *"
                      : selectedType === "personal"
                      ? "Title / Work / Subject *"
                      : "Source / Article Title *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      selectedType === "study"
                        ? "e.g. The Brain & The Nervous System"
                        : selectedType === "personal"
                        ? "e.g. A Knight of the Seven Kingdoms"
                        : "e.g. Architecture of Modern AI Agents"
                    }
                    className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-stone-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300">
                    Paper Color
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    {PIN_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        className={`h-7 w-7 rounded-full transition-transform ${
                          color === c
                            ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-stone-900"
                            : "opacity-75 hover:opacity-100"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* TYPE 1: STUDY / LECTURE NOTE FORM */}
              {selectedType === "study" && (
                <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-stone-300">
                        Class / Course
                      </label>
                      <input
                        type="text"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        placeholder="e.g. Biology 101, CS 224N"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-300">
                        Topic
                      </label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. The Brain & The Nervous System"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                    {/* Left Column: Questions / Cues */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-stone-300">
                        Questions & Cues (Left Margin)
                      </label>
                      <textarea
                        rows={4}
                        value={questions}
                        onChange={(e) => setQuestions(e.target.value)}
                        placeholder={"- What are the major regions?\n- How do neurons communicate?"}
                        className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/20 p-2 text-xs leading-relaxed text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>

                    {/* Right Column: Main Notes */}
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-stone-300">
                        Main Notes (Right Column)
                      </label>
                      <textarea
                        rows={4}
                        value={mainNotes}
                        onChange={(e) => setMainNotes(e.target.value)}
                        placeholder={"Cerebrum: controls cognitive thought\nCerebellum: coordination\nBrainstem: vital functions"}
                        className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/20 p-2 text-xs leading-relaxed text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <label className="block text-xs font-medium text-stone-300">
                      Summary (Bottom Banner)
                    </label>
                    <textarea
                      rows={2}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Brief 1-2 sentence core takeaway..."
                      className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>

                  {/* Key Concepts */}
                  <div>
                    <label className="block text-xs font-medium text-stone-300">
                      Key Concepts (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={keyConceptsInput}
                      onChange={(e) => setKeyConceptsInput(e.target.value)}
                      placeholder="e.g. Cerebrum, Cerebellum, Brainstem, Synapse"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>
              )}

              {/* TYPE 2: PERSONAL / SERIES NOTE FORM */}
              {selectedType === "personal" && (
                <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-stone-300">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-stone-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-300">
                        Rating (Optional)
                      </label>
                      <div className="mt-1.5 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(rating === star ? 0 : star)}
                            className="text-lg text-amber-400 hover:scale-125 transition-transform"
                          >
                            {star <= rating ? "★" : "☆"}
                          </button>
                        ))}
                        {rating > 0 && (
                          <span className="ml-2 text-xs text-stone-400 font-mono">
                            {rating}/5
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300">
                      Short Thought / Note *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={shortNote}
                      onChange={(e) => setShortNote(e.target.value)}
                      placeholder="e.g. Back to Westeros, finally. The character dynamics felt much warmer."
                      className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/20 p-2 text-xs leading-relaxed text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300">
                      People / Characters (Optional, comma-separated)
                    </label>
                    <input
                      type="text"
                      value={peopleInput}
                      onChange={(e) => setPeopleInput(e.target.value)}
                      placeholder="e.g. George R.R. Martin, Duncan, Egg"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  </div>
                </div>
              )}

              {/* TYPE 3: WEB CLIPPING FORM */}
              {selectedType === "web" && (
                <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-stone-300">
                        URL / Source Link
                      </label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/article"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-300">
                        Website / Publication
                      </label>
                      <input
                        type="text"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="e.g. The New York Times, arXiv"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300">
                      Author (Optional)
                    </label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="e.g. John Doe, Dario Amodei"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-sky-400"
                    />
                  </div>

                  {/* Distinction: Source Content vs Annotation */}
                  <div>
                    <label className="block text-xs font-medium text-sky-300 flex items-center justify-between">
                      <span>Source Excerpt (Direct Quote / Web Content)</span>
                      <span className="text-[10px] text-stone-400 font-normal">Source Truth</span>
                    </label>
                    <textarea
                      rows={3}
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      placeholder="Paste the key passage or quote from the article..."
                      className="mt-1 w-full resize-none rounded-lg border border-sky-500/30 bg-black/30 p-2 text-xs italic leading-relaxed text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-emerald-300 flex items-center justify-between">
                      <span>My Note (Your Interpretation & Why it matters)</span>
                      <span className="text-[10px] text-stone-400 font-normal">User Knowledge</span>
                    </label>
                    <textarea
                      rows={2}
                      value={annotation}
                      onChange={(e) => setAnnotation(e.target.value)}
                      placeholder="This is relevant to the architecture I'm building for Nectar..."
                      className="mt-1 w-full resize-none rounded-lg border border-emerald-500/30 bg-black/30 p-2 text-xs leading-relaxed text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>
              )}

              {/* Attachments & Tags Row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-stone-300">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. AI, biology, recommendations"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300">
                    Diagram / Image Attachment
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-stone-200 hover:bg-white/10 disabled:opacity-50"
                    >
                      {uploading ? "Uploading…" : media ? "Change Image" : "+ Attach Image"}
                    </button>
                    {media && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-emerald-400">✓ Attached</span>
                        <button
                          type="button"
                          onClick={() => setMedia(undefined)}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        void handleFileUpload(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* LIVE KNOWLEDGE GRAPH PREVIEW */}
              {currentStickyData && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                    <span>🧠 Nectar Knowledge Graph Extraction</span>
                    <span className="font-mono text-[10px] text-emerald-300/80">
                      {currentStickyData.entities?.length || 0} entities ·{" "}
                      {currentStickyData.relationships?.length || 0} relations
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {currentStickyData.entities?.map((ent, idx) => (
                      <span
                        key={idx}
                        className="rounded-md border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200"
                      >
                        <strong className="text-emerald-400 uppercase text-[8px] mr-1">
                          {ent.type}
                        </strong>
                        {ent.name}
                      </span>
                    ))}
                  </div>

                  {currentStickyData.relationships &&
                    currentStickyData.relationships.length > 0 && (
                      <div className="mt-2 space-y-1 text-[10px] text-stone-300">
                        {currentStickyData.relationships.slice(0, 3).map((rel, idx) => (
                          <div key={idx} className="flex items-center gap-1 font-mono text-[9px]">
                            <span className="text-stone-200 font-bold">{rel.source}</span>
                            <span className="text-emerald-400">→ [{rel.predicate}] →</span>
                            <span className="text-stone-300">{rel.target}</span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-xs font-medium text-stone-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-stone-950 shadow-md transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {saving ? "Saving…" : editPin ? "Update Note" : "Pin Knowledge Note"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
