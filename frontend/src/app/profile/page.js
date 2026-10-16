
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    let active = true;

    async function loadProfile() {
      setPageLoading(true);
      setError("");

      try {
        const response = await apiRequest("/api/v1/users/me");
        const currentUser = response?.data?.user;

        if (!currentUser) {
          throw new Error("Profile information was not returned by the server.");
        }

        if (active) {
          setProfile(currentUser);
          setName(currentUser.name || "");
          setAvatarPreview(currentUser.avatar?.url || "");
        }
      } catch (err) {
        if (active) setError(err.message || "Unable to load your profile.");
      } finally {
        if (active) setPageLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [loading, isAuthenticated]);

  useEffect(() => {
    if (!avatarFile) return;

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

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
      } else if (avatarFile) {
        setAvatarFile(null);
      }

      setMessage(response.message || "Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
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

  if (loading || !isAuthenticated || pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] text-sm text-[#6b7068]">
        Loading profile...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#242923]">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-[#deded5] px-5 py-3 sm:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          BlogPilot
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-[#6b7068] hover:text-[#242923]"
          >
            Write
          </Link>
          <Link
            href="/blogs"
            className="text-sm text-[#6b7068] hover:text-[#242923]"
          >
            My blogs
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="bg-[#34483a] px-3 py-2 text-sm font-medium text-white hover:bg-[#28392d] disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </nav>
      </header>

      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-9 border-b border-[#deded5] pb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7068]">
            Account settings
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Your profile
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#6b7068]">
            Manage your personal information and profile photo.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-5 border-l-2 border-red-700 bg-[#f3e9e6] px-4 py-3 text-sm text-[#852f28]">
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="mb-5 border-l-2 border-[#34483a] bg-[#eaece5] px-4 py-3 text-sm text-[#34483a]">
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="border border-[#deded5] bg-white">
          <div className="border-b border-[#e7e7df] p-6 sm:p-8">
            <h2 className="text-base font-semibold">Profile photo</h2>
            <p className="mt-1 text-sm text-[#6b7068]">
              Choose a clear image to represent your account.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-5">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile avatar preview"
                  className="size-20 border border-[#deded5] object-cover"
                />
              ) : (
                <div className="flex size-20 items-center justify-center border border-[#deded5] bg-[#f7f6f2] text-2xl font-medium text-[#34483a]">
                  {(name || authUser?.name || "U").trim().charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <label htmlFor="avatar" className="block text-sm font-medium">
                  Upload an image
                </label>
                <input
                  id="avatar"
                  name="avatar"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setAvatarFile(file);
                    setMessage("");
                  }}
                  className="mt-2 block w-full max-w-xs text-sm text-[#6b7068] file:mr-3 file:border file:border-[#deded5] file:bg-white file:px-3 file:py-2 file:text-sm file:text-[#242923]"
                />
                <p className="mt-2 text-xs text-[#777b73]">
                  Select an image file. Your existing avatar is retained if you don't choose another.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full border border-[#d5d6cd] bg-white px-3 text-sm outline-none focus:border-[#34483a]"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={profile?.email || authUser?.email || ""}
                readOnly
                className="h-11 w-full border border-[#deded5] bg-[#f7f6f2] px-3 text-sm text-[#6b7068] outline-none"
              />
              <p className="mt-2 text-xs text-[#777b73]">
                Email address cannot be changed here.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7e7df] pt-5">
              <Link
                href="/"
                className="text-sm text-[#6b7068] underline underline-offset-4 hover:text-[#242923]"
              >
                Back to workspace
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="bg-[#34483a] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#28392d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving changes..." : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
