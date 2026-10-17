"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

const MAX_AVATAR_MB = 5;

const inputClass =
  "h-12 w-full rounded-md border border-[#d5d6cd] bg-white px-3.5 text-[15px] outline-none transition placeholder:text-[#92958d] focus:border-[#34483a] focus:ring-2 focus:ring-[#34483a]/15";

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function getPasswordChecks(password) {
  return [
    { id: "length", label: "8+ characters", met: password.length >= 8 },
    { id: "case", label: "Upper & lower case", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { id: "number", label: "A number", met: /\d/.test(password) },
    { id: "symbol", label: "A symbol", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

function getStrength(password) {
  if (!password) return { score: 0, label: "", color: "#d5d6cd" };
  let score = getPasswordChecks(password).filter((c) => c.met).length;
  if (password.length >= 12) score += 1;
  if (password.length < 8) score = Math.min(score, 1);

  if (score <= 1) return { score: 1, label: "Too weak", color: "#b2453b" };
  if (score === 2) return { score: 2, label: "Fair", color: "#c0862d" };
  if (score === 3) return { score: 3, label: "Good", color: "#6f8f4a" };
  return { score: 4, label: "Strong", color: "#34483a" };
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, isAuthenticated } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const fileInputRef = useRef(null);

  const strength = useMemo(() => getStrength(password), [password]);
  const checks = useMemo(() => getPasswordChecks(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsDiffer = confirmPassword.length > 0 && password !== confirmPassword;

  const canSubmit =
    name.trim() && email.trim() && password.length >= 8 && passwordsMatch && !submitting;

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!avatar) {
      setAvatarPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(avatar);
    setAvatarPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatar]);

  function handleAvatarChange(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, WebP or GIF).");
      return;
    }

    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setError(`That image is too large. Please choose one under ${MAX_AVATAR_MB} MB.`);
      return;
    }

    setError("");
    setAvatar(file);
  }

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
        <p className="text-sm text-[#6b7068]" role="status">
          Loading your workspace...
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
            Turn your ideas into thoughtful writing.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[#59605a]">
            Create your workspace to research topics, plan articles, and develop
            complete blog posts with AI assistance.
          </p>

          <ul className="mt-10 space-y-4 text-sm text-[#3d453f]">
            <li className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 text-[#34483a]">✓</span>
              Research a topic and keep the sources with your draft.
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 text-[#34483a]">✓</span>
              Review the outline before the full post is written.
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 text-[#34483a]">✓</span>
              Save every blog to your own library.
            </li>
          </ul>
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
            Already registered?{" "}
            <Link
              href="/login"
              className="font-medium text-[#34483a] underline underline-offset-4 hover:text-[#28392d]"
            >
              Sign in
            </Link>
          </p>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-semibold tracking-tight">Create your account</h2>
            <p className="mt-3 text-sm leading-6 text-[#6b7068]">
              It takes less than a minute. No card needed.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-7 flex items-start justify-between gap-3 rounded-md border border-[#e5c9c4] bg-[#f8eeeb] px-4 py-3 text-sm text-[#852f28]"
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

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt="Profile photo preview"
                    className="size-16 shrink-0 rounded-full border border-[#deded5] object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex size-16 shrink-0 items-center justify-center rounded-full border border-dashed border-[#b9bdb1] bg-white text-lg font-semibold text-[#34483a]"
                  >
                    {getInitials(name) || "+"}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Profile photo <span className="font-normal text-[#777b73]">(optional)</span>
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-md border border-[#d5d6cd] bg-white px-3 py-1.5 text-sm hover:bg-[#f0f1eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34483a]"
                    >
                      {avatar ? "Change" : "Upload"}
                    </button>
                    {avatar && (
                      <button
                        type="button"
                        onClick={() => setAvatar(null)}
                        className="text-sm text-[#6b7068] underline underline-offset-4 hover:text-[#242923]"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-xs text-[#777b73]">
                    {avatar ? avatar.name : `JPG, PNG or WebP, up to ${MAX_AVATAR_MB} MB.`}
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  id="avatar"
                  name="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="sr-only"
                  tabIndex={-1}
                />
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
                  autoFocus
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className={inputClass}
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
                  className={inputClass}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyUp={(event) =>
                      setCapsLock(event.getModifierState?.("CapsLock") || false)
                    }
                    onBlur={() => setCapsLock(false)}
                    placeholder="At least 8 characters"
                    aria-describedby="password-help"
                    className={`${inputClass} pr-16`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide passwords" : "Show passwords"}
                    className="absolute inset-y-0 right-0 px-3.5 text-xs font-medium text-[#6b7068] hover:text-[#242923] focus:outline-none focus-visible:text-[#34483a]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {capsLock && (
                  <p className="mt-1.5 text-xs text-[#9a6a1f]" role="status">
                    Caps Lock is on.
                  </p>
                )}

                {password && (
                  <div id="password-help" className="mt-3">
                    <div className="flex gap-1.5" aria-hidden="true">
                      {[1, 2, 3, 4].map((segment) => (
                        <span
                          key={segment}
                          className="h-1.5 flex-1 rounded-full transition-colors"
                          style={{
                            backgroundColor: strength.score >= segment ? strength.color : "#e3e4dc",
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="font-medium" style={{ color: strength.color }} aria-live="polite">
                        {strength.label}
                      </span>
                      {checks.map((check) => (
                        <span
                          key={check.id}
                          className={check.met ? "text-[#34483a]" : "text-[#8a8e85]"}
                        >
                          {check.met ? "✓" : "○"} {check.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">
                  Confirm password
                </label>
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
                  aria-describedby="confirm-status"
                  className={inputClass}
                />
                <p
                  id="confirm-status"
                  aria-live="polite"
                  className={`mt-1.5 h-4 text-xs ${
                    passwordsMatch ? "text-[#34483a]" : "text-[#b2453b]"
                  }`}
                >
                  {passwordsMatch && "Passwords match."}
                  {passwordsDiffer && "Passwords don't match yet."}
                </p>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#34483a] px-4 text-[15px] font-medium text-white transition-colors hover:bg-[#28392d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34483a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && (
                  <span
                    aria-hidden="true"
                    className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                )}
                {submitting ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-[#777b73]">
              By creating an account, you agree to use BlogPilot responsibly.
            </p>
          </div>
        </div>

        <footer className="px-6 py-4 text-center text-xs text-[#777b73]">
          BlogPilot · Your ideas, thoughtfully developed.
        </footer>
      </section>
    </main>
  );
}