import { useState } from "react";
import type { Locale, NodeKind } from "../../types";

interface AddNodesSectionProps {
  locale: Locale;
  onAddNode: (kind: NodeKind) => void;
  onAddCustomNodes: (
    kind: NodeKind,
    tier: number,
    count: number,
    splitCount?: number,
  ) => void;
}

export default function AddNodesSection({
  locale,
  onAddNode,
  onAddCustomNodes,
}: AddNodesSectionProps) {
  const t = (en: string, zhTW: string) => (locale === "zh-TW" ? zhTW : en);

  // Custom node creator state
  const [customKind, setCustomKind] = useState<NodeKind>("switch");
  const [customTier, setCustomTier] = useState<number>(1);
  const [customCount, setCustomCount] = useState<number>(1);
  const [customSplit, setCustomSplit] = useState<number>(8);
  const [showCustom, setShowCustom] = useState<boolean>(false);

  const handleAddCustom = () => {
    onAddCustomNodes(
      customKind,
      customTier,
      customCount,
      customKind === "patch"
        ? Math.max(2, Math.min(64, Number(customSplit) || 8))
        : undefined,
    );
    // Reset form
    setCustomCount(1);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <button
          className="btn"
          onClick={() => onAddNode("rack")}
          title={t("Add Rack", "新增機架")}
        >
          📦 Rack
        </button>
        <button
          className="btn ghost"
          onClick={() => onAddNode("switch")}
          title={t("Add Switch", "新增交換機")}
        >
          🔀 Switch
        </button>
        <button
          className="btn ghost"
          onClick={() => onAddNode("server")}
          title={t("Add Server", "新增伺服器")}
        >
          🖥️ Server
        </button>
        <button
          className="btn ghost"
          onClick={() => onAddNode("asic")}
          title={t("Add ASIC", "新增 ASIC")}
        >
          💾 ASIC
        </button>
        <button
          className="btn ghost"
          onClick={() => onAddNode("patch")}
          title={t("Add Patch Panel", "新增配線板")}
          style={{ gridColumn: "1 / -1" }}
        >
          🔌 Patch Panel
        </button>
      </div>

      <div style={{ borderTop: "1px solid rgba(0,0,0,0.1)", paddingTop: "0.75rem" }}>
        <button
          className="btn ghost"
          onClick={() => setShowCustom(!showCustom)}
          style={{ width: "100%", marginBottom: showCustom ? "0.75rem" : 0 }}
        >
          {showCustom ? "▼" : "▶"} {t("Batch Add", "批次新增")}
        </button>

        {showCustom && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div className="field">
              <label>{t("Kind", "種類")}</label>
              <select value={customKind} onChange={(e) => setCustomKind(e.target.value as NodeKind)}>
                <option value="rack">Rack</option>
                <option value="switch">Switch</option>
                <option value="server">Server</option>
                <option value="asic">ASIC</option>
                <option value="patch">Patch Panel</option>
              </select>
            </div>

            <div className="field">
              <label>{t("Tier", "層級")}</label>
              <input
                type="number"
                min="1"
                value={customTier}
                onChange={(e) => setCustomTier(Number(e.target.value))}
              />
            </div>

            <div className="field">
              <label>{t("Count", "數量")}</label>
              <input
                type="number"
                min="1"
                max="100"
                value={customCount}
                onChange={(e) => setCustomCount(Number(e.target.value))}
              />
            </div>

            {customKind === "patch" && (
              <div className="field">
                <label>{t("Split Count", "分割數量")}</label>
                <input
                  type="number"
                  min="2"
                  max="64"
                  value={customSplit}
                  onChange={(e) => setCustomSplit(Number(e.target.value))}
                />
              </div>
            )}

            <button className="btn" onClick={handleAddCustom}>
              {t("Add to Topology", "加入拓撲")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
