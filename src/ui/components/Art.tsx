import { useState, type ReactNode } from "react";

/**
 * One image, resolved against whatever file exists.
 *
 * The art set is generated in whatever format the model returns, so nothing in
 * the code can assume an extension. This tries each one once per `base` and
 * caches the answer, then falls back to a grey box with whatever `children`
 * the caller supplies. Twenty drops from one dungeon cost one lookup.
 */
const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

/**
 * Public files live beside the app, not at the domain root: GitHub Pages serves
 * this build from `/world-first/`. Vite rewrites the paths it can see at build
 * time, but a template string is invisible to it, so the base is applied here.
 */
const assetUrl = (base: string, ext: string): string =>
  `${import.meta.env.BASE_URL}${base.replace(/^\//, "")}${ext}`;

/** base → the extension that loaded, or null when every one was missing. */
const resolved = new Map<string, string | null>();

type Props = {
  /** Site-absolute path without an extension: `/art/items/salve`. */
  base: string;
  alt: string;
  /** Pixels, or "100%" for a banner that stretches. */
  width: number | string;
  height?: number;
  className?: string;
  title?: string;
  /** Rendered inside the placeholder when no file loads. */
  children?: ReactNode;
};

export const Art = ({ base, alt, width, height, className = "", title, children }: Props) => {
  const [attempt, setAttempt] = useState(0);
  // A string width ("100%") leaves height to CSS, so a banner can use aspect-ratio.
  const box = { width, height: height ?? (typeof width === "number" ? width : undefined) };
  const known = resolved.get(base);

  if (known === null) {
    return (
      <span className={`art art-empty ${className}`} style={box} aria-hidden="true" title={title}>
        {children}
      </span>
    );
  }

  const ext = known ?? EXTENSIONS[attempt];
  if (!ext) return null;

  return (
    <img
      className={`art ${className}`}
      style={box}
      src={assetUrl(base, ext)}
      alt={alt}
      title={title}
      loading="lazy"
      decoding="async"
      onLoad={() => resolved.set(base, ext)}
      onError={() => {
        if (attempt + 1 < EXTENSIONS.length) {
          setAttempt(attempt + 1);
        } else {
          resolved.set(base, null);
          setAttempt(0);
        }
      }}
    />
  );
};

/**
 * A drop's display name to its file id: `Vaultwarden's Key` → `vaultwardens-key`.
 * Mirrors the rule in scripts/art/prompts.mjs, which names the files.
 */
export const itemArtId = (name: string): string =>
  name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
