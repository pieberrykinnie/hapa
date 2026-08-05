/* eslint-disable @next/next/no-img-element */
// Product imagery is the interface. Until curated photos / SerpApi thumbnails
// land, the diagonal-striped placeholder with a monospace caption marks the slot.
export function ProductPhoto({
  image,
  caption,
  variant = "deep",
  className = "",
}: {
  image: string;
  caption: string;
  variant?: "deep" | "light";
  className?: string;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={caption}
        className={`h-full w-full object-cover ${className}`}
        draggable={false}
      />
    );
  }
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${
        variant === "deep" ? "stripes" : "stripes-light"
      } ${className}`}
    >
      <span className="px-4 text-center font-mono text-xs text-ink-faint">
        {caption}
      </span>
    </div>
  );
}
