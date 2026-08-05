/* eslint-disable @next/next/no-img-element */

// Full primary lockup — digital-mall mark + wordmark. Use for splash/hero
// placements where the mark has room to read (login, empty states).
export function HapaMark({
  height = 40,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  return (
    <img
      src="/brand/hapa-logo.svg"
      alt="HAPA"
      height={height}
      className={className}
      style={{ height, width: "auto", alignSelf: "flex-start" }}
      draggable={false}
    />
  );
}

// Wordmark only, cropped from the primary lockup — for compact header use
// where the tiled-cart mark would be too small to read cleanly.
export function HapaWordmark({
  height = 16,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="330 80 620 160"
      height={height}
      style={{ height, width: "auto", alignSelf: "flex-start" }}
      role="img"
      aria-label="HAPA"
      className={className}
    >
      <g
        fill="none"
        stroke="#14080E"
        strokeWidth="24"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M360 102v116M444 102v116M360 160h84" />
        <path d="M510 218v-66c0-34 19-52 49-52s49 18 49 52v66M510 166h98" />
        <path d="M674 218V102h50c29 0 47 16 47 40s-18 40-47 40h-50" />
        <path d="M837 218v-66c0-34 19-52 49-52s49 18 49 52v66M837 166h98" />
      </g>
    </svg>
  );
}
