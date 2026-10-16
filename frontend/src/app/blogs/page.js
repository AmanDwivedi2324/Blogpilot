"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const FONT_SIZES = { sm: 16, md: 18, lg: 20 };
const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';

function extractText(node) {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (node.props) return extractText(node.props.children);
    return "";
}

function slugify(text) {
    return String(text)
        .toLowerCase()
        .replace(/[`*_~[\]()]/g, "")
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
}

function extractHeadings(markdown = "") {
    const headings = [];
    let inFence = false;

    for (const line of markdown.split("\n")) {
        if (/^\s*```/.test(line)) {
            inFence = !inFence;
            continue;
        }
        if (inFence) continue;

        const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
        if (match) {
            const text = match[2].replace(/[`*_~]/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1");
            headings.push({ level: match[1].length, text, id: slugify(text) });
        }
    }
    return headings;
}

function getStats(markdown = "") {
    const words = markdown
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/[#>*_`~[\]()-]/g, " ")
        .split(/\s+/)
        .filter(Boolean).length;
    return { words, minutes: Math.max(1, Math.ceil(words / 220)) };
}

function getDomain(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
}

function formatDate(value, withTime = false) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return withTime
        ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        : date.toLocaleDateString(undefined, { dateStyle: "medium" });
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
/* Markdown rendering                                                  */
/* ------------------------------------------------------------------ */

function CodeBlock({ children }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const ok = await copyToClipboard(extractText(children).replace(/\n$/, ""));
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        }
    };

    return (
        <div className="group relative my-6">
            <button
                type="button"
                onClick={handleCopy}
                className="absolute right-2 top-2 rounded border border-white/20 bg-[#2b312c] px-2 py-1 text-xs text-[#d9ddd3] opacity-100 transition hover:bg-[#3a4239] focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                style={{ fontSize: "12px" }}
            >
                {copied ? "Copied" : "Copy"}
            </button>
            <pre
                className="overflow-x-auto rounded-md bg-[#1f241f] p-4 text-[#e8eadf]"
                style={{ fontSize: "0.85em", lineHeight: 1.65 }}
            >
                {children}
            </pre>
        </div>
    );
}

const markdownComponents = {
    h1: ({ children }) => (
        <h2
            id={slugify(extractText(children))}
            className="mb-4 mt-12 scroll-mt-24 font-semibold leading-tight tracking-tight text-[#1c211d]"
            style={{ fontSize: "1.7em" }}
        >
            {children}
        </h2>
    ),
    h2: ({ children }) => {
        const id = slugify(extractText(children));
        return (
            <h2
                id={id}
                className="group mb-4 mt-12 scroll-mt-24 border-t border-[#e7e7df] pt-8 font-semibold leading-tight tracking-tight text-[#1c211d]"
                style={{ fontSize: "1.45em" }}
            >
                <a href={`#${id}`} className="no-underline">
                    {children}
                    <span aria-hidden className="ml-2 text-[#b5b9ae] opacity-0 transition group-hover:opacity-100">
                        #
                    </span>
                </a>
            </h2>
        );
    },
    h3: ({ children }) => {
        const id = slugify(extractText(children));
        return (
            <h3
                id={id}
                className="group mb-3 mt-9 scroll-mt-24 font-semibold leading-snug text-[#1c211d]"
                style={{ fontSize: "1.2em" }}
            >
                <a href={`#${id}`} className="no-underline">
                    {children}
                    <span aria-hidden className="ml-2 text-[#b5b9ae] opacity-0 transition group-hover:opacity-100">
                        #
                    </span>
                </a>
            </h3>
        );
    },
    h4: ({ children }) => (
        <h4 className="mb-2 mt-6 font-semibold text-[#1c211d]" style={{ fontSize: "1.05em" }}>
            {children}
        </h4>
    ),
    p: ({ children }) => <p className="my-5">{children}</p>,
    a: ({ href, children }) => {
        const external = /^https?:\/\//.test(href || "");
        return (
            <a
                href={href}
                {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                className="font-medium text-[#34483a] underline decoration-[#9fb3a5] underline-offset-4 hover:decoration-[#34483a]"
            >
                {children}
            </a>
        );
    },
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
    img: ({ src, alt }) => (
        <figure className="my-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt || ""} loading="lazy" className="w-full rounded-md border border-[#e7e7df]" />
            {alt && (
                <figcaption className="mt-2 text-center text-[#6b7068]" style={{ fontSize: "0.8em" }}>
                    {alt}
                </figcaption>
            )}
        </figure>
    ),
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
    pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
    code: ({ className, children }) => {
        const isBlock = /language-/.test(className || "") || String(children).includes("\n");
        if (isBlock) {
            return <code className={`${className || ""} font-mono`}>{children}</code>;
        }
        return (
            <code
                className="rounded bg-[#eceee6] px-1.5 py-0.5 font-mono text-[#34483a]"
                style={{ fontSize: "0.88em" }}
            >
                {children}
            </code>
        );
    },
};

/* ------------------------------------------------------------------ */
/* Small UI pieces                                                     */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }) {
    return (
        <span className="inline-block rounded-full bg-[#e8ece4] px-2.5 py-0.5 text-[11px] font-medium capitalize text-[#34483a]">
            {status || "saved"}
        </span>
    );
}

