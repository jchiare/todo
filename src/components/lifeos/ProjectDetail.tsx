"use client";

import type { CSSProperties } from "react";
import { C, eyebrow, fonts, freshLabel, freshStyle } from "@/lib/lifeos/tokens";
import { DECISIONS, DETAIL } from "@/lib/lifeos/seed";
import { tasksFor, type LifeOS } from "@/lib/lifeos/store";
import type { Project, ProjectTab } from "@/lib/lifeos/types";

const TABS: { key: ProjectTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "tasks", label: "Tasks" },
  { key: "sources", label: "Sources" },
];

export function ProjectDetail({
  project,
  lifeos,
}: {
  project: Project;
  lifeos: LifeOS;
}) {
  const { state, actions, researchFor, allFindings } = lifeos;
  const pd = project;
  const det = DETAIL[pd.id] || {
    note: "",
    questions: [],
    decisions: [],
    tasks: pd.action.steps,
    done: [],
    sources: [],
  };
  const tab = state.projectTab;
  const findings = allFindings(pd.id);
  const memo = state.memo[pd.id] || null;

  const tabStyle = (k: ProjectTab): CSSProperties => ({
    background: "none",
    border: "none",
    fontFamily: "inherit",
    fontSize: 13.5,
    padding: "0 2px 11px",
    marginRight: 14,
    cursor: "pointer",
    color: tab === k ? C.textPrimary : C.faintTab,
    fontWeight: tab === k ? 600 : 400,
    borderBottom: `2px solid ${tab === k ? C.accent : "transparent"}`,
  });

  return (
    <section>
      <button
        onClick={actions.backToProjects}
        style={{
          background: "none",
          border: "none",
          color: C.accentLabel,
          fontSize: 13,
          fontFamily: "inherit",
          padding: 0,
          marginBottom: 20,
          cursor: "pointer",
        }}
      >
        ← All projects
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: C.accentLabel,
              fontFamily: fonts.mono,
            }}
          >
            {pd.area}
          </div>
          <h1
            style={{
              fontFamily: fonts.serif,
              fontWeight: 600,
              fontSize: 38,
              margin: "8px 0 0",
              letterSpacing: -0.3,
            }}
          >
            {pd.title}
          </h1>
        </div>
        <span style={freshStyle(pd.freshness)}>{freshLabel(pd.freshness)}</span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          margin: "24px 0 26px",
          borderBottom: `1px solid ${C.cardBorder}`,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => actions.setProjectTab(t.key)}
            style={tabStyle(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          project={pd}
          det={det}
          memoText={memo ? memo.text : pd.currentState}
          memoMeta={
            memo
              ? `Synthesized from ${memo.count} finding${
                  memo.count === 1 ? "" : "s"
                } · updated ${memo.updatedAt}`
              : "From current project state"
          }
          canSummarize={findings.length > 0}
          summarizeLabel={
            memo ? "Re-summarize from research" : "Summarize from research"
          }
          summaryHint={
            findings.length > 0
              ? ""
              : "Open a task below and add findings — then the project can summarize them here."
          }
          rollup={findings}
          onSummarize={() => actions.summarizeProject(pd.id)}
        />
      )}

      {tab === "tasks" && (
        <TasksTab project={pd} lifeos={lifeos} researchFor={researchFor} />
      )}

      {tab === "sources" && <SourcesTab det={det} />}
    </section>
  );
}

