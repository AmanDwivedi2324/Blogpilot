"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(err.message || "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2]">
        <p className="text-sm text-[#6b7068]">Restoring your session...</p>
      </main>
    );
  }

  if (isAuthenticated) {
    router.replace("/");
    return null;
  }

  return (
    <main className="grid min-h-screen bg-[#f7f6f2] text-[#242923] lg:grid-cols-[1fr_460px]">
      {/* Brand panel */}
      <section className="hidden flex-col justify-between border-r border-[#deded5] p-10 lg:flex xl:p-14">
        <Link href="/" className="w-fit text-xl font-semibold tracking-tight">
          BlogPilot
        </Link>

        <div className="max-w-xl pb-12">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7068]">
            A workspace for ideas
          </p>

          <h1 className="max-w-lg text-5xl font-medium leading-[1.15] tracking-tight">
            Good writing begins with a good idea.
          </h1>

          <p className="mt-6 max-w-md text-base leading-7 text-[#6b7068]">
            Research your topic, build a clear outline, and turn your thinking
            into thoughtful, well-structured blogs.
          </p>

          <div className="mt-10 border-l-2 border-[#34483a] pl-4">
            <p className="text-sm font-medium">Your ideas, thoughtfully developed.</p>
            <p className="mt-1 text-sm text-[#6b7068]">
              Research. Plan. Write. Refine.
            </p>
          </div>
        </div>

        <p className="text-xs text-[#777b73]">
          BlogPilot · AI-assisted writing workspace
        </p>
      </section>

      {/* Login form */}
      <section className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between border-b border-[#deded5] px-6 lg:justify-end lg:border-b-0 lg:px-10">
          <Link href="/" className="text-lg font-semibold tracking-tight lg:hidden">
            BlogPilot
          </Link>

          <p className="text-sm text-[#6b7068]">
            New to BlogPilot?{" "}
            <Link
              href="/register"
              className="font-medium text-[#34483a] underline underline-offset-4 hover:text-[#28392d]"
            >
              Create an account
            </Link>
          </p>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7068]">
                Welcome back
              </p>

              <h2 className="text-3xl font-semibold tracking-tight">
                Sign in to your account
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#6b7068]">
                Continue working on your ideas and saved blogs.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 border-l-2 border-red-700 bg-[#f3e9e6] px-4 py-3 text-sm text-[#852f28]"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-11 w-full border border-[#d5d6cd] bg-white px-3 text-sm outline-none transition-colors placeholder:text-[#92958d] focus:border-[#34483a]"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs text-[#6b7068] underline underline-offset-4 hover:text-[#34483a]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="flex h-11 border border-[#d5d6cd] bg-white focus-within:border-[#34483a]">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[#92958d]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="px-3 text-xs text-[#6b7068] hover:text-[#242923]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex h-11 w-full items-center justify-center gap-2 bg-[#34483a] px-4 text-sm font-medium text-white transition-colors hover:bg-[#28392d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing in..." : "Sign in"}
                {!submitting && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <div className="my-7 border-t border-[#deded5]" />

            <p className="text-center text-sm leading-6 text-[#6b7068]">
              Your writing workspace is waiting for you.
            </p>
          </div>
        </div>

        <footer className="border-t border-[#deded5] px-6 py-4 text-center text-xs text-[#777b73]">
          By continuing, you agree to use BlogPilot responsibly.
        </footer>
      </section>
    </main>
  );
}