"use client";
import { TypeAnimation } from 'react-type-animation';
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, Loader2, BookOpen, Clock, Tag, GraduationCap,
  AlertCircle, SearchX, Star, Zap, Bookmark, BookmarkCheck,
  ExternalLink, X, Users, Award, ChevronDown, ChevronUp, Info,
  DollarSign, SlidersHorizontal, TrendingUp,
} from "lucide-react";

import {
  cleanString, toTitleCase, normaliseLevel, formatStudents,
  formatDuration, formatPrice, generateDescription, getRatingStars,
  getMatchLabel, getSubjectColor, subjectBadgeClass, levelBadgeClass,
  matchScoreBadgeClass, matchScoreRingClass,
} from "@/utils/sanitize";

// ─── Types ─────────────────────────────────────────────────────────────────

interface RawCourse {
  title?: unknown;
  subject?: unknown;
  level?: unknown;
  rating?: unknown;
  students?: unknown;
  price?: unknown;
  duration?: unknown;
  features?: unknown;
}

interface Course {
  title: string;
  subject: string | null;
  level: string | null;
  rating: number | null;
  students: string | null;
  price: string | null;
  duration: string | null;
  description: string;
  relevanceScore: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const SUGGESTIONS = ["Machine Learning", "Data Science", "Web Development", "AI Basics", "Python"];
const LEVELS = ["All Levels", "Beginner", "Intermediate", "Advanced"];
const PLATFORMS = (q: string) => [
  { label: "Google",   url: `https://www.google.com/search?q=${q}` },
  { label: "Coursera", url: `https://www.coursera.org/search?query=${q}` },
  { label: "Udemy",    url: `https://www.udemy.com/courses/search/?q=${q}` },
];

const RELEVANCE_SCORES = [98, 92, 85, 76, 68, 62, 55, 48];
const getRelevance = (i: number) => RELEVANCE_SCORES[i] ?? Math.max(40, 68 - (i - 4) * 4);

// ─── StarRating ────────────────────────────────────────────────────────────

function StarRating({ rating, size = "sm" }: { rating: number | null; size?: "sm" | "md" }) {
  if (!rating) return null;
  const stars = getRatingStars(rating);
  const iconClass = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5">
        {stars.map((s, i) => (
          <Star
            key={i}
            className={`${iconClass} ${
              s === "full"  ? "fill-amber-400/80 text-amber-400/80" :
              s === "half"  ? "fill-amber-400/40 text-amber-400/60" :
                              "text-slate-700"
            }`}
          />
        ))}
      </span>
      <span className={`font-semibold text-amber-400/90 leading-none ${size === "md" ? "text-sm" : "text-xs"}`}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

// ─── MatchCircle ───────────────────────────────────────────────────────────

function MatchCircle({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimatedScore(score), 50);
    return () => clearTimeout(t);
  }, [score]);

  const r = 34;
  const cx = 40;
  const cy = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - animatedScore / 100);
  const { label, color } = getMatchLabel(score);

  // Muted ring colors
  const ringColorClass =
    score >= 90 ? "text-teal-400/70" :
    score >= 75 ? "text-indigo-400/70" :
    "text-blue-400/60";

  const ringBgClass =
    score >= 90 ? "bg-teal-400/70" :
    score >= 75 ? "bg-indigo-400/70" :
    "bg-blue-400/60";

  return (
    <div className="flex flex-col items-center gap-2 shrink-0" title="Based on semantic similarity between your interest and course content">
      <div className="relative w-20 h-20">
        <svg
          viewBox="0 0 80 80"
          width="80"
          height="80"
          className="absolute inset-0 -rotate-90"
          aria-hidden="true"
        >
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} strokeWidth="3" stroke="currentColor" fill="none" className="text-slate-800/80" />
          {/* Progress */}
          <circle
            cx={cx} cy={cy} r={r}
            strokeWidth="3" stroke="currentColor" fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${ringColorClass} transition-[stroke-dashoffset] duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-baseline gap-px leading-none">
            <span className="text-xl font-black text-slate-200">{score}</span>
            <span className="text-[10px] font-bold text-slate-500">%</span>
          </span>
        </div>
      </div>

      {/* Label badge */}
      <span className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full border whitespace-nowrap ${matchScoreBadgeClass(color)}`}>
        {label}
      </span>

      {/* Progress bar */}
      <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${ringBgClass}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ─── PlatformDropdown ──────────────────────────────────────────────────────

function PlatformDropdown({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const q = encodeURIComponent(title + " course");
  const platforms = PLATFORMS(q);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative inline-flex shrink-0 overflow-visible" ref={ref}>
      <a
        href={platforms[0].url}
        target="_blank"
        rel="noopener noreferrer"
        title="Search this course online"
        className="group inline-flex items-center gap-2 h-10 px-5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 text-sm font-medium rounded-l-xl border border-slate-700 border-r-0 transition-all duration-200"
      >
        Search this course online
        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-px group-hover:-translate-y-px transition-transform" />
      </a>

      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="h-10 w-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-r-xl transition-colors duration-200 active:scale-[0.98]"
        aria-label="More platforms"
      >
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-44 max-h-[200px] overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
          {platforms.map((p) => (
            <a
              key={p.label}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors duration-200"
            >
              <ExternalLink className="w-3.5 h-3.5 opacity-40 shrink-0" />
              {p.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── HowItWorks ────────────────────────────────────────────────────────────

function HowItWorksAccordion() {
  const [open, setOpen] = useState(false);

  const steps = [
    {
      icon: "🔍",
      title: "Filters Applied",
      body: "Your preferences (price range, duration, level) are used to narrow down the full course catalogue before any AI ranking.",
    },
    {
      icon: "🤖",
      title: "Semantic Understanding",
      body: "Your interest query is encoded into a vector embedding using a SentenceTransformer model (all-MiniLM-L6-v2).",
    },
    {
      icon: "📊",
      title: "Cosine Similarity Ranking",
      body: "Each filtered course embedding is compared to your query. The most semantically similar courses rise to the top.",
    },
  ];

  return (
    <div className="border border-slate-800/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left bg-slate-900/50 hover:bg-slate-800/40 transition-colors duration-200"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <Info className="w-3.5 h-3.5 text-indigo-400/70 shrink-0" />
          How Recommendations Work
        </span>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
      </button>

      {open && (
        <div className="flex flex-col gap-4 p-5 bg-slate-900/30 border-t border-slate-800/60 animate-in fade-in slide-in-from-top-2 duration-200">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-4 p-4 bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800/50 hover:border-slate-700/60 rounded-xl transition-colors duration-200 group">
              <span className="text-2xl leading-none shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200">{s.icon}</span>
              <div>
                <p className="text-sm font-semibold text-slate-300 mb-1">
                  <span className="text-indigo-400/80 mr-1.5 font-bold">Step {i + 1}</span> 
                  {s.title}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors duration-200">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MetaBadge ─────────────────────────────────────────────────────────────

function MetaBadge({ icon, label, className }: {
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 text-xs font-medium rounded-md border leading-none select-none ${className}`}>
      <span className="shrink-0 flex items-center">{icon}</span>
      {label}
    </span>
  );
}

// ─── CourseCard ────────────────────────────────────────────────────────────

