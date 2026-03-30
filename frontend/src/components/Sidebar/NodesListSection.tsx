import { useMemo, useState } from "react";
import type { AppNode, Locale, NodeKind } from "../../types";

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
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | NodeKind>("all");
  const [tierFilter, setTierFilter] = useState<"all" | string>("all");

  const tiers = useMemo(
    () =>
      Array.from(
        new Set(
          nodes
            .map((node) => node.data.tier)
            .filter((tier): tier is number => typeof tier === "number"),
        ),
      ).sort((a, b) => a - b),
    [nodes],
  );

  const filteredNodes = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return nodes.filter((node) => {
      const matchesQuery =
        !keyword ||
        node.data.label.toLowerCase().includes(keyword) ||
        node.id.toLowerCase().includes(keyword);
      const matchesKind = kindFilter === "all" || node.data.kind === kindFilter;
      const matchesTier =
        tierFilter === "all" || String(node.data.tier ?? "") === tierFilter;
      return matchesQuery && matchesKind && matchesTier;
    });
  }, [kindFilter, nodes, query, tierFilter]);

  if (nodes.length === 0) {
    return (
      <div style={{ color: "#94a3b8", fontSize: "0.875rem", textAlign: "center", padding: "1rem 0" }}>
        {t("No nodes yet", "尚無節點")}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="field">
        <label>{t("Search", "搜尋")}</label>
        <input
          type="text"
          value={query}
          placeholder={t("Node name or id", "節點名稱或 id")}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="filter-grid">
        <div className="field">
          <label>{t("Kind", "種類")}</label>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as "all" | NodeKind)}
          >
            <option value="all">{t("All", "全部")}</option>
            <option value="rack">Rack</option>
            <option value="switch">Switch</option>
            <option value="server">Server</option>
            <option value="asic">ASIC</option>
            <option value="patch">Patch Panel</option>
          </select>
        </div>

        <div className="field">
          <label>{t("Tier", "層級")}</label>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <option value="all">{t("All", "全部")}</option>
            {tiers.map((tier) => (
              <option key={tier} value={String(tier)}>
                {tier}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="list-summary">
        {t("{count} nodes shown", "顯示 {count} 個節點").replace("{count}", String(filteredNodes.length))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "300px", overflowY: "auto" }}>
      {filteredNodes.map((node) => (
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
      {filteredNodes.length === 0 && (
        <div className="empty-note">
          {t("No matching nodes", "沒有符合條件的節點")}
        </div>
      )}
      </div>
    </div>
  );
}
