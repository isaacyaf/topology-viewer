import type { AppStatus, Locale } from "../../types";

interface SidebarFooterProps {
  locale: Locale;
  status?: AppStatus;
  lastSaved?: string;
}

export default function SidebarFooter({ locale, status = "idle", lastSaved }: SidebarFooterProps) {
  const statusText = {
    idle: locale === "zh-TW" ? "閒置" : "Idle",
    loading: locale === "zh-TW" ? "載入中..." : "Loading...",
    saving: locale === "zh-TW" ? "儲存中..." : "Saving...",
    ready: locale === "zh-TW" ? "已更新" : "Up to date",
    error: locale === "zh-TW" ? "錯誤" : "Error",
  };

  const statusColors = {
    idle: "#94a3b8",
    loading: "#3b82f6",
    saving: "#f59e0b",
    ready: "#10b981",
    error: "#ef4444",
  };

  return (
    <div className="sidebar-footer">
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: statusColors[status],
            display: "inline-block",
          }}
        />
        <span style={{ color: "#64748b" }}>{statusText[status]}</span>
      </div>
      {lastSaved && (
        <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>
          {locale === "zh-TW" ? "最後儲存: " : "Last saved: "}
          {lastSaved}
        </div>
      )}
    </div>
  );
}