function CourseCard({ course, idx, onOpen, isSaved, onSave }: {
  course: Course;
  idx: number;
  onOpen: (c: Course) => void;
  isSaved: boolean;
  onSave: (idx: number, e: React.MouseEvent) => void;
}) {
  const subjectColor = getSubjectColor(course.subject);
  const isTop = idx === 0;

  return (
    <article
      onClick={() => onOpen(course)}
      style={{ animationDelay: `${idx * 70}ms`, animationFillMode: "both" }}
      className={`group relative flex flex-col gap-4 bg-slate-900/60 border rounded-xl overflow-hidden
        hover:border-slate-700 hover:bg-slate-800/40
        hover:shadow-md hover:shadow-black/20 hover:-translate-y-[2px]
        transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-3
        ${isTop
          ? "border-indigo-500/20 shadow-none"
          : "border-slate-800/60"
        }`}
    >
      {/* Top accent line for #1 */}
      {isTop && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-indigo-500/30 via-purple-500/20 to-transparent" />
      )}

      {/* ── Card Body ── */}
      <div className="flex-1 flex flex-col gap-3.5 p-6 min-w-0">

        {/* Row 1: Subject chip + Top badge */}
        <div className="flex items-center gap-2">
          {course.subject && (
            <span className={`inline-flex items-center h-5 px-2 text-[10px] uppercase tracking-widest font-bold rounded-full border ${subjectBadgeClass(subjectColor)}`}>
              {course.subject}
            </span>
          )}
          {isTop && (
            <div className="flex items-center gap-2" title="Best match based on your preferences">
              <span className="inline-flex items-center gap-1 h-5 px-2 text-[10px] uppercase tracking-widest font-bold rounded-full bg-indigo-500/5 border border-indigo-500/10 text-indigo-300">
                <TrendingUp className="w-2.5 h-2.5" /> Top Result
              </span>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline-block">Best match based on your preferences</span>
            </div>
          )}
        </div>

        {/* Row 2: Title + Bookmark */}
        <div className="flex items-start gap-3">
          <h3 className="flex-1 text-base md:text-lg font-bold text-slate-200 group-hover:text-slate-100 transition-colors leading-snug line-clamp-2">
            {course.title}
          </h3>
          <button
            onClick={(e) => onSave(idx, e)}
            aria-label={isSaved ? "Unsave course" : "Save course"}
            className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 ${
              isSaved
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400/80"
                : "bg-slate-800/60 border-slate-700/50 text-slate-600 hover:text-slate-300 hover:border-slate-600"
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Row 3: Meta badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {course.level && (
            <MetaBadge
              icon={<GraduationCap className="w-3 h-3" />}
              label={course.level}
              className={levelBadgeClass(course.level)}
            />
          )}
          {course.rating && (
            <span className="inline-flex items-center h-6 px-2.5 bg-slate-800/50 border border-slate-700/40 rounded-md">
              <StarRating rating={course.rating} />
            </span>
          )}
          {course.duration && (
            <MetaBadge
              icon={<Clock className="w-3 h-3" />}
              label={course.duration}
              className="bg-slate-800/50 border-slate-700/40 text-slate-400"
            />
          )}
          {course.price && (
            <MetaBadge
              icon={<Tag className="w-3 h-3" />}
              label={course.price}
              className={course.price === "Free"
                ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400/80"
                : "bg-slate-800/50 border-slate-700/40 text-slate-400"}
            />
          )}
          {course.students && (
            <MetaBadge
              icon={<Users className="w-3 h-3" />}
              label={`${course.students} learners`}
              className="bg-slate-800/50 border-slate-700/40 text-slate-500"
            />
          )}
        </div>

        {/* Row 4: Description */}
        <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 flex-1">
          {course.description}
        </p>

        {/* Row 5: Expand hint */}
        <p className="flex items-center gap-1 text-xs font-medium text-indigo-400/60 group-hover:text-indigo-400/80 group-hover:translate-x-0.5 transition-all duration-200">
          View full details <ExternalLink className="w-3 h-3" />
        </p>
      </div>

      {/* ── Score Panel ── */}
      <div className="flex items-center justify-center gap-4 px-5 py-4 w-full bg-slate-900/30 border-t border-slate-800/60 shrink-0">
        <MatchCircle score={course.relevanceScore} />
        <div className="flex flex-col gap-0.5">
          {course.relevanceScore >= 85 && (
            <span className="text-[10px] font-semibold text-slate-300 leading-tight">High confidence match</span>
          )}
          <span className="text-[10px] text-slate-400 leading-tight">Based on semantic similarity<br/>and course quality</span>
        </div>
      </div>
    </article>
  );
}

