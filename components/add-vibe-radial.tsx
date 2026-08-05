"use client";

import { motion } from "framer-motion";
import { MicIcon, PhotoIcon, PlusIcon, TypeIcon } from "./icons";

export type AddVibeMode = "speech" | "text" | "photo";

// Fan-out offsets from the FAB, in px, tracing a quarter-circle from
// straight-up to straight-left — the only quadrant with room on a
// bottom-right FAB. { right, up } are added to the FAB's own right/bottom.
const SLOTS: { mode: AddVibeMode; label: string; right: number; up: number }[] = [
  { mode: "speech", label: "Speak", right: 6, up: 80 },
  { mode: "text", label: "Type", right: 58, up: 58 },
  { mode: "photo", label: "Photo", right: 80, up: 6 },
];

// Controlled from Feed so a scroll/swipe can close the fan from outside —
// wandering off to browse shouldn't leave it hanging open.
export function AddVibeRadial({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (mode: AddVibeMode) => void;
}) {
  const pick = (mode: AddVibeMode) => {
    onOpenChange(false);
    onSelect(mode);
  };

  return (
    <>
      {/* tap-away catcher — invisible, just closes the fan */}
      {open && (
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="absolute inset-0 z-[19] cursor-default"
        />
      )}

      {SLOTS.map((slot, i) => (
        <motion.button
          key={slot.mode}
          type="button"
          aria-label={slot.label}
          onClick={() => pick(slot.mode)}
          initial={false}
          animate={
            open
              ? { x: 0, y: 0, scale: 1, opacity: 1 }
              : { x: slot.right, y: slot.up, scale: 0.4, opacity: 0 }
          }
          transition={{
            type: "spring",
            damping: 22,
            stiffness: 320,
            delay: open ? i * 0.035 : 0,
          }}
          style={{
            right: `${26 + slot.right}px`,
            bottom: `calc(env(safe-area-inset-bottom) + ${24 + slot.up}px)`,
          }}
          className="absolute z-20 flex size-11 items-center justify-center rounded-full border border-line bg-card shadow-float"
        >
          {slot.mode === "speech" && <MicIcon size={18} color="#14080e" />}
          {slot.mode === "text" && <TypeIcon size={18} color="#14080e" />}
          {slot.mode === "photo" && <PhotoIcon size={18} color="#14080e" />}
        </motion.button>
      ))}

      {/* the fab itself — plus rotates into an x while the fan is open */}
      <button
        type="button"
        aria-label={open ? "Close" : "Change your feed"}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] right-[26px] z-20 flex size-12 items-center justify-center rounded-full bg-pine shadow-float"
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.18 }}
          className="flex items-center justify-center"
        >
          <PlusIcon color="#f7f5ee" />
        </motion.span>
      </button>
    </>
  );
}
