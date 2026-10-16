"use client";

import { useState } from "react";

const recentBlogs = [
  {
    id: 1,
    title: "Building Reliable AI Agents",
    description: "Planning, tools, and evaluation",
    status: "Completed",
  },
  {
    id: 2,
    title: "The Evolution of Backend Systems",
    description: "From monoliths to event-driven architecture",
    status: "Draft",
  },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!prompt.trim()) return;

    // Blog generation API integration will be added next.
    console.log("Blog prompt:", prompt.trim());
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#242923]">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-[#deded5] bg-[#f7f6f2] md:flex md:flex-col">
          <div className="flex h-16 items-center border-b border-[#deded5] px-6">
            <span className="text-lg font-semibold tracking-tight">
              BlogPilot
            </span>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            <a
              href="/"
              className="flex items-center gap-3 border-l-2 border-[#34483a] bg-[#eaece5] px-3 py-2.5 text-sm font-medium"
            >
              <span aria-hidden="true">✎</span>
              Write
            </a>

            <a
              href="/blogs"
              className="flex items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-sm text-[#6b7068] transition-colors hover:bg-[#eeeee8] hover:text-[#242923]"
            >
              <span aria-hidden="true">▤</span>
              My blogs
            </a>
          </nav>

          <div className="border-t border-[#deded5] p-4">
            <a
              href="/profile"
              className="block px-3 py-2.5 text-sm text-[#6b7068] transition-colors hover:text-[#242923]"
            >
              Profile and settings
            </a>
          </div>
        </aside>

        {/* Main workspace */}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-[#deded5] px-5 sm:px-8">
            <span className="text-sm text-[#6b7068]">Writing workspace</span>

            <a
              href="/profile"
              className="text-sm text-[#6b7068] transition-colors hover:text-[#242923]"
            >
              Account
            </a>
          </header>

          <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
            <div className="mb-10 max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7068]">
                Your writing workspace
              </p>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                What are we writing today?
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-[#6b7068]">
                Start with an idea. BlogPilot can research your topic, plan
                the structure, and turn it into a complete blog.
              </p>
            </div>

            {/* Prompt form */}
            <form
              onSubmit={handleSubmit}
              className="border border-[#deded5] bg-white"
            >
              <label htmlFor="blog-prompt" className="sr-only">
                Describe the blog you want to write
              </label>

              <textarea
                id="blog-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe your topic, intended audience, or the ideas you want to explore..."
                rows={5}
                maxLength={5000}
                className="w-full resize-y border-0 bg-transparent px-5 py-5 text-sm leading-7 outline-none placeholder:text-[#898d85] focus:ring-0"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7e7df] px-4 py-3">
                <span className="text-xs text-[#777b73]">
                  {prompt.length}/5000 characters
                </span>

                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="inline-flex items-center gap-3 bg-[#34483a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#28392d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Generate blog
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>

            {/* Recent blogs */}
            <section className="mt-14">
              <div className="mb-5 flex items-center justify-between border-b border-[#deded5] pb-3">
                <h2 className="text-base font-semibold">Recent writing</h2>

                <a
                  href="/blogs"
                  className="text-sm text-[#6b7068] transition-colors hover:text-[#34483a]"
                >
                  View all →
                </a>
              </div>

              <div className="divide-y divide-[#deded5]">
                {recentBlogs.map((blog) => (
                  <a
                    key={blog.id}
                    href="/blogs"
                    className="flex flex-col gap-3 py-5 transition-colors hover:bg-[#efeee8] sm:flex-row sm:items-center sm:justify-between sm:px-3"
                  >
                    <div>
                      <h3 className="text-sm font-medium">{blog.title}</h3>
                      <p className="mt-1 text-sm text-[#6b7068]">
                        {blog.description}
                      </p>
                    </div>

                    <span className="text-xs text-[#777b73]">
                      {blog.status}
                    </span>
                  </a>
                ))}
              </div>
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