function ToolbarButton({ onClick, children, active = false, danger = false, disabled = false, label }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active || undefined}
            className={`rounded border px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34483a] disabled:opacity-50 ${danger
                    ? "border-[#d8c9c5] text-[#852f28] hover:bg-[#f8eeeb]"
                    : active
                        ? "border-[#34483a] bg-[#34483a] text-white"
                        : "border-[#deded5] text-[#3d453f] hover:bg-[#f7f6f2]"
                }`}
        >
            {children}
        </button>
    );
}

function ReaderSkeleton() {
    return (
        <div className="animate-pulse space-y-4 p-6 sm:p-10" aria-busy="true" aria-label="Opening blog">
            <div className="h-3 w-24 rounded bg-[#e7e7df]" />
            <div className="h-8 w-3/4 rounded bg-[#e7e7df]" />
            <div className="h-3 w-48 rounded bg-[#e7e7df]" />
            <div className="mt-8 space-y-3">
                {[100, 96, 92, 100, 88, 94, 70].map((w, i) => (
                    <div key={i} className="h-3 rounded bg-[#efefe8]" style={{ width: `${w}%` }} />
                ))}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function BlogsPage() {
    const router = useRouter();
    const { loading, isAuthenticated } = useAuth();

    const [blogs, setBlogs] = useState([]);
    const [selectedBlog, setSelectedBlog] = useState(null);
    const [listLoading, setListLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPlan, setShowPlan] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [query, setQuery] = useState("");
    const [fontSize, setFontSize] = useState("md");
    const [progress, setProgress] = useState(0);
    const [activeHeading, setActiveHeading] = useState("");
    const [showTop, setShowTop] = useState(false);
    const [notice, setNotice] = useState("");

    const articleRef = useRef(null);
    const noticeTimer = useRef(null);

    /* ---------- data ---------- */

    const loadBlogs = useCallback(async () => {
        setListLoading(true);
        setError("");

        try {
            const response = await apiRequest("/api/v1/blogs");
            const list = response?.blogs || response?.data?.blogs || [];
            setBlogs(list);
        } catch (err) {
            setError(err.message || "Unable to load your blogs.");
        } finally {
            setListLoading(false);
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

    /* ---------- remembered font size ---------- */

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem("blogpilot:fontSize");
            if (saved && FONT_SIZES[saved]) setFontSize(saved);
        } catch {
            /* storage unavailable — keep default */
        }
    }, []);

    const changeFontSize = (size) => {
        setFontSize(size);
        try {
            window.localStorage.setItem("blogpilot:fontSize", size);
        } catch {
            /* ignore */
        }
    };

    /* ---------- derived reading data ---------- */

    const headings = useMemo(() => extractHeadings(selectedBlog?.content), [selectedBlog]);
    const stats = useMemo(() => getStats(selectedBlog?.content), [selectedBlog]);

    const filteredBlogs = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return blogs;
        return blogs.filter((blog) => (blog.title || "").toLowerCase().includes(q));
    }, [blogs, query]);

    /* ---------- scroll progress, active heading, back-to-top ---------- */

    useEffect(() => {
        if (!selectedBlog) {
            setProgress(0);
            setShowTop(false);
            return;
        }

        let frame = 0;

        const update = () => {
            frame = 0;
            const el = articleRef.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            const scrollable = rect.height - window.innerHeight * 0.6;
            const value = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
            setProgress(value);
            setShowTop(window.scrollY > 700);

            let current = "";
            for (const heading of headings) {
                const node = document.getElementById(heading.id);
                if (node && node.getBoundingClientRect().top <= 140) current = heading.id;
            }
            setActiveHeading(current);
        };

        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };

        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [selectedBlog, headings, fontSize, showPlan]);

    /* ---------- actions ---------- */

    const flash = (message) => {
        setNotice(message);
        clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setNotice(""), 2200);
    };

    useEffect(() => () => clearTimeout(noticeTimer.current), []);

    const openBlog = async (id) => {
        setDetailLoading(true);
        setError("");
        setShowPlan(false);

        try {
            const response = await apiRequest(`/api/v1/blogs/${id}`);
            const blog = response?.blog || response?.data?.blog;

            if (!blog) throw new Error("Blog details were not returned.");

            setSelectedBlog(blog);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            setError(err.message || "Unable to open this blog.");
        } finally {
            setDetailLoading(false);
        }
    };

    const closeBlog = () => {
        setSelectedBlog(null);
        setShowPlan(false);
        window.scrollTo({ top: 0 });
    };

    const handleDelete = async () => {
        if (!selectedBlog || deleting) return;

        const confirmed = window.confirm(
            `Delete "${selectedBlog.title}"? This cannot be undone.`
        );

        if (!confirmed) return;

        setDeleting(true);
        setError("");

        try {
            await apiRequest(`/api/v1/blogs/${selectedBlog._id}`, {
                method: "DELETE",
            });

            setBlogs((current) =>
                current.filter((blog) => blog._id !== selectedBlog._id)
            );
            setSelectedBlog(null);
            flash("Blog deleted");
        } catch (err) {
            setError(err.message || "Unable to delete this blog.");
        } finally {
            setDeleting(false);
        }
    };

    const handleCopyMarkdown = async () => {
        const ok = await copyToClipboard(`# ${selectedBlog.title}\n\n${selectedBlog.content || ""}`);
        flash(ok ? "Markdown copied" : "Copy failed — your browser blocked clipboard access");
    };

    /* ---------- loading gate ---------- */

    if (loading || !isAuthenticated) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] text-sm text-[#6b7068]">
                Loading your library...
            </main>
        );
    }

    const hasSelection = Boolean(selectedBlog) || detailLoading;

    return (
        <main className="min-h-screen bg-[#f7f6f2] text-[#242923]">
            {/* Reading progress */}
            {selectedBlog && (
                <div
                    className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent print:hidden"
                    role="progressbar"
                    aria-label="Reading progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress * 100)}
                >
                    <div
                        className="h-full bg-[#34483a] transition-[width] duration-150"
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>
            )}

            <header className="flex min-h-16 items-center justify-between border-b border-[#deded5] px-5 sm:px-8 print:hidden">
                <Link href="/" className="text-lg font-semibold tracking-tight">
                    BlogPilot
                </Link>
                <div className="flex items-center gap-5 text-sm">
                    <Link href="/" className="text-[#6b7068] hover:text-[#34483a]">
                        Write
                    </Link>
                    <Link href="/profile" className="text-[#6b7068] hover:text-[#34483a]">
                        Profile
                    </Link>
                </div>
            </header>

            <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8">
                {/* Page heading — hidden on mobile while reading to save space */}
                <div className={`mb-6 ${hasSelection ? "hidden lg:block" : ""} print:hidden`}>
                    <h1 className="text-3xl font-semibold tracking-tight">My blogs</h1>
                    <p className="mt-2 text-sm text-[#6b7068]">
                        Read, review, and manage your saved writing.
                    </p>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-4 border-l-2 border-red-700 bg-[#f3e9e6] px-4 py-3 text-sm text-[#852f28]"
                    >
                        {error}
                        <button onClick={() => setError("")} className="ml-3 underline">
                            Dismiss
                        </button>
                    </div>
                )}

                <div className="grid min-h-[65vh] border border-[#deded5] bg-white lg:grid-cols-[320px_minmax(0,1fr)]">
                    {/* ---------------- Library list ---------------- */}
                    <aside
                        className={`border-b border-[#deded5] lg:border-b-0 lg:border-r print:hidden ${hasSelection ? "hidden lg:block" : ""
                            }`}
                    >
                        <div className="lg:sticky lg:top-0">
                            <div className="border-b border-[#deded5] px-4 py-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-semibold">Saved blogs</h2>
                                    <span className="text-xs text-[#6b7068]">
                                        {query ? `${filteredBlogs.length} of ${blogs.length}` : `${blogs.length} total`}
                                    </span>
                                </div>
                                {blogs.length > 3 && (
                                    <input
                                        type="search"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Search by title"
                                        aria-label="Search blogs by title"
                                        className="mt-3 w-full rounded border border-[#deded5] bg-[#f7f6f2] px-3 py-2 text-sm outline-none placeholder:text-[#9a9f94] focus:border-[#34483a] focus:bg-white"
                                    />
                                )}
                            </div>

                            {listLoading ? (
                                <div className="animate-pulse space-y-4 p-5" aria-busy="true">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="h-3 w-5/6 rounded bg-[#e7e7df]" />
                                            <div className="h-2.5 w-1/3 rounded bg-[#efefe8]" />
                                        </div>
                                    ))}
                                </div>
                            ) : blogs.length === 0 ? (
                                <div className="p-5">
                                    <p className="text-sm text-[#6b7068]">No saved blogs yet.</p>
                                    <Link
                                        href="/"
                                        className="mt-3 inline-block text-sm font-medium text-[#34483a] underline underline-offset-4"
                                    >
                                        Generate your first blog →
                                    </Link>
                                </div>
                            ) : filteredBlogs.length === 0 ? (
                                <div className="p-5 text-sm text-[#6b7068]">
                                    No blogs match “{query}”.{" "}
                                    <button onClick={() => setQuery("")} className="underline">
                                        Clear search
                                    </button>
                                </div>
                            ) : (
                                <div className="max-h-[70vh] divide-y divide-[#e7e7df] overflow-y-auto">
                                    {filteredBlogs.map((blog) => {
                                        const active = selectedBlog?._id === blog._id;
                                        return (
                                            <button
                                                key={blog._id}
                                                type="button"
                                                onClick={() => openBlog(blog._id)}
                                                aria-current={active ? "true" : undefined}
                                                className={`w-full border-l-2 p-4 text-left transition-colors hover:bg-[#f7f6f2] focus:outline-none focus-visible:bg-[#f0f1eb] ${active ? "border-[#34483a] bg-[#f0f1eb]" : "border-transparent"
                                                    }`}
                                            >
                                                <span className="line-clamp-2 block text-sm font-medium leading-5">
                                                    {blog.title}
                                                </span>
                                                <span className="mt-2 flex items-center gap-2 text-xs text-[#6b7068]">
                                                    {formatDate(blog.createdAt)}
                                                    <StatusBadge status={blog.status} />
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* ---------------- Reader ---------------- */}
                    <section className={`min-w-0 ${hasSelection ? "" : "hidden lg:block"}`}>
                        {detailLoading ? (
                            <ReaderSkeleton />
                        ) : !selectedBlog ? (
                            <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-12 text-center">
                                <h2 className="text-lg font-semibold">Choose a blog to read</h2>
                                <p className="mt-2 max-w-sm text-sm leading-6 text-[#6b7068]">
                                    Pick a saved blog from the list. You can read it, check the
                                    research sources, and see the plan the agent followed.
                                </p>
                            </div>
                        ) : (
                            <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_240px]">
                                <div className="min-w-0">
                                    {/* Header + toolbar */}
                                    <div className="border-b border-[#deded5] px-5 py-6 sm:px-10 sm:py-8 print:border-0 print:px-0">
                                        <button
                                            type="button"
                                            onClick={closeBlog}
                                            className="mb-5 text-sm text-[#34483a] underline underline-offset-4 lg:hidden print:hidden"
                                        >
                                            ← All blogs
                                        </button>

                                        <div className="mx-auto max-w-[720px]">
                                            <h2
                                                className="text-3xl font-semibold leading-tight tracking-tight text-[#1c211d] sm:text-4xl"
                                                style={{ fontFamily: SERIF }}
                                            >
                                                {selectedBlog.title}
                                            </h2>

                                            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#6b7068]">
                                                <span>{formatDate(selectedBlog.createdAt, true)}</span>
                                                <span aria-hidden>·</span>
                                                <span>{stats.minutes} min read</span>
                                                <span aria-hidden>·</span>
                                                <span>{stats.words.toLocaleString()} words</span>
                                                <StatusBadge status={selectedBlog.status} />
                                            </p>

                                            <div className="mt-5 flex flex-wrap items-center gap-2 print:hidden">
                                                <ToolbarButton onClick={() => setShowPlan((v) => !v)} active={showPlan}>
                                                    {showPlan ? "Hide agent plan" : "Agent plan & sources"}
                                                </ToolbarButton>
                                                <ToolbarButton onClick={handleCopyMarkdown}>Copy markdown</ToolbarButton>
                                                <ToolbarButton onClick={() => window.print()}>Print</ToolbarButton>

                                                <div
                                                    className="ml-auto flex items-center overflow-hidden rounded border border-[#deded5]"
                                                    role="group"
                                                    aria-label="Text size"
                                                >
                                                    {[
                                                        ["sm", "A", "text-xs"],
                                                        ["md", "A", "text-sm"],
                                                        ["lg", "A", "text-base"],
                                                    ].map(([key, label, size]) => (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => changeFontSize(key)}
                                                            aria-label={`Text size ${key === "sm" ? "small" : key === "md" ? "medium" : "large"}`}
                                                            aria-pressed={fontSize === key}
                                                            className={`px-3 py-1.5 font-semibold ${size} ${fontSize === key
                                                                    ? "bg-[#34483a] text-white"
                                                                    : "text-[#3d453f] hover:bg-[#f7f6f2]"
                                                                }`}
                                                        >
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>

                                                <ToolbarButton onClick={handleDelete} disabled={deleting} danger>
                                                    {deleting ? "Deleting..." : "Delete"}
                                                </ToolbarButton>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Agent plan */}
                                    {showPlan && (
                                        <div className="border-b border-[#deded5] bg-[#f7f6f2] px-5 py-6 sm:px-10 print:hidden">
                                            <div className="mx-auto max-w-[720px]">
                                                <h3 className="text-base font-semibold">How this blog was planned</h3>

                                                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                                                    <div className="sm:col-span-2">
                                                        <dt className="text-xs text-[#6b7068]">Planned title</dt>
                                                        <dd className="mt-1 text-sm font-medium">
                                                            {selectedBlog.plan?.title || selectedBlog.title}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-xs text-[#6b7068]">Audience</dt>
                                                        <dd className="mt-1 text-sm">
                                                            {selectedBlog.plan?.audience || "Not specified"}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-xs text-[#6b7068]">Tone</dt>
                                                        <dd className="mt-1 text-sm">
                                                            {selectedBlog.plan?.tone || "Not specified"}
                                                        </dd>
                                                    </div>
                                                </dl>

                                                <h4 className="mt-6 text-sm font-semibold">Planned sections</h4>
                                                {selectedBlog.plan?.sections?.length ? (
                                                    <ol className="mt-3 list-decimal space-y-3 pl-5">
                                                        {selectedBlog.plan.sections.map((section, index) => (
                                                            <li key={section.id || index} className="text-sm">
                                                                <p className="font-medium">{section.title}</p>
                                                                <p className="mt-1 text-[#6b7068]">{section.goal}</p>
                                                            </li>
                                                        ))}
                                                    </ol>
                                                ) : (
                                                    <p className="mt-2 text-sm text-[#6b7068]">No section plan was saved.</p>
                                                )}

                                                <h4 className="mt-6 text-sm font-semibold">
                                                    Research sources ({selectedBlog.sources?.length || 0})
                                                </h4>
                                                {selectedBlog.sources?.length ? (
                                                    <ul className="mt-3 space-y-3">
                                                        {selectedBlog.sources.map((source, index) => (
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
                                                                    <span className="font-medium">
                                                                        {source.title || `Source ${index + 1}`}
                                                                    </span>
                                                                )}
                                                                {source.url && (
                                                                    <span className="ml-2 text-xs text-[#6b7068]">
                                                                        {getDomain(source.url)}
                                                                    </span>
                                                                )}
                                                                {source.snippet && (
                                                                    <p className="mt-1 text-[#6b7068]">{source.snippet}</p>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="mt-2 text-sm text-[#6b7068]">
                                                        No research sources were saved.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Mobile table of contents */}
                                    {headings.length > 2 && (
                                        <details className="border-b border-[#deded5] px-5 py-3 sm:px-10 xl:hidden print:hidden">
                                            <summary className="mx-auto max-w-[720px] cursor-pointer text-sm font-medium text-[#3d453f]">
                                                In this blog ({headings.length} sections)
                                            </summary>
                                            <ul className="mx-auto mt-3 max-w-[720px] space-y-2 text-sm">
                                                {headings.map((h) => (
                                                    <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
                                                        <a href={`#${h.id}`} className="text-[#34483a] hover:underline">
                                                            {h.text}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}

                                    {/* Article */}
                                    <article
                                        ref={articleRef}
                                        className="px-5 pb-16 pt-8 text-[#2c322d] sm:px-10 sm:pt-10 print:px-0"
                                        style={{
                                            fontFamily: SERIF,
                                            fontSize: `${FONT_SIZES[fontSize]}px`,
                                            lineHeight: 1.8,
                                        }}
                                    >
                                        <div className="mx-auto max-w-[720px]">
                                            {selectedBlog.content ? (
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                                    {selectedBlog.content}
                                                </ReactMarkdown>
                                            ) : (
                                                <p className="text-[#6b7068]">This blog has no content saved.</p>
                                            )}

                                            <div
                                                className="mt-14 flex items-center justify-between border-t border-[#e7e7df] pt-6 text-[#6b7068] print:hidden"
                                                style={{ fontFamily: "inherit", fontSize: "14px", lineHeight: 1.5 }}
                                            >
                                                <span>You've reached the end · {stats.minutes} min read</span>
                                                <button
                                                    type="button"
                                                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                                                    className="text-[#34483a] underline underline-offset-4"
                                                >
                                                    Back to top
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                </div>

                                {/* Desktop table of contents */}
                                {headings.length > 2 && (
                                    <nav
                                        aria-label="Table of contents"
                                        className="hidden border-l border-[#e7e7df] xl:block print:hidden"
                                    >
                                        <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto p-5">
                                            <p className="mb-3 text-sm font-semibold">On this page</p>
                                            <ul className="space-y-1 text-sm">
                                                {headings.map((h) => {
                                                    const active = activeHeading === h.id;
                                                    return (
                                                        <li key={h.id}>
                                                            <a
                                                                href={`#${h.id}`}
                                                                aria-current={active ? "location" : undefined}
                                                                className={`block border-l-2 py-1 leading-5 transition-colors ${h.level === 3 ? "pl-6" : "pl-3"
                                                                    } ${active
                                                                        ? "border-[#34483a] font-medium text-[#34483a]"
                                                                        : "border-transparent text-[#6b7068] hover:text-[#34483a]"
                                                                    }`}
                                                            >
                                                                {h.text}
                                                            </a>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    </nav>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Back to top */}
            {selectedBlog && showTop && (
                <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    aria-label="Back to top"
                    className="fixed bottom-5 right-5 z-40 rounded-full border border-[#deded5] bg-white px-4 py-2 text-sm shadow-md hover:bg-[#f7f6f2] print:hidden"
                >
                    ↑ Top
                </button>
            )}

            {/* Toast */}
            <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center">
                {notice && (
                    <div className="rounded bg-[#242923] px-4 py-2 text-sm text-white shadow-lg">{notice}</div>
                )}
            </div>
        </main>
    );
}