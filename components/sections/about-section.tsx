"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import ScrollRevealText from "@/components/features/scroll-reveal-text";
import type { PortfolioContent } from "@/lib/portfolio";

export default function AboutSection({
  profile,
  photoUrl,
  isAdmin,
  onUploadImage,
}: {
  profile: PortfolioContent["profile"];
  photoUrl?: string;
  isAdmin: boolean;
  onUploadImage: (file: File) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadFailed, setUploadFailed] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  async function handleImageSelection(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadStatus("");
    setUploadFailed(false);
    try {
      await onUploadImage(file);
      setUploadStatus("Photo updated.");
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "Could not upload photo.");
      setUploadFailed(true);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <section id="about" className="about-section relative overflow-hidden">
      <div className="mx-auto max-w-none px-6 py-20 sm:px-10 sm:py-28 lg:px-16">
        <div className="about-topline mb-10 flex items-end justify-between gap-5">
          <div>
            <p className="about-eyebrow text-xs font-semibold uppercase tracking-[0.2em]">
              <ScrollRevealText>About / 01</ScrollRevealText>
            </p>
            <p className="about-section-intro mt-3 text-sm">
              <ScrollRevealText>A little more about me</ScrollRevealText>
            </p>
          </div>
          <span className="about-index hidden font-mono text-xs sm:inline">01 — ABOUT</span>
        </div>

        <div className="about-layout grid items-center gap-10 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:gap-20">
          <motion.div
            className="about-profile"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="about-photo-stage relative mx-auto aspect-square max-w-[420px]">
              <div className="about-photo-frame absolute inset-[8%] overflow-hidden">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt={`${profile.name} portrait`}
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="about-photo-image object-cover"
                    priority={false}
                  />
                ) : (
                  <div className="about-photo-placeholder absolute inset-0 grid place-items-center" aria-hidden="true">
                    <div className="about-placeholder-art">
                      <span className="about-placeholder-ring" />
                      <span className="about-placeholder-initial">{profile.name.trim().charAt(0) || "?"}</span>
                    </div>
                  </div>
                )}
                {isAdmin && (
                  <div className="absolute bottom-[12%] right-[10%] z-[1]">
                    <input
                      ref={fileInputRef}
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label="Upload an About photo"
                      onChange={(event) => void handleImageSelection(event.currentTarget.files?.[0])}
                    />
                    <button
                      className="about-upload-button rounded-full px-4 py-2.5 text-xs font-medium transition disabled:cursor-wait disabled:opacity-60"
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? "Uploading..." : photoUrl ? "Change photo" : "Upload photo"}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="about-profile-caption mx-auto mt-6 flex max-w-[440px] items-baseline justify-between gap-4">
              <div>
                <p className="about-photo-name text-xl font-medium tracking-tight sm:text-2xl">{profile.name}</p>
                <p className="about-photo-role mt-1.5 text-sm">{profile.title}</p>
              </div>
              {isAdmin && <p className="about-upload-hint text-right text-[10px]">JPG, PNG or WebP<br />Up to 5 MB</p>}
            </div>
          </motion.div>

          <motion.div
            className="about-story flex flex-col justify-center"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="about-story-label mb-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em]">
              <span className="about-label-line" aria-hidden="true" />
              <ScrollRevealText>A note from me</ScrollRevealText>
            </p>
            <h2 className="about-heading mb-7 max-w-lg text-4xl font-medium leading-[1.04] tracking-[-0.055em] sm:text-5xl lg:text-6xl">
              <ScrollRevealText>Behind the work.</ScrollRevealText>
            </h2>
            <p className="about-copy relative z-[1] max-w-3xl text-lg leading-[1.75] tracking-[-0.02em] sm:text-xl lg:text-2xl">
              <ScrollRevealText>{profile.bio}</ScrollRevealText>
            </p>
            <div className="about-details mt-10 grid gap-5 border-t pt-6 sm:grid-cols-2">
              <div>
                <p className="about-detail-label mb-2 text-[10px] font-semibold uppercase tracking-[0.18em]">Based in</p>
                <p className="about-detail-value flex items-center gap-2 text-sm">
                  <span className="about-location-dot" aria-hidden="true" />
                  <ScrollRevealText>{profile.location}</ScrollRevealText>
                </p>
              </div>
              <div>
                <p className="about-detail-label mb-2 text-[10px] font-semibold uppercase tracking-[0.18em]">Currently</p>
                <p className="about-detail-value text-sm"><ScrollRevealText>{profile.title}</ScrollRevealText></p>
              </div>
            </div>
            {uploadStatus && (
              <p
                className={`about-upload-status mt-5 text-xs ${uploadFailed ? "about-upload-error" : ""}`}
                role={uploadFailed ? "alert" : "status"}
              >
                {uploadStatus}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