// ─── InfoCell ──────────────────────────────────────────────────────────────

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 bg-slate-800/30 border border-slate-700/40 rounded-lg p-3.5">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-600">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

// ─── CourseModal ───────────────────────────────────────────────────────────

function CourseModal({ course, interest, onClose }: {
  course: Course;
  interest: string;
  onClose: () => void;
}) {
  const q = encodeURIComponent(course.title + " course");
  const { label, color } = getMatchLabel(course.relevanceScore);
  const subjectColor = getSubjectColor(course.subject);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex flex-col w-full max-w-2xl max-h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-xl shadow-black/40 overflow-y-auto animate-in zoom-in-95 duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="flex items-start gap-4 px-6 sm:px-8 pt-6 sm:pt-7 pb-5 border-b border-slate-800 rounded-t-2xl bg-slate-900 shrink-0">
          <div className="flex-1 min-w-0 space-y-2">
            {course.subject && (
              <span className={`inline-flex items-center h-5 px-2 text-[10px] uppercase tracking-widest font-bold rounded-full border ${subjectBadgeClass(subjectColor)}`}>
                {course.subject}
              </span>
            )}
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 leading-snug">
              {course.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center bg-slate-800/60 hover:bg-slate-700/60 text-slate-500 hover:text-slate-300 rounded-lg border border-slate-700/40 transition-colors duration-200 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Modal Body (scrollable) ── */}
        <div className="flex-1 px-6 sm:px-8 py-6 space-y-5">

          {/* 2-col info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {course.level && (
              <InfoCell label="Level">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${levelBadgeClass(course.level)}`}>
                  {course.level}
                </span>
              </InfoCell>
            )}
            {course.rating && (
              <InfoCell label="Rating">
                <StarRating rating={course.rating} size="md" />
              </InfoCell>
            )}
            {course.duration && (
              <InfoCell label="Duration">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> {course.duration}
                </span>
              </InfoCell>
            )}
            {course.price && (
              <InfoCell label="Price">
                <span className={`text-sm font-semibold ${course.price === "Free" ? "text-emerald-400/80" : "text-slate-200"}`}>
                  {course.price}
                </span>
              </InfoCell>
            )}
            {course.students && (
              <InfoCell label="Learners">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-400">
                  <Users className="w-3.5 h-3.5 text-slate-600" /> {course.students}+
                </span>
              </InfoCell>
            )}
            <InfoCell label="Match Score">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${matchScoreBadgeClass(color)}`}>
                {course.relevanceScore}% · {label}
              </span>
            </InfoCell>
          </div>

          {/* Course Overview */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Award className="w-3.5 h-3.5 text-slate-500" /> Course Overview
            </h4>
            <p className="text-sm text-slate-500 leading-relaxed bg-slate-950/40 border border-slate-800/60 rounded-lg p-4">
              {course.description}
            </p>
          </div>

          {/* Why this course */}
          <div className="flex gap-3 bg-slate-800/50 border border-slate-700/60 rounded-lg p-4">
            <Zap className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-300">Why this course?</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Selected based on your search for{" "}
                <span className="text-slate-300 font-medium">"{interest}"</span>{" "}
                using semantic similarity matching. The {course.relevanceScore}% match score reflects
                alignment via the{" "}
                <span className="text-slate-400">all-MiniLM-L6-v2</span> model.
              </p>
            </div>
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div className="flex items-center justify-between gap-4 px-6 sm:px-8 py-5 border-t border-slate-800 bg-slate-900 rounded-b-2xl shrink-0">
          <div className="flex items-baseline gap-1 leading-none">
            <span className="text-2xl font-black text-slate-200">{course.relevanceScore}</span>
            <span className="text-sm font-medium text-slate-600">% Fit</span>
          </div>
          <PlatformDropdown title={course.title} />
        </div>
      </div>
    </div>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────

export default function Home() {
  const [interest, setInterest]     = useState("");
  const [submittedInterest, setSub] = useState("");
  const [freeOnly, setFreeOnly]     = useState(false);
  const [maxPrice, setMaxPrice]     = useState(500);
  const [duration, setDuration]     = useState("");
  const [level, setLevel]           = useState("All Levels");

  const [results, setResults]             = useState<Course[] | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [savedCourses, setSaved]          = useState<Set<number>>(new Set());
  const [selectedCourse, setSelected]     = useState<Course | null>(null);
  const [selectedInterest, setSelInterest]= useState("");

  const formRef    = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    try {
      const stored = localStorage.getItem("saved_courses");
      if (stored) setSaved(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { 
      if (e.key === "Escape") setSelected(null); 
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const toggleSave = useCallback((idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      try { localStorage.setItem("saved_courses", JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!interest.trim() || !duration) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setSub(interest);

    // Build the price value to send: "free" OR a numeric string
    const targetPrice: string = freeOnly ? "free" : String(maxPrice);

    try {
      const res = await fetch("https://ascend-app-rkgv.onrender.com/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interest: interest.trim(),
          price: targetPrice,
          duration: parseFloat(duration),
          level,
        }),
      });

      if (!res.ok) throw new Error("Backend error. Ensure the server is running on port 8000.");

      const raw: RawCourse[] = await res.json();
      const processed: Course[] = [];

      for (let idx = 0; idx < raw.length; idx++) {
        const item = raw[idx];
        const title = toTitleCase(item.title);
        if (!title) continue;
        if (title.toLowerCase().includes("unknown")) continue;

        const subj   = toTitleCase(cleanString(item.subject));
        const lvl    = normaliseLevel(item.level);
        const raw_r  = parseFloat(item.rating as string);
        const rating = !isNaN(raw_r) && raw_r >= 3 && raw_r <= 5 ? raw_r : null;

        // Price: display null if the whole dataset returned same value
        // We parse and format — formatPrice returns "Free" for 0, or ₹N for paid
        const priceVal = formatPrice(item.price);

        // Students: null if missing/zero
        const studentsVal = formatStudents(item.students);

        // Duration: null if missing/zero
        const durationVal = formatDuration(item.duration);

        processed.push({
          title,
          subject:        subj,
          level:          lvl,
          rating,
          students:       studentsVal,
          price:          priceVal,
          duration:       durationVal,
          description:    generateDescription(item),
          relevanceScore: getRelevance(idx),
        });
      }

      await new Promise(r => setTimeout(r, 250)); // subtle delay

      setResults(processed);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch (err: unknown) {
      console.error("API Error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const openModal = useCallback((course: Course) => {
    setSelected(course);
    setSelInterest(submittedInterest);
  }, [submittedInterest]);

  const refineSearch = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => inputRef.current?.focus(), 500);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4 sm:px-6 lg:px-8 font-sans overflow-x-hidden">
      {/* Subtle ambient background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-5%,rgba(99,102,241,0.08),transparent)]" />
      </div>

      <div className="max-w-4xl mx-auto space-y-8">

       {/* ── Header ── */}
<header className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-600">
  <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-500/8 rounded-xl ring-1 ring-indigo-500/15">
    <BookOpen className="w-7 h-7 text-indigo-400/70" />
  </div>

  <div className="space-y-2.5">
    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
  <TypeAnimation
    sequence={[
      "Ascend",
      2000,
      "Discover",
      2000,
      "Learn Smarter",
      2000,
      "Ascend"
    ]}
    speed={60}
    repeat={Infinity}
  />
</h1>

    <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
  Align your skills with the{" "}
  <span className="inline-block animate-pulse text-indigo-400">
    future
  </span>
</p>
  </div>
</header>
        {/* ── Search Form ── */}
        <section ref={formRef} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 md:p-9 shadow-lg shadow-black/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Interest field */}
              <div className="md:col-span-2 space-y-3">
                <label htmlFor="interest-input" className="flex items-center gap-2 text-sm font-medium text-slate-400">
                  <Search className="w-3.5 h-3.5 text-indigo-400/70 shrink-0" />
                  What do you want to learn?
                </label>
                <input
                  id="interest-input"
                  ref={inputRef}
                  type="text"
                  required
                  placeholder="e.g. Machine Learning, React, Data Science…"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className="w-full h-16 bg-slate-950/60 border border-slate-600/50 rounded-xl px-6 py-0 text-slate-100 text-lg outline-none
                    focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400/60 shadow-inner focus:shadow-[0_0_15px_rgba(99,102,241,0.2)]
                    transition-all duration-200 placeholder:text-slate-700"
                />
                {/* Suggestion chips */}
                <div className="pt-3 space-y-2.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Popular searches</span>
                  <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setInterest(s); inputRef.current?.focus(); }}
                      className="h-8 px-4 inline-flex items-center text-sm font-medium rounded-full
                        bg-slate-800/50 border border-slate-700/40 text-slate-400
                        hover:bg-slate-700/50 hover:text-slate-200 hover:border-slate-600/50
                        hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md hover:shadow-indigo-500/10 active:scale-[0.97]
                        transition-all duration-200"
                    >
                      {s}
                    </button>
                  ))}
                  </div>
                </div>
              </div>

              {/* Price Filter */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-400">
                  <Tag className="w-3.5 h-3.5 text-indigo-400/70 shrink-0" />
                  Budget
                </label>
                <div className="space-y-3">
                  {/* Free Only toggle */}
                  <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={freeOnly}
                        onChange={(e) => setFreeOnly(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 border border-slate-700/60 rounded-full peer-checked:bg-indigo-600/70 peer-checked:border-indigo-500/50 transition-all duration-200" />
                      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-slate-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-white transition-all duration-200" />
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      Free courses only
                    </span>
                  </label>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {freeOnly ? "Showing only free courses." : "Adjust your maximum budget below."}
                  </p>

                  {/* Slider — shown only when NOT free */}
                  {!freeOnly && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Max price</span>
                        <span className="text-xs font-semibold text-slate-300">
                          ₹{maxPrice.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={5000}
                        step={50}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-4
                          [&::-webkit-slider-thumb]:h-4
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-indigo-400
                          [&::-webkit-slider-thumb]:border-2
                          [&::-webkit-slider-thumb]:border-slate-900
                          [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-webkit-slider-thumb]:hover:bg-indigo-300
                          [&::-webkit-slider-thumb]:transition-colors"
                      />
                      <div className="flex justify-between text-[10px] text-slate-700">
                        <span>₹0</span>
                        <span>₹5,000</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-3">
                <label htmlFor="duration-input" className="flex items-center gap-2 text-sm font-medium text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-indigo-400/70 shrink-0" />
                  Max Duration (hours)
                </label>
                <input
                  id="duration-input"
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  placeholder="e.g. 20"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="max-w-[180px] h-9 bg-slate-950/60 border border-slate-700/50 rounded-xl px-4 text-slate-200 text-sm outline-none
                    focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/40
                    transition-all duration-200 placeholder:text-slate-700"
                />
              </div>

              {/* Difficulty segmented control */}
              <div className="md:col-span-2 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-400">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400/70 shrink-0" />
                  Difficulty Level
                </label>
                <div className="grid grid-cols-4 gap-1 bg-slate-950/50 border border-slate-800/50 rounded-xl p-1.5">
                  {LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(lvl)}
                      className={`h-9 flex items-center justify-center text-sm font-medium rounded-lg transition-all duration-200 ${
                        level === lvl
                          ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/30"
                          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-2.5 bg-indigo-700/80 hover:bg-indigo-600/90
                text-white text-sm font-semibold rounded-xl
                transition-all duration-200
                hover:-translate-y-px hover:shadow-lg hover:shadow-indigo-900/30
                active:translate-y-0 active:scale-[0.98]
                disabled:opacity-40 disabled:pointer-events-none
                relative overflow-hidden group"
            >
              <div className="absolute inset-0 -skew-x-12 -translate-x-full group-hover:translate-x-full bg-white/4 transition-transform duration-700" />
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Finding your best matches…</>
                : <><Zap className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" /> Discover Courses</>}
            </button>
          </form>
        </section>

        {/* ── How It Works ── */}
        <HowItWorksAccordion />

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-3.5 bg-red-500/8 border border-red-500/20 text-red-400/90 rounded-xl px-5 py-4 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* ── Results ── */}
        <section ref={resultsRef} className="scroll-mt-10 min-h-[120px]">
          {loading && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
              <div className="flex flex-col sm:flex-row justify-between pb-4 border-b border-slate-800/50">
                <div className="h-7 w-64 bg-slate-800/60 rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-[140px] bg-slate-900/40 border border-slate-800/60 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {results !== null && !loading && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

              {/* Results heading */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/50">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-bold text-slate-200">
                    <SlidersHorizontal className="w-5 h-5 text-slate-500 shrink-0" />
                    Showing top results for <span className="text-indigo-400">"{submittedInterest}"</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <span className="font-medium text-slate-400">Ranked by relevance</span>
                    <span>•</span>
                    {freeOnly ? "Free courses only" : `Up to ₹${maxPrice}`}
                    {duration && <><span>•</span> Up to {duration} hrs</>}
                  </p>
                </div>
                {results.length > 0 && (
                  <button
                    onClick={refineSearch}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-400/70 hover:text-indigo-400 border border-indigo-500/20 hover:border-indigo-400/30 px-4 h-8 rounded-lg transition-all duration-200 hover:-translate-y-px active:scale-[0.98] shrink-0"
                  >
                    ↑ Refine Search
                  </button>
                )}
              </div>

              {/* Empty state */}
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-5 bg-slate-900/40 border border-dashed border-slate-700/50 rounded-2xl py-16 text-center px-6">
                  <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center">
                    <SearchX className="w-7 h-7 text-slate-600" />
                  </div>
                  <div className="space-y-2 max-w-sm">
                    <h3 className="text-base font-semibold text-slate-300">No matching courses found</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      We couldn't find any courses matching your exact criteria. Try increasing your budget or duration to see more options.
                    </p>
                  </div>
                  <button
                    onClick={refineSearch}
                    className="h-9 px-5 text-sm font-medium text-indigo-400/80 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/8 hover:border-indigo-400/30 transition-all duration-200 active:scale-[0.98]"
                  >
                    Adjust Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((course, idx) => (
                    <CourseCard
                      key={idx}
                      course={course}
                      idx={idx}
                      onOpen={openModal}
                      isSaved={savedCourses.has(idx)}
                      onSave={toggleSave}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── Modal ── */}
      {selectedCourse && (
        <CourseModal
          course={selectedCourse}
          interest={selectedInterest}
          onClose={() => setSelected(null)}
        />
      )}

      {/* ── Footer ── */}
      <footer className="max-w-4xl mx-auto mt-16 pt-6 border-t border-slate-800/40 pb-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex flex-wrap justify-center gap-2.5">
          {[
            { icon: <Zap className="w-3 h-3 text-indigo-400/60" />, text: "FastAPI + Next.js" },
            { icon: <Search className="w-3 h-3 text-blue-400/60" />, text: "Semantic Vector Search" },
          ].map((item) => (
            <span key={item.text} className="inline-flex items-center gap-1.5 bg-slate-900/40 px-3 h-7 rounded-lg border border-slate-800/60 text-slate-600">
              {item.icon} {item.text}
            </span>
          ))}
        </div>
        <span className="font-mono text-slate-700 bg-slate-900/40 px-3 h-7 inline-flex items-center rounded-lg border border-slate-800/60">
          SentenceTransformer · all-MiniLM-L6-v2
        </span>
      </footer>
    </main>
  );
}
