"use client";

import { C, fonts } from "@/lib/lifeos/tokens";
import { build } from "@/lib/lifeos/ranking";
import { useLifeOS } from "@/lib/lifeos/store";
import { Sidebar } from "@/components/lifeos/Sidebar";
import { Today } from "@/components/lifeos/Today";
import { ProjectsList } from "@/components/lifeos/ProjectsList";
import { ProjectDetail } from "@/components/lifeos/ProjectDetail";

export default function Page() {
  const lifeos = useLifeOS();
  const { state, actions, allProjects } = lifeos;

  const projects = allProjects();
  // Live count for the Today nav badge mirrors the ranked list length.
  const { live } = build(projects, state.ov, state.completed, state.manualOrder);
  const selected =
    state.selectedProjectId != null
      ? projects.find((p) => p.id === state.selectedProjectId) ?? null
      : null;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: fonts.sans,
        color: C.textPrimary,
        background: C.appBg,
      }}
    >
      <Sidebar
        screen={state.screen}
        liveCount={live.length}
        projectCount={projects.length}
        onNavigate={actions.setScreen}
      />
      <main
        style={{ flex: 1, minWidth: 0, padding: "46px 56px 90px", maxWidth: 880 }}
      >
        {state.screen === "today" && <Today lifeos={lifeos} />}
        {state.screen === "projects" &&
          (selected ? (
            <ProjectDetail project={selected} lifeos={lifeos} />
          ) : (
            <ProjectsList lifeos={lifeos} />
          ))}
      </main>
    </div>
  );
}
