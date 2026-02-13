import type { AppNode, AppEdge, Selection, NodeKind, Locale } from "../../types";

interface InspectorProps {
  selected: Selection;
  nodes: AppNode[];
  edges: AppEdge[];
  locale: Locale;
  onUpdateNode: (id: string, updates: Partial<AppNode["data"]>) => void;
  onUpdateEdge: (id: string, updates: Partial<AppEdge>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function Inspector({
  selected,
  nodes,
  edges,
  locale,
  onUpdateNode,
  onUpdateEdge,
  onDelete,
  onClose,
}: InspectorProps) {
  const t = (en: string, zhTW: string) => (locale === "zh-TW" ? zhTW : en);

  if (selected.type === "node") {
    const node = nodes.find((n) => n.id === selected.id);
    if (!node) return null;

    const handleKindChange = (value: string) => {
      onUpdateNode(node.id, { kind: value as NodeKind });
    };

    const handleLabelChange = (value: string) => {
      onUpdateNode(node.id, { label: value });
    };

    const handleTierChange = (value: number) => {
      onUpdateNode(node.id, { tier: value });
    };

    const handleSplitChange = (value: number) => {
      onUpdateNode(node.id, { splitCount: value });
    };

    return (
      <div className="inspector">
        <div className="inspector-header">
          <strong>{t("Inspector", "檢視器")}</strong>
          <button className="btn ghost" onClick={onClose} style={{ padding: "0.25rem 0.5rem" }}>
            ✕
          </button>
        </div>
        <div className="inspector-body">
          <div className="field">
            <label>{t("Type", "類型")}</label>
            <input type="text" value="node" disabled />
          </div>

          <div className="field">
            <label>{t("Kind", "種類")}</label>
            <select value={node.data.kind} onChange={(e) => handleKindChange(e.target.value)}>
              <option value="rack">Rack</option>
              <option value="switch">Switch</option>
              <option value="server">Server</option>
              <option value="asic">ASIC</option>
              <option value="patch">Patch Panel</option>
            </select>
          </div>

          {node.data.kind === "patch" && (
            <div className="field">
              <label>{t("Split Count", "分割數量")}</label>
              <input
                type="number"
                min="2"
                max="64"
                value={node.data.splitCount ?? 2}
                onChange={(e) => handleSplitChange(Number(e.target.value))}
              />
            </div>
          )}

          <div className="field">
            <label>{t("Tier", "層級")}</label>
            <input
              type="number"
              min="1"
              value={node.data.tier}
              onChange={(e) => handleTierChange(Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label>{t("Label", "標籤")}</label>
            <input
              type="text"
              value={node.data.label}
              onChange={(e) => handleLabelChange(e.target.value)}
            />
          </div>

          <button className="btn danger" onClick={onDelete} style={{ width: "100%", marginTop: "1rem" }}>
            {t("Delete", "刪除")}
          </button>
        </div>
      </div>
    );
  }

  if (selected.type === "edge") {
    const edge = edges.find((e) => e.id === selected.id);
    if (!edge) return null;

    const handleLabelChange = (value: string) => {
      onUpdateEdge(edge.id, { label: value });
    };

    return (
      <div className="inspector">
        <div className="inspector-header">
          <strong>{t("Inspector", "檢視器")}</strong>
          <button className="btn ghost" onClick={onClose} style={{ padding: "0.25rem 0.5rem" }}>
            ✕
          </button>
        </div>
        <div className="inspector-body">
          <div className="field">
            <label>{t("Type", "類型")}</label>
            <input type="text" value="edge" disabled />
          </div>

          <div className="field">
            <label>{t("Label", "標籤")}</label>
            <input
              type="text"
              value={String(edge.label ?? "")}
              onChange={(e) => handleLabelChange(e.target.value)}
            />
          </div>

          <button className="btn danger" onClick={onDelete} style={{ width: "100%", marginTop: "1rem" }}>
            {t("Delete", "刪除")}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
