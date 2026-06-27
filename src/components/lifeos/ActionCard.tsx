"use client";

import type { CSSProperties } from "react";
import { C, fonts } from "@/lib/lifeos/tokens";
import type { ScoreComponents } from "@/lib/lifeos/ranking";
import type { LifeOS } from "@/lib/lifeos/store";
import type { Project } from "@/lib/lifeos/types";

const baseBtn: CSSProperties = {
  background: "transparent",
  color: C.textTertiary,
  border: `1px solid ${C.inputBorder}`,
  borderRadius: 7,
  padding: "7px 14px",
  fontSize: 13,
};

export function ActionCard({
  project,
  comps,
  rank,
  lifeos,
}: {
  project: Project;
  comps: ScoreComponents;
  rank: number;
  lifeos: LifeOS;
}) {
  const { state, actions } = lifeos;
  const p = project;
  const o = state.ov[p.id] || {};
  const active = o.status === "active";
  const third = p.action.third || "break_down";
  const showBreakdown = !!state.expanded[p.id];

  const scoreRows = [
    { label: "Deadline urgency", val: String(comps.du) },
    {
      label:
        "Momentum risk" +
        (p.habit ? ` (${p.daysSinceTouch}d untouched)` : " (n/a)"),
      val: String(comps.mr),
    },
    { label: `Strategic importance (${p.strategic}/5)`, val: String(comps.si) },
    { label: `Project priority (${p.priority}/5)`, val: String(comps.pr) },
    { label: "Research change signal", val: String(comps.rc) },
  ];

  const primaryStyle: CSSProperties = {
    background: active ? C.green : C.accent,
    color: "#fff",
    border: `1px solid ${active ? C.green : C.accent}`,
    borderRadius: 7,
    padding: "7px 16px",
    fontSize: 13,
    fontWeight: 500,
  };

  return (
    <article
      draggable
      onDragStart={(e) => actions.onDragStart(e, p.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => actions.onDrop(e, p.id)}
      style={{
        animation: "loUp .3s ease both",
        background: C.cardBg,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 11,
        padding: "22px 24px",
        marginBottom: 14,
        cursor: "grab",
        boxShadow: "0 1px 2px rgba(60,50,30,.03)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <div
          style={{
            fontFamily: fonts.serif,
            fontSize: 30,
            color: C.rankNumeral,
            lineHeight: 1,
            width: 22,
            flex: "0 0 22px",
          }}
        >
          {rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: C.accentLabel,
              fontFamily: fonts.mono,
            }}
          >
            {p.title}
          </div>
          <h3
            style={{
              fontFamily: fonts.serif,
              fontWeight: 500,
              fontSize: 21,
              margin: "5px 0 0",
              lineHeight: 1.3,
            }}
          >
            {p.action.title}
          </h3>
        </div>
        <div
          style={{
            fontSize: 12,
            color: C.faintAlt,
            whiteSpace: "nowrap",
            fontFamily: fonts.mono,
          }}
        >
          {p.action.effort} min
        </div>
      </div>

      <p
        style={{
          margin: "13px 0 0 38px",
          fontSize: 14.5,
          lineHeight: 1.62,
          color: C.textSecondary,
        }}
      >
        <span
          style={{ fontFamily: fonts.serif, fontStyle: "italic", color: C.textMuted }}
        >
          Why now —{" "}
        </span>
        {p.action.whyNow}
      </p>

      {o.broken && (
        <div
          style={{
            margin: "14px 0 0 38px",
            background: C.brokenBg,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 8,
            padding: "12px 14px",
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
            Broken down
          </div>
          {p.action.steps.map((st, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                padding: "4px 0",
                fontSize: 13.5,
                color: C.textSecondary,
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: C.faintTab, fontFamily: fonts.mono }}>·</span>
              <span>{st}</span>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          margin: "18px 0 0 38px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button onClick={() => actions.primary(p.id)} style={primaryStyle}>
          {active ? "Mark done" : "Start"}
        </button>
        <button onClick={() => actions.snooze(p.id)} style={baseBtn}>
          Snooze
        </button>
        <button
          onClick={() =>
            third === "not_relevant"
              ? actions.notRelevant(p.id)
              : actions.breakDown(p.id)
          }
          style={baseBtn}
        >
          {third === "not_relevant" ? "Not Relevant" : "Break Down"}
        </button>
        <button
          onClick={() => actions.toggleExpand(p.id)}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            color: C.accentLabel,
            fontSize: 12,
            fontFamily: "inherit",
          }}
        >
          {showBreakdown ? "Hide ranking ▾" : "Why this rank ▸"}
        </button>
      </div>

      {showBreakdown && (
        <div
          style={{
            margin: "14px 0 0 38px",
            borderTop: `1px solid ${C.dividerAlt}`,
            paddingTop: 12,
          }}
        >
          {scoreRows.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 0",
                fontSize: 12.5,
                color: C.textTertiary,
                fontFamily: fonts.mono,
              }}
            >
              <span>{r.label}</span>
              <span>{r.val}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "7px 0 0",
              marginTop: 4,
              borderTop: `1px solid ${C.dividerAlt}`,
              fontSize: 13,
              color: C.textPrimary,
              fontFamily: fonts.mono,
              fontWeight: 500,
            }}
          >
            <span>Score</span>
            <span>{comps.total}</span>
          </div>
        </div>
      )}
    </article>
  );
}