function OverviewTab({
  project,
  det,
  memoText,
  memoMeta,
  canSummarize,
  summarizeLabel,
  summaryHint,
  rollup,
  onSummarize,
}: {
  project: Project;
  det: (typeof DETAIL)[string];
  memoText: string;
  memoMeta: string;
  canSummarize: boolean;
  summarizeLabel: string;
  summaryHint: string;
  rollup: { task: string; text: string }[];
  onSummarize: () => void;
}) {
  const facts: { label: string; value: string }[] = [
    { label: "Goal", value: project.goal },
    { label: "Risk", value: project.risk },
    { label: "Decision supported", value: project.decision },
    { label: "Review cadence", value: project.cadence },
  ];
  const relatedDecisions = det.decisions
    .map((id) => DECISIONS[id])
    .filter(Boolean);

  return (
    <>
      <div style={{ ...eyebrow(C.faintTab), marginBottom: 10 }}>Current memo</div>
      <p
        style={{
          fontFamily: fonts.serif,
          fontSize: 20,
          lineHeight: 1.55,
          color: C.textPrimaryAlt,
          margin: 0,
          maxWidth: 640,
        }}
      >
        {memoText}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          margin: "12px 0 0",
        }}
      >
        <span style={{ fontSize: 12, color: C.faintAlt, fontFamily: fonts.mono }}>
          {memoMeta}
        </span>
        {canSummarize && (
          <button
            onClick={onSummarize}
            style={{
              background: C.accent,
              color: "#fff",
              border: `1px solid ${C.accent}`,
              borderRadius: 7,
              padding: "6px 14px",
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            {summarizeLabel}
          </button>
        )}
      </div>

      {rollup.length > 0 && (
        <div
          style={{
            marginTop: 18,
            background: C.cardBg,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 11,
            padding: "16px 18px",
            maxWidth: 640,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: C.faintTab,
              fontFamily: fonts.mono,
              marginBottom: 8,
            }}
          >
            What the research says
          </div>
          {rollup.map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                padding: "5px 0",
              }}
            >
              <span style={{ color: C.accentLabel, marginTop: 1 }}>▸</span>
              <div>
                <div
                  style={{ fontSize: 13.5, color: C.textPrimaryAlt, lineHeight: 1.5 }}
                >
                  {f.text}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.faintTab,
                    fontFamily: fonts.mono,
                    marginTop: 2,
                  }}
                >
                  {f.task}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {summaryHint && (
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 13,
            color: C.faintAlt,
            fontStyle: "italic",
            fontFamily: fonts.serif,
            maxWidth: 560,
          }}
        >
          {summaryHint}
        </p>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "30px 48px",
          margin: "24px 0 0",
        }}
      >
        {facts.map((f) => (
          <div key={f.label} style={{ maxWidth: 260 }}>
            <div
              style={{
                fontSize: 10.5,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: C.faintTab,
                fontFamily: fonts.mono,
                marginBottom: 5,
              }}
            >
              {f.label}
            </div>
            <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.5 }}>
              {f.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...eyebrow(C.faintTab), margin: "32px 0 10px" }}>
        Next action
      </div>
      <div
        style={{
          background: C.cardBg,
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 11,
          padding: "18px 20px",
          maxWidth: 560,
        }}
      >
        <h3
          style={{
            fontFamily: fonts.serif,
            fontWeight: 500,
            fontSize: 18,
            margin: 0,
            lineHeight: 1.35,
          }}
        >
          {project.action.title}
        </h3>
      </div>

      {relatedDecisions.length > 0 && (
        <>
          <div style={{ ...eyebrow(C.faintTab), margin: "32px 0 10px" }}>
            Related decisions
          </div>
          {relatedDecisions.map((d, i) => (
            <div
              key={i}
              style={{
                background: C.cardBg,
                border: `1px solid ${C.cardBorder}`,
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 10,
                maxWidth: 560,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                }}
              >
                <h4 style={{ fontSize: 14.5, fontWeight: 600, margin: 0 }}>
                  {d.title}
                </h4>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    fontFamily: fonts.mono,
                    color: C.accentText,
                    background: C.accentTintBg,
                    border: `1px solid ${C.accentTintBorder}`,
                    borderRadius: 5,
                    padding: "3px 8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.status}
                </span>
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 13,
                  color: C.textTertiary,
                  lineHeight: 1.55,
                  fontFamily: fonts.serif,
                  fontStyle: "italic",
                }}
              >
                {d.leaning}
              </p>
            </div>
          ))}
        </>
      )}
    </>
  );
}

