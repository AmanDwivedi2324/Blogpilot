"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const PROMPT_MAX = 5000;
const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';

const SUGGESTIONS = [
  "A beginner's guide to personal budgeting, friendly and practical, for people in their 20s",
  "Why small teams should write down their decisions, for startup founders, conversational tone",
  "How remote workers can build a healthy daily routine, with actionable tips",
  "Explain how vaccines train the immune system, for curious readers with no science background",
];

const GENERATION_STAGES = [
  { after: 0, label: "Researching your topic" },
  { after: 12, label: "Planning the structure" },
  { after: 25, label: "Writing the draft" },
  { after: 60, label: "Polishing the final blog" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function getReadingTime(text = "") {
  const words = text.split(/\s+/).filter(Boolean).length;
  return { words, minutes: Math.max(1, Math.ceil(words / 220)) };
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function extractText(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node.props) return extractText(node.props.children);
  return "";
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Markdown rendering (kept in sync with the My blogs page)            */
/* ------------------------------------------------------------------ */

const markdownComponents = {
  h1: ({ children }) => (
    <h3 className="mb-4 mt-10 font-semibold leading-tight tracking-tight text-[#1c211d]" style={{ fontSize: "1.6em" }}>
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-4 mt-10 border-t border-[#e7e7df] pt-7 font-semibold leading-tight tracking-tight text-[#1c211d]" style={{ fontSize: "1.4em" }}>
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-3 mt-8 font-semibold leading-snug text-[#1c211d]" style={{ fontSize: "1.15em" }}>
      {children}
    </h4>
  ),
  p: ({ children }) => <p className="my-5">{children}</p>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-[#34483a] underline decoration-[#9fb3a5] underline-offset-4 hover:decoration-[#34483a]"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-6 marker:text-[#8a9188]">{children}</ul>,
  ol: ({ children }) => <ol className="my-5 list-decimal space-y-2 pl-6 marker:text-[#8a9188]">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-7 border-l-4 border-[#34483a] bg-[#f3f4ee] py-1 pl-5 pr-4 italic text-[#3d453f]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-[#e7e7df]" />,
  strong: ({ children }) => <strong className="font-semibold text-[#1c211d]">{children}</strong>,
  table: ({ children }) => (
    <div className="my-7 overflow-x-auto rounded-md border border-[#e7e7df]">
      <table className="w-full border-collapse text-left" style={{ fontSize: "0.9em" }}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[#f3f4ee]">{children}</thead>,
  th: ({ children }) => <th className="border-b border-[#e7e7df] px-4 py-2.5 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-[#efefe8] px-4 py-2.5 align-top">{children}</td>,
  pre: ({ children }) => (
    <pre
      className="my-6 overflow-x-auto rounded-md bg-[#1f241f] p-4 text-[#e8eadf]"
      style={{ fontSize: "0.85em", lineHeight: 1.65 }}
    >
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className || "") || String(children).includes("\n");
    if (isBlock) return <code className={`${className || ""} font-mono`}>{children}</code>;
    return (
      <code className="rounded bg-[#eceee6] px-1.5 py-0.5 font-mono text-[#34483a]" style={{ fontSize: "0.88em" }}>
        {children}
      </code>
    );
  },
};

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function Avatar({ user, size = "size-9" }) {
  if (user?.avatar?.url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={user.avatar.url}
        alt=""
        className={`${size} shrink-0 rounded-full border border-[#deded5] object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[#e8ece4] text-xs font-semibold text-[#34483a]`}
    >
      {getInitials(user?.name)}
    </span>
  );
}

function GenerationProgress({ elapsed }) {
  const activeIndex = GENERATION_STAGES.reduce(
    (acc, stage, index) => (elapsed >= stage.after ? index : acc),
    0
  );
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <div role="status" aria-live="polite" className="mt-5 rounded-lg border border-[#deded5] bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Your blog is being developed</p>
        <span className="text-xs tabular-nums text-[#777b73]">
          {minutes}:{seconds}
        </span>
      </div>

      <ol className="mt-4 space-y-3">
        {GENERATION_STAGES.map((stage, index) => {
          const done = index < activeIndex;
          const current = index === activeIndex;
          return (
            <li key={stage.label} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                  done
                    ? "border-[#34483a] bg-[#34483a] text-white"
                    : current
                    ? "border-[#34483a]"
                    : "border-[#d5d6cd]"
                }`}
              >
                {done ? (
                  "✓"
                ) : current ? (
                  <span className="size-2 animate-pulse rounded-full bg-[#34483a]" />
                ) : null}
              </span>
              <span className={done ? "text-[#6b7068]" : current ? "font-medium" : "text-[#92958d]"}>
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-xs leading-5 text-[#777b73]">
        This can take a minute or two. Please keep this tab open. The steps above are a guide to what the
        agent is doing, not exact progress.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [blogs, setBlogs] = useState([]);
  const [generatedBlog, setGeneratedBlog] = useState(null);
  const [showPlan, setShowPlan] = useState(false);
  const [notice, setNotice] = useState("");

  const textareaRef = useRef(null);
  const resultRef = useRef(null);
  const noticeTimer = useRef(null);

  const firstName = (user?.name || "").trim().split(/\s+/)[0];
  const stats = useMemo(() => getReadingTime(generatedBlog?.content), [generatedBlog]);

  /* ---------- data ---------- */

  const loadBlogs = useCallback(async () => {
    try {
      const response = await apiRequest("/api/v1/blogs");
      const result = response?.data;
      const list = Array.isArray(result) ? result : result?.blogs || result?.items || [];

      setBlogs(list);
    } catch (err) {
      setError(err.message || "Unable to load your blogs.");
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    loadBlogs();
  }, [loading, isAuthenticated, router, loadBlogs]);

  /* ---------- generation timer + leave warning ---------- */

  useEffect(() => {
    if (!generating) return;

    setElapsed(0);
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);

    return () => {
      clearInterval(timer);
      window.removeEventListener("beforeunload", warn);
    };
  }, [generating]);

  /* ---------- textarea auto-grow ---------- */

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 420)}px`;
  }, [prompt]);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  /* ---------- actions ---------- */

  const flash = (message) => {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 2200);
  };

  async function handleGenerate(event) {
    event?.preventDefault();

    if (!prompt.trim() || generating) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    setGenerating(true);
    setError("");
    setGeneratedBlog(null);
    setShowPlan(false);

    try {
      const response = await apiRequest("/api/v1/blogs/generate", {
        method: "POST",
        body: { prompt: prompt.trim() },
      });

      // Support either a direct JSON response or a wrapped response.
      const payload = response?.data ?? response;
      const blog = payload?.blog ?? payload;

      if (typeof blog?.content !== "string" || !blog.content.trim()) {
        console.error("Unexpected blog generation response:", response);
        throw new Error(
          "The server responded, but blog content was missing. Check the browser console."
        );
      }

      setGeneratedBlog(blog);
      setPrompt("");
      await loadBlogs();

      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    } catch (err) {
      console.error("Blog generation failed:", err);
      setError(err.message || "Blog generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function handlePromptKeyDown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      handleGenerate(event);
    }
  }

  function useSuggestion(text) {
    setPrompt(text);
    textareaRef.current?.focus();
  }

  async function handleCopy() {
    const ok = await copyToClipboard(`# ${generatedBlog.title || "Untitled blog"}\n\n${generatedBlog.content}`);
    flash(ok ? "Markdown copied" : "Copy failed — your browser blocked clipboard access");
  }

  /* ---------- loading gate ---------- */

  if (loading || !isAuthenticated || pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] text-sm text-[#6b7068]">
        <p role="status">Loading your writing workspace...</p>
      </main>
    );
  }

  const plan = generatedBlog?.plan;
  const hasStructuredPlan = plan && typeof plan === "object" && (plan.sections || plan.audience || plan.tone);

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#242923]">
      <div className="flex min-h-screen">
        {/* ---------- Sidebar ---------- */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#deded5] md:flex">
          <div className="flex h-16 items-center border-b border-[#deded5] px-6">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              BlogPilot
            </Link>
          </div>

          <nav className="flex-1 space-y-1 p-4" aria-label="Main">
            <Link
              href="/"
              aria-current="page"
              className="flex items-center gap-3 rounded-md bg-[#eaece5] px-3 py-2.5 text-sm font-medium"
            >
              <span aria-hidden="true">✎</span>
              Write
            </Link>

            <Link
              href="/blogs"
              className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm text-[#6b7068] hover:bg-[#eeeee8] hover:text-[#242923]"
            >
              <span className="flex items-center gap-3">
                <span aria-hidden="true">▤</span>
                My blogs
              </span>
              {blogs.length > 0 && (
                <span className="rounded-full bg-[#e7e7df] px-2 py-0.5 text-xs text-[#6b7068]">
                  {blogs.length}
                </span>
              )}
            </Link>
          </nav>

          <div className="border-t border-[#deded5] p-4">
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-[#eeeee8]"
            >
              <Avatar user={user} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{user?.name || "Your account"}</span>
                <span className="block text-xs text-[#6b7068]">Profile and settings</span>
              </span>
            </Link>
          </div>
        </aside>

        {/* ---------- Main ---------- */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Top bar (mobile gets navigation here) */}
          <header className="flex min-h-16 items-center justify-between gap-4 border-b border-[#deded5] px-5 py-3 sm:px-8">
            <Link href="/" className="text-lg font-semibold tracking-tight md:hidden">
              BlogPilot
            </Link>
            <span className="hidden text-sm text-[#6b7068] md:inline">Writing workspace</span>

            <nav className="flex items-center gap-4 text-sm" aria-label="Quick links">
              <Link href="/blogs" className="text-[#6b7068] hover:text-[#242923] md:hidden">
                My blogs
              </Link>
              <Link href="/profile" className="md:hidden">
                <Avatar user={user} size="size-8" />
                <span className="sr-only">Profile</span>
              </Link>
              <Link
                href="/profile"
                className="hidden font-medium underline underline-offset-4 hover:text-[#34483a] md:inline"
              >
                Account
              </Link>
            </nav>
          </header>

          <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
            <div className="mb-8 max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {firstName ? `What are we writing today, ${firstName}?` : "What are we writing today?"}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#6b7068]">
                Describe your idea. BlogPilot researches the topic, plans the structure, and writes the
                full blog.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start justify-between gap-3 rounded-md border border-[#e5c9c4] bg-[#f8eeeb] px-4 py-3 text-sm text-[#852f28]"
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="shrink-0 underline underline-offset-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Prompt box */}
            <form
              onSubmit={handleGenerate}
              className="rounded-lg border border-[#deded5] bg-white shadow-sm transition-shadow focus-within:border-[#34483a] focus-within:ring-2 focus-within:ring-[#34483a]/15"
            >
              <label htmlFor="blog-prompt" className="sr-only">
                Describe the blog you want to write
              </label>

              <textarea
                id="blog-prompt"
                ref={textareaRef}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handlePromptKeyDown}
                placeholder="Describe your topic, who it's for, the tone, or the ideas you want to explore..."
                rows={4}
                maxLength={PROMPT_MAX}
                disabled={generating}
                className="block w-full resize-none border-0 bg-transparent px-5 py-5 text-[15px] leading-7 outline-none placeholder:text-[#898d85] focus:ring-0 disabled:opacity-60"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7e7df] px-4 py-3">
                <span
                  className={`text-xs ${prompt.length > PROMPT_MAX * 0.9 ? "text-[#9a6a1f]" : "text-[#777b73]"}`}
                >
                  {prompt.length > 0
                    ? `${prompt.length.toLocaleString()} / ${PROMPT_MAX.toLocaleString()}`
                    : "Tip: mention your audience and tone for better results"}
                </span>

                <div className="flex items-center gap-3">
                  <span className="hidden text-xs text-[#92958d] sm:inline">Ctrl/⌘ + Enter</span>
                  <button
                    type="submit"
                    disabled={!prompt.trim() || generating}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#34483a] px-5 text-sm font-medium text-white transition-colors hover:bg-[#28392d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34483a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {generating && (
                      <span
                        aria-hidden="true"
                        className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      />
                    )}
                    {generating ? "Writing your blog..." : "Generate blog"}
                  </button>
                </div>
              </div>
            </form>

            {/* Suggestions */}
            {!generating && !prompt && !generatedBlog && (
              <div className="mt-5">
                <p className="mb-3 text-sm text-[#6b7068]">Need a starting point?</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => useSuggestion(text)}
                      className="rounded-full border border-[#deded5] bg-white px-4 py-2 text-left text-sm text-[#3d453f] transition-colors hover:border-[#34483a] hover:bg-[#f0f1eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34483a]"
                    >
                      {text.split(",")[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {generating && <GenerationProgress elapsed={elapsed} />}

            {/* Generated blog */}
            {generatedBlog && (
              <section
                ref={resultRef}
                className="mt-12 scroll-mt-6 overflow-hidden rounded-lg border border-[#deded5] bg-white"
              >
                <div className="border-b border-[#deded5] p-5 sm:p-8">
                  <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#e8ece4] px-3 py-1 text-xs font-medium text-[#34483a]">
                    ✓ Saved to your library
                  </p>

                  <h2
                    className="text-2xl font-semibold leading-tight tracking-tight text-[#1c211d] sm:text-4xl"
                    style={{ fontFamily: SERIF }}
                  >
                    {generatedBlog.title || "Untitled blog"}
                  </h2>

                  <p className="mt-3 text-sm text-[#6b7068]">
                    {stats.minutes} min read · {stats.words.toLocaleString()} words
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Link
                      href="/blogs"
                      className="rounded-md bg-[#34483a] px-4 py-2 text-sm font-medium text-white hover:bg-[#28392d]"
                    >
                      Open in my blogs
                    </Link>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="rounded-md border border-[#deded5] px-3.5 py-2 text-sm hover:bg-[#f7f6f2]"
                    >
                      Copy markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPlan((value) => !value)}
                      aria-pressed={showPlan}
                      className={`rounded-md border px-3.5 py-2 text-sm ${
                        showPlan
                          ? "border-[#34483a] bg-[#34483a] text-white"
                          : "border-[#deded5] hover:bg-[#f7f6f2]"
                      }`}
                    >
                      {showPlan ? "Hide agent plan" : "Agent plan & sources"}
                    </button>
                  </div>
                </div>

                {showPlan && (
                  <div className="border-b border-[#deded5] bg-[#f7f6f2] p-5 sm:p-8">
                    <h3 className="text-base font-semibold">How this blog was planned</h3>

                    {hasStructuredPlan ? (
                      <>
                        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                          {plan.audience && (
                            <div>
                              <dt className="text-xs text-[#6b7068]">Audience</dt>
                              <dd className="mt-1 text-sm">{plan.audience}</dd>
                            </div>
                          )}
                          {plan.tone && (
                            <div>
                              <dt className="text-xs text-[#6b7068]">Tone</dt>
                              <dd className="mt-1 text-sm">{plan.tone}</dd>
                            </div>
                          )}
                        </dl>

                        {plan.sections?.length > 0 && (
                          <>
                            <h4 className="mt-6 text-sm font-semibold">Planned sections</h4>
                            <ol className="mt-3 list-decimal space-y-3 pl-5">
                              {plan.sections.map((section, index) => (
                                <li key={section.id || index} className="text-sm">
                                  <p className="font-medium">{section.title}</p>
                                  {section.goal && <p className="mt-1 text-[#6b7068]">{section.goal}</p>}
                                </li>
                              ))}
                            </ol>
                          </>
                        )}
                      </>
                    ) : plan ? (
                      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words text-sm leading-6 text-[#555b53]">
                        {typeof plan === "string" ? plan : JSON.stringify(plan, null, 2)}
                      </pre>
                    ) : (
                      <p className="mt-3 text-sm text-[#6b7068]">No plan was returned for this blog.</p>
                    )}

                    {generatedBlog.sources?.length > 0 && (
                      <div className="mt-6">
                        <h4 className="mb-3 text-sm font-semibold">
                          Research sources ({generatedBlog.sources.length})
                        </h4>
                        <ul className="space-y-3">
                          {generatedBlog.sources.map((source, index) => (
                            <li key={source.url || index} className="text-sm">
                              {source.url ? (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="font-medium text-[#34483a] underline underline-offset-4"
                                >
                                  {source.title || source.url}
                                </a>
                              ) : (
                                <span className="font-medium">{source.title || `Source ${index + 1}`}</span>
                              )}
                              {source.url && (
                                <span className="ml-2 text-xs text-[#6b7068]">{getDomain(source.url)}</span>
                              )}
                              {source.snippet && <p className="mt-1 text-[#6b7068]">{source.snippet}</p>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <article
                  className="px-5 pb-12 pt-7 text-[#2c322d] sm:px-8 sm:pt-9"
                  style={{ fontFamily: SERIF, fontSize: "18px", lineHeight: 1.8 }}
                >
                  <div className="mx-auto max-w-[680px]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {generatedBlog.content}
                    </ReactMarkdown>
                  </div>
                </article>
              </section>
            )}

            {/* Recent writing */}
            <section className="mt-14" aria-labelledby="recent-heading">
              <div className="mb-4 flex items-center justify-between border-b border-[#deded5] pb-3">
                <h2 id="recent-heading" className="text-base font-semibold">
                  Recent writing
                </h2>
                {blogs.length > 0 && (
                  <Link href="/blogs" className="text-sm text-[#6b7068] hover:text-[#34483a]">
                    View all ({blogs.length})
                  </Link>
                )}
              </div>

              {blogs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#d5d6cd] px-6 py-10 text-center">
                  <p className="text-sm font-medium">Your library is empty</p>
                  <p className="mt-1 text-sm text-[#6b7068]">
                    Write your first blog above. It will be saved here automatically.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[#e7e7df] overflow-hidden rounded-lg border border-[#deded5] bg-white">
                  {blogs.slice(0, 5).map((blog) => (
                    <li key={blog._id || blog.id}>
                      <Link
                        href="/blogs"
                        className="flex flex-col gap-1.5 px-5 py-4 transition-colors hover:bg-[#f7f6f2] focus:outline-none focus-visible:bg-[#f0f1eb] sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                      >
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-medium">{blog.title || "Untitled blog"}</h3>
                          {blog.prompt && (
                            <p className="mt-1 truncate text-sm text-[#6b7068]">{blog.prompt}</p>
                          )}
                        </div>
                        <span className="flex shrink-0 items-center gap-3 text-xs text-[#777b73]">
                          {formatDate(blog.createdAt)}
                          <span className="rounded-full bg-[#e8ece4] px-2.5 py-0.5 font-medium capitalize text-[#34483a]">
                            {blog.status || "saved"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <footer className="border-t border-[#deded5] px-5 py-4 text-center text-xs text-[#777b73] sm:px-8">
            BlogPilot · Your ideas, thoughtfully developed.
          </footer>
        </section>
      </div>

      {/* Toast */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center">
        {notice && (
          <div className="rounded-md bg-[#242923] px-4 py-2 text-sm text-white shadow-lg">{notice}</div>
        )}
      </div>
    </main>
  );
}