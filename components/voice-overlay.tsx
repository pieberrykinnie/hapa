"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useHapa } from "./hapa-provider";
import { MicIcon } from "./icons";
import {
  HAPA_ASSISTANT_CONFIG,
  SHIFT_FEED_VIBE_TOOL,
  getVapiClient,
  parseToolArguments,
  startVapiCall,
  stopVapiCall,
  toVibeShift,
} from "@/lib/vapi";
import type { VibeShift } from "@/lib/types";

type CallState =
  | "connecting"
  | "listening"
  | "speaking"
  | "denied"
  | "error";

interface TranscriptLine {
  role: "assistant" | "user";
  text: string;
}

interface VapiTranscriptMessage {
  type: "transcript";
  role: "assistant" | "user";
  transcriptType: "partial" | "final";
  transcript: string;
}

interface VapiToolCallsMessage {
  type: "tool-calls";
  // Despite the SDK's types, `arguments` isn't reliably a JSON string —
  // `parseToolArguments` normalizes whatever shape actually arrives.
  toolCallList: { id: string; type: string; function: { name: string; arguments: unknown } }[];
}

const BAR_HEIGHTS = [20, 44, 60, 34, 52, 24, 40];

const STATUS_LABEL: Record<CallState, string> = {
  connecting: "connecting…",
  listening: "hapa is listening",
  speaking: "hapa is talking",
  denied: "mic access needed",
  error: "voice trouble",
};

function isPermissionError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "NotAllowedError" || error.name === "PermissionDeniedError";
  }
  // Daily (Vapi's underlying transport) reports device/permission failures as
  // plain objects with an `errorMsg`/`msg` field rather than a DOMException.
  const e = error as Record<string, unknown> | null;
  const nested = (e?.error as Record<string, unknown> | undefined) ?? {};
  const text = [e?.message, e?.errorMsg, e?.msg, nested.message, nested.errorMsg, nested.msg]
    .filter(Boolean)
    .join(" ");
  return /permission|notallowed|denied/i.test(text);
}

/** Simple heuristic for the typed fallback — "no "/"not "/"without " clauses become
 * dealbreakers, everything else is added. Voice keeps the real LLM parser (Vapi's
 * assistant); this only covers the degraded path when a call can't be used. */
function parseTypedShift(input: string): VibeShift {
  const clauses = input
    .split(/,| and /i)
    .map((c) => c.trim())
    .filter(Boolean);

  const add_keywords: string[] = [];
  const dealbreakers: string[] = [];
  for (const clause of clauses) {
    const negated = clause.match(/^(?:no|not|without)\s+(.+)$/i);
    if (negated) dealbreakers.push(negated[1].trim().toLowerCase());
    else add_keywords.push(clause.toLowerCase());
  }
  return { add_keywords, remove_keywords: [], dealbreakers };
}

export function VoiceOverlay({ onClose }: { onClose: () => void }) {
  const { applyVibeShift } = useHapa();
  const [callState, setCallState] = useState<CallState>("connecting");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [textInput, setTextInput] = useState("");
  const closedRef = useRef(false);
  const connectedRef = useRef(false);
  const speakingRef = useRef(false);
  // Holds a shift that arrived while hapa was still talking — applied once
  // the modal has actually closed, not before.
  const pendingShiftRef = useRef<VibeShift | null>(null);

  useEffect(() => {
    const vapi = getVapiClient();
    let cancelled = false;

    const handleCallStart = () => {
      if (cancelled) return;
      connectedRef.current = true;
      setCallState("listening");
    };
    const handleSpeechStart = () => {
      if (cancelled) return;
      speakingRef.current = true;
      setCallState("speaking");
    };
    const handleSpeechEnd = () => {
      if (cancelled) return;
      speakingRef.current = false;
      // The vibe shift landed while hapa was still talking — let her finish
      // that line, then close before switching the feed's vibe.
      const pending = pendingShiftRef.current;
      if (pending) {
        pendingShiftRef.current = null;
        closedRef.current = true;
        onClose();
        applyVibeShift(pending);
        return;
      }
      setCallState("listening");
    };
    const handleCallEnd = () => {
      if (cancelled) return;
      // A call that ends before it ever connected (e.g. mic permission
      // denied before Daily even reaches call-start) is a failure, not a
      // graceful hangup — fall back to text instead of silently closing.
      if (!connectedRef.current) {
        setCallState("error");
        return;
      }
      closedRef.current = true;
      onClose();
    };
    const handleError = (error: unknown) => {
      if (cancelled) return;
      setCallState(isPermissionError(error) ? "denied" : "error");
    };
    const handleMessage = (message: unknown) => {
      if (cancelled || !message || typeof message !== "object") return;
      const type = (message as { type?: string }).type;

      if (type === "transcript") {
        const m = message as VapiTranscriptMessage;
        if (m.transcriptType !== "final") return;
        setTranscript((prev) => [...prev.slice(-4), { role: m.role, text: m.transcript }]);
      } else if (type === "tool-calls") {
        const m = message as VapiToolCallsMessage;
        const calls = m.toolCallList ?? [];
        if (calls.length === 0) {
          console.warn("[hapa voice] tool-calls message with no toolCallList", m);
        }
        for (const call of calls) {
          if (call.function?.name !== SHIFT_FEED_VIBE_TOOL) {
            console.warn("[hapa voice] unexpected tool call", call.function?.name);
            continue;
          }
          const shift = toVibeShift(parseToolArguments(call.function.arguments));
          if (!shift) {
            console.warn(
              "[hapa voice] shift_feed_vibe call had an invalid payload shape",
              call.function.arguments,
            );
            continue;
          }
          // One shift per call: close the modal first, then switch the
          // feed's vibe — wait for hapa to finish confirming it if she's
          // still mid-sentence, rather than cutting her off.
          if (speakingRef.current) {
            pendingShiftRef.current = shift;
          } else {
            closedRef.current = true;
            onClose();
            applyVibeShift(shift);
          }
        }
      } else if (type && type !== "conversation-update" && type !== "model-output") {
        // Anything else (status-update, speech-update, etc.) is expected
        // noise; log unrecognized types so a silent integration gap is
        // visible in the console instead of just "nothing happened".
        console.debug("[hapa voice] unhandled message type", type, message);
      }
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);
    vapi.on("call-end", handleCallEnd);
    vapi.on("error", handleError);
    vapi.on("message", handleMessage);

    startVapiCall(HAPA_ASSISTANT_CONFIG).catch((error: unknown) => {
      if (!cancelled) setCallState(isPermissionError(error) ? "denied" : "error");
    });

    return () => {
      cancelled = true;
      vapi.removeListener("call-start", handleCallStart);
      vapi.removeListener("speech-start", handleSpeechStart);
      vapi.removeListener("speech-end", handleSpeechEnd);
      vapi.removeListener("call-end", handleCallEnd);
      vapi.removeListener("error", handleError);
      vapi.removeListener("message", handleMessage);
      stopVapiCall();
    };
  }, [applyVibeShift, onClose]);

  const close = () => {
    if (!closedRef.current) {
      closedRef.current = true;
      onClose();
    }
  };

  const submitText = () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    const shift = parseTypedShift(trimmed);
    close();
    applyVibeShift(shift);
  };

  const isFallback = callState === "denied" || callState === "error";
  const isCallActive = callState === "listening" || callState === "speaking";

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 48 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="absolute inset-0 z-30 flex flex-col bg-ink"
    >
      <div className="flex items-center justify-between px-7 pt-[calc(env(safe-area-inset-top)+20px)]">
        <span className="font-display text-[15px] font-bold text-paper">
          {STATUS_LABEL[callState]}
        </span>
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="flex size-[34px] items-center justify-center rounded-full border-[1.5px] border-line-dark text-[15px] text-ink-faint"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-7 px-7">
        {!isFallback && (
          <div className="flex h-16 items-end justify-center gap-[5px]">
            {BAR_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="wave-bar w-1.5 rounded-[3px]"
                style={{
                  height: h,
                  background: i === 2 || i === 4 ? "#c8e087" : "#3f7d20",
                  animationDelay: `${i * 0.12}s`,
                  animationPlayState: isCallActive ? "running" : "paused",
                }}
              />
            ))}
          </div>
        )}

        <div className="flex min-h-[220px] flex-col justify-end gap-3.5">
          <AnimatePresence>
            {transcript.map((line, i) => (
              <motion.div
                key={`${i}-${line.text.slice(0, 12)}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={
                  line.role === "user"
                    ? "max-w-[280px] self-end rounded-[18px] rounded-br-[4px] bg-bubble px-4 py-3.5 text-[14.5px] leading-normal text-paper"
                    : "max-w-[280px] self-start rounded-[18px] rounded-bl-[4px] bg-pine px-4 py-3.5 text-[14.5px] leading-normal text-paper"
                }
              >
                {line.text}
              </motion.div>
            ))}
          </AnimatePresence>
          {transcript.length === 0 && !isFallback && (
            <p className="text-center text-[13px] text-ink-faint">
              Try “switch to camping gear, no neon.”
            </p>
          )}
          {isFallback && (
            <p className="text-center text-[13px] text-ink-faint">
              {callState === "denied"
                ? "Mic access was denied. Type what you're after instead."
                : "Voice hit a snag. Type what you're after instead."}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 px-7 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        {isFallback ? (
          <div className="flex w-full items-center gap-2.5">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitText()}
              placeholder="camping this weekend, no neon…"
              className="flex-1 rounded-full border-[1.5px] border-line-dark bg-transparent px-4 py-3 text-[14.5px] text-paper outline-none placeholder:text-ink-faint"
            />
            <button
              type="button"
              aria-label="Apply"
              onClick={submitText}
              className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-pine"
            >
              <MicIcon size={20} color="#f7f5ee" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Done talking"
            onClick={close}
            className="flex size-[62px] items-center justify-center rounded-full bg-pine"
          >
            <MicIcon size={26} color="#f7f5ee" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