function TasksTab({
  project,
  lifeos,
  researchFor,
}: {
  project: Project;
  lifeos: LifeOS;
  researchFor: LifeOS["researchFor"];
}) {
  const { state, actions } = lifeos;
  const pid = project.id;
  const rows = tasksFor(pid);
  const tdone = state.taskDone[pid] || {};
  const openK = state.openTask[pid] || null;

  return (
    <div style={{ maxWidth: 620 }}>
      <p
        style={{
          fontSize: 13,
          color: C.faint,
          margin: "0 0 14px",
          lineHeight: 1.55,
        }}
      >
        Check a task off, or open it to do research. Findings roll up into the
        project&apos;s memo on the Overview tab.
      </p>
      {rows.map((t) => {
        const checked = t.key in tdone ? tdone[t.key] : t.def;
        const cell = researchFor(pid, t.key);
        const isOpen = openK === t.key;
        const fc = (cell.findings || []).length;
        return (
          <div
            key={t.key}
            style={{
              background: isOpen ? C.openTask : "transparent",
              borderRadius: 8,
              borderBottom: `1px solid ${C.divider}`,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "13px 10px",
              }}
            >
              <button
                onClick={() => actions.toggleTask(pid, t.key)}
                style={{
                  width: 18,
                  height: 18,
                  flex: "0 0 18px",
                  borderRadius: 5,
                  marginTop: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "#fff",
                  cursor: "pointer",
                  border: `1px solid ${checked ? C.green : C.navDot}`,
                  background: checked ? C.green : "#fff",
                  padding: 0,
                }}
              >
                {checked ? "✓" : ""}
              </button>
              <button
                onClick={() => actions.toggleTaskResearch(pid, t.key)}
                style={{
                  flex: 1,
                  textAlign: "left",
                  fontSize: 14.5,
                  lineHeight: 1.45,
                  color: checked ? C.faint : C.textPrimaryAlt,
                  textDecoration: checked ? "line-through" : "none",
                  background: "none",
                  border: "none",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {t.text}
              </button>
              {fc > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: fonts.mono,
                    color: C.accentText,
                    background: C.accentTintBg,
                    border: `1px solid ${C.accentTintBorder}`,
                    borderRadius: 5,
                    padding: "2px 7px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fc} finding{fc === 1 ? "" : "s"}
                </span>
              )}
              <button
                onClick={() => actions.toggleTaskResearch(pid, t.key)}
                style={{
                  background: "none",
                  border: "none",
                  color: C.faintAlt,
                  fontSize: 12,
                  cursor: "pointer",
                  padding: "0 2px",
                }}
              >
                {isOpen ? "▾" : "▸"}
              </button>
            </div>

            {isOpen && (
              <div style={{ padding: "4px 10px 18px 40px" }}>
                <div
                  style={{
                    fontSize: 10.5,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    color: C.faintTab,
                    fontFamily: fonts.mono,
                    marginBottom: 6,
                  }}
                >
                  Research notes
                </div>
                <textarea
                  value={cell.notes}
                  onChange={(e) => actions.setTaskNotes(pid, t.key, e.target.value)}
                  placeholder="Jot what you find — links, numbers, observations…"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    minHeight: 74,
                    border: `1px solid ${C.inputBorder}`,
                    background: "#fff",
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 13.5,
                    fontFamily: "inherit",
                    color: C.textPrimary,
                    lineHeight: 1.55,
                    resize: "vertical",
                  }}
                />
                <div
                  style={{
                    fontSize: 10.5,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    color: C.faintTab,
                    fontFamily: fonts.mono,
                    margin: "16px 0 6px",
                  }}
                >
                  Findings
                </div>
                {(cell.findings || []).map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      padding: "5px 0",
                    }}
                  >
                    <span style={{ color: C.accentLabel, marginTop: 1 }}>▸</span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13.5,
                        color: C.textPrimaryAlt,
                        lineHeight: 1.5,
                      }}
                    >
                      {f}
                    </span>
                    <button
                      onClick={() => actions.removeFinding(pid, t.key, i)}
                      style={{
                        background: "none",
                        border: "none",
                        color: C.faintest,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      remove
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input
                    value={state.findingDraft}
                    onChange={(e) => actions.setFindingDraft(e.target.value)}
                    placeholder="Add a finding — one clear statement"
                    style={{
                      flex: 1,
                      boxSizing: "border-box",
                      border: `1px solid ${C.inputBorder}`,
                      background: "#fff",
                      borderRadius: 8,
                      padding: "8px 11px",
                      fontSize: 13.5,
                      fontFamily: "inherit",
                      color: C.textPrimary,
                    }}
                  />
                  <button
                    onClick={() => actions.addFinding(pid, t.key)}
                    style={{
                      background: C.cardBg,
                      color: C.accentText,
                      border: `1px solid ${C.accentTintBorder}`,
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Add finding
                  </button>
                </div>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 11.5,
                    color: C.faintTab,
                    fontStyle: "italic",
                    fontFamily: fonts.serif,
                  }}
                >
                  Findings feed the project summary — open Overview and hit
                  “Summarize”.
                </p>
              </div>
            )}
          </div>
        );
      })}
      {rows.length === 0 && (
        <p
          style={{
            fontSize: 14,
            color: C.faint,
            fontStyle: "italic",
            fontFamily: fonts.serif,
            paddingTop: 8,
          }}
        >
          No tasks yet. The next action above is the place to start.
        </p>
      )}
    </div>
  );
}

function SourcesTab({ det }: { det: (typeof DETAIL)[string] }) {
  return (
    <div style={{ maxWidth: 600 }}>
      {det.note && (
        <p
          style={{
            margin: "0 0 4px",
            fontSize: 14.5,
            color: C.textSecondaryAlt,
            lineHeight: 1.6,
          }}
        >
          <span
            style={{ fontFamily: fonts.serif, fontStyle: "italic", color: C.textMuted }}
          >
            Freshness —{" "}
          </span>
          {det.note}
        </p>
      )}
      {det.questions.length > 0 && (
        <>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: C.faintTab,
              fontFamily: fonts.mono,
              margin: "24px 0 8px",
            }}
          >
            Open questions
          </div>
          {det.questions.map((q, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "baseline",
                padding: "4px 0",
                fontSize: 14,
                color: C.textSecondary,
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: C.faintest }}>—</span>
              <span>{q}</span>
            </div>
          ))}
        </>
      )}
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: C.faintTab,
          fontFamily: fonts.mono,
          margin: "26px 0 8px",
        }}
      >
        Saved sources
      </div>
      {det.sources.map((s, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 11,
            alignItems: "baseline",
            padding: "8px 0",
            borderBottom: `1px solid ${C.divider}`,
          }}
        >
          <span
            style={{ color: C.accentLabel, fontFamily: fonts.mono, fontSize: 12 }}
          >
            ↗
          </span>
          <div>
            <div style={{ fontSize: 14, color: C.textPrimaryAlt }}>{s[0]}</div>
            <div style={{ fontSize: 12, color: C.faintAlt }}>{s[1]}</div>
          </div>
        </div>
      ))}
      {det.sources.length === 0 && (
        <p
          style={{
            fontSize: 13.5,
            color: C.faint,
            fontStyle: "italic",
            fontFamily: fonts.serif,
          }}
        >
          No sources saved yet. Manual source ingestion arrives in Version 2.
        </p>
      )}
    </div>
  );
}
