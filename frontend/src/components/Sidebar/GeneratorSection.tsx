import { useEffect, useState } from "react";

import { DEFAULT_PATCH_SPLIT, MAX_PATCH_SPLIT, MIN_PATCH_SPLIT } from "../../types";

import type { Locale, TopologyType, TopologyParamsMap, NodeKind } from "../../types";

interface GeneratorSectionProps {
  locale: Locale;
  topoType: TopologyType;
  topoParams: TopologyParamsMap;
  customKind: NodeKind;
  customTier: number;
  customCount: number;
  customSplit: number;
  onTopoTypeChange: (type: TopologyType) => void;
  onParamChange: (key: string, value: string | number) => void;
  onCustomKindChange: (value: NodeKind) => void;
  onCustomTierChange: (value: number) => void;
  onCustomCountChange: (value: number) => void;
  onCustomSplitChange: (value: number) => void;
  onAddCustomBatch: () => void;
  onGenerateTopology: () => void;
}

export default function GeneratorSection({
  locale,
  topoType,
  topoParams,
  customKind,
  customTier,
  customCount,
  customSplit,
  onTopoTypeChange,
  onParamChange,
  onCustomKindChange,
  onCustomTierChange,
  onCustomCountChange,
  onCustomSplitChange,
  onAddCustomBatch,
  onGenerateTopology,
}: GeneratorSectionProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const t = (en: string, zhTW: string) => (locale === "zh-TW" ? zhTW : en);
  const canGenerate = topoType !== "custom";

  useEffect(() => {
    setAdvancedOpen(false);
  }, [topoType]);

  const renderKindSelect = (value: NodeKind | undefined, onChange: (value: NodeKind) => void) => (
    <select value={value ?? "switch"} onChange={(e) => onChange(e.target.value as NodeKind)}>
      <option value="rack">Rack</option>
      <option value="switch">Switch</option>
      <option value="server">Server</option>
      <option value="asic">ASIC</option>
      <option value="patch">Patch Panel</option>
    </select>
  );

  const commonFields = (() => {
    switch (topoType) {
      case "leaf-spine":
        return (
          <>
            <div className="field">
              <label>{t("Spines", "脊交換機")}</label>
              <input
                type="number"
                min="1"
                value={topoParams.spines ?? 2}
                onChange={(e) => onParamChange("spines", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>{t("Leaves", "葉交換機")}</label>
              <input
                type="number"
                min="1"
                value={topoParams.leaves ?? 4}
                onChange={(e) => onParamChange("leaves", Number(e.target.value))}
              />
            </div>
          </>
        );
      case "fat-tree":
        return (
          <div className="field">
            <label>{t("K (must be even)", "K（必須為偶數）")}</label>
            <input
              type="number"
              min="2"
              step="2"
              value={topoParams.k ?? 4}
              onChange={(e) => onParamChange("k", Number(e.target.value))}
            />
          </div>
        );
      case "three-tier":
        return (
          <>
            <div className="field">
              <label>{t("Core", "核心層")}</label>
              <input
                type="number"
                min="1"
                value={topoParams.core ?? 2}
                onChange={(e) => onParamChange("core", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>{t("Aggregation", "聚合層")}</label>
              <input
                type="number"
                min="1"
                value={topoParams.aggregation ?? 4}
                onChange={(e) => onParamChange("aggregation", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>{t("Access", "接入層")}</label>
              <input
                type="number"
                min="1"
                value={topoParams.access ?? 8}
                onChange={(e) => onParamChange("access", Number(e.target.value))}
              />
            </div>
          </>
        );
      case "expanded-clos":
        return (
          <>
            <div className="field">
              <label>{t("Tiers", "層數")}</label>
              <input
                type="number"
                min="2"
                value={topoParams.tiers ?? 3}
                onChange={(e) => onParamChange("tiers", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>{t("Nodes per Tier", "每層節點數")}</label>
              <input
                type="number"
                min="1"
                value={topoParams.nodes_per_tier ?? 4}
                onChange={(e) => onParamChange("nodes_per_tier", Number(e.target.value))}
              />
            </div>
          </>
        );
      case "core-and-pod":
        return (
          <>
            <div className="field">
              <label>{t("Cores", "核心")}</label>
              <input
                type="number"
                min="1"
                value={topoParams.cores ?? 2}
                onChange={(e) => onParamChange("cores", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>{t("Pods", "機櫃")}</label>
              <input
                type="number"
                min="1"
                value={topoParams.pods ?? 2}
                onChange={(e) => onParamChange("pods", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>{t("Pod Leaves", "機櫃葉交換機")}</label>
              <input
                type="number"
                min="1"
                value={topoParams.pod_leaves ?? 2}
                onChange={(e) => onParamChange("pod_leaves", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>{t("Pod Aggs", "機櫃聚合交換機")}</label>
              <input
                type="number"
                min="1"
                value={topoParams.pod_aggs ?? 2}
                onChange={(e) => onParamChange("pod_aggs", Number(e.target.value))}
              />
            </div>
          </>
        );
      case "torus-2d":
      case "mesh":
        return (
          <>
            <div className="field">
              <label>{t("Rows", "行數")}</label>
              <input
                type="number"
                min="2"
                value={topoParams.rows ?? 4}
                onChange={(e) => onParamChange("rows", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>{t("Cols", "列數")}</label>
              <input
                type="number"
                min="2"
                value={topoParams.cols ?? 4}
                onChange={(e) => onParamChange("cols", Number(e.target.value))}
              />
            </div>
          </>
        );
      case "torus-3d":
        return (
          <>
            <div className="field">
              <label>{t("X", "X 維度")}</label>
              <input
                type="number"
                min="2"
                value={topoParams.x ?? 3}
                onChange={(e) => onParamChange("x", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>{t("Y", "Y 維度")}</label>
              <input
                type="number"
                min="2"
                value={topoParams.y ?? 3}
                onChange={(e) => onParamChange("y", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>{t("Z", "Z 維度")}</label>
              <input
                type="number"
                min="2"
                value={topoParams.z ?? 3}
                onChange={(e) => onParamChange("z", Number(e.target.value))}
              />
            </div>
          </>
        );
      case "dragonfly":
        return (
          <>
            <div className="field">
              <label>{t("Groups", "群組")}</label>
              <input
                type="number"
                min="2"
                value={topoParams.groups ?? 4}
                onChange={(e) => onParamChange("groups", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>{t("Routers per Group", "每群組路由器")}</label>
              <input
                type="number"
                min="2"
                value={topoParams.routers_per_group ?? 4}
                onChange={(e) => onParamChange("routers_per_group", Number(e.target.value))}
              />
            </div>
          </>
        );
      case "butterfly":
        return (
          <>
            <div className="field">
              <label>{t("Stages", "階段")}</label>
              <input
                type="number"
                min="2"
                value={topoParams.stages ?? 3}
                onChange={(e) => onParamChange("stages", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>{t("Width", "寬度")}</label>
              <input
                type="number"
                min="2"
                value={topoParams.width ?? 4}
                onChange={(e) => onParamChange("width", Number(e.target.value))}
              />
            </div>
          </>
        );
      case "ring":
      case "star":
        return (
          <div className="field">
            <label>{t("Count", "數量")}</label>
            <input
              type="number"
              min="3"
              value={topoParams.count ?? 6}
              onChange={(e) => onParamChange("count", Number(e.target.value))}
            />
          </div>
        );
      default:
        return null;
    }
  })();

  const advancedFields = (() => {
    switch (topoType) {
      case "leaf-spine":
        return (
          <>
            <div className="field">
              <label>{t("Spine Kind", "脊交換機種類")}</label>
              {renderKindSelect(topoParams.spine_kind as NodeKind | undefined, (v) => onParamChange("spine_kind", v))}
            </div>
            <div className="field">
              <label>{t("Leaf Kind", "葉交換機種類")}</label>
              {renderKindSelect(topoParams.leaf_kind as NodeKind | undefined, (v) => onParamChange("leaf_kind", v))}
            </div>
          </>
        );
      case "fat-tree":
        return (
          <>
            <div className="field">
              <label>{t("Core Kind", "核心交換機種類")}</label>
              {renderKindSelect(topoParams.core_kind as NodeKind | undefined, (v) => onParamChange("core_kind", v))}
            </div>
            <div className="field">
              <label>{t("Aggregation Kind", "聚合交換機種類")}</label>
              {renderKindSelect(topoParams.agg_kind as NodeKind | undefined, (v) => onParamChange("agg_kind", v))}
            </div>
            <div className="field">
              <label>{t("Edge Kind", "邊緣交換機種類")}</label>
              {renderKindSelect(topoParams.edge_kind as NodeKind | undefined, (v) => onParamChange("edge_kind", v))}
            </div>
          </>
        );
      case "three-tier":
        return (
          <>
            <div className="field">
              <label>{t("Core Kind", "核心交換機種類")}</label>
              {renderKindSelect(topoParams.core_kind as NodeKind | undefined, (v) => onParamChange("core_kind", v))}
            </div>
            <div className="field">
              <label>{t("Aggregation Kind", "聚合交換機種類")}</label>
              {renderKindSelect(topoParams.agg_kind as NodeKind | undefined, (v) => onParamChange("agg_kind", v))}
            </div>
            <div className="field">
              <label>{t("Access Kind", "接入交換機種類")}</label>
              {renderKindSelect(topoParams.access_kind as NodeKind | undefined, (v) => onParamChange("access_kind", v))}
            </div>
          </>
        );
      case "expanded-clos":
      case "torus-2d":
      case "torus-3d":
      case "dragonfly":
      case "butterfly":
      case "mesh":
      case "ring":
      case "star":
        return (
          <div className="field">
            <label>{t("Kind", "種類")}</label>
            {renderKindSelect(topoParams.kind as NodeKind | undefined, (v) => onParamChange("kind", v))}
          </div>
        );
      case "core-and-pod":
        return (
          <>
            <div className="field">
              <label>{t("Core Kind", "核心交換機種類")}</label>
              {renderKindSelect(topoParams.core_kind as NodeKind | undefined, (v) => onParamChange("core_kind", v))}
            </div>
            <div className="field">
              <label>{t("Pod Agg Kind", "機櫃聚合交換機種類")}</label>
              {renderKindSelect(topoParams.agg_kind as NodeKind | undefined, (v) => onParamChange("agg_kind", v))}
            </div>
            <div className="field">
              <label>{t("Pod Leaf Kind", "機櫃葉交換機種類")}</label>
              {renderKindSelect(topoParams.leaf_kind as NodeKind | undefined, (v) => onParamChange("leaf_kind", v))}
            </div>
          </>
        );
      default:
        return null;
    }
  })();

  const hasAdvanced = topoType !== "custom" && Boolean(advancedFields);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="field">
        <label>{t("Type", "類型")}</label>
        <select value={topoType} onChange={(e) => onTopoTypeChange(e.target.value as TopologyType)}>
          <option value="custom">{t("Custom", "自訂")}</option>
          <option value="leaf-spine">{t("Leaf-Spine", "葉脊")}</option>
          <option value="fat-tree">{t("Fat-Tree", "胖樹")}</option>
          <option value="three-tier">{t("3-Tier", "三層")}</option>
          <option value="expanded-clos">{t("Expanded Clos", "擴展 Clos")}</option>
          <option value="core-and-pod">{t("Core-and-Pod", "核心與機櫃")}</option>
          <option value="torus-2d">{t("2D Torus", "2D 環面")}</option>
          <option value="torus-3d">{t("3D Torus", "3D 環面")}</option>
          <option value="dragonfly">{t("Dragonfly", "蜻蜓")}</option>
          <option value="butterfly">{t("Butterfly", "蝴蝶")}</option>
          <option value="mesh">{t("Mesh", "網格")}</option>
          <option value="ring">{t("Ring", "環")}</option>
          <option value="star">{t("Star", "星")}</option>
        </select>
      </div>

      {commonFields}

      {hasAdvanced && (
        <div className="advanced-block">
          <button
            className="btn ghost advanced-toggle"
            onClick={() => setAdvancedOpen((prev) => !prev)}
          >
            <span>{advancedOpen ? "▼" : "▶"}</span>
            <span>{t("Advanced Parameters", "進階參數")}</span>
          </button>

          {advancedOpen && (
            <div className="advanced-panel">
              {advancedFields}
              <div className="field">
                <label>{t("Edge Label", "邊標籤")}</label>
                <input
                  type="text"
                  value={topoParams.edge_label ?? "link"}
                  onChange={(e) => onParamChange("edge_label", e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <button className="btn" onClick={onGenerateTopology} disabled={!canGenerate}>
        {t("Generate Topology", "產生拓撲")}
      </button>

      {topoType === "custom" && (
        <>
          <div className="field">
            <label>{t("Node Kind", "節點種類")}</label>
            {renderKindSelect(customKind, onCustomKindChange)}
          </div>
          <div className="field">
            <label>{t("Tier", "層級")}</label>
            <input
              type="number"
              min="1"
              value={customTier}
              onChange={(e) => onCustomTierChange(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="field">
            <label>{t("Count", "數量")}</label>
            <input
              type="number"
              min="1"
              max="200"
              value={customCount}
              onChange={(e) => onCustomCountChange(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          {customKind === "patch" && (
            <div className="field">
              <label>{t("Split Count", "分割數量")}</label>
              <input
                type="number"
                min={MIN_PATCH_SPLIT}
                max={MAX_PATCH_SPLIT}
                value={customSplit}
                onChange={(e) =>
                  onCustomSplitChange(
                    Math.max(
                      MIN_PATCH_SPLIT,
                      Math.min(MAX_PATCH_SPLIT, Number(e.target.value) || DEFAULT_PATCH_SPLIT),
                    ),
                  )
                }
              />
            </div>
          )}
          <button className="btn" onClick={onAddCustomBatch}>
            {t("Add Custom Nodes", "新增自訂節點")}
          </button>
          <div className="section-note">
            {t(
              "Custom mode: set kind and tier, then add nodes with links to the nearest lower tier.",
              "自訂模式：設定種類與層級後新增節點，並自動連到最近的下一層。",
            )}
          </div>
        </>
      )}
    </div>
  );
}
