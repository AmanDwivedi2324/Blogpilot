"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

const STEPS = [
  { id: "email", label: "Email" },
  { id: "otp", label: "Verify" },
  { id: "password", label: "New password" },
];

const inputClass =
  "h-12 w-full rounded-md border border-[#d5d6cd] bg-white px-3.5 text-[15px] outline-none transition placeholder:text-[#92958d] focus:border-[#34483a] focus:ring-2 focus:ring-[#34483a]/15";

const primaryButtonClass =
  "flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#34483a] px-4 text-[15px] font-medium text-white transition-colors hover:bg-[#28392d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34483a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function maskEmail(value) {
  const [name, domain] = value.split("@");
  if (!name || !domain) return value;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"•".repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

function getPasswordChecks(password) {
  return [
    { id: "length", label: "At least 8 characters", met: password.length >= 8, required: true },
    { id: "case", label: "Upper and lower case letters", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { id: "number", label: "A number", met: /\d/.test(password) },
    { id: "symbol", label: "A symbol (e.g. ! @ # $)", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

function getStrength(password) {
  if (!password) return { score: 0, label: "", color: "#d5d6cd" };
  const checks = getPasswordChecks(password);
  let score = checks.filter((c) => c.met).length;
  if (password.length >= 12) score += 1;
  if (password.length < 8) score = Math.min(score, 1);

  if (score <= 1) return { score: 1, label: "Too weak", color: "#b2453b" };
  if (score === 2) return { score: 2, label: "Fair", color: "#c0862d" };
  if (score === 3) return { score: 3, label: "Good", color: "#6f8f4a" };
  return { score: 4, label: "Strong", color: "#34483a" };
}

/* ------------------------------------------------------------------ */
/* Components                                                          */
/* ------------------------------------------------------------------ */

function Stepper({ activeIndex }) {
  return (
    <ol className="mb-8 flex items-center" aria-label="Progress">
      {STEPS.map((item, index) => {
        const done = index < activeIndex;
        const current = index === activeIndex;
        return (
          <li
            key={item.id}
            aria-current={current ? "step" : undefined}
            className={`flex items-center ${index < STEPS.length - 1 ? "flex-1" : ""}`}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                done
                  ? "border-[#34483a] bg-[#34483a] text-white"
                  : current
                  ? "border-[#34483a] bg-white text-[#34483a]"
                  : "border-[#d5d6cd] bg-white text-[#92958d]"
              }`}
            >
              {done ? "✓" : index + 1}
            </span>
            <span
              className={`ml-2 hidden text-xs sm:inline ${
                current ? "font-medium text-[#242923]" : "text-[#92958d]"
              }`}
            >
              {item.label}
            </span>
            {index < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={`mx-3 h-px flex-1 transition-colors ${
                  done ? "bg-[#34483a]" : "bg-[#d5d6cd]"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function OtpInput({ value, onChange, disabled, hasError }) {
  const refs = useRef([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] || "");

  const focusAt = (index) => {
    const el = refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const setDigit = (index, digit) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join("").slice(0, OTP_LENGTH));
  };

  const handleChange = (index, event) => {
    const raw = event.target.value.replace(/\D/g, "");
    if (!raw) {
      setDigit(index, "");
      return;
    }
    if (raw.length > 1) {
      // Autofill or multi-character input: spread across the boxes.
      const merged = (value.slice(0, index) + raw).slice(0, OTP_LENGTH);
      onChange(merged);
      focusAt(Math.min(merged.length, OTP_LENGTH - 1));
      return;
    }
    setDigit(index, raw);
    if (index < OTP_LENGTH - 1) focusAt(index + 1);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      setDigit(index - 1, "");
      focusAt(index - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAt(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    focusAt(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="6-digit verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (refs.current[index] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={index === 0}
          maxLength={OTP_LENGTH}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          aria-invalid={hasError || undefined}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`h-14 w-full min-w-0 rounded-md border bg-white text-center text-xl font-semibold outline-none transition focus:border-[#34483a] focus:ring-2 focus:ring-[#34483a]/15 disabled:opacity-60 ${
            hasError ? "border-[#b2453b]" : digit ? "border-[#34483a]" : "border-[#d5d6cd]"
          }`}
        />
      ))}
    </div>
  );
}

function PasswordField({ id, label, value, onChange, show, onToggle, placeholder, autoFocus, describedBy }) {
  const [capsLock, setCapsLock] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          autoFocus={autoFocus}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock") || false)}
          onBlur={() => setCapsLock(false)}
          placeholder={placeholder}
          aria-describedby={describedBy}
          className={`${inputClass} pr-16`}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide passwords" : "Show passwords"}
          className="absolute inset-y-0 right-0 px-3.5 text-xs font-medium text-[#6b7068] hover:text-[#242923] focus:outline-none focus-visible:text-[#34483a]"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {capsLock && <p className="mt-1.5 text-xs text-[#9a6a1f]">Caps Lock is on.</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetSessionToken, setResetSessionToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const activeIndex = Math.max(0, STEPS.findIndex((item) => item.id === step));
  const strength = useMemo(() => getStrength(password), [password]);
  const checks = useMemo(() => getPasswordChecks(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsDiffer = confirmPassword.length > 0 && password !== confirmPassword;

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestOtp({ isResend = false } = {}) {
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      const response = await apiRequest("/api/v1/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
        retry: false,
      });

      setNotice(
        isResend
          ? "A new code has been sent."
          : response.message || "If an account exists with this email, a code has been sent."
      );
      setCooldown(RESEND_SECONDS);
      setOtp("");
      setStep("otp");
    } catch (err) {
      setError(err.message || "Unable to process your request.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSendOtp(event) {
    event.preventDefault();
    requestOtp();
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    if (otp.length !== OTP_LENGTH) return;

    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      const response = await apiRequest("/api/v1/auth/verify-otp", {
        method: "POST",
        body: { email: email.trim(), otp: otp.trim() },
        retry: false,
      });

      const token = response?.data?.resetSessionToken;

      if (!token) {
        throw new Error("OTP verified, but no reset session token was returned.");
      }

      setResetSessionToken(token);
      setNotice("Email verified. Now choose a new password.");
      setStep("password");
    } catch (err) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest("/api/v1/auth/reset-password", {
        method: "POST",
        body: {
          resetSessionToken,
          newPassword: password,
        },
        retry: false,
      });

      setNotice("");
      setStep("success");
    } catch (err) {
      setError(err.message || "Unable to reset your password.");
    } finally {
      setSubmitting(false);
    }
  }

  const heading = {
    email: "Forgot your password?",
    otp: "Check your email",
    password: "Create a new password",
  }[step];

  const subheading = {
    email: "Enter the email you signed up with and we'll send you a 6-digit code.",
    otp: null,
    password: "Pick something you haven't used for this account before.",
  }[step];

  return (
    <main className="grid min-h-screen bg-[#f7f6f2] text-[#242923] lg:grid-cols-[1fr_500px]">
      {/* ---------- Brand panel ---------- */}
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-[#deded5] bg-[#eef0e8] p-10 lg:flex xl:p-14">
        <Link href="/" className="relative z-10 w-fit text-xl font-semibold tracking-tight">
          BlogPilot
        </Link>

        {/* Decorative key-and-lock motif */}
        <svg
          aria-hidden="true"
          viewBox="0 0 400 400"
          className="pointer-events-none absolute -right-24 top-1/2 size-[520px] -translate-y-1/2 text-[#34483a] opacity-[0.07]"
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="140" cy="200" r="78" />
          <circle cx="140" cy="200" r="26" />
          <path d="M218 200h150" />
          <path d="M320 200v52" />
          <path d="M360 200v36" />
        </svg>

        <div className="relative z-10 max-w-xl pb-12">
          <h1 className="max-w-lg text-5xl font-medium leading-[1.15] tracking-tight">
            Locked out?
            <br />
            It happens. Let&rsquo;s fix it.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[#59605a]">
            Confirm your email, enter the code we send, and set a new password.
            It takes about a minute.
          </p>

          <ul className="mt-10 space-y-4 text-sm text-[#3d453f]">
            <li className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 text-[#34483a]">✓</span>
              Your blogs and drafts stay exactly as you left them.
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 text-[#34483a]">✓</span>
              Codes are single-use and expire shortly after they are sent.
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
          <Link
            href="/login"
            className="text-sm text-[#6b7068] underline underline-offset-4 hover:text-[#34483a]"
          >
            Back to sign in
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm">
            {step !== "success" && (
              <>
                <Stepper activeIndex={activeIndex} />

                <h2 className="text-3xl font-semibold tracking-tight">{heading}</h2>
                <p className="mt-3 text-sm leading-6 text-[#6b7068]">
                  {step === "otp" ? (
                    <>
                      We sent a 6-digit code to{" "}
                      <span className="font-medium text-[#242923]">{maskEmail(email.trim())}</span>.
                    </>
                  ) : (
                    subheading
                  )}
                </p>
              </>
            )}

            <div className={step === "success" ? "" : "mt-7"}>
              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-md border border-[#e5c9c4] bg-[#f8eeeb] px-4 py-3 text-sm text-[#852f28]"
                >
                  {error}
                </div>
              )}

              {notice && !error && (
                <div
                  role="status"
                  className="mb-5 rounded-md border border-[#cbd4c8] bg-[#eaece5] px-4 py-3 text-sm text-[#34483a]"
                >
                  {notice}
                </div>
              )}

              {/* ----- Step 1: email ----- */}
              {step === "email" && (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-medium">
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </div>

                  <button type="submit" disabled={submitting || !email.trim()} className={primaryButtonClass}>
                    {submitting ? "Sending code..." : "Send code"}
                  </button>
                </form>
              )}

              {/* ----- Step 2: OTP ----- */}
              {step === "otp" && (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div>
                    <p id="otp-label" className="mb-3 text-sm font-medium">
                      Verification code
                    </p>
                    <OtpInput
                      value={otp}
                      onChange={(next) => {
                        setOtp(next);
                        if (error) setError("");
                      }}
                      disabled={submitting}
                      hasError={Boolean(error)}
                    />
                    <p className="mt-3 text-xs text-[#777b73]">
                      You can paste the code straight from your email.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || otp.length !== OTP_LENGTH}
                    className={primaryButtonClass}
                  >
                    {submitting ? "Verifying..." : "Verify code"}
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setNotice("");
                        setOtp("");
                        setStep("email");
                      }}
                      className="text-[#6b7068] underline underline-offset-4 hover:text-[#34483a]"
                    >
                      Use a different email
                    </button>

                    {cooldown > 0 ? (
                      <span className="text-[#92958d]" aria-live="polite">
                        Resend in {cooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => requestOtp({ isResend: true })}
                        className="font-medium text-[#34483a] underline underline-offset-4 disabled:opacity-60"
                      >
                        Resend code
                      </button>
                    )}
                  </div>

                  <p className="rounded-md bg-[#efefe8] px-3.5 py-3 text-xs leading-5 text-[#6b7068]">
                    Can&rsquo;t find it? Check your spam folder. The message
                    only arrives if an account exists for this email.
                  </p>
                </form>
              )}

              {/* ----- Step 3: new password ----- */}
              {step === "password" && (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div>
                    <PasswordField
                      id="password"
                      label="New password"
                      value={password}
                      onChange={setPassword}
                      show={showPassword}
                      onToggle={() => setShowPassword((current) => !current)}
                      placeholder="At least 8 characters"
                      autoFocus
                      describedBy="password-help"
                    />

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
                      <p
                        className="mt-2 h-4 text-xs font-medium"
                        style={{ color: strength.color }}
                        aria-live="polite"
                      >
                        {strength.label && `Password strength: ${strength.label}`}
                      </p>

                      <ul className="mt-2 space-y-1.5">
                        {checks.map((check) => (
                          <li
                            key={check.id}
                            className={`flex items-center gap-2 text-xs transition-colors ${
                              check.met ? "text-[#34483a]" : "text-[#8a8e85]"
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`flex size-4 items-center justify-center rounded-full border text-[10px] ${
                                check.met
                                  ? "border-[#34483a] bg-[#34483a] text-white"
                                  : "border-[#d5d6cd]"
                              }`}
                            >
                              {check.met ? "✓" : ""}
                            </span>
                            {check.label}
                            {check.required && <span className="text-[#92958d]">(required)</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <PasswordField
                      id="confirmPassword"
                      label="Confirm new password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      show={showPassword}
                      onToggle={() => setShowPassword((current) => !current)}
                      placeholder="Re-enter your new password"
                      describedBy="confirm-status"
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
                    disabled={submitting || password.length < 8 || !passwordsMatch}
                    className={primaryButtonClass}
                  >
                    {submitting ? "Updating password..." : "Reset password"}
                  </button>
                </form>
              )}

              {/* ----- Success ----- */}
              {step === "success" && (
                <div className="py-6" role="status">
                  <div className="mb-6 flex size-14 items-center justify-center rounded-full bg-[#34483a] text-2xl text-white">
                    ✓
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight">Password updated</h2>
                  <p className="mt-4 text-sm leading-6 text-[#6b7068]">
                    You can now sign in to BlogPilot with your new password.
                  </p>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => router.replace("/login")}
                    className={`${primaryButtonClass} mt-7`}
                  >
                    Go to sign in
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="px-6 py-4 text-center text-xs text-[#777b73]">
          BlogPilot · Your ideas, thoughtfully developed.
        </footer>
      </section>
    </main>
  );
}