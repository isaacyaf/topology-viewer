import { useRef } from "react";
import type { SidebarSectionProps } from "../../types";

export default function SidebarSection({
  id,
  title,
  titleZhTW,
  icon,
  badge,
  expanded,
  onToggle,
  locale,
  sidebarOpen,
  onSidebarToggle,
  children,
}: SidebarSectionProps) {
  const displayTitle = locale === "zh-TW" ? titleZhTW : title;
  const sectionRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (!sidebarOpen) {
      // If sidebar is collapsed, expand it first
      onSidebarToggle();
      // Wait for sidebar to expand, then scroll to this section
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 300); // Match the sidebar transition duration
    }
    // Always toggle the section
    onToggle();
  };

  return (
    <div className="sidebar-section" ref={sectionRef}>
      <div className="sidebar-section-header" onClick={handleClick}>
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
