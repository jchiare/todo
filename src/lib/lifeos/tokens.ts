// Design tokens from the handoff "Design Tokens" section. The prototype uses
// inline styles throughout; we keep that approach so the exact hex values,
// spacing, and type scale are matched faithfully rather than approximated by a
// utility framework.

import type { CSSProperties } from "react";
import type { Freshness } from "./types";

export const C = {
  appBg: "#F2EEE5",
  sidebarBg: "#ECE7DC",
  sidebarBorder: "#E0D9CB",
  cardBg: "#FBF9F4",
  cardBorder: "#E5DECF",
  openTask: "#F6F2E8",
  brokenBg: "#F3EEE2",

  textPrimary: "#2B2825",
  textPrimaryAlt: "#3A352E",
  textSecondary: "#5C554B",
  textSecondaryAlt: "#6B6457",
  textTertiary: "#7C7464",
  textMuted: "#8A8273",
  textMutedAlt: "#8C8270",
  faint: "#9A9082",
  faintAlt: "#A0967F",
  faintTab: "#A89E8E",
  faintest: "#B6AB95",
  rankNumeral: "#C9BFA8",
  navDot: "#C9C0AE",

  accent: "#4E6E89",
  accentLabel: "#5A7286",
  accentText: "#3F5E78",
  accentTintBg: "#EAEFF3",
  accentTintBorder: "#BFD0DC",

  green: "#4B6B4F",
  amber: "#9A7B3A",
  red: "#A65441",

  divider: "#E8E1D3",
  dividerAlt: "#EFE9DC",
  inputBorder: "#DAD2C2",
  selection: "#D7E0E8",
} as const;

export const fonts = {
  serif: "var(--font-serif), Georgia, serif",
  sans: "var(--font-sans), system-ui, sans-serif",
  mono: "var(--font-mono), ui-monospace, monospace",
} as const;

export function freshLabel(f: Freshness): string {
  return f === "fresh" ? "Fresh" : f === "aging" ? "Aging" : "Stale";
}

/** The freshness pill style (fresh=green, aging=amber, stale=red). */
export function freshStyle(f: Freshness): CSSProperties {
  const c = f === "fresh" ? C.green : f === "aging" ? C.amber : C.red;
  return {
    display: "inline-block",
    fontSize: 11,
    fontFamily: fonts.mono,
    color: c,
    border: `1px solid ${c}44`,
    borderRadius: 4,
    padding: "2px 8px",
  };
}

/** Uppercase mono "eyebrow" label. */
export function eyebrow(color: string, size = 12, spacing = 1.5): CSSProperties {
  return {
    fontSize: size,
    letterSpacing: spacing,
    textTransform: "uppercase",
    color,
    fontFamily: fonts.mono,
  };
}
