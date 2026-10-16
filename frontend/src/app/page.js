
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [blogs, setBlogs] = useState([]);
  const [generatedBlog, setGeneratedBlog] = useState(null);
  const [showPlan, setShowPlan] = useState(false);

  const loadBlogs = useCallback(async () => {
    try {
      const response = await apiRequest("/api/v1/blogs");
      const result = response?.data;
      const list = Array.isArray(result)
        ? result
        : result?.blogs || result?.items || [];

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

  async function handleGenerate(event) {
    event.preventDefault();

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

      const result = response?.data;
      const blog = result?.blog || result;

      if (!blog || !blog.content) {
        throw new Error(
          "The generation response did not contain blog content. Check your backend response format."
        );
      }

      setGeneratedBlog(blog);
      await loadBlogs();
    } catch (err) {
      setError(err.message || "Blog generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading || !isAuthenticated || pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] text-sm text-[#6b7068]">
        Loading your writing workspace...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#242923]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[#deded5] md:flex">
          <div className="flex h-16 items-center border-b border-[#deded5] px-6">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              BlogPilot
            </Link>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            <Link
              href="/"
              className="flex items-center gap-3 border-l-2 border-[#34483a] bg-[#eaece5] px-3 py-2.5 text-sm font-medium"
            >
              <span aria-hidden="true">✎</span>
              Write
            </Link>

            <Link
              href="/blogs"
              className="flex items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-sm text-[#6b7068] hover:bg-[#eeeee8] hover:text-[#242923]"
            >
              <span aria-hidden="true">▤</span>
              My blogs
            </Link>
          </nav>

          <div className="border-t border-[#deded5] p-4">
            <Link
              href="/profile"
              className="block px-3 py-2.5 text-sm text-[#6b7068] hover:text-[#242923]"
            >
              Profile and settings
            </Link>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 items-center justify-between gap-4 border-b border-[#deded5] px-5 py-3 sm:px-8">
            <span className="text-sm text-[#6b7068]">
              Writing workspace
            </span>

            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-[#6b7068] sm:inline">
                {user?.name || "Your account"}
              </span>
              <Link
                href="/profile"
                className="text-sm font-medium underline underline-offset-4 hover:text-[#34483a]"
              >
                Account
              </Link>
            </div>
          </header>

          <div className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
            <div className="mb-10 max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7068]">
                Your writing workspace
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                What are we writing today?
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#6b7068]">
                Start with an idea. BlogPilot researches your topic, plans
                the structure, and turns it into a complete blog.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 border-l-2 border-red-700 bg-[#f3e9e6] px-4 py-3 text-sm text-[#852f28]"
              >
                {error}
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="ml-3 underline underline-offset-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            <form onSubmit={handleGenerate} className="border border-[#deded5] bg-white">
              <label htmlFor="blog-prompt" className="sr-only">
                Describe the blog you want to write
              </label>

              <textarea
                id="blog-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe your topic, target audience, tone, or the ideas you want to explore..."
                rows={5}
                maxLength={5000}
                disabled={generating}
                className="w-full resize-y border-0 bg-transparent px-5 py-5 text-sm leading-7 outline-none placeholder:text-[#898d85] focus:ring-0 disabled:opacity-60"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7e7df] px-4 py-3">
                <span className="text-xs text-[#777b73]">
                  {prompt.length}/5000 characters
                </span>

                <button
                  type="submit"
                  disabled={!prompt.trim() || generating}
                  className="inline-flex items-center gap-3 bg-[#34483a] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#28392d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? "Writing your blog..." : "Generate blog"}
                  {!generating && <span aria-hidden="true">→</span>}
                </button>
              </div>
            </form>

            {generating && (
              <div
                role="status"
                className="mt-5 border border-[#deded5] bg-white px-5 py-4"
              >
                <p className="text-sm font-medium">
                  Your blog is being developed
                </p>
                <p className="mt-1 text-sm text-[#6b7068]">
                  The AI agent is researching, planning, and writing. This may
                  take a little while.
                </p>
              </div>
            )}

            {generatedBlog && (
              <section className="mt-12 border border-[#deded5] bg-white">
                <div className="border-b border-[#deded5] p-5 sm:p-7">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7068]">
                    Generated blog
                  </p>

                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {generatedBlog.title || "Untitled blog"}
                  </h2>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPlan((value) => !value)}
                      className="border border-[#deded5] px-3 py-2 text-sm hover:bg-[#f7f6f2]"
                    >
                      {showPlan ? "Hide agent plan" : "View agent plan"}
                    </button>

                    <Link
                      href="/blogs"
                      className="bg-[#34483a] px-3 py-2 text-sm font-medium text-white hover:bg-[#28392d]"
                    >
                      Open my blogs →
                    </Link>
                  </div>
                </div>

                {showPlan && (
                  <div className="border-b border-[#deded5] bg-[#f7f6f2] p-5 sm:p-7">
                    <h3 className="mb-4 text-base font-semibold">
                      Agent plan
                    </h3>

                    {generatedBlog.plan ? (
                      <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-[#555b53]">
                        {JSON.stringify(generatedBlog.plan, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-sm text-[#6b7068]">
                        No plan was returned for this blog.
                      </p>
                    )}

                    {generatedBlog.sources?.length > 0 && (
                      <div className="mt-6">
                        <h4 className="mb-3 text-sm font-semibold">
                          Research sources
                        </h4>
                        <ul className="space-y-3">
                          {generatedBlog.sources.map((source, index) => (
                            <li key={source.url || index} className="text-sm">
                              {source.url ? (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-medium text-[#34483a] underline underline-offset-2"
                                >
                                  {source.title || source.url}
                                </a>
                              ) : (
                                <span className="font-medium">
                                  {source.title || `Source ${index + 1}`}
                                </span>
                              )}
                              {source.snippet && (
                                <p className="mt-1 text-[#6b7068]">
                                  {source.snippet}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <article className="whitespace-pre-wrap break-words px-5 py-6 text-sm leading-7 sm:px-7 sm:py-8">
                  {generatedBlog.content}
                </article>
              </section>
            )}

            <section className="mt-14">
              <div className="mb-5 flex items-center justify-between border-b border-[#deded5] pb-3">
                <h2 className="text-base font-semibold">Recent writing</h2>
                <Link
                  href="/blogs"
                  className="text-sm text-[#6b7068] hover:text-[#34483a]"
                >
                  View all →
                </Link>
              </div>

              {blogs.length === 0 ? (
                <p className="py-8 text-sm text-[#6b7068]">
                  {pageLoading
                    ? "Loading your blogs..."
                    : "No blogs yet. Start by generating your first one above."}
                </p>
              ) : (
                <div className="divide-y divide-[#deded5]">
                  {blogs.slice(0, 5).map((blog) => (
                    <Link
                      key={blog._id || blog.id}
                      href="/blogs"
                      className="flex flex-col gap-2 py-5 transition-colors hover:bg-[#efeee8] sm:flex-row sm:items-center sm:justify-between sm:px-3"
                    >
                      <div>
                        <h3 className="text-sm font-medium">
                          {blog.title || "Untitled blog"}
                        </h3>
                        <p className="mt-1 text-sm text-[#6b7068]">
                          {blog.prompt || "AI-generated blog"}
                        </p>
                      </div>
                      <span className="text-xs text-[#777b73]">
                        {blog.status || "Saved"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <footer className="border-t border-[#deded5] px-5 py-4 text-center text-xs text-[#777b73] sm:px-8">
            BlogPilot · Your ideas, thoughtfully developed.
          </footer>
        </section>
      </div>
    </main>
  );
}
