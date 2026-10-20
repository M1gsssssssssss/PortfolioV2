"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";

type AdminAccountMenuProps = {
  session: Session | null;
  isAdmin: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
};

export default function AdminAccountMenu({
  session,
  isAdmin,
  onSignIn,
  onSignOut,
}: AdminAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const user = session?.user;
  const displayName =
    user?.user_metadata.full_name ??
    user?.user_metadata.name ??
    user?.user_metadata.user_name ??
    user?.email ??
    "Account";
  const avatarUrl = user?.user_metadata.avatar_url ?? user?.user_metadata.picture;

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!user) {
    return (
      <button
        className="text-sm hover:text-stone-950"
        onClick={onSignIn}
        type="button"
      >
        Admin sign in
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${displayName}`}
        className="account-menu-trigger flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-medium shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {avatarUrl ? (
          <Image
            alt=""
            className="h-8 w-8 rounded-full object-cover"
            height={32}
            src={avatarUrl}
            unoptimized
            width={32}
          />
        ) : (
          <span
            aria-hidden="true"
            className="account-menu-admin grid h-8 w-8 place-items-center rounded-full text-xs font-semibold"
          >
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="max-w-28 truncate">{displayName}</span>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 20 20"
        >
          <path
            d="m5 7.5 5 5 5-5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </button>
      {open && (
        <div
          aria-label="Account menu"
          className="account-menu-popover absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border py-2"
          role="menu"
        >
          <div className="account-menu-divider border-b px-4 py-3">
            <p className="account-menu-name truncate text-sm font-semibold">{displayName}</p>
            <p className="account-menu-email mt-1 truncate text-xs">
              {user.email ?? "No email provided by GitHub"}
            </p>
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                isAdmin
                  ? "account-menu-admin"
                  : "account-menu-viewer"
              }`}
            >
              {isAdmin ? "Admin" : "Not the configured admin"}
            </span>
            {!isAdmin && (
              <p className="account-menu-viewer-note mt-2 text-xs leading-5">
                This GitHub account email does not match the admin email configured for this portfolio.
              </p>
            )}
          </div>
          <button
            className="account-menu-signout flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            role="menuitem"
            type="button"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
              <path
                d="M8 4H4.75A.75.75 0 0 0 4 4.75v10.5c0 .414.336.75.75.75H8m4-3 3-3m0 0-3-3m3 3H8m2-7h4.25c.414 0 .75.336.75.75v12.5a.75.75 0 0 1-.75.75H10"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
