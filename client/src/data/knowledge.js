// Knowledge Base — Merges Vehicles + Buildings
import { VEHICLE_ISSUES } from './knowledge-vehicles';
import { BUILDING_ISSUES } from './knowledge-buildings';

export const KNOWLEDGE_BASE = [...VEHICLE_ISSUES, ...BUILDING_ISSUES];

// ============================================================
// SMART AUTO-CLASSIFICATION
// ============================================================
export function classifyIssue(text) {
  if (!text || text.trim().length < 2) return null;

  const q = text.toLowerCase().trim();
  const qWords = q.split(/\s+/).filter(w => w.length > 1);

  let best = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;

    // 1) Keyword matching
    for (const kw of entry.keywords) {
      const k = kw.toLowerCase();
      if (q.includes(k)) {
        score += k.length * 3;
      } else {
        for (const word of qWords) {
          if (k.includes(word) || word.includes(k)) {
            score += 4;
          }
        }
      }
    }

    // 2) Title matching (boost)
    if (q.includes(entry.title.toLowerCase())) score += 80;
    if (entry.titleAr && q.includes(entry.titleAr)) score += 80;
    if (entry.titleUr && q.includes(entry.titleUr)) score += 80;

    // 3) Partial title word matching
    const titleWords = entry.title.toLowerCase().split(/\s+/);
    for (const tw of titleWords) {
      if (tw.length > 3 && q.includes(tw)) score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (!best || bestScore < 8) return null;

  const confidence = Math.min(Math.round((bestScore / 40) * 100), 100);
  return { ...best, confidence };
}

// ============================================================
// SEARCH
// ============================================================
export function searchKnowledge(query) {
  const result = classifyIssue(query);
  if (!result) return [];
  return [result];
}

// ============================================================
// LOCALIZATION
// ============================================================
export function getLocalized(entry, lang) {
  if (!entry) return null;

  if (lang === 'ar') {
    return {
      title: entry.titleAr || entry.title,
      causes: entry.causesAr || entry.causes,
      solutions: entry.solutionsAr || entry.solutions
    };
  }
  if (lang === 'ur') {
    return {
      title: entry.titleUr || entry.title,
      causes: entry.causesUr || entry.causes,
      solutions: entry.solutionsUr || entry.solutions
    };
  }
  return {
    title: entry.title,
    causes: entry.causes,
    solutions: entry.solutions
  };
}

// ============================================================
// STATS
// ============================================================
export const TOTAL_ISSUES = KNOWLEDGE_BASE.length;
export const VEHICLE_COUNT = VEHICLE_ISSUES.length;
export const BUILDING_COUNT = BUILDING_ISSUES.length;