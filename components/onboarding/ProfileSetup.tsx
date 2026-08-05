"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { motion } from "framer-motion";
import { MAX_LOCAL_PHOTOS, type LocalPhoto } from "@/lib/onboarding/local-store";
import { validatePhoto } from "@/lib/onboarding/rules";
import { OnboardingFrame } from "./OnboardingFrame";

interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
}

export function ProfileSetup({
  initialName,
  photos,
  onContinue,
  onRemovePhoto,
}: {
  initialName: string;
  photos: LocalPhoto[];
  onContinue: (name: string, files: File[]) => Promise<void>;
  onRemovePhoto: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<PendingPhoto[]>([]);
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { pendingRef.current = pending; }, [pending]);
  useEffect(() => () => pendingRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview)), []);

  const total = photos.length + pending.length;
  const remaining = MAX_LOCAL_PHOTOS - total;
  const allPhotos = useMemo(() => [
    ...photos.map((photo) => ({ id: photo.id, src: photo.dataUrl, name: photo.name, saved: true as const })),
    ...pending.map((photo) => ({ id: photo.id, src: photo.preview, name: photo.file.name, saved: false as const })),
  ], [pending, photos]);
  const featuredPhoto = allPhotos[0] ?? null;
  const thumbnailPhotos = allPhotos.slice(1);

  function choose(files: FileList | null) {
    setError(null);
    if (!files?.length) return;
    const available = MAX_LOCAL_PHOTOS - photos.length - pending.length;
    if (available <= 0) return setError(`You can use up to ${MAX_LOCAL_PHOTOS} images.`);
    const selected = [...files].slice(0, available);
    const invalid = selected.map(validatePhoto).find(Boolean);
    if (invalid) return setError(invalid);
    const existingIds = new Set([...photos.map((photo) => photo.id), ...pending.map((photo) => photo.id)]);
    const additions = selected
      .map((file) => ({ id: `${file.name}-${file.size}-${file.lastModified}`, file }))
      .filter((photo) => !existingIds.has(photo.id))
      .map((photo) => ({ ...photo, preview: URL.createObjectURL(photo.file) }));
    setPending((current) => [...current, ...additions]);
    if (additions.length) setConsent(false);
  }

  function remove(id: string, saved: boolean) {
    if (saved) {
      onRemovePhoto(id);
      return;
    }
    setPending((current) => current.filter((photo) => {
      if (photo.id === id) URL.revokeObjectURL(photo.preview);
      return photo.id !== id;
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Enter your name to continue.");
    if (pending.length && !consent) return setError("Confirm that these images may be analyzed on this device.");
    setBusy(true);
    setError(null);
    try {
      await onContinue(name.trim(), pending.map((photo) => photo.file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your profile on this device.");
      setBusy(false);
    }
  }

  function drop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    choose(event.dataTransfer.files);
  }

  return (
    <OnboardingFrame step={1} title="Make HAPA yours." description="Tell us what to call you. Add a few images for a sharper starting feed.">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-7 pt-7">
        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-semibold tracking-[0.04em] text-ink-soft">What should we call you?</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            autoComplete="name"
            className="rounded-2xl border border-line bg-card px-4 py-3.5 text-[16px] leading-6 text-ink outline-none placeholder:text-ink-faint focus:border-pine"
            placeholder="Peter"
          />
        </label>

        <section aria-labelledby="visual-reference-label">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="visual-reference-label" className="text-[12px] font-semibold tracking-[0.04em] text-ink-soft">Show us your taste <span className="font-normal tracking-normal text-ink-faint">· optional</span></h2>
              <p className="mt-1 text-[13px] leading-5 text-ink-faint">Add up to five screenshots or photos you love.</p>
            </div>
            {total > 0 && <span className="shrink-0 text-[12px] font-semibold tracking-[0.04em] text-ink-faint">{total}/{MAX_LOCAL_PHOTOS}</span>}
          </div>

          {!featuredPhoto ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={drop}
              className="mt-3 flex min-h-[218px] w-full flex-col items-center justify-center rounded-card border border-dashed border-line bg-card px-6 text-center text-ink-soft transition-colors hover:border-pine hover:bg-sand/40"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-sand text-pine"><UploadIcon /></span>
              <span className="mt-4 text-[15px] font-bold text-ink">Choose images</span>
              <span className="mt-1 text-[12px] leading-5 text-ink-faint">JPG, PNG or WebP · up to 10 MB each</span>
            </button>
          ) : (
            <div className="mt-3">
              <PhotoPreview photo={featuredPhoto} index={0} featured onRemove={remove} />
              <div className="mt-2.5 grid grid-cols-4 gap-2.5">
                {thumbnailPhotos.map((photo, index) => <PhotoPreview key={photo.id} photo={photo} index={index + 1} onRemove={remove} />)}
                {remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    aria-label="Add more images"
                    className="flex aspect-square items-center justify-center rounded-frame border border-dashed border-line bg-card text-pine transition-colors hover:border-pine"
                  >
                    <UploadIcon compact />
                  </button>
                )}
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => { choose(event.target.files); event.target.value = ""; }}
          />
        </section>

        {pending.length > 0 && (
          <label className="flex cursor-pointer items-start gap-3 text-[12px] leading-5 text-ink-soft">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-pine" />
            <span>Use these image names to tune my starter feed.</span>
          </label>
        )}
        <div className="flex items-center gap-2.5 rounded-frame bg-sand/70 px-3.5 py-3 text-[11.5px] text-ink-faint">
          <DeviceShieldIcon />
          <span>Filename cues stay on this device. Images are never uploaded.</span>
        </div>
        {error && <p role="alert" className="text-[13px] leading-5 text-red-800">{error}</p>}
        </div>

        <div className="shrink-0 px-7 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-4">
          <button disabled={busy || !name.trim()} className="w-full rounded-full bg-ink py-[17px] text-[15px] font-bold text-paper transition-opacity disabled:opacity-35">
            {busy ? "Building your edit…" : "Next"}
          </button>
        </div>
      </form>
    </OnboardingFrame>
  );
}

function PhotoPreview({
  photo,
  index,
  featured = false,
  onRemove,
}: {
  photo: { id: string; src: string; name: string; saved: boolean };
  index: number;
  featured?: boolean;
  onRemove: (id: string, saved: boolean) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: .96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden border border-line bg-sand ${featured ? "aspect-[16/9] rounded-card" : "aspect-square rounded-frame"}`}
    >
      <img src={photo.src} alt={`Visual reference ${index + 1}: ${photo.name}`} className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={() => onRemove(photo.id, photo.saved)}
        aria-label={`Remove ${photo.name}`}
        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-ink/75 text-xs text-paper backdrop-blur-sm"
      >
        ✕
      </button>
    </motion.div>
  );
}

function UploadIcon({ compact = false }: { compact?: boolean }) {
  const size = compact ? 24 : 28;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12.5v5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DeviceShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-pine" aria-hidden>
      <path d="M12 3.5 19 6v5.2c0 4.2-2.8 7.7-7 9.3-4.2-1.6-7-5.1-7-9.3V6l7-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
