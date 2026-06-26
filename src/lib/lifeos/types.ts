// Product-level data model for LifeOS V0 (manual triage, no backend).
// See design_handoff README "Data Model" — this is the source of truth, not
// the persisted blob.

export type Freshness = "fresh" | "aging" | "stale";

export type ThirdControl = "break_down" | "not_relevant";

/** The single next action a project surfaces into Today. */
export interface ProjectAction {
  /** Which third button the Today card shows. */
  third: ThirdControl;
  title: string;
  whyNow: string;
  /** Effort in minutes. */
  effort: number;
  /** Smaller steps revealed by "Break Down". */
  steps: string[];
}

export interface Project {
  id: string;
  title: string;
  area: string;
  /** Habit projects accrue momentum_risk and go quiet (not done) for the day. */
  habit: boolean;
  goal: string;
  /** The "Current Memo" prose, unless a synthesized memo overrides it. */
  currentState: string;
  priority: number; // 1–5
  strategic: number; // 1–5
  cadence: string;
  freshness: Freshness;
  risk: string;
  /** Label of the decision this project supports ("—" if none). */
  decision: string;
  daysSinceTouch: number;
  /** ISO date or null. */
  deadline: string | null;
  /** A material research change created/changed this action. */
  researchSignal: boolean;
  action: ProjectAction;

  // --- Gates (remove from Today entirely, not by score) ---
  blocked?: boolean;
  noNewInfo?: boolean;
  quietReason?: string;
}

export interface RelatedDecision {
  title: string;
  status: string;
  leaning: string;
}

/** Per-project static detail backing the Tasks/Sources/Overview tabs. */
export interface ProjectDetailData {
  note: string;
  questions: string[];
  /** Decision ids (single source of truth for the Project↔Decision link). */
  decisions: string[];
  tasks: string[];
  done: string[];
  /** [title, meta] tuples. */
  sources: [string, string][];
}

/** Per-action overlay state set by Today interactions. */
export interface Overlay {
  status?: "active" | "idle";
  snoozedUntil?: string;
  cleared?: boolean;
  broken?: boolean;
}

/** Task-scoped research that synthesizes into the project memo. */
export interface ResearchCell {
  notes: string;
  findings: string[];
}

export interface MemoOverride {
  text: string;
  count: number;
  updatedAt: string;
}

export interface Draft {
  title: string;
  area: string;
  goal: string;
  next: string;
  priority: number;
  strategic: number;
  effort: number;
}

export type Screen = "today" | "projects";
export type ProjectTab = "overview" | "tasks" | "sources";

export interface LifeOSState {
  screen: Screen;
  selectedProjectId: string | null;
  projectTab: ProjectTab;
  ov: Record<string, Overlay>;
  manualOrder: string[] | null;
  expanded: Record<string, boolean>;
  completed: string[];
  userProjects: Project[];
  adding: boolean;
  draftInvalid: boolean;
  taskDone: Record<string, Record<string, boolean>>;
  draft: Draft;
  research: Record<string, Record<string, ResearchCell>>;
  memo: Record<string, MemoOverride>;
  openTask: Record<string, string | null>;
  findingDraft: string;
}
