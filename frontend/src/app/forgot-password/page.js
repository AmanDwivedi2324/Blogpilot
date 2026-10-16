
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";

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

  async function handleSendOtp(event) {
    event.preventDefault();
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
        response.message ||
          "If an account exists with this email, an OTP has been sent."
      );
      setStep("otp");
    } catch (err) {
      setError(err.message || "Unable to process your request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
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
      setNotice("Email verified. You can now set a new password.");
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

      setNotice("Your password has been updated. Please sign in with your new password.");
      setStep("success");
    } catch (err) {
      setError(err.message || "Unable to reset your password.");
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [
    { id: "email", label: "Email" },
    { id: "otp", label: "Verification" },
    { id: "password", label: "New password" },
  ];

  const activeIndex = steps.findIndex((item) => item.id === step);

  return (
    <main className="grid min-h-screen bg-[#f7f6f2] text-[#242923] lg:grid-cols-[1fr_460px]">
      <section className="hidden flex-col justify-between border-r border-[#deded5] p-10 lg:flex xl:p-14">
        <Link href="/" className="w-fit text-xl font-semibold tracking-tight">
          BlogPilot
        </Link>

        <div className="max-w-xl pb-12">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7068]">
            Account recovery
          </p>
          <h1 className="max-w-lg text-5xl font-medium leading-[1.15] tracking-tight">
            Get back to your ideas.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[#6b7068]">
            Verify your email and create a new password to get back to your
            writing workspace.
          </p>

          <div className="mt-10 border-l-2 border-[#34483a] pl-4">
            <p className="text-sm font-medium">Your work, right where you left it.</p>
            <p className="mt-1 text-sm text-[#6b7068]">
              Your account recovery starts here.
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
          <Link
            href="/login"
            className="text-sm text-[#6b7068] underline underline-offset-4 hover:text-[#34483a]"
          >
            Back to sign in
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            {step !== "success" && (
              <>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7068]">
                  Account recovery
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  {step === "email" && "Forgot your password?"}
                  {step === "otp" && "Check your email"}
                  {step === "password" && "Create a new password"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#6b7068]">
                  {step === "email" &&
                    "Enter your account email and we'll send you a verification code."}
                  {step === "otp" &&
                    `Enter the verification code sent to ${email.trim()}.`}
                  {step === "password" &&
                    "Choose a strong password you haven't used for this account before."}
                </p>

                <div className="mb-8 mt-7 grid grid-cols-3 border-b border-[#deded5]">
                  {steps.map((item, index) => (
                    <div
                      key={item.id}
                      className={`border-b-2 px-1 pb-3 text-center text-xs ${
                        index <= activeIndex
                          ? "border-[#34483a] font-medium text-[#34483a]"
                          : "border-transparent text-[#92958d]"
                      }`}
                    >
                      <span className="mr-1">{index + 1}.</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </>
            )}

            {error && (
              <div
                role="alert"
                className="mb-5 border-l-2 border-red-700 bg-[#f3e9e6] px-4 py-3 text-sm text-[#852f28]"
              >
                {error}
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="mb-5 border-l-2 border-[#34483a] bg-[#eaece5] px-4 py-3 text-sm text-[#34483a]"
              >
                {notice}
              </div>
            )}

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
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-11 w-full border border-[#d5d6cd] bg-white px-3 text-sm outline-none placeholder:text-[#92958d] focus:border-[#34483a]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-11 w-full items-center justify-center gap-2 bg-[#34483a] px-4 text-sm font-medium text-white transition-colors hover:bg-[#28392d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Sending code..." : "Send verification code"}
                  {!submitting && <span aria-hidden="true">→</span>}
                </button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label htmlFor="otp" className="mb-2 block text-sm font-medium">
                    Verification code
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="Enter 6-digit OTP"
                    className="h-11 w-full border border-[#d5d6cd] bg-white px-3 text-sm tracking-[0.2em] outline-none placeholder:tracking-normal placeholder:text-[#92958d] focus:border-[#34483a]"
                  />
                  <p className="mt-2 text-xs text-[#777b73]">
                    Enter the code sent to your email address.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || otp.length !== 6}
                  className="flex h-11 w-full items-center justify-center gap-2 bg-[#34483a] px-4 text-sm font-medium text-white transition-colors hover:bg-[#28392d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Verifying..." : "Verify code"}
                  {!submitting && <span aria-hidden="true">→</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setNotice("");
                    setOtp("");
                    setStep("email");
                  }}
                  className="w-full text-center text-sm text-[#6b7068] underline underline-offset-4 hover:text-[#34483a]"
                >
                  Change email address
                </button>
              </form>
            )}

            {step === "password" && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium">
                    New password
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
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium"
                    >
                      Confirm new password
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
                    placeholder="Re-enter your new password"
                    className="h-11 w-full border border-[#d5d6cd] bg-white px-3 text-sm outline-none placeholder:text-[#92958d] focus:border-[#34483a]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-11 w-full items-center justify-center gap-2 bg-[#34483a] px-4 text-sm font-medium text-white transition-colors hover:bg-[#28392d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Updating password..." : "Reset password"}
                  {!submitting && <span aria-hidden="true">→</span>}
                </button>
              </form>
            )}

            {step === "success" && (
              <div className="py-8">
                <div className="mb-6 flex size-12 items-center justify-center border border-[#cbd4c8] bg-[#eaece5] text-xl text-[#34483a]">
                  ✓
                </div>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Password updated
                </h2>
                <p className="mt-4 text-sm leading-6 text-[#6b7068]">
                  Your password has been changed successfully. Sign in using
                  your new password to continue to BlogPilot.
                </p>
                <button
                  type="button"
                  onClick={() => router.replace("/login")}
                  className="mt-7 flex h-11 w-full items-center justify-center gap-2 bg-[#34483a] px-4 text-sm font-medium text-white transition-colors hover:bg-[#28392d]"
                >
                  Go to sign in <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="border-t border-[#deded5] px-6 py-4 text-center text-xs text-[#777b73]">
          BlogPilot · Your ideas, thoughtfully developed.
        </footer>
      </section>
    </main>
  );
}
