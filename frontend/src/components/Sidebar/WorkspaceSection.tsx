import type { Locale, TopologySummary } from "../../types";

interface WorkspaceSectionProps {
  locale: Locale;
  topologies: TopologySummary[];
  activeId: number | null;
  name: string;
  onLoadTopology: (id: number | null) => void;
  onNameChange: (name: string) => void;
  onNewTopology: () => void;
  onSaveTopology: () => void;
  onDeleteTopology: () => void;
  onLoadFromJson: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportJson: () => void;
  onAutoLayout: () => void;
}

export default function WorkspaceSection({
  locale,
  topologies,
  activeId,
  name,
  onLoadTopology,
  onNameChange,
  onNewTopology,
  onSaveTopology,
  onDeleteTopology,
  onLoadFromJson,
  onExportJson,
  onAutoLayout,
}: WorkspaceSectionProps) {
  const t = (en: string, zhTW: string) => (locale === "zh-TW" ? zhTW : en);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="field">
        <label>{t("Topology", "拓撲")}</label>
        <select
          value={activeId ?? ""}
          onChange={(e) =>
            onLoadTopology(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">{t("Select...", "選擇...")}</option>
          {topologies.map((topo) => (
            <option key={topo.id} value={topo.id}>
              {topo.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>{t("Name", "名稱")}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className="btn" onClick={onNewTopology} style={{ flex: 1 }}>
          {t("New", "新建")}
        </button>
        <button className="btn" onClick={onSaveTopology} style={{ flex: 1 }}>
          {t("Save", "儲存")}
        </button>
      </div>

      <button className="btn ghost" onClick={onAutoLayout} style={{ width: "100%" }}>
        {t("Auto Layout", "自動布局")}
      </button>

      <div className="subsection">
        <div className="subsection-title">{t("Import / Export", "匯入 / 匯出")}</div>
        <label className="btn ghost" style={{ width: "100%", cursor: "pointer" }}>
          {t("Load JSON", "載入 JSON")}
          <input
            type="file"
            accept="application/json"
            onChange={onLoadFromJson}
            style={{ display: "none" }}
          />
        </label>

        <button
          className="btn ghost"
          onClick={onExportJson}
          style={{ width: "100%", marginTop: "0.5rem" }}
        >
          {t("Export JSON", "匯出 JSON")}
        </button>
      </div>

      <div className="danger-zone">
        <div className="subsection-title danger">{t("Danger Zone", "危險操作")}</div>
        <div className="danger-copy">
          {t(
            "Delete the current topology permanently.",
            "永久刪除目前的拓撲。",
          )}
        </div>
        <button className="btn danger" onClick={onDeleteTopology}>
          {t("Delete Topology", "刪除拓撲")}
        </button>
      </div>
    </div>
  );
}
