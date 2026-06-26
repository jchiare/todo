"use client";

// Client-side store for LifeOS V0. All state is local and synchronous; there
// is no backend in V0. State is persisted to localStorage on every change and
// sanitized on read (unknown screens coerce to 'today'). The data model in
// ./types is the source of truth — not this persisted blob.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DETAIL, SEED, SUMMARIZE_DATE } from "./seed";
import type {
  Draft,
  LifeOSState,
  Overlay,
  Project,
  ResearchCell,
  Screen,
} from "./types";

const STORAGE_KEY = "lifeos_v0";

const EMPTY_CELL: ResearchCell = { notes: "", findings: [] };

function initialDraft(): Draft {
  return { title: "", area: "", goal: "", next: "", priority: 3, strategic: 3, effort: 30 };
}

function initialState(): LifeOSState {
  return {
    screen: "today",
    selectedProjectId: null,
    projectTab: "overview",
    ov: {},
    manualOrder: null,
    expanded: {},
    completed: [],
    userProjects: [],
    adding: false,
    draftInvalid: false,
    taskDone: {},
    draft: initialDraft(),
    research: {},
    memo: {},
    openTask: {},
    findingDraft: "",
  };
}

/** Guard persisted values against removed screens. */
function sanitize(saved: Partial<LifeOSState>): Partial<LifeOSState> {
  const out = { ...saved };
  if (out.screen && out.screen !== "today" && out.screen !== "projects") {
    out.screen = "today";
  }
  return out;
}

/** Task rows for a project: its open tasks plus its already-done tasks. */
export function tasksFor(
  pid: string
): { key: string; text: string; def: boolean }[] {
  const det = DETAIL[pid];
  const all = SEED.concat([]); // user projects have no DETAIL entry
  const tasks = det ? det.tasks : all.find((p) => p.id === pid)?.action.steps ?? [];
  const done = det ? det.done : [];
  return [
    ...tasks.map((t, i) => ({ key: "t" + i, text: t, def: false })),
    ...done.map((t, i) => ({ key: "d" + i, text: t, def: true })),
  ];
}

