"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function finishSignIn() {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error_description") ?? params.get("error");
      if (oauthError) {
        setErrorMessage(`GitHub sign-in failed: ${oauthError}`);
        return;
      }

      const code = params.get("code");
      if (!code) {
        setErrorMessage("GitHub returned to the app without an authorization code. Please try again.");
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setErrorMessage("Supabase is not configured. Check the app environment settings.");
        return;
      }

      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setErrorMessage(`Could not complete sign-in: ${error.message}`);
          return;
        }

        if (active) {
          router.replace("/");
          router.refresh();
        }
      } catch (error) {
        setErrorMessage(
          `Could not complete sign-in: ${
            error instanceof Error ? error.message : "An unexpected error occurred."
          }`,
        );
      }
    }

    void finishSignIn();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f8f7f4] px-6">
      <section className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        {errorMessage ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
              Sign-in failed
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-stone-900">
              Could not finish GitHub sign-in
            </h1>
            <p className="mt-3 break-words text-sm leading-6 text-stone-600" role="alert">
              {errorMessage}
            </p>
            <Link
              className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
              href="/"
            >
              Return to portfolio
            </Link>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
              GitHub
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-stone-900">
              Finishing sign-in...
            </h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Please wait while your portfolio session is set up.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
