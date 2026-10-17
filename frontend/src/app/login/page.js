"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

const REMEMBER_KEY = "blogpilot:rememberedEmail";

const inputClass =
  "h-12 w-full rounded-md border border-[#d5d6cd] bg-white px-3.5 text-[15px] outline-none transition placeholder:text-[#92958d] focus:border-[#34483a] focus:ring-2 focus:ring-[#34483a]/15";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill a remembered email address
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRememberEmail(true);
      }
    } catch {
      /* storage unavailable — ignore */
    }
  }, []);

  // Redirect signed-in users (done in an effect, not during render)
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setError("");
    setSubmitting(true);

    try {
      await login(email.trim(), password);

      try {
        if (rememberEmail) window.localStorage.setItem(REMEMBER_KEY, email.trim());
        else window.localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* ignore */
      }

      router.replace("/");
    } catch (err) {
      setError(err.message || "Unable to sign in. Please try again.");
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2]">
        <p className="text-sm text-[#6b7068]" role="status">
          {isAuthenticated ? "Taking you to your workspace..." : "Restoring your session..."}
        </p>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-[#f7f6f2] text-[#242923] lg:grid-cols-[1fr_500px]">
      {/* ---------- Brand panel ---------- */}
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-[#deded5] bg-[#eef0e8] p-10 lg:flex xl:p-14">
        <Link href="/" className="relative z-10 w-fit text-xl font-semibold tracking-tight">
          BlogPilot
        </Link>

        {/* Decorative page-and-pen motif */}
        <svg
          aria-hidden="true"
          viewBox="0 0 400 400"
          className="pointer-events-none absolute -right-20 top-1/2 size-[520px] -translate-y-1/2 text-[#34483a] opacity-[0.07]"
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="70" y="50" width="220" height="290" rx="18" />
          <path d="M115 120h130M115 170h130M115 220h80" />
          <path d="M250 330l20-70 90-90 50 50-90 90z" />
        </svg>

        <div className="relative z-10 max-w-xl pb-12">
          <h1 className="max-w-lg text-5xl font-medium leading-[1.15] tracking-tight">
            Good writing begins with a good idea.
          </h1>

          <p className="mt-6 max-w-md text-base leading-7 text-[#59605a]">
            Research your topic, build a clear outline, and turn your thinking
            into well-structured blogs.
          </p>

          <ol className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#3d453f]">
            {["Research", "Plan", "Write", "Refine"].map((item, index, list) => (
              <li key={item} className="flex items-center gap-3">
                <span className="font-medium">{item}</span>
                {index < list.length - 1 && (
                  <span aria-hidden="true" className="h-px w-6 bg-[#9fb3a5]" />
                )}
              </li>
            ))}
          </ol>
        </div>

        <p className="relative z-10 text-xs text-[#777b73]">
          BlogPilot · AI-assisted writing workspace
        </p>
      </section>

      {/* ---------- Form panel ---------- */}
      <section className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between px-6 lg:justify-end lg:px-10">
          <Link href="/" className="text-lg font-semibold tracking-tight lg:hidden">
            BlogPilot
          </Link>

          <p className="text-sm text-[#6b7068]">
            New here?{" "}
            <Link
              href="/register"
              className="font-medium text-[#34483a] underline underline-offset-4 hover:text-[#28392d]"
            >
              Create an account
            </Link>
          </p>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-3 text-sm leading-6 text-[#6b7068]">
              Sign in to continue working on your ideas and saved blogs.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-7 rounded-md border border-[#e5c9c4] bg-[#f8eeeb] px-4 py-3 text-sm text-[#852f28]"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium">
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus={!email}
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="password" className="block text-sm font-medium">
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs text-[#6b7068] underline underline-offset-4 hover:text-[#34483a]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    autoFocus={Boolean(email)}
                    required
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (error) setError("");
                    }}
                    onKeyUp={(event) =>
                      setCapsLock(event.getModifierState?.("CapsLock") || false)
                    }
                    onBlur={() => setCapsLock(false)}
                    placeholder="Enter your password"
                    className={`${inputClass} pr-16`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 px-3.5 text-xs font-medium text-[#6b7068] hover:text-[#242923] focus:outline-none focus-visible:text-[#34483a]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {capsLock && (
                  <p className="mt-1.5 text-xs text-[#9a6a1f]" role="status">
                    Caps Lock is on.
                  </p>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#3d453f]">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(event) => setRememberEmail(event.target.checked)}
                  className="size-4 rounded border-[#d5d6cd] accent-[#34483a]"
                />
                Remember my email on this device
              </label>

              <button
                type="submit"
                disabled={submitting || !email.trim() || !password}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#34483a] px-4 text-[15px] font-medium text-white transition-colors hover:bg-[#28392d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34483a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && (
                  <span
                    aria-hidden="true"
                    className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                )}
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>

        <footer className="px-6 py-4 text-center text-xs text-[#777b73]">
          By continuing, you agree to use BlogPilot responsibly.
        </footer>
      </section>
    </main>
  );
}