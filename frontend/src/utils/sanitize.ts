// ============================================================
// sanitize.ts — Data Cleaning & Formatting Utilities
// Course Recommendation System — Frontend Only
// ============================================================

const CURRENCY_SYMBOL = "₹";

// Returns null if value is unknown/null/empty/undefined
export function cleanString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = value.toString().trim();
  if (["unknown", "null", "undefined", "none", "nan", "n/a", ""].includes(s.toLowerCase())) return null;
  return s;
}

// Title Case + remove consecutive duplicate words
export function toTitleCase(str: unknown): string | null {
  const clean = cleanString(str);
  if (!clean) return null;
  const cased = clean.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return cased.replace(/\b(\w+)\s+\1\b/gi, "$1").trim();
}

// Normalise inconsistent level strings
export function normaliseLevel(level: unknown): string | null {
  const c = cleanString(level);
  if (!c) return null;
  const l = c.toLowerCase();
  if (l.includes("beginner")) return "Beginner";
  if (l.includes("intermediate")) return "Intermediate";
  if (l.includes("expert") || l.includes("advanced")) return "Advanced";
  if (l.includes("all") || l.includes("mixed")) return "All Levels";
  return null;
}

// Format student count — 0 or missing → null
export function formatStudents(count: unknown): string | null {
  const n = parseFloat(count as string);
  if (!n || n <= 0 || isNaN(n) || Math.abs(n - 911.5) < 0.1) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
}

// Format price — 0 → "Free", positive number → ₹value, missing/NaN → null
// NOTE: Called only after hydration (client-side). Uses CURRENCY_SYMBOL constant, not locale APIs.
export function formatPrice(price: unknown): string | null {
  if (price === null || price === undefined) return null;
  const s = String(price).trim();
  if (["unknown", "null", "undefined", "none", "nan", "n/a", ""].includes(s.toLowerCase())) return null;
  const p = parseFloat(s);
  if (isNaN(p)) return null;
  if (p <= 0) return "Free";
  return `${CURRENCY_SYMBOL}${p.toLocaleString("en-IN")}`;
}

// Format duration — 0 → null
export function formatDuration(hours: unknown): string | null {
  const h = parseFloat(hours as string);
  if (!h || h <= 0 || isNaN(h) || Math.abs(h - 2.0) < 0.1) return null;
  return `${h % 1 === 0 ? h : h.toFixed(1)} hrs`;
}

// Generate a clean, structured description from course fields
export function generateDescription(course: {
  title?: unknown;
  subject?: unknown;
  level?: unknown;
  rating?: unknown;
  duration?: unknown;
  students?: unknown;
  features?: unknown;
}): string {
  const feats = cleanString(course.features);
  if (feats && feats.length > 20) {
    return feats;
  }
  
  const level = normaliseLevel(course.level) || "comprehensive";
  const subject = toTitleCase(course.subject) || "this field";
  
  const raw_r = parseFloat(course.rating as string);
  const rating = !isNaN(raw_r) && raw_r >= 3 && raw_r <= 5 ? raw_r : null;
  
  const duration = formatDuration(course.duration);
  const students = formatStudents(course.students);

  let desc = `This ${level.toLowerCase()} course on ${subject}`;
  if (rating && duration) {
    desc += ` is rated ${rating.toFixed(1)}/5 and spans ${duration}.`;
  } else if (rating) {
    desc += ` is highly rated at ${rating.toFixed(1)}/5.0.`;
  } else if (duration) {
    desc += ` spans ${duration} of material.`;
  } else {
    desc += ` offers an in-depth learning experience.`;
  }

  if (students) {
    desc += ` It is currently trusted by ${students}+ learners.`;
  }
  
  return desc;
}

// Returns array of "full" | "half" | "empty" for star rendering
export function getRatingStars(rating: unknown): ("full" | "half" | "empty")[] {
  const r = parseFloat(rating as string);
  if (!r || isNaN(r)) return [];
  const stars: ("full" | "half" | "empty")[] = [];
  for (let i = 1; i <= 5; i++) {
    if (r >= i) stars.push("full");
    else if (r >= i - 0.5) stars.push("half");
    else stars.push("empty");
  }
  return stars;
}

// Match score → label + tailwind color class name
export function getMatchLabel(score: number): { label: string; color: "green" | "blue" | "gray" } {
  if (score >= 90) return { label: "Excellent Match", color: "green" };
  if (score >= 75) return { label: "Good Match", color: "blue" };
  return { label: "Relevant", color: "gray" };
}

// Subject → deterministic Tailwind color class (no hydration mismatch)
export function getSubjectColor(subject: unknown): string {
  const s = cleanString(subject)?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    "web development": "blue",
    "business finance": "green",
    "graphic design": "purple",
    "musical instruments": "orange",
    "it & software": "cyan",
    "office productivity": "yellow",
    "personal development": "pink",
    "health & fitness": "red",
    "teaching & academics": "teal",
    "marketing": "amber",
    "photography": "violet",
    "design": "fuchsia",
    "finance": "emerald",
    "data science": "sky",
    "music": "rose",
  };
  for (const key in map) {
    if (s.includes(key)) return map[key];
  }
  return "slate";
}

// Map color name to Tailwind badge class strings
export function subjectBadgeClass(color: string): string {
  const classes: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    green: "bg-teal-500/10 text-teal-300 border-teal-500/20",
    purple: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    orange: "bg-orange-500/10 text-orange-300 border-orange-500/20",
    cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    yellow: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    pink: "bg-pink-500/10 text-pink-300 border-pink-500/20",
    red: "bg-red-500/10 text-red-300 border-red-500/20",
    teal: "bg-teal-500/10 text-teal-300 border-teal-500/20",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    violet: "bg-violet-500/10 text-violet-300 border-violet-500/20",
    fuchsia: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20",
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    sky: "bg-sky-500/10 text-sky-300 border-sky-500/20",
    rose: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    slate: "bg-slate-700/30 text-slate-400 border-slate-600/30",
  };
  return classes[color] ?? classes.slate;
}

export function levelBadgeClass(level: string | null): string {
  if (!level) return "bg-slate-700/30 text-slate-400 border-slate-600/40";
  const l = level.toLowerCase();
  if (l === "beginner") return "bg-teal-500/10 text-teal-300 border-teal-500/20";
  if (l === "intermediate") return "bg-amber-500/10 text-amber-300 border-amber-500/20";
  if (l === "advanced") return "bg-rose-500/10 text-rose-300 border-rose-500/20";
  return "bg-blue-500/10 text-blue-300 border-blue-500/20"; // All Levels
}

export function matchScoreBadgeClass(color: "green" | "blue" | "gray"): string {
  const map = {
    green: "bg-teal-500/10 text-teal-300 border-teal-500/20",
    blue: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    gray: "bg-slate-700/30 text-slate-400 border-slate-600/40",
  };
  return map[color];
}

export function matchScoreRingClass(score: number): string {
  if (score >= 90) return "text-teal-400/80";
  if (score >= 75) return "text-indigo-400/80";
  return "text-blue-400/80";
}
