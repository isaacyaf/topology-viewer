import type { Locale } from "../../types";

interface SidebarHeaderProps {
  open: boolean;
  onToggle: () => void;
  locale: Locale;
}

export default function SidebarHeader({ open, onToggle, locale }: SidebarHeaderProps) {
  const appTitle = locale === "zh-TW" ? "數據中心拓撲" : "Data Center Topology";

  return (
    <div className="sidebar-header">
      <button
        className="btn ghost"
        onClick={onToggle}
        title={open ? "Collapse sidebar" : "Expand sidebar"}
        style={{ padding: "0.5rem" }}
      >
        ☰
      </button>
      {open && <span style={{ fontWeight: 600 }}>{appTitle}</span>}
    </div>
  );
}
