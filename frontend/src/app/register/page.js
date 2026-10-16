
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, isAuthenticated } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    setSubmitting(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        avatar,
      });
      router.replace("/");
    } catch (err) {
      setError(err.message || "Unable to create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2]">
        <p className="text-sm text-[#6b7068]">Loading your workspace...</p>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-[#f7f6f2] text-[#242923] lg:grid-cols-[1fr_460px]">
      <section className="hidden flex-col justify-between border-r border-[#deded5] p-10 lg:flex xl:p-14">
        <Link href="/" className="w-fit text-xl font-semibold tracking-tight">
          BlogPilot
        </Link>

        <div className="max-w-xl pb-12">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7068]">
            Start with an idea
          </p>
          <h1 className="max-w-lg text-5xl font-medium leading-[1.15] tracking-tight">
            Turn your ideas into thoughtful writing.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[#6b7068]">
            Create your workspace to research topics, plan articles, and develop
            complete blog posts with AI assistance.
          </p>
          <div className="mt-10 border-l-2 border-[#34483a] pl-4">
            <p className="text-sm font-medium">One workspace for your writing.</p>
            <p className="mt-1 text-sm text-[#6b7068]">
              Research. Plan. Write. Refine.
            </p>
          </div>
        </div>

        <p className="text-xs text-[#777b73]">
          BlogPilot · AI-assisted writing workspace
        </p>
      </section>

      <section className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between border-b border-[#deded5] px-6 lg:justify-end lg:border-b-0 lg:px-10">
          <Link href="/" className="text-lg font-semibold tracking-tight lg:hidden">
            BlogPilot
          </Link>
          <p className="text-sm text-[#6b7068]">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-medium text-[#34483a] underline underline-offset-4 hover:text-[#28392d]"
            >
              Sign in
            </Link>
          </p>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7068]">
                Create your account
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Get started with BlogPilot
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#6b7068]">
                Set up your account and start developing your ideas.
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
                <label htmlFor="avatar" className="mb-2 block text-sm font-medium">
                  Profile photo <span className="text-[#777b73]">(optional)</span>
                </label>

                <input
                  id="avatar"
                  name="avatar"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setAvatar(event.target.files?.[0] || null);
                  }}
                  className="block w-full border border-[#d5d6cd] bg-white px-3 py-2.5 text-sm file:mr-3 file:border file:border-[#deded5] file:bg-white file:px-3 file:py-1.5 file:text-sm"
                />

                <p className="mt-2 text-xs text-[#777b73]">
                  Upload an image for your profile.
                </p>
              </div>

              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="h-11 w-full border border-[#d5d6cd] bg-white px-3 text-sm outline-none placeholder:text-[#92958d] focus:border-[#34483a]"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium">
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
                  className="h-11 w-full border border-[#d5d6cd] bg-white px-3 text-sm outline-none placeholder:text-[#92958d] focus:border-[#34483a]"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="h-11 w-full border border-[#d5d6cd] bg-white px-3 text-sm outline-none placeholder:text-[#92958d] focus:border-[#34483a]"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium">
                    Confirm password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="text-xs text-[#6b7068] hover:text-[#242923]"
                  >
                    {showPassword ? "Hide passwords" : "Show passwords"}
                  </button>
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  className="h-11 w-full border border-[#d5d6cd] bg-white px-3 text-sm outline-none placeholder:text-[#92958d] focus:border-[#34483a]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex h-11 w-full items-center justify-center gap-2 bg-[#34483a] px-4 text-sm font-medium text-white transition-colors hover:bg-[#28392d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating account..." : "Create account"}
                {!submitting && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <p className="mt-7 text-center text-xs leading-5 text-[#777b73]">
              By creating an account, you agree to use BlogPilot responsibly.
            </p>
          </div>
        </div>

        <footer className="border-t border-[#deded5] px-6 py-4 text-center text-xs text-[#777b73]">
          BlogPilot · Your ideas, thoughtfully developed.
        </footer>
      </section>
    </main>
  );
}
