// Seed data ported verbatim from the V0 prototype's SEED / DECISION / DETAIL.
// The default Today ranking with this seed must surface, in order:
//   German A1 → USA Taxes 2025 → Ellie German Exposure.

import type { Project, ProjectDetailData, RelatedDecision } from "./types";

/** The fixed "today" used for deterministic deadline math (matches prototype). */
export const TODAY = "2026-06-25";
export const DATE_LABEL = "Thursday, June 25, 2026";
/** Stamp used when synthesizing a memo (matches prototype). */
export const SUMMARIZE_DATE = "Jun 26";

export const SEED: Project[] = [
  {
    id: "german-a1",
    title: "German A1",
    area: "Language",
    habit: true,
    goal: "Functional A1 by Oct 2026.",
    currentState:
      "On track if the daily habit resumes. Speaking practice is the weak point.",
    priority: 5,
    strategic: 5,
    cadence: "Daily",
    freshness: "fresh",
    risk: "Medium — consistency.",
    decision: "Berlin move optionality.",
    daysSinceTouch: 3,
    deadline: null,
    researchSignal: false,
    action: {
      third: "break_down",
      title: "Do 20 Anki cards + 1 Nicos Weg lesson.",
      whyNow:
        "3 days untouched. German compounds daily and supports Berlin optionality.",
      effort: 35,
      steps: [
        "Open Anki and clear the 20 due cards",
        "Watch one Nicos Weg lesson",
        "Spend 5 minutes speaking the new phrases aloud",
      ],
    },
  },
  {
    id: "taxes-2025",
    title: "USA Taxes 2025",
    area: "Admin",
    habit: false,
    goal: "File an accurate federal + CA return by the Oct 15 extension deadline.",
    currentState:
      "Documents not yet collected. The next step is concrete and unblocked.",
    priority: 4,
    strategic: 3,
    cadence: "Until filed",
    freshness: "fresh",
    risk: "Low — execution only.",
    decision: "—",
    daysSinceTouch: 6,
    deadline: "2026-10-15",
    researchSignal: false,
    action: {
      third: "not_relevant",
      title: "Collect W-2, 1099, RSU, and childcare documents.",
      whyNow:
        "Concrete, unblocked, and deadline-bound. No more research is needed.",
      effort: 30,
      steps: [
        "Download the W-2 from the payroll portal",
        "Gather 1099 forms (brokerage, interest)",
        "Pull RSU vesting and sale records",
        "Collect childcare receipts for the year",
      ],
    },
  },
  {
    id: "ellie-german",
    title: "Ellie German Exposure",
    area: "Family",
    habit: false,
    goal: "Make the German transition realistic if moving to Berlin in 2028.",
    currentState:
      "No concrete exposure plan yet. A German-speaking babysitter is the fastest first lever.",
    priority: 4,
    strategic: 5,
    cadence: "Weekly review",
    freshness: "fresh",
    risk: "Medium — time-sensitive for 2028.",
    decision: "Berlin 2028 school transition.",
    daysSinceTouch: 9,
    deadline: null,
    researchSignal: false,
    action: {
      third: "break_down",
      title: "Find one German-speaking babysitter option.",
      whyNow:
        "This matters more than additional Berlin theory. It directly improves the 2028 school transition path.",
      effort: 25,
      steps: [
        "Post one sitter listing with a German-language requirement",
        "Ask two local parents for referrals",
        "Note rate and availability for one candidate",
      ],
    },
  },
  {
    id: "berlin-housing",
    title: "Berlin Housing",
    area: "Relocation",
    habit: false,
    goal: "Understand whether P-Berg or Moabit family housing is realistic by 2029–2030.",
    currentState:
      "Renting first remains safer. Buying a perfect P-Berg flat should not be the base case.",
    priority: 3,
    strategic: 4,
    cadence: "Refresh in 4 days",
    freshness: "aging",
    risk: "High — price / income / equity mismatch.",
    decision: "Berlin 2027 / 2028 move timing.",
    daysSinceTouch: 4,
    deadline: null,
    researchSignal: false,
    noNewInfo: true,
    quietReason: "Research is aging but not stale. Refresh in 4 days.",
    action: {
      third: "break_down",
      title: "Save and classify 10 live listings.",
      whyNow: "Turns housing theory into concrete data.",
      effort: 40,
      steps: [
        "Save 10 P-Berg / Moabit listings",
        "Tag each acceptable / compromise / no",
        "Note the median asking price",
      ],
    },
  },
  {
    id: "schools",
    title: "Schools",
    area: "Relocation",
    habit: false,
    goal: "Compare viable school paths across SF, Hoboken / Park Slope, and Berlin.",
    currentState:
      "Comparison is a container, not a Today action. Waiting on a single concrete neighborhood step.",
    priority: 3,
    strategic: 4,
    cadence: "Monthly",
    freshness: "aging",
    risk: "Medium.",
    decision: "Berlin 2028 vs stay USA.",
    daysSinceTouch: 20,
    deadline: null,
    researchSignal: false,
    blocked: true,
    quietReason:
      "Waiting on the German exposure task before a single neighborhood deadline is worth confirming.",
    action: {
      third: "break_down",
      title: "Confirm the next enrollment deadline for ONE target neighborhood.",
      whyNow: "A dated, 25-minute step beats comparing four metros.",
      effort: 25,
      steps: [
        "Pick one neighborhood (Park Slope)",
        "Find the public-school enrollment window",
        "Record the date in the project",
      ],
    },
  },
  {
    id: "safety",
    title: "Safety",
    area: "Relocation",
    habit: false,
    goal: "Compare neighborhood safety for real relocation options.",
    currentState:
      "No change requiring action. Safety data is moderately volatile.",
    priority: 2,
    strategic: 2,
    cadence: "Quarterly",
    freshness: "aging",
    risk: "Low right now.",
    decision: "Housing / school location.",
    daysSinceTouch: 30,
    deadline: null,
    researchSignal: false,
    noNewInfo: true,
    quietReason: "No change requiring action.",
    action: {
      third: "break_down",
      title: "Define target neighborhoods to track.",
      whyNow: "Sets up the later comparison.",
      effort: 20,
      steps: [],
    },
  },
  {
    id: "n400",
    title: "N-400 / Citizenship",
    area: "Admin",
    habit: false,
    goal: "Preserve U.S. citizenship optionality.",
    currentState: "No eligibility window near. Nothing actionable this week.",
    priority: 3,
    strategic: 4,
    cadence: "Quarterly",
    freshness: "fresh",
    risk: "Low timing risk now.",
    decision: "Relocation timing.",
    daysSinceTouch: 40,
    deadline: null,
    researchSignal: false,
    noNewInfo: true,
    quietReason: "No eligibility or early-filing window is near.",
    action: {
      third: "break_down",
      title: "Confirm eligibility dates.",
      whyNow: "Sets up the 90-day filing window.",
      effort: 20,
      steps: [],
    },
  },
  {
    id: "career",
    title: "Career / Income Optionality",
    area: "Work",
    habit: false,
    goal: "Maintain high-income options while preserving family and lifestyle goals.",
    currentState: "Surfaces during review cycles, comp events, or move decisions.",
    priority: 3,
    strategic: 4,
    cadence: "Review cycles",
    freshness: "fresh",
    risk: "Low this week.",
    decision: "Berlin vs Bay Area.",
    daysSinceTouch: 14,
    deadline: null,
    researchSignal: false,
    noNewInfo: true,
    quietReason: "Surfaces during review cycles, comp events, or move decisions.",
    action: {
      third: "break_down",
      title: "Track Stripe equity value.",
      whyNow: "Feeds the move-timing decision.",
      effort: 20,
      steps: [],
    },
  },
];

