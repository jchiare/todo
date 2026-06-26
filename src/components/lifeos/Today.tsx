"use client";

import { useEffect } from "react";
import { C, eyebrow, fonts } from "@/lib/lifeos/tokens";
import { build } from "@/lib/lifeos/ranking";
import { DATE_LABEL } from "@/lib/lifeos/seed";
import type { LifeOS } from "@/lib/lifeos/store";
import { ActionCard } from "./ActionCard";

export function Today({ lifeos }: { lifeos: LifeOS }) {
  const { state, actions, allProjects } = lifeos;
  const { live, quiet, completedItems } = build(
    allProjects(),
    state.ov,
    state.completed,
    state.manualOrder
  );

  // Keep the drag-reorder scratch order in sync with the rendered ranking.
  const orderKey = live.map((x) => x.p.id).join(",");
  useEffect(() => {
    actions.setLiveOrder(live.map((x) => x.p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey]);

  const allClear = live.length === 0 && completedItems.length > 0;

  return (
    <section>
      <div style={eyebrow(C.accentLabel)}>{DATE_LABEL}</div>
      <h1
        style={{
          fontFamily: fonts.serif,
          fontWeight: 600,
          fontSize: 42,
          margin: "8px 0 0",
          letterSpacing: -0.3,
        }}
      >
        Today
      </h1>
      <p
        style={{
          fontSize: 15,
          color: C.textTertiary,
          margin: "10px 0 0",
          maxWidth: 520,
          lineHeight: 1.6,
        }}
      >
        Three actions, ranked. Each one says why now and what to ignore.
        Everything else stays quiet.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "34px 0 14px",
        }}
      >
        <div style={eyebrow(C.faintTab)}>Recommended focus</div>
        {state.manualOrder && (
          <button
            onClick={actions.resetOrder}
            style={{
              background: "none",
              border: "none",
              color: C.accentLabel,
              fontSize: 12,
              fontFamily: "inherit",
            }}
          >
            Manually ordered · reset to ranking
          </button>
        )}
      </div>

      <div>
        {live.map((it, i) => (
          <ActionCard
            key={it.p.id}
            project={it.p}
            comps={it.comps}
            rank={i + 1}
            lifeos={lifeos}
          />
        ))}
      </div>

      {allClear && (
        <div
          style={{
            background: C.cardBg,
            border: `1px dashed ${C.inputBorder}`,
            borderRadius: 11,
            padding: 34,
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: fonts.serif, fontSize: 22, color: C.textSecondary }}>
            Nothing left for today.
          </div>
          <div style={{ fontSize: 14, color: C.faint, marginTop: 6 }}>
            Good. Close the app.
          </div>
        </div>
      )}

      {completedItems.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <div style={{ ...eyebrow(C.faintTab), marginBottom: 10 }}>
            Completed today
          </div>
          {completedItems.map((ci) => (
            <div
              key={ci.p.id}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                padding: "10px 0",
                borderBottom: `1px solid ${C.divider}`,
              }}
            >
              <span style={{ color: C.green, fontSize: 15 }}>✓</span>
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: 13.5,
                    color: C.textMutedAlt,
                    textDecoration: "line-through",
                  }}
                >
                  {ci.p.action.title}
                </span>
                <span style={{ fontSize: 12, color: C.faintTab, marginLeft: 10 }}>
                  {ci.p.habit
                    ? "Habit done — returns tomorrow."
                    : "Done — next action computes for tomorrow."}
                </span>
              </div>
              <button
                onClick={() => actions.surface(ci.p.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: C.accentLabel,
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 42 }}>
        <div style={{ ...eyebrow(C.faintTab), marginBottom: 6 }}>Quiet today</div>
        {quiet.map((q) => (
          <div
            key={q.p.id}
            style={{
              display: "flex",
              gap: 16,
              alignItems: "baseline",
              padding: "11px 0",
              borderBottom: `1px solid ${C.divider}`,
            }}
          >
            <div
              style={{
                width: 140,
                flex: "0 0 140px",
                fontWeight: 500,
                fontSize: 13.5,
                color: C.textSecondary,
              }}
            >
              {q.p.title}
            </div>
            <div
              style={{ flex: 1, fontSize: 13.5, color: C.textMuted, lineHeight: 1.5 }}
            >
              {q.reason}
            </div>
            <button
              onClick={() => actions.surface(q.p.id)}
              style={{
                background: "none",
                border: "none",
                color: C.accentLabel,
                fontSize: 12,
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              Surface
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
