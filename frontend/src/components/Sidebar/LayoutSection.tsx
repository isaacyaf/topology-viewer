import type { Locale } from "../../types";

interface LayoutSectionProps {
  locale: Locale;
  layerGap: number;
  endGap: boolean;
  onAutoLayout: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onLayerGapChange: (value: number) => void;
  onEndGapChange: (value: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function LayoutSection({
  locale,
  layerGap,
  endGap,
  onAutoLayout,
  onUndo,
  onRedo,
  onLayerGapChange,
  onEndGapChange,
  canUndo,
  canRedo,
}: LayoutSectionProps) {
  const t = (en: string, zhTW: string) => (locale === "zh-TW" ? zhTW : en);
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modKey = isMac ? "⌘" : "Ctrl";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <button className="btn" onClick={onAutoLayout} style={{ width: "100%" }}>
        {t("Auto Layout", "自動布局")}
      </button>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          className="btn ghost"
          onClick={onUndo}
          disabled={!canUndo}
          style={{ flex: 1 }}
          title={`${t("Undo", "復原")} (${modKey}+Z)`}
        >
          ↶ {t("Undo", "復原")}
        </button>
        <button
          className="btn ghost"
          onClick={onRedo}
          disabled={!canRedo}
          style={{ flex: 1 }}
          title={`${t("Redo", "重做")} (${modKey}+Y)`}
        >
          ↷ {t("Redo", "重做")}
        </button>
      </div>

      <div className="field">
        <label>{t("Layer Gap", "層間距")}</label>
        <input
          type="number"
          min="50"
          max="500"
          step="10"
          value={layerGap}
          onChange={(e) => onLayerGapChange(Number(e.target.value))}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          type="checkbox"
          id="end-gap-checkbox"
          checked={endGap}
          onChange={(e) => onEndGapChange(e.target.checked)}
        />
        <label htmlFor="end-gap-checkbox" style={{ margin: 0, cursor: "pointer" }}>
          {t("Add gap at layer ends", "層端添加間距")}
        </label>
      </div>
    </div>
  );
}