// Decisions are read-only in V0. The Project↔Decision link lives only here
// (lookup by id), so the two surfaces can never drift.
export const DECISIONS: Record<string, RelatedDecision> = {
  "berlin-timing": {
    title: "Berlin 2027 vs Berlin 2028 vs Stay USA",
    status: "Leaning",
    leaning:
      "Prepare for Berlin, but do not commit yet. Preserve U.S. income and citizenship optionality while making German exposure real.",
  },
  "pberg-moabit": {
    title: "P-Berg only vs Moabit backup",
    status: "Open",
    leaning: "Keep Moabit as a serious backup until listings prove otherwise.",
  },
  "kita-sitter": {
    title: "German Kita vs German babysitter path",
    status: "Leaning",
    leaning: "Babysitter now; Kita is stronger if reachable by 2028.",
  },
  "bay-nyc": {
    title: "Stay Bay Area vs Hoboken / NYC area",
    status: "Open",
    leaning: "Unresolved — tied to the Berlin timing fork.",
  },
};

export const DETAIL: Record<string, ProjectDetailData> = {
  "german-a1": {
    note: "Fresh — the current plan is still valid. No meaningful change.",
    questions: [
      "Is the Anki deck aligned to A1 vocabulary?",
      "Does Nicos Weg give enough speaking practice?",
    ],
    decisions: ["berlin-timing"],
    tasks: [
      "20 Anki cards daily",
      "One Nicos Weg lesson",
      "Schedule an italki trial lesson",
      "5 min speaking aloud each day",
    ],
    done: ["Install Anki + import A1 deck"],
    sources: [
      ["Nicos Weg — DW Learn German", "dw.com · course"],
      ["Anki A1 frequency deck", "shared deck"],
    ],
  },
  "taxes-2025": {
    note: "No research needed — this is pure execution against a deadline.",
    questions: [],
    decisions: [],
    tasks: [
      "Collect W-2",
      "Collect 1099s",
      "Collect RSU documents",
      "Collect childcare receipts",
      "Confirm CA + federal details",
      "Prepare and review return",
    ],
    done: [],
    sources: [
      ["IRS Form 1040 (2025)", "irs.gov"],
      ["CA FTB filing portal", "ftb.ca.gov"],
    ],
  },
  "ellie-german": {
    note: "Fresh, but no concrete exposure plan exists yet.",
    questions: [
      "How much German exposure is enough before 2028?",
      "Babysitter vs Saturday school vs Kita — which is sufficient?",
    ],
    decisions: ["kita-sitter", "berlin-timing"],
    tasks: [
      "Find one German-speaking babysitter",
      "Evaluate the local Saturday school",
      "Build a weekly exposure plan",
    ],
    done: [],
    sources: [],
  },
  "berlin-housing": {
    note: "Aging — refresh in 4 days. 7 new listings pending review; Moabit still looks better value than P-Berg.",
    questions: [
      "What are current family-apartment prices in P-Berg?",
      "How does Moabit compare?",
      "Are the mortgage assumptions stale?",
      "Is renting first better than buying?",
    ],
    decisions: ["pberg-moabit", "berlin-timing"],
    tasks: [
      "Save 10 P-Berg / Moabit listings",
      "Classify each acceptable / compromise / no",
      "Build a rent-vs-buy calculator",
      "Decide whether Moabit is acceptable",
    ],
    done: ["Define target neighborhoods", "Define target apartment size"],
    sources: [
      ["ImmoScout24 — P-Berg family flats", "immobilienscout24.de"],
      ["Moabit listings tracker", "spreadsheet"],
    ],
  },
  schools: {
    note: "Aging — comparison is a container. Waiting on one dated neighborhood step.",
    questions: [
      "What are the enrollment windows per neighborhood?",
      "How do school zones map to target listings?",
    ],
    decisions: ["berlin-timing", "bay-nyc"],
    tasks: [
      "Confirm next enrollment deadline for Park Slope",
      "Confirm the school zone for one target listing",
    ],
    done: [],
    sources: [],
  },
  safety: {
    note: "Aging — moderately volatile, but no change requiring action.",
    questions: ["Which official crime datasets are current for each metro?"],
    decisions: ["bay-nyc"],
    tasks: ["Define target neighborhoods", "Track official crime / safety data"],
    done: [],
    sources: [],
  },
  n400: {
    note: "Fresh — no eligibility or early-filing window is near.",
    questions: [
      "What are the exact eligibility and 90-day early-filing dates?",
    ],
    decisions: ["berlin-timing"],
    tasks: [
      "Confirm eligibility dates",
      "Track the 90-day early-filing window",
      "Prepare the document checklist",
    ],
    done: [],
    sources: [],
  },
  career: {
    note: "Fresh — surfaces during review cycles, comp events, or move decisions.",
    questions: [
      "What is the current Stripe equity value?",
      "Which roles are Berlin-compatible?",
    ],
    decisions: ["berlin-timing", "bay-nyc"],
    tasks: [
      "Track Stripe equity value",
      "Evaluate two remote roles",
      "Evaluate Berlin-compatible work",
    ],
    done: [],
    sources: [],
  },
};
