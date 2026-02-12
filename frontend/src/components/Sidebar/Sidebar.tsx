import type { SidebarProps } from "../../types";
import SidebarHeader from "./SidebarHeader";
import SidebarFooter from "./SidebarFooter";

export default function Sidebar({ open, onToggle, locale, status, lastSaved, children }: SidebarProps) {
  return (
    <>
      <div className={`sidebar ${open ? "" : "collapsed"}`}>
        <SidebarHeader open={open} onToggle={onToggle} locale={locale} />
        <div className="sidebar-body">{children}</div>
        <SidebarFooter locale={locale} status={status} lastSaved={lastSaved ? lastSaved.toLocaleTimeString() : undefined} />
      </div>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="sidebar-backdrop"
          onClick={onToggle}
          style={{ display: "none" }}
        />
      )}
    </>
  );
}
