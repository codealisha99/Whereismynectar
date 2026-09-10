export type PinType = "text" | "photo" | "sticky";

export type PinSource = "manual" | "whatsapp";

export type StickyType = "study" | "personal" | "web";

export interface StudyNoteMetadata {
  class?: string;
  topic?: string;
  questions?: string;
  mainNotes?: string;
  summary?: string;
  keyConcepts?: string[];
  attachments?: string[];
}

export interface PersonalNoteMetadata {
  category?: string; // Series | Movie | Book | Person | Idea | Experience | Recommendation | Memory | Other
  shortNote?: string;
  rating?: number; // 1 to 5
  people?: string[];
  links?: string[];
}

export interface WebClipMetadata {
  url?: string;
  website?: string;
  author?: string;
  capturedAt?: string;
  publishedAt?: string;
  excerpt?: string;
  annotation?: string;
}

export interface KnowledgeEntity {
  name: string;
  type: "concept" | "course" | "topic" | "work" | "person" | "source" | "category" | "tag";
}

export interface KnowledgeRelationship {
  source: string;
  predicate: string; // e.g. "covers", "part_of", "includes", "categorized_as", "sourced_from", "discusses", "authored_by", "quotes"
  target: string;
}

export interface StickyNoteData {
  stickyType: StickyType;
  title: string;
  study?: StudyNoteMetadata;
  personal?: PersonalNoteMetadata;
  web?: WebClipMetadata;
  tags?: string[];
  entities?: KnowledgeEntity[];
  relationships?: KnowledgeRelationship[];
}

export interface Pin {
  id: string;
  type: PinType;
  content: string; // For text/photo, or fallback text summary
  media?: string;
  x: number;
  y: number;
  color: string;
  source: PinSource;
  createdAt: string;
  updatedAt?: string;
  sticky?: StickyNoteData;
}

