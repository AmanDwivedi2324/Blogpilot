"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const MAX_AVATAR_MB = 5;
const NAME_MAX = 100;

const inputClass =
  "h-12 w-full rounded-md border border-[#d5d6cd] bg-white px-3.5 text-[15px] outline-none transition placeholder:text-[#92958d] focus:border-[#34483a] focus:ring-2 focus:ring-[#34483a]/15";

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function formatMemberSince(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse px-5 py-10 sm:px-8 sm:py-14" aria-busy="true">
      <div className="h-8 w-40 rounded bg-[#e7e7df]" />
      <div className="mt-3 h-4 w-72 rounded bg-[#efefe8]" />
      <div className="mt-9 flex items-center gap-5 rounded-lg border border-[#deded5] bg-white p-6">
        <div className="size-20 rounded-full bg-[#e7e7df]" />
        <div className="space-y-2">
          <div className="h-4 w-44 rounded bg-[#e7e7df]" />
          <div className="h-3 w-56 rounded bg-[#efefe8]" />
        </div>
      </div>
      <div className="mt-6 space-y-4 rounded-lg border border-[#deded5] bg-white p-6">
        <div className="h-12 rounded bg-[#efefe8]" />
        <div className="h-12 rounded bg-[#efefe8]" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, loading, isAuthenticated, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fileInputRef = useRef(null);
  const messageTimer = useRef(null);

  /* ---------- auth redirect ---------- */

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  /* ---------- load profile ---------- */

  const loadProfile = useCallback(async (isActive = () => true) => {
    setPageLoading(true);
    setLoadFailed(false);
    setError("");

    try {
      const response = await apiRequest("/api/v1/users/me");
      const currentUser = response?.data?.user;

      if (!currentUser) {
        throw new Error("Profile information was not returned by the server.");
      }

      if (isActive()) {
        setProfile(currentUser);
        setName(currentUser.name || "");
        setAvatarPreview(currentUser.avatar?.url || "");
      }
    } catch (err) {
      if (isActive()) {
        setLoadFailed(true);
        setError(err.message || "Unable to load your profile.");
      }
    } finally {
      if (isActive()) setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    let active = true;
    loadProfile(() => active);

    return () => {
      active = false;
    };
  }, [loading, isAuthenticated, loadProfile]);

  /* ---------- avatar preview ---------- */

  useEffect(() => {
    if (!avatarFile) return;

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  /* ---------- success message auto-dismiss ---------- */

  useEffect(() => {
    if (!message) return;
    clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(messageTimer.current);
  }, [message]);

  /* ---------- unsaved changes ---------- */

  const isDirty = useMemo(() => {
    if (!profile) return false;
    return name.trim() !== (profile.name || "").trim() || Boolean(avatarFile);
  }, [name, avatarFile, profile]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  /* ---------- actions ---------- */

  function chooseFile(file) {
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
    setMessage("");
    setAvatarFile(file);
  }

  function handleFileInput(event) {
    chooseFile(event.target.files?.[0] || null);
    event.target.value = ""; // allow re-selecting the same file
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0] || null);
  }

  function discardChanges() {
    setName(profile?.name || "");
    setAvatarFile(null);
    setAvatarPreview(profile?.avatar?.url || "");
    setError("");
    setMessage("");
  }

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name.trim());

    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    setSaving(true);

    try {
      const response = await apiRequest("/api/v1/users/me", {
        method: "PATCH",
        body: formData,
      });

      const updatedUser = response?.data?.user;

      if (updatedUser) {
        setProfile(updatedUser);
        setName(updatedUser.name || "");
        setAvatarPreview(updatedUser.avatar?.url || "");
        setAvatarFile(null);
      } else {
        // Server returned no user — treat what we sent as saved.
        setProfile((current) => (current ? { ...current, name: name.trim() } : current));
        setAvatarFile(null);
      }

      setMessage(response?.message || "Profile updated.");
    } catch (err) {
      setError(err.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (isDirty && !window.confirm("You have unsaved changes. Log out anyway?")) return;

    setLoggingOut(true);

    try {
      await logout();
      router.replace("/login");
    } catch (err) {
      setError(err.message || "Logout failed.");
    } finally {
      setLoggingOut(false);
    }
  }

  /* ---------- render ---------- */

  const displayName = profile?.name || authUser?.name || "";
  const email = profile?.email || authUser?.email || "";
  const memberSince = formatMemberSince(profile?.createdAt);

  const header = (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b border-[#deded5] px-5 py-3 sm:px-8">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        BlogPilot
      </Link>

      <nav className="flex items-center gap-4 sm:gap-5">
        <Link href="/" className="text-sm text-[#6b7068] hover:text-[#242923]">
          Write
        </Link>
        <Link href="/blogs" className="text-sm text-[#6b7068] hover:text-[#242923]">
          My blogs
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut || loading || !isAuthenticated}
          className="rounded-md border border-[#d5d6cd] bg-white px-3 py-1.5 text-sm font-medium text-[#242923] transition-colors hover:bg-[#f0f1eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34483a] disabled:opacity-50"
        >
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      </nav>
    </header>
  );

  if (loading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] text-sm text-[#6b7068]">
        <p role="status">Loading profile...</p>
      </main>
    );
  }

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-[#f7f6f2] text-[#242923]">
        {header}
        <ProfileSkeleton />
      </main>
    );
  }

  if (loadFailed) {
    return (
      <main className="min-h-screen bg-[#f7f6f2] text-[#242923]">
        {header}
        <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">We couldn&rsquo;t load your profile</h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-[#6b7068]">
            {error || "Something went wrong. Please try again."}
          </p>
          <button
            type="button"
            onClick={() => loadProfile()}
            className="mt-6 h-11 rounded-md bg-[#34483a] px-6 text-sm font-medium text-white hover:bg-[#28392d]"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#242923]">
      {header}

      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
          <p className="mt-3 text-sm leading-6 text-[#6b7068]">
            Update how your name and photo appear in BlogPilot.
          </p>
        </div>

        {/* Identity summary */}
        <div className="mb-6 flex items-center gap-4 rounded-lg border border-[#deded5] bg-white p-5 sm:p-6">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt=""
              className="size-14 shrink-0 rounded-full border border-[#deded5] object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#e8ece4] text-lg font-semibold text-[#34483a]"
            >
              {getInitials(displayName)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{displayName || "Your account"}</p>
            <p className="truncate text-sm text-[#6b7068]">{email}</p>
            {memberSince && (
              <p className="mt-0.5 text-xs text-[#777b73]">Member since {memberSince}</p>
            )}
          </div>
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

        {message && (
          <div
            role="status"
            className="mb-5 rounded-md border border-[#cbd4c8] bg-[#eaece5] px-4 py-3 text-sm text-[#34483a]"
          >
            ✓ {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Photo */}
          <section className="rounded-lg border border-[#deded5] bg-white p-5 sm:p-7">
            <h2 className="text-base font-semibold">Profile photo</h2>
            <p className="mt-1 text-sm text-[#6b7068]">
              JPG, PNG, WebP or GIF, up to {MAX_AVATAR_MB} MB.
            </p>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`mt-5 flex flex-col items-center gap-5 rounded-md border-2 border-dashed p-5 transition-colors sm:flex-row ${
                dragging ? "border-[#34483a] bg-[#eaece5]" : "border-[#d5d6cd] bg-[#fafaf7]"
              }`}
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Profile photo preview"
                  className="size-24 shrink-0 rounded-full border border-[#deded5] object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex size-24 shrink-0 items-center justify-center rounded-full bg-[#e8ece4] text-3xl font-semibold text-[#34483a]"
                >
                  {getInitials(name || displayName)}
                </div>
              )}

              <div className="min-w-0 text-center sm:text-left">
                <p className="text-sm text-[#3d453f]">
                  {dragging ? "Drop the image here" : "Drag an image here, or"}
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md border border-[#d5d6cd] bg-white px-3.5 py-2 text-sm font-medium hover:bg-[#f0f1eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34483a]"
                  >
                    {avatarPreview ? "Choose a different image" : "Choose an image"}
                  </button>
                  {avatarFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(profile?.avatar?.url || "");
                      }}
                      className="rounded-md px-3 py-2 text-sm text-[#6b7068] underline underline-offset-4 hover:text-[#242923]"
                    >
                      Undo
                    </button>
                  )}
                </div>
                {avatarFile ? (
                  <p className="mt-2 truncate text-xs text-[#34483a]">
                    New photo selected: {avatarFile.name}. Save to apply it.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[#777b73]">
                    Your current photo stays unless you pick a new one.
                  </p>
                )}
              </div>

              <input
                ref={fileInputRef}
                id="avatar"
                name="avatar"
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="sr-only"
                tabIndex={-1}
              />
            </div>
          </section>

          {/* Details */}
          <section className="space-y-5 rounded-lg border border-[#deded5] bg-white p-5 sm:p-7">
            <h2 className="text-base font-semibold">Personal details</h2>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="name" className="block text-sm font-medium">
                  Full name
                </label>
                <span className="text-xs text-[#92958d]" aria-hidden="true">
                  {name.length}/{NAME_MAX}
                </span>
              </div>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                maxLength={NAME_MAX}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError("");
                  if (message) setMessage("");
                }}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                readOnly
                aria-describedby="email-help"
                className="h-12 w-full cursor-not-allowed rounded-md border border-[#deded5] bg-[#f3f3ee] px-3.5 text-[15px] text-[#6b7068] outline-none"
              />
              <p id="email-help" className="mt-2 text-xs text-[#777b73]">
                Your email is used to sign in and can&rsquo;t be changed here.
              </p>
            </div>
          </section>

          {/* Sticky action bar */}
          <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#deded5] bg-[#f7f6f2]/95 px-5 py-4 backdrop-blur sm:mx-0 sm:rounded-lg sm:border sm:bg-white sm:px-5">
            <p className="text-sm text-[#6b7068]" aria-live="polite">
              {isDirty ? "You have unsaved changes." : "All changes saved."}
            </p>

            <div className="flex items-center gap-3">
              {isDirty && (
                <button
                  type="button"
                  onClick={discardChanges}
                  disabled={saving}
                  className="text-sm text-[#6b7068] underline underline-offset-4 hover:text-[#242923] disabled:opacity-50"
                >
                  Discard
                </button>
              )}

              <button
                type="submit"
                disabled={saving || !isDirty || !name.trim()}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#34483a] px-6 text-sm font-medium text-white transition-colors hover:bg-[#28392d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34483a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && (
                  <span
                    aria-hidden="true"
                    className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                )}
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}