import type { Locale } from "../../types";

interface SidebarSectionProps {
  id: string;
  title: string;
  titleZhTW: string;
  icon: string;
  badge?: string | number;
  expanded: boolean;
  onToggle: () => void;
  locale: Locale;
  children: React.ReactNode;
}

export default function SidebarSection({
  id,
  title,
  titleZhTW,
  icon,
  badge,
  expanded,
  onToggle,
  locale,
  children,
}: SidebarSectionProps) {
  const displayTitle = locale === "zh-TW" ? titleZhTW : title;

  return (
    <div className="sidebar-section">
      <div className="sidebar-section-header" onClick={onToggle}>
        <span className="sidebar-section-icon">{icon}</span>
        <span className="sidebar-section-title">{displayTitle}</span>
        {badge !== undefined && (
          <span className="sidebar-section-badge">{badge}</span>
        )}
        <span className={`sidebar-section-chevron ${expanded ? "expanded" : ""}`}>
          ▼
        </span>
      </div>
      <div className={`sidebar-section-body ${expanded ? "expanded" : ""}`}>
        {children}
      </div>
    </div>
  );
}