export function useLifeOS() {
  const [state, setState] = useState<LifeOSState>(initialState);
  const hydrated = useRef(false);
  // Drag-and-drop scratch refs (not persisted).
  const dragId = useRef<string | null>(null);
  const orderRef = useRef<string[]>([]);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = sanitize(JSON.parse(raw));
        // SSR renders the default state; we adopt persisted state once on the
        // client (the prototype does this in componentDidMount).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState((p) => ({ ...p, ...saved }));
      }
    } catch {
      /* ignore */
    }
    hydrated.current = true;
  }, []);

  // Persist on every change (after the first hydrate to avoid clobbering).
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const allProjects = useCallback(
    (): Project[] => SEED.concat(state.userProjects || []),
    [state.userProjects]
  );

  const researchFor = useCallback(
    (pid: string, key: string): ResearchCell =>
      state.research[pid]?.[key] || EMPTY_CELL,
    [state.research]
  );

  const allFindings = useCallback(
    (pid: string): { task: string; text: string }[] => {
      const r = state.research[pid] || {};
      const map = Object.fromEntries(tasksFor(pid).map((t) => [t.key, t.text]));
      const out: { task: string; text: string }[] = [];
      for (const k in r) {
        (r[k].findings || []).forEach((f) =>
          out.push({ task: map[k] || "", text: f })
        );
      }
      return out;
    },
    [state.research]
  );

  // --- mutations ---------------------------------------------------------

  const setScreen = useCallback(
    (k: Screen) => setState((s) => ({ ...s, screen: k })),
    []
  );
  const openProject = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        screen: "projects",
        selectedProjectId: id,
        projectTab: "overview",
      })),
    []
  );
  const backToProjects = useCallback(
    () => setState((s) => ({ ...s, selectedProjectId: null })),
    []
  );

  const setOv = useCallback((id: string, patch: Overlay) => {
    setState((s) => ({
      ...s,
      ov: { ...s.ov, [id]: { ...(s.ov[id] || {}), ...patch } },
    }));
  }, []);

  const complete = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      completed: [...s.completed.filter((x) => x !== id), id],
      ov: { ...s.ov, [id]: { ...(s.ov[id] || {}), status: "idle" } },
      manualOrder: s.manualOrder ? s.manualOrder.filter((x) => x !== id) : null,
    }));
  }, []);

  const primary = useCallback(
    (id: string) => {
      const o = state.ov[id] || {};
      if (o.status === "active") complete(id);
      else setOv(id, { status: "active" });
    },
    [state.ov, complete, setOv]
  );

  const snooze = useCallback(
    (id: string) =>
      setOv(id, { snoozedUntil: "2026-06-26", status: "idle", broken: false }),
    [setOv]
  );
  const notRelevant = useCallback(
    (id: string) => setOv(id, { cleared: true }),
    [setOv]
  );
  const breakDown = useCallback(
    (id: string) => setOv(id, { broken: true }),
    [setOv]
  );

  const surface = useCallback((id: string) => {
    setState((s) => {
      const o = { ...(s.ov[id] || {}) };
      delete o.snoozedUntil;
      delete o.cleared;
      return {
        ...s,
        ov: { ...s.ov, [id]: o },
        completed: s.completed.filter((x) => x !== id),
      };
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      expanded: { ...s.expanded, [id]: !s.expanded[id] },
    }));
  }, []);

  const setProjectTab = useCallback(
    (t: LifeOSState["projectTab"]) =>
      setState((s) => ({ ...s, projectTab: t })),
    []
  );

  const toggleTask = useCallback((pid: string, key: string) => {
    setState((s) => {
      const m = { ...(s.taskDone[pid] || {}) };
      m[key] = !m[key];
      return { ...s, taskDone: { ...s.taskDone, [pid]: m } };
    });
  }, []);

  const toggleTaskResearch = useCallback((pid: string, key: string) => {
    setState((s) => ({
      ...s,
      openTask: { ...s.openTask, [pid]: s.openTask[pid] === key ? null : key },
      findingDraft: "",
    }));
  }, []);

  const setTaskNotes = useCallback((pid: string, key: string, v: string) => {
    setState((s) => {
      const pr = { ...(s.research[pid] || {}) };
      pr[key] = { ...(pr[key] || EMPTY_CELL), notes: v };
      return { ...s, research: { ...s.research, [pid]: pr } };
    });
  }, []);

  const setFindingDraft = useCallback(
    (v: string) => setState((s) => ({ ...s, findingDraft: v })),
    []
  );

  const addFinding = useCallback((pid: string, key: string) => {
    setState((s) => {
      const v = (s.findingDraft || "").trim();
      if (!v) return s;
      const pr = { ...(s.research[pid] || {}) };
      const cell = { ...(pr[key] || EMPTY_CELL) };
      cell.findings = [...(cell.findings || []), v];
      pr[key] = cell;
      return { ...s, research: { ...s.research, [pid]: pr }, findingDraft: "" };
    });
  }, []);

  const removeFinding = useCallback((pid: string, key: string, idx: number) => {
    setState((s) => {
      const pr = { ...(s.research[pid] || {}) };
      const cell = { ...(pr[key] || EMPTY_CELL) };
      cell.findings = (cell.findings || []).filter((_, i) => i !== idx);
      pr[key] = cell;
      return { ...s, research: { ...s.research, [pid]: pr } };
    });
  }, []);

  const summarizeProject = useCallback(
    (pid: string) => {
      const proj = allProjects().find((p) => p.id === pid);
      if (!proj) return;
      const fs = allFindings(pid);
      const count = fs.length;
      let text: string;
      if (count === 0) {
        text = proj.currentState;
      } else {
        const lead = proj.goal && proj.goal !== "—" ? proj.goal + " " : "";
        text =
          lead +
          "Research now supports " +
          count +
          " finding" +
          (count === 1 ? "" : "s") +
          ": " +
          fs.map((f) => f.text.replace(/\s*\.\s*$/, "")).join("; ") +
          ".";
      }
      setState((s) => ({
        ...s,
        memo: { ...s.memo, [pid]: { text, count, updatedAt: SUMMARIZE_DATE } },
      }));
    },
    [allProjects, allFindings]
  );

  // --- new project form --------------------------------------------------

  const startAdd = useCallback(
    () =>
      setState((s) => ({
        ...s,
        adding: true,
        draftInvalid: false,
        draft: initialDraft(),
      })),
    []
  );
  const cancelAdd = useCallback(
    () => setState((s) => ({ ...s, adding: false, draftInvalid: false })),
    []
  );
  const setDraft = useCallback((k: keyof Draft, v: string | number) => {
    setState((s) => ({ ...s, draft: { ...s.draft, [k]: v } }));
  }, []);

  const saveProject = useCallback(() => {
    setState((s) => {
      const d = s.draft;
      if (!d.title.trim() || !d.next.trim()) {
        return { ...s, draftInvalid: true };
      }
      const p: Project = {
        id: "user-" + Date.now(),
        title: d.title.trim(),
        area: d.area.trim() || "General",
        habit: false,
        goal: d.goal.trim() || "—",
        currentState: "New project — just added.",
        priority: d.priority,
        strategic: d.strategic,
        cadence: "Weekly review",
        freshness: "fresh",
        risk: "—",
        decision: "—",
        daysSinceTouch: 0,
        deadline: null,
        researchSignal: false,
        action: {
          third: "break_down",
          title: d.next.trim(),
          whyNow: "You just created this project.",
          effort: d.effort,
          steps: [],
        },
      };
      return {
        ...s,
        userProjects: [...(s.userProjects || []), p],
        adding: false,
        draftInvalid: false,
      };
    });
  }, []);

  // --- drag to reorder ---------------------------------------------------

  const resetOrder = useCallback(
    () => setState((s) => ({ ...s, manualOrder: null })),
    []
  );
  const setLiveOrder = useCallback((ids: string[]) => {
    orderRef.current = ids;
  }, []);
  const onDragStart = useCallback((e: React.DragEvent, id: string) => {
    dragId.current = id;
    if (e?.dataTransfer) e.dataTransfer.effectAllowed = "move";
  }, []);
  const onDrop = useCallback((e: React.DragEvent, id: string) => {
    e?.preventDefault?.();
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === id) return;
    const arr = orderRef.current.filter((x) => x !== from);
    const i = arr.indexOf(id);
    if (i < 0) return;
    arr.splice(i, 0, from);
    setState((s) => ({ ...s, manualOrder: arr }));
  }, []);

  const actions = useMemo(
    () => ({
      setScreen,
      openProject,
      backToProjects,
      primary,
      snooze,
      notRelevant,
      breakDown,
      surface,
      toggleExpand,
      setProjectTab,
      toggleTask,
      toggleTaskResearch,
      setTaskNotes,
      setFindingDraft,
      addFinding,
      removeFinding,
      summarizeProject,
      startAdd,
      cancelAdd,
      setDraft,
      saveProject,
      resetOrder,
      setLiveOrder,
      onDragStart,
      onDrop,
    }),
    [
      setScreen,
      openProject,
      backToProjects,
      primary,
      snooze,
      notRelevant,
      breakDown,
      surface,
      toggleExpand,
      setProjectTab,
      toggleTask,
      toggleTaskResearch,
      setTaskNotes,
      setFindingDraft,
      addFinding,
      removeFinding,
      summarizeProject,
      startAdd,
      cancelAdd,
      setDraft,
      saveProject,
      resetOrder,
      setLiveOrder,
      onDragStart,
      onDrop,
    ]
  );

  return { state, actions, allProjects, researchFor, allFindings };
}

export type LifeOS = ReturnType<typeof useLifeOS>;
