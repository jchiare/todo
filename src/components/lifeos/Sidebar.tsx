"use client";

import type { CSSProperties } from "react";
import { C, fonts } from "@/lib/lifeos/tokens";
import type { Screen } from "@/lib/lifeos/types";

interface NavDef {
  key: Screen;
  label: string;
  count: number;
}

export function Sidebar({
  screen,
  liveCount,
  projectCount,
  onNavigate,
}: {
  screen: Screen;
  liveCount: number;
  projectCount: number;
  onNavigate: (s: Screen) => void;
}) {
  const navDefs: NavDef[] = [
    { key: "today", label: "Today", count: liveCount },
    { key: "projects", label: "Projects", count: projectCount },
  ];

  return (
    <aside
      style={{
        width: 250,
        flex: "0 0 250px",
        background: C.sidebarBg,
        borderRight: `1px solid ${C.sidebarBorder}`,
        padding: "30px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 30,
        position: "sticky",
        top: 0,
        height: "100vh",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: fonts.serif,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 0.2,
          }}
        >
          LifeOS
        </div>
        <div
          style={{
            fontSize: 11,
            color: C.faintAlt,
            marginTop: 3,
            textTransform: "uppercase",
            letterSpacing: 1.5,
            fontFamily: fonts.mono,
          }}
        >
          daily triage
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {navDefs.map((n) => {
          const active = n.key === screen;
          const btn: CSSProperties = {
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            textAlign: "left",
            border: "none",
            borderRadius: 7,
            padding: "9px 11px",
            fontSize: 14,
            fontFamily: "inherit",
            background: active ? C.cardBg : "transparent",
            color: active ? C.textPrimary : C.textTertiary,
            fontWeight: active ? 600 : 400,
            boxShadow: active ? "0 1px 2px rgba(60,50,30,.06)" : "none",
          };
          return (
            <button key={n.key} onClick={() => onNavigate(n.key)} style={btn}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  flex: "0 0 auto",
                  background: active ? C.accent : C.navDot,
                }}
              />
              <span>{n.label}</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  fontFamily: fonts.mono,
                  color: C.faintTab,
                }}
              >
                {n.count}
              </span>
            </button>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: "auto",
          fontSize: 11,
          color: C.faintTab,
          lineHeight: 1.7,
          borderTop: `1px solid ${C.sidebarBorder}`,
          paddingTop: 18,
        }}
      >
        <div style={{ fontWeight: 500, color: C.textMutedAlt }}>
          Version 0 · Manual triage
        </div>
        <div>No agents. No claims engine.</div>
        <div>No noise.</div>
      </div>
    </aside>
  );
}
