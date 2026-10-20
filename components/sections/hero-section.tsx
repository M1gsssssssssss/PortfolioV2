"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import RockShooter from "@/components/features/rock-shooter";
import type { PortfolioContent } from "@/lib/portfolio";

type Profile = PortfolioContent["profile"];

export default function HeroSection({
  profile,
  photoUrl,
  introImageScale,
  onUploadPhoto,
  onSavePhotoScale,
  isAdmin,
  saving,
  onSaveProfile,
}: {
  profile: Profile;
  photoUrl?: string;
  introImageScale: number;
  onUploadPhoto: (file: File) => Promise<void>;
  onSavePhotoScale: (scale: number) => Promise<boolean>;
  isAdmin: boolean;
  saving: boolean;
  onSaveProfile: (profile: Profile) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [firstName, setFirstName] = useState(() => splitName(profile.name).firstName);
  const [lastName, setLastName] = useState(() => splitName(profile.name).lastName);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoNotice, setPhotoNotice] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pointerAnimationRef = useRef<number | null>(null);
  const pointerPositionRef = useRef({ x: 50, y: 50, targetX: 50, targetY: 50 });
  const resizeDragRef = useRef<{
    startX: number;
    startY: number;
    startScale: number;
    width: number;
    height: number;
    horizontalDirection: number;
    verticalDirection: number;
  } | null>(null);
  const [portraitScale, setPortraitScale] = useState(introImageScale);
  const portraitScaleRef = useRef(introImageScale);
  const [portraitColorRevealed, setPortraitColorRevealed] = useState(false);
  const [portraitHovered, setPortraitHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(
    () => () => {
      if (pointerAnimationRef.current !== null) {
        cancelAnimationFrame(pointerAnimationRef.current);
      }
    },
    [],
  );

  function handleResizeStart(
    event: ReactPointerEvent<HTMLButtonElement>,
    horizontalDirection: number,
    verticalDirection: number,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!bounds) return;

    resizeDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startScale: portraitScale,
      width: bounds.width,
      height: bounds.height,
      horizontalDirection,
      verticalDirection,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleResizeMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = resizeDragRef.current;
    if (!drag) return;
    const delta =
      (event.clientX - drag.startX) * drag.horizontalDirection +
      (event.clientY - drag.startY) * drag.verticalDirection;
    const nextScale = Math.min(
      2,
      Math.max(0.5, drag.startScale + delta / (drag.width + drag.height)),
    );
    portraitScaleRef.current = nextScale;
    setPortraitScale(nextScale);
  }

  async function handleResizeEnd(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!resizeDragRef.current) return;
    resizeDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setPhotoNotice("");
    if (!(await onSavePhotoScale(portraitScaleRef.current))) {
      setPhotoNotice("Could not save the portrait size.");
    }
  }

  function handlePortraitPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse") return;
    const portrait = event.currentTarget;
    const bounds = portrait.getBoundingClientRect();
    const pointer = pointerPositionRef.current;
    pointer.targetX = ((event.clientX - bounds.left) / bounds.width) * 100;
    pointer.targetY = ((event.clientY - bounds.top) / bounds.height) * 100;
    setPortraitHovered(true);

    if (pointerAnimationRef.current !== null) return;
    const animatePointer = () => {
      const position = pointerPositionRef.current;
      position.x += (position.targetX - position.x) * 0.22;
      position.y += (position.targetY - position.y) * 0.22;
      portrait.style.setProperty("--photo-pointer-x", `${position.x}%`);
      portrait.style.setProperty("--photo-pointer-y", `${position.y}%`);

      if (
        Math.abs(position.targetX - position.x) < 0.1 &&
        Math.abs(position.targetY - position.y) < 0.1
      ) {
        position.x = position.targetX;
        position.y = position.targetY;
        portrait.style.setProperty("--photo-pointer-x", `${position.x}%`);
        portrait.style.setProperty("--photo-pointer-y", `${position.y}%`);
        pointerAnimationRef.current = null;
        return;
      }

      pointerAnimationRef.current = requestAnimationFrame(animatePointer);
    };
    pointerAnimationRef.current = requestAnimationFrame(animatePointer);
  }

  async function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setPhotoNotice("");
    try {
      await onUploadPhoto(file);
      setPhotoNotice("Intro photo updated.");
    } catch (error) {
      setPhotoNotice(error instanceof Error ? error.message : "Could not upload intro photo.");
    } finally {
      setUploadingPhoto(false);
      input.value = "";
    }
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    if (await onSaveProfile({ ...draft, name })) setEditing(false);
  }

  return (
    <>
      <section id="home" className="hero-section mx-auto flex max-w-none items-center justify-center px-6 sm:px-10 lg:px-16">
        <div className="hero-intro-scene">
          <div className="hero-name-marquee" aria-hidden="true">
            <div className="hero-name-track">
              {[0, 1].map((copy) => (
                <span className="hero-name-group" key={copy}>
                  {[0, 1, 2].map((repeat) => (
                    <span className="hero-name-item" key={repeat}>
                      {profile.name}
                      <span className="hero-name-separator">✳</span>
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
          {photoUrl ? (
            <motion.div
              className="hero-portrait-motion"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 26, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="hero-portrait-float"
                animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
                transition={{
                  duration: 6,
                  ease: "easeInOut",
                  repeat: shouldReduceMotion ? 0 : Infinity,
                }}
              >
                <div
                  className="hero-portrait-resize-frame"
                  style={{ transform: `scale(${portraitScale})` }}
                >
                  <button
                    aria-label={portraitColorRevealed
                      ? "Show portrait in black and white"
                      : "Reveal full-color portrait"}
                    aria-pressed={portraitColorRevealed}
                    className="hero-portrait-button"
                    data-color-revealed={portraitColorRevealed}
                    onClick={() => setPortraitColorRevealed((current) => !current)}
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") setPortraitHovered(true);
                    }}
                    onPointerLeave={() => setPortraitHovered(false)}
                    onPointerMove={handlePortraitPointerMove}
                    type="button"
                  >
                    <Image
                      alt=""
                      className="hero-portrait-image"
                      fill
                      priority
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 54vw, 760px"
                      src={photoUrl}
                      unoptimized
                    />
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="hero-portrait-image hero-portrait-color"
                      data-visible={portraitHovered || portraitColorRevealed}
                      fill
                      priority
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 54vw, 760px"
                      src={photoUrl}
                      unoptimized
                    />
                  </button>
                  {isAdmin && (
                    <>
                      {[
                        { corner: "nw", horizontalDirection: -1, verticalDirection: -1 },
                        { corner: "ne", horizontalDirection: 1, verticalDirection: -1 },
                        { corner: "sw", horizontalDirection: -1, verticalDirection: 1 },
                        { corner: "se", horizontalDirection: 1, verticalDirection: 1 },
                      ].map(({ corner, horizontalDirection, verticalDirection }) => (
                        <button
                          aria-label={`Resize intro photo from ${corner} corner`}
                          className={`hero-photo-resize-handle hero-photo-resize-${corner}`}
                          key={corner}
                          onPointerDown={(event) =>
                            handleResizeStart(event, horizontalDirection, verticalDirection)
                          }
                          onPointerMove={handleResizeMove}
                          onPointerUp={(event) => void handleResizeEnd(event)}
                          onPointerCancel={(event) => void handleResizeEnd(event)}
                          type="button"
                        />
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <span className="hero-portrait-initial" aria-hidden="true">
              {profile.name.trim().charAt(0) || "?"}
            </span>
          )}
          {isAdmin && (
            <div className="hero-photo-admin">
              <input
                ref={photoInputRef}
                accept="image/jpeg,image/png,image/webp"
                aria-label="Choose a separate intro photo"
                className="sr-only"
                onChange={handlePhotoSelection}
                type="file"
              />
              <button
                className="hero-photo-button"
                disabled={uploadingPhoto}
                onClick={() => photoInputRef.current?.click()}
                type="button"
              >
                {uploadingPhoto ? "Uploading..." : photoUrl ? "Change intro photo" : "Upload intro photo"}
              </button>
              <span className="hero-photo-resize-hint">Drag a corner to resize</span>
              {photoNotice && <p className="hero-photo-notice" role="status">{photoNotice}</p>}
            </div>
          )}
        </div>
      </section>

      <motion.section
        className="hero-feature-section mx-auto max-w-none px-6 py-12 sm:px-10 sm:py-16 lg:px-16"
        initial={shouldReduceMotion ? false : { y: 72 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.08 }}
        transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="hero-feature-heading">
          <p className="hero-intro-greeting">Welcome to my portfolio</p>
          <h1 className="hero-feature-name">{profile.name}</h1>
          <p className="hero-feature-title">{profile.title}</p>
        </div>
        <motion.div
          className="hero-feature-game"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <RockShooter />
        </motion.div>
        {isAdmin && (
          <button
            className="admin-edit-button w-fit rounded-full border px-4 py-2 text-sm font-medium"
            onClick={() => {
              if (!editing) {
                setDraft(profile);
                const name = splitName(profile.name);
                setFirstName(name.firstName);
                setLastName(name.lastName);
              }
              setEditing((current) => !current);
            }}
            type="button"
          >
            {editing ? "Close profile editor" : "Edit profile"}
          </button>
        )}
        {editing && isAdmin && (
          <form onSubmit={submitProfile} className="editor-panel grid max-w-2xl gap-4 rounded-3xl border p-6 sm:grid-cols-2">
            <ProfileField
              label="First name"
              value={firstName}
              onChange={setFirstName}
            />
            <ProfileField
              label="Last name"
              value={lastName}
              onChange={setLastName}
              required={false}
            />
            <ProfileField
              label="Title"
              value={draft.title}
              onChange={(title) => setDraft((current) => ({ ...current, title }))}
            />
            <ProfileField
              label="Location"
              value={draft.location}
              onChange={(location) => setDraft((current) => ({ ...current, location }))}
            />
            <label className="form-label grid gap-2 text-sm font-medium sm:col-span-2">
              Intro
              <textarea
                className="portfolio-input min-h-24 rounded-xl border px-3 py-2 font-normal outline-none"
                maxLength={1000}
                value={draft.bio}
                onChange={(event) => {
                  const bio = event.currentTarget.value;
                  setDraft((current) => ({ ...current, bio }));
                }}
                required
              />
            </label>
            <button disabled={saving} className="primary-button w-fit rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-50" type="submit">
              {saving ? "Saving..." : "Save profile"}
            </button>
          </form>
        )}
      </motion.section>
    </>
  );
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const lastName = parts.length > 1 ? parts.pop() ?? "" : "";
  return { firstName: parts.length ? parts.join(" ") : (lastName || name), lastName };
}

function ProfileField({
  label,
  value,
  onChange,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="form-label grid gap-2 text-sm font-medium">
      {label}
      <input
        className="portfolio-input rounded-xl border px-3 py-2 font-normal outline-none"
        type="text"
        value={value}
        autoComplete={label === "First name" ? "given-name" : label === "Last name" ? "family-name" : "off"}
        onChange={(event) => onChange(event.currentTarget.value)}
        required={required}
        maxLength={200}
      />
    </label>
  );
}
