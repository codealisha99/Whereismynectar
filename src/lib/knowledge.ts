import type {
  KnowledgeEntity,
  KnowledgeRelationship,
  Pin,
  StickyNoteData,
} from "./types";

/**
 * Extracts high-confidence entities and explicit relationships
 * from structured Sticky Note metadata.
 */
export function extractKnowledge(sticky: StickyNoteData): {
  entities: KnowledgeEntity[];
  relationships: KnowledgeRelationship[];
} {
  const entityMap = new Map<string, KnowledgeEntity>();
  const relationships: KnowledgeRelationship[] = [];

  const addEntity = (name: string | undefined, type: KnowledgeEntity["type"]) => {
    if (!name) return;
    const clean = name.trim();
    if (!clean || clean.length < 2) return;
    const key = `${type}:${clean.toLowerCase()}`;
    if (!entityMap.has(key)) {
      entityMap.set(key, { name: clean, type });
    }
  };

  const addRel = (source: string, predicate: string, target: string) => {
    const s = source.trim();
    const p = predicate.trim();
    const t = target.trim();
    if (!s || !p || !t || s.toLowerCase() === t.toLowerCase()) return;
    const exists = relationships.some(
      (r) =>
        r.source.toLowerCase() === s.toLowerCase() &&
        r.predicate.toLowerCase() === p.toLowerCase() &&
        r.target.toLowerCase() === t.toLowerCase(),
    );
    if (!exists) {
      relationships.push({ source: s, predicate: p, target: t });
    }
  };

  const title = sticky.title.trim();

  // 1. Tags
  if (Array.isArray(sticky.tags)) {
    sticky.tags.forEach((tag) => {
      addEntity(tag, "tag");
      if (title) addRel(title, "tagged_with", tag);
    });
  }

  // 2. Study Note Extraction
  if (sticky.stickyType === "study" && sticky.study) {
    const { class: course, topic, keyConcepts, questions, mainNotes } = sticky.study;

    if (course) {
      addEntity(course, "course");
      if (title) addRel(title, "for_course", course);
    }

    if (topic) {
      addEntity(topic, "topic");
      if (title) addRel(title, "covers_topic", topic);
      if (course) addRel(topic, "part_of", course);
    }

    // Key Concepts explicitly provided
    if (Array.isArray(keyConcepts)) {
      keyConcepts.forEach((concept) => {
        addEntity(concept, "concept");
        const parent = topic || title;
        if (parent) addRel(parent, "includes", concept);
      });
    }

    // High confidence concept cues from questions or notes
    if (questions) {
      const qLines = questions.split(/\r?\n/).filter((l) => l.trim().length > 0);
      qLines.forEach((q) => {
        const cleaned = q.replace(/^[-*•\d.]\s*/, "").replace(/[?.,;:]+$/, "").trim();
        // Extract terms like "What are X?" or "How does X work?"
        const match = cleaned.match(/(?:major regions of|functions of|difference between|how does|what is|what are)\s+([^?]+)/i);
        if (match && match[1]) {
          const cue = match[1].trim();
          if (cue.length > 2 && cue.length < 40) {
            addEntity(cue, "concept");
            if (topic) addRel(topic, "explores", cue);
          }
        }
      });
    }

    // Parse bullet headers in main notes: e.g. "Cerebrum: controls...", "Cerebrum - ..."
    if (mainNotes) {
      const lines = mainNotes.split(/\r?\n/);
      lines.forEach((line) => {
        const headerMatch = line.match(/^[-*•]?\s*([A-Za-z0-9\s_-]{2,30})\s*[:–—]/);
        if (headerMatch && headerMatch[1]) {
          const concept = headerMatch[1].trim();
          if (!/^(note|summary|example|step|tip|date|class|topic)$/i.test(concept)) {
            addEntity(concept, "concept");
            const parent = topic || title;
            if (parent) addRel(parent, "defines", concept);
          }
        }
      });
    }
  }

  // 3. Personal Note Extraction
  if (sticky.stickyType === "personal" && sticky.personal) {
    const { category, people, links } = sticky.personal;

    if (category) {
      addEntity(category, "category");
      if (title) addRel(title, "categorized_as", category);
    }

    if (Array.isArray(people)) {
      people.forEach((p) => {
        addEntity(p, "person");
        if (title) addRel(title, "mentions", p);
      });
    }

    if (Array.isArray(links)) {
      links.forEach((link) => {
        try {
          const u = new URL(link);
          const domain = u.hostname.replace(/^www\./, "");
          addEntity(domain, "source");
          if (title) addRel(title, "links_to", domain);
        } catch {
          // invalid url ignored
        }
      });
    }
  }

  // 4. Web Clipping Extraction
  if (sticky.stickyType === "web" && sticky.web) {
    const { website, url, author } = sticky.web;

    let siteName = website?.trim();
    if (!siteName && url) {
      try {
        const u = new URL(url);
        siteName = u.hostname.replace(/^www\./, "");
      } catch {
        // ignore
      }
    }

    if (siteName) {
      addEntity(siteName, "source");
      if (title) addRel(title, "sourced_from", siteName);
    }

    if (author) {
      addEntity(author, "person");
      if (title) addRel(title, "authored_by", author);
    }
  }

  return {
    entities: Array.from(entityMap.values()),
    relationships,
  };
}

/**
 * Builds a comprehensive search index string from any pin (text, photo, or sticky note)
 */
export function buildSearchIndex(pin: Pin): string {
  const parts: string[] = [];

  if (pin.content) parts.push(pin.content);

  if (pin.sticky) {
    const { title, tags, entities, relationships, study, personal, web } = pin.sticky;
    if (title) parts.push(title);
    if (tags) parts.push(tags.join(" "));

    if (entities) {
      parts.push(entities.map((e) => e.name).join(" "));
    }

    if (relationships) {
      parts.push(
        relationships
          .map((r) => `${r.source} ${r.predicate} ${r.target}`)
          .join(" "),
      );
    }

    if (study) {
      if (study.class) parts.push(study.class);
      if (study.topic) parts.push(study.topic);
      if (study.questions) parts.push(study.questions);
      if (study.mainNotes) parts.push(study.mainNotes);
      if (study.summary) parts.push(study.summary);
      if (study.keyConcepts) parts.push(study.keyConcepts.join(" "));
    }

    if (personal) {
      if (personal.category) parts.push(personal.category);
      if (personal.shortNote) parts.push(personal.shortNote);
      if (personal.people) parts.push(personal.people.join(" "));
    }

    if (web) {
      if (web.website) parts.push(web.website);
      if (web.author) parts.push(web.author);
      if (web.url) parts.push(web.url);
      if (web.excerpt) parts.push(web.excerpt);
      if (web.annotation) parts.push(web.annotation);
    }
  }

  return parts.join(" ").toLowerCase();
}
