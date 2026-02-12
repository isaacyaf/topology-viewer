import type { AppNode, Locale } from "../../types";

interface NodesListSectionProps {
  locale: Locale;
  nodes: AppNode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}

const KIND_ICONS = {
  rack: "📦",
  switch: "🔀",
  server: "🖥️",
  asic: "💾",
  patch: "🔌",
};

export default function NodesListSection({
  locale,
  nodes,
  selectedNodeId,
  onSelectNode,
}: NodesListSectionProps) {
  const t = (en: string, zhTW: string) => (locale === "zh-TW" ? zhTW : en);

  if (nodes.length === 0) {
    return (
      <div style={{ color: "#94a3b8", fontSize: "0.875rem", textAlign: "center", padding: "1rem 0" }}>
        {t("No nodes yet", "尚無節點")}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "300px", overflowY: "auto" }}>
      {nodes.map((node) => (
        <div
          key={node.id}
          onClick={() => onSelectNode(node.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem",
            borderRadius: "8px",
            cursor: "pointer",
            background: selectedNodeId === node.id ? "rgba(15, 118, 110, 0.1)" : "transparent",
            border: selectedNodeId === node.id ? "1px solid rgba(15, 118, 110, 0.3)" : "1px solid transparent",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (selectedNodeId !== node.id) {
              e.currentTarget.style.background = "rgba(0,0,0,0.03)";
            }
          }}
          onMouseLeave={(e) => {
            if (selectedNodeId !== node.id) {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <span style={{ fontSize: "1.25rem" }}>{KIND_ICONS[node.data.kind]}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {node.data.label}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              {node.data.kind} · {t("Tier", "層級")} {node.data.tier}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
