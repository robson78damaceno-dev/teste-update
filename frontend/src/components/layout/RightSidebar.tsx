"use client";

import React from "react";

type RightSidebarProps = Record<string, never>;

export function RightSidebar(_props: RightSidebarProps): React.ReactElement {
  return (
    <aside className="layout-sidebar-right right-sidebar glass-surface section-divider" aria-label="Sidebar">
      <div className="right-sidebar-empty" aria-hidden />
    </aside>
  );
}
