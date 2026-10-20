"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { DM_Sans, Manrope } from "next/font/google";

import AboutSection from "@/components/sections/about-section";
import HeroSection from "@/components/sections/hero-section";
import ProjectsSection from "@/components/sections/projects-section";
import AdminAccountMenu from "@/components/admin-account-menu";
import ThemeToggle from "@/components/features/theme-toggle";

import {
  isPortfolioContent,
  starterContent,
  type PortfolioContent,
  type PortfolioProject,
} from "@/lib/portfolio";

import { getSupabaseBrowserClient } from "@/lib/supabase";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

type LoadState = "loading" | "ready" | "missing-config" | "error";

const ABOUT_IMAGE_BUCKET = "portfolio-images";

export default function Portfolio() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    ?.trim()
    .toLowerCase();

  const [content, setContent] =
    useState<PortfolioContent>(starterContent);

  const [session, setSession] = useState<Session | null>(null);

  const [loadState, setLoadState] = useState<LoadState>(() =>
    supabase ? "loading" : "missing-config",
  );

  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const isAdmin = Boolean(
    adminEmail &&
      session?.user.email?.trim().toLowerCase() === adminEmail,
  );

  const loadContent = useCallback(async () => {
    if (!supabase) {
      setLoadState("missing-config");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("portfolio_content")
        .select("content")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        setNotice(`Could not load portfolio: ${error.message}`);
        setLoadState("error");
        return;
      }

      if (!data) {
        setNotice(
          "Portfolio content has not been initialized in Supabase yet.",
        );
        setLoadState("error");
        return;
      }

      if (!isPortfolioContent(data.content)) {
        setNotice("Saved portfolio content has an invalid format.");
        setLoadState("error");
        return;
      }

      setContent(data.content);
      setLoadState("ready");
    } catch (error) {
      setNotice(
        `Could not load portfolio: ${
          error instanceof Error
            ? error.message
            : "An unexpected error occurred."
        }`,
      );

      setLoadState("error");
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error) {
        setNotice(`Could not check sign-in status: ${error.message}`);
        setLoadState("error");
        return;
      }

      setSession(data.session);
      await loadContent();
    };

    const { data: authListener } =
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
      });

    const refreshSession = () => {
      void supabase.auth
        .getSession()
        .then(({ data, error }) => {
          if (error) {
            setNotice(`Could not restore sign-in: ${error.message}`);
            return;
          }

          setSession(data.session);
        })
        .catch((error: unknown) => {
          setNotice(
            `Could not restore sign-in: ${
              error instanceof Error
                ? error.message
                : "An unexpected error occurred."
            }`,
          );
        });
    };

    window.addEventListener("focus", refreshSession);

    void initialize().catch((error: unknown) => {
      if (!active) return;

      setNotice(
        `Could not initialize the portfolio: ${
          error instanceof Error
            ? error.message
            : "An unexpected error occurred."
        }`,
      );

      setLoadState("error");
    });

    return () => {
      active = false;

      window.removeEventListener("focus", refreshSession);
      authListener.subscription.unsubscribe();
    };
  }, [loadContent, supabase]);

  async function saveContent(
    nextContent: PortfolioContent,
    onFailure?: (message: string) => void,
  ) {
    if (!supabase || !isAdmin) {
      const message =
        "Only the configured admin account can change portfolio content.";

      setNotice(message);
      onFailure?.(message);

      return false;
    }

    setSaving(true);
    setNotice("");

    try {
      const { error } = await supabase
        .from("portfolio_content")
        .upsert({
          id: 1,
          content: nextContent,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        const message = `Could not save changes: ${error.message}`;

        setNotice(message);
        onFailure?.(message);

        return false;
      }

      setContent(nextContent);
      setNotice("Changes saved.");

      return true;
    } catch (error) {
      const message = `Could not save changes: ${
        error instanceof Error
          ? error.message
          : "An unexpected error occurred."
      }`;

      setNotice(message);
      onFailure?.(message);

      return false;
    } finally {
      setSaving(false);
    }
  }

  async function signIn() {
    if (!supabase) return;

    setNotice("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "read:user user:email",
        },
      });

      if (error) {
        setNotice(`GitHub sign-in failed: ${error.message}`);
      }
    } catch (error) {
      setNotice(
        `GitHub sign-in failed: ${
          error instanceof Error
            ? error.message
            : "An unexpected error occurred."
        }`,
      );
    }
  }

  async function signOut() {
    if (!supabase) return;

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setNotice(`Could not sign out: ${error.message}`);
      } else {
        setNotice("Signed out.");
      }
    } catch (error) {
      setNotice(
        `Could not sign out: ${
          error instanceof Error
            ? error.message
            : "An unexpected error occurred."
        }`,
      );
    }
  }

  async function uploadPortfolioImage(file: File, imageType: "about" | "intro") {
    const label = imageType === "about" ? "About" : "intro";
    const imagePathKey = imageType === "about" ? "aboutImagePath" : "introImagePath";

    if (!supabase || !isAdmin) {
      const message = `Only the configured admin account can upload an ${label} photo.`;

      setNotice(message);
      throw new Error(message);
    }

    const fileExtensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    const extension = fileExtensions[file.type];

    if (!extension) {
      const message = "Choose a JPG, PNG, or WebP image.";

      setNotice(message);
      throw new Error(message);
    }

    if (file.size > 5 * 1024 * 1024) {
      const message = "Choose an image smaller than 5 MB.";

      setNotice(message);
      throw new Error(message);
    }

    const imagePath = `${imageType}/${crypto.randomUUID()}.${extension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(ABOUT_IMAGE_BUCKET)
        .upload(imagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        const detail = uploadError.message;

        const setupHint =
          /bucket not found|row-level security|permission denied/i.test(
            detail,
          )
            ? " Run the updated supabase/schema.sql in the Supabase SQL Editor to create the image bucket and admin storage policies."
            : "";

        const message = `Could not upload photo: ${detail}.${setupHint}`;

        setNotice(message);
        throw new Error(message);
      }

      let saveError = `Could not save the ${label} photo reference to portfolio content.`;

      const saved = await saveContent(
        { ...content, [imagePathKey]: imagePath },
        (message) => {
          saveError = message;
        },
      );

      if (!saved) {
        const { error: cleanupError } = await supabase.storage
          .from(ABOUT_IMAGE_BUCKET)
          .remove([imagePath]);

        if (cleanupError) {
          saveError += ` The uploaded image could not be cleaned up: ${cleanupError.message}`;
          setNotice(saveError);
        }

        throw new Error(saveError);
      }

      const previousImagePath = content[imagePathKey];

      if (previousImagePath) {
        const { error: removeError } = await supabase.storage
          .from(ABOUT_IMAGE_BUCKET)
          .remove([previousImagePath]);

        if (removeError) {
          setNotice(
            `Photo saved, but the previous image could not be removed: ${removeError.message}`,
          );
        }
      }
    } catch (error) {
      if (error instanceof Error) throw error;

      const message = `Could not upload ${label} photo due to an unexpected error.`;

      setNotice(message);
      throw new Error(message);
    }
  }

  async function uploadAboutImage(file: File) {
    await uploadPortfolioImage(file, "about");
  }

  async function uploadIntroImage(file: File) {
    await uploadPortfolioImage(file, "intro");
  }

  const pageClass = [
    "portfolio-shell",
    "min-h-screen",
    "bg-[#101312]",
    "text-[#F2F1EA]",
    dmSans.variable,
    manrope.variable,
  ].join(" ");

  if (loadState === "loading") {
    return (
      <main
        className={`${pageClass} grid place-items-center px-6`}
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-5">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#303B36] border-t-[#A7E6C0]" />

          <p className="font-sans text-sm tracking-wide text-[#A4AEA8]">
            Preparing your portfolio...
          </p>
        </div>
      </main>
    );
  }

  if (loadState === "missing-config") {
    return (
      <main
        className={`${pageClass} grid place-items-center px-6 py-16`}
      >
        <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#181D1A] p-8 shadow-2xl sm:p-12">
          <span className="inline-flex rounded-full border border-[#A7E6C0]/20 bg-[#A7E6C0]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#A7E6C0]">
            Setup required
          </span>

          <h1 className="mt-8 font-[var(--font-manrope)] text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Connect your portfolio
          </h1>

          <p className="mt-5 text-base leading-8 text-[#A4AEA8] sm:text-lg">
            Add your Supabase project URL, publishable anon key, and
            configured GitHub admin email to your local environment.
            Then complete the database setup in the README.
          </p>
        </section>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main
        className={`${pageClass} grid place-items-center px-6 py-16`}
      >
        <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#181D1A] p-8 shadow-2xl sm:p-12">
          <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
            Portfolio unavailable
          </span>

          <h1 className="mt-8 font-[var(--font-manrope)] text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Something went wrong.
          </h1>

          <p
            role="alert"
            className="mt-5 break-words text-base leading-8 text-[#A4AEA8]"
          >
            {notice}
          </p>

          <button
            className="mt-8 inline-flex items-center justify-center rounded-full bg-[#A7E6C0] px-7 py-4 text-sm font-bold text-[#101812] transition duration-300 hover:-translate-y-0.5 hover:bg-[#C1F3D3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A7E6C0]"
            onClick={() => void loadContent()}
            type="button"
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={pageClass}>
      <header className="site-header sticky top-0 z-40 mx-auto flex w-full max-w-none items-center justify-between gap-4 px-5 py-3 sm:px-10 lg:px-16">
        <a
          aria-label={`${content.profile.name} — back to home`}
          href="#home"
          className="brand-mark group flex min-w-0 items-center gap-3 font-[var(--font-manrope)] text-base font-extrabold tracking-tight text-[#F2F1EA] transition duration-300 sm:text-lg"
        >
          <span className="brand-mark-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#A7E6C0]/20 bg-[#A7E6C0]/10 text-sm font-extrabold text-[#A7E6C0] transition duration-300 group-hover:rotate-[-6deg] group-hover:bg-[#A7E6C0]/20">
            {content.profile.name
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase() || "P"}
          </span>

          <span className="brand-copy flex min-w-0 flex-col">
            <span className="truncate">{content.profile.name}</span>
            <span className="brand-caption text-[9px] font-semibold uppercase tracking-[0.2em]">
              Portfolio
            </span>
          </span>
        </a>

        <nav
          aria-label="Main navigation"
          className="site-nav flex shrink-0 items-center gap-5 text-sm font-medium sm:gap-8"
        >
          <a
            className="site-nav-link group relative py-2 text-[#B8C0BA] transition-colors duration-300 hover:text-[#A7E6C0]"
            href="#work"
          >
            Work
            <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-[#A7E6C0] transition-transform duration-300 group-hover:scale-x-100" />
          </a>

          <a
            className="site-nav-link group relative py-2 text-[#B8C0BA] transition-colors duration-300 hover:text-[#A7E6C0]"
            href="#about"
          >
            About
            <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-[#A7E6C0] transition-transform duration-300 group-hover:scale-x-100" />
          </a>

          <ThemeToggle />

          <AdminAccountMenu
            session={session}
            isAdmin={isAdmin}
            onSignIn={() => void signIn()}
            onSignOut={() => void signOut()}
          />
        </nav>
      </header>

      <div className="relative isolate overflow-clip">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[30rem] w-[48rem] -translate-x-1/2 rounded-full bg-[#A7E6C0]/[0.06] blur-[120px]"
        />

        <HeroSection
          profile={content.profile}
          photoUrl={
            supabase && content.introImagePath
              ? supabase.storage
                  .from(ABOUT_IMAGE_BUCKET)
                  .getPublicUrl(content.introImagePath).data.publicUrl
              : undefined
          }
          introImageScale={content.introImageScale ?? 1}
          onUploadPhoto={uploadIntroImage}
          onSavePhotoScale={(scale) =>
            saveContent({ ...content, introImageScale: scale })
          }
          isAdmin={isAdmin}
          saving={saving}
          onSaveProfile={(profile) =>
            saveContent({ ...content, profile })
          }
        />
      </div>

      <div className="relative">
        <AboutSection
          profile={content.profile}
          photoUrl={
            supabase && content.aboutImagePath
              ? supabase.storage
                  .from(ABOUT_IMAGE_BUCKET)
                  .getPublicUrl(content.aboutImagePath).data.publicUrl
              : undefined
          }
          isAdmin={isAdmin}
          onUploadImage={uploadAboutImage}
        />
      </div>

      <section className="relative">
        <ProjectsSection
          projects={content.projects}
          isAdmin={isAdmin}
          saving={saving}
          notice={notice}
          onSaveProjects={(projects: PortfolioProject[]) =>
            saveContent({ ...content, projects })
          }
        />
      </section>

      <footer className="site-footer border-t border-white/[0.08] bg-[#0C0F0D] px-6 py-10 sm:px-10 sm:py-12">
        <div className="mx-auto flex w-full max-w-none flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <a
            href="#home"
            className="font-[var(--font-manrope)] text-base font-bold tracking-tight text-[#F2F1EA] transition-colors hover:text-[#A7E6C0]"
          >
            {content.profile.name}
            <span className="ml-2 text-[#A7E6C0]">✳</span>
          </a>

          <p className="text-xs leading-6 text-[#87928B] sm:text-sm">
            © {new Date().getFullYear()} {content.profile.name}. Made with
            care.
          </p>

          <a
            href="#home"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A7E6C0] transition-colors hover:text-[#F2F1EA]"
          >
            Back to top ↑
          </a>
        </div>
      </footer>
    </main>
  );
}