"use client";

import type { CSSProperties } from "react";
import { C, eyebrow, fonts, freshLabel, freshStyle } from "@/lib/lifeos/tokens";
import type { LifeOS } from "@/lib/lifeos/store";
import type { Draft } from "@/lib/lifeos/types";

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${C.inputBorder}`,
  background: "#fff",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "inherit",
  color: C.textPrimary,
};

const fieldLabel: CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: C.faintTab,
  fontFamily: fonts.mono,
  marginBottom: 5,
};

function seg(on: boolean, w: number): CSSProperties {
  return {
    width: w,
    height: 32,
    marginRight: 6,
    borderRadius: 7,
    fontSize: 13,
    fontFamily: fonts.mono,
    border: `1px solid ${on ? C.accent : C.inputBorder}`,
    background: on ? C.accent : "#fff",
    color: on ? "#fff" : C.textSecondary,
    cursor: "pointer",
  };
}

function Segmented({
  values,
  current,
  width,
  onPick,
}: {
  values: number[];
  current: number;
  width: number;
  onPick: (n: number) => void;
}) {
  return (
    <>
      {values.map((n) => (
        <button key={n} onClick={() => onPick(n)} style={seg(current === n, width)}>
          {n}
        </button>
      ))}
    </>
  );
}

function NewProjectForm({ lifeos }: { lifeos: LifeOS }) {
  const { state, actions } = lifeos;
  const d = state.draft;
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    actions.setDraft(k, e.target.value);

  return (
    <div
      style={{
        marginTop: 24,
        background: C.cardBg,
        border: "1px solid #D8CFBC",
        borderRadius: 13,
        padding: "24px 26px",
      }}
    >
      <h3
        style={{
          fontFamily: fonts.serif,
          fontWeight: 500,
          fontSize: 20,
          margin: "0 0 4px",
        }}
      >
        New project
      </h3>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: C.faint }}>
        A project is a durable goal with one next action. Keep it concrete.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ display: "block" }}>
          <span style={fieldLabel}>Title</span>
          <input
            value={d.title}
            onChange={set("title")}
            placeholder="e.g. Learn German A1"
            style={inputStyle}
          />
        </label>
        <div style={{ display: "flex", gap: 14 }}>
          <label style={{ flex: 1, display: "block" }}>
            <span style={fieldLabel}>Area</span>
            <input
              value={d.area}
              onChange={set("area")}
              placeholder="Language · Family · Admin…"
              style={inputStyle}
            />
          </label>
        </div>
        <label style={{ display: "block" }}>
          <span style={fieldLabel}>Goal</span>
          <input
            value={d.goal}
            onChange={set("goal")}
            placeholder="What does done look like?"
            style={inputStyle}
          />
        </label>
        <label style={{ display: "block" }}>
          <span style={fieldLabel}>One next action</span>
          <input
            value={d.next}
            onChange={set("next")}
            placeholder="The single best concrete step"
            style={inputStyle}
          />
        </label>
        <div style={{ display: "flex", gap: "30px 48px", flexWrap: "wrap" }}>
          <div>
            <span style={{ ...fieldLabel, marginBottom: 7 }}>Priority</span>
            <Segmented
              values={[1, 2, 3, 4, 5]}
              current={d.priority}
              width={34}
              onPick={(n) => actions.setDraft("priority", n)}
            />
          </div>
          <div>
            <span style={{ ...fieldLabel, marginBottom: 7 }}>
              Strategic importance
            </span>
            <Segmented
              values={[1, 2, 3, 4, 5]}
              current={d.strategic}
              width={34}
              onPick={(n) => actions.setDraft("strategic", n)}
            />
          </div>
          <div>
            <span style={{ ...fieldLabel, marginBottom: 7 }}>Effort</span>
            <Segmented
              values={[15, 25, 30, 45, 60]}
              current={d.effort}
              width={42}
              onPick={(n) => actions.setDraft("effort", n)}
            />
          </div>
        </div>
        <div
          style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}
        >
          <button
            onClick={actions.saveProject}
            style={{
              background: C.accent,
              color: "#fff",
              border: `1px solid ${C.accent}`,
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Create project
          </button>
          <button
            onClick={actions.cancelAdd}
            style={{
              background: "transparent",
              color: C.textTertiary,
              border: `1px solid ${C.inputBorder}`,
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          {state.draftInvalid && (
            <span style={{ fontSize: 12, color: C.faintAlt }}>
              Add a title and a next action.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProjectsList({ lifeos }: { lifeos: LifeOS }) {
  const { state, actions, allProjects } = lifeos;
  const projects = allProjects();

  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
        }}
      >
        <div>
          <div style={eyebrow(C.accentLabel)}>The memory</div>
          <h1
            style={{
              fontFamily: fonts.serif,
              fontWeight: 600,
              fontSize: 42,
              margin: "8px 0 0",
              letterSpacing: -0.3,
            }}
          >
            Projects
          </h1>
        </div>
        <button
          onClick={actions.startAdd}
          style={{
            background: C.accent,
            color: "#fff",
            border: `1px solid ${C.accent}`,
            borderRadius: 8,
            padding: "9px 16px",
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
            marginTop: 6,
          }}
        >
          + New project
        </button>
      </div>
      <p
        style={{
          fontSize: 15,
          color: C.textTertiary,
          margin: "10px 0 0",
          maxWidth: 540,
          lineHeight: 1.6,
        }}
      >
        Durable life projects, not todos. Each holds state, one next action, and
        the decision it serves. The Today list only ever pulls the single best
        next action.
      </p>

      {state.adding && <NewProjectForm lifeos={lifeos} />}

      <div style={{ marginTop: 28 }}>
        {projects.map((p) => (
          <div
            key={p.id}
            style={{
              background: C.cardBg,
              border: `1px solid ${C.cardBorder}`,
              borderRadius: 11,
              padding: "20px 22px",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
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
                  {p.area}
                </div>
                <h3
                  style={{
                    fontFamily: fonts.serif,
                    fontWeight: 500,
                    fontSize: 21,
                    margin: "5px 0 0",
                  }}
                >
                  {p.title}
                </h3>
              </div>
              <span style={freshStyle(p.freshness)}>
                {freshLabel(p.freshness)}
              </span>
            </div>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 14,
                color: C.textSecondaryAlt,
                lineHeight: 1.55,
              }}
            >
              {p.currentState}
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "baseline",
                marginTop: 14,
                paddingTop: 13,
                borderTop: `1px solid ${C.dividerAlt}`,
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  letterSpacing: 1,
                  color: C.accentLabel,
                  fontFamily: fonts.mono,
                  whiteSpace: "nowrap",
                }}
              >
                NEXT →
              </span>
              <span style={{ flex: 1, fontSize: 13.5, color: C.textSecondary }}>
                {p.action.title}
              </span>
              <button
                onClick={() => actions.openProject(p.id)}
                style={{
                  background: "transparent",
                  color: C.textTertiary,
                  border: `1px solid ${C.inputBorder}`,
                  borderRadius: 7,
                  padding: "6px 16px",
                  fontSize: 13,
                  whiteSpace: "nowrap",
                }}
              >
                Open
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
