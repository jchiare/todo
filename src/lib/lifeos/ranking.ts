// Deterministic ranking — a small, visible scoring function, NOT a learned
// model. Implemented exactly per the handoff "Ranking Logic" section.
//
//   score =
//       deadline_urgency        # 0–40
//     + momentum_risk           # 0–30   habit projects only
//     + strategic_importance*5  # 0–25
//     + project_priority*3      # 0–15
//     + research_change_signal  # +20    only on a material research change
//     + pinned                  # +1000  (model only; no V0 UI)
//     - recently_snoozed        # -50    until the snooze window expires
//
// Gates remove an item entirely (not by score): blocked, low actionability,
// no new info.

import { TODAY } from "./seed";
import type { Overlay, Project } from "./types";

export interface ScoreComponents {
  du: number;
  mr: number;
  si: number;
  pr: number;
  rc: number;
  total: number;
}

const DAY_MS = 86_400_000;

/** 0–40, ramps as the deadline nears. */
export function deadlineUrgency(iso: string | null): number {
  if (!iso) return 0;
  const days = Math.round(
    (new Date(iso).getTime() - new Date(TODAY).getTime()) / DAY_MS
  );
  if (days <= 0) return 40;
  if (days >= 180) return 0;
  return Math.round(40 * (1 - days / 180));
}

/** The five visible score components for a project's active action. */
export function comps(p: Project): ScoreComponents {
  const du = deadlineUrgency(p.deadline);
  const mr = p.habit ? Math.min(30, p.daysSinceTouch * 8) : 0;
  const si = p.strategic * 5;
  const pr = p.priority * 3;
  const rc = p.researchSignal ? 20 : 0;
  return { du, mr, si, pr, rc, total: du + mr + si + pr + rc };
}

export interface LiveItem {
  p: Project;
  comps: ScoreComponents;
}
export interface QuietItem {
  p: Project;
  reason: string;
}
export interface CompletedItem {
  p: Project;
}

export interface TriageResult {
  live: LiveItem[];
  quiet: QuietItem[];
  completedItems: CompletedItem[];
}

/**
 * Partition projects into the ranked Today list, the Quiet list, and the
 * Completed list, applying gates and the snooze/cleared overlays. Sort the
 * live list by score descending; a manual drag order, when set, overrides it.
 */
export function build(
  projects: Project[],
  ov: Record<string, Overlay>,
  completed: string[],
  manualOrder: string[] | null
): TriageResult {
  const live: LiveItem[] = [];
  const quiet: QuietItem[] = [];
  const completedItems: CompletedItem[] = [];

  for (const p of projects) {
    const o = ov[p.id] || {};
    if (completed.includes(p.id)) {
      completedItems.push({ p });
      continue;
    }
    let reason: string | null = null;
    if (p.blocked) reason = p.quietReason || "Blocked.";
    else if (o.cleared)
      reason =
        "Cleared — that action was wrong for this project. Needs a new next action.";
    else if (o.snoozedUntil) reason = "Snoozed. Returns tomorrow.";
    else if (p.noNewInfo) reason = p.quietReason || "No new information.";
    if (reason) {
      quiet.push({ p, reason });
      continue;
    }
    live.push({ p, comps: comps(p) });
  }

  live.sort((a, b) => b.comps.total - a.comps.total);
  if (manualOrder) {
    const idx = (id: string) => {
      const i = manualOrder.indexOf(id);
      return i < 0 ? 999 : i;
    };
    live.sort((a, b) => idx(a.p.id) - idx(b.p.id));
  }

  return { live, quiet, completedItems };
}
