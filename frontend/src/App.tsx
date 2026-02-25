import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Handle,
  getNodesBounds,
  getViewportForBounds,
  MiniMap,
  Position,
  useEdgesState,
  useNodesState,
  type Connection,
  type ReactFlowInstance,
  type OnSelectionChangeParams,
} from "reactflow";

import { toPng } from "html-to-image";
import "reactflow/dist/style.css";

import type {
  AppNode,
  AppEdge,
  AppStatus,
  ActiveTab,
  Selection,
  HistoryState,
  Locale,
  Theme,
  ViewMode,
  TranslationFunction,
  TopologyType,
  TopologyParamsMap,
  TopologySummary,
  TopologyResponse,
  CustomNodeProps,
  CustomNodeData,
  LayoutOptions,
  NodeKind,
  HandlePosition,
  KindConfigMap,
  DefaultTierMap,
  SidebarSectionId,
} from "./types";

// Sidebar components
import Sidebar from "./components/Sidebar/Sidebar";
import SidebarSection from "./components/Sidebar/SidebarSection";
import WorkspaceSection from "./components/Sidebar/WorkspaceSection";
import GeneratorSection from "./components/Sidebar/GeneratorSection";
import AddNodesSection from "./components/Sidebar/AddNodesSection";
import NodesListSection from "./components/Sidebar/NodesListSection";
import LayoutSection from "./components/Sidebar/LayoutSection";
import SettingsSection from "./components/Sidebar/SettingsSection";
import Inspector from "./components/Inspector/Inspector";

const defaultViewport = { x: 0, y: 0, zoom: 1 };

const NON_TREE_TYPES = new Set<TopologyType>([
  "torus-2d",
  "torus-3d",
  "dragonfly",
  "butterfly",
  "mesh",
  "ring",
  "star",
]);

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  en: {},
  "zh-TW": {
    "Data Center Topology": "資料中心拓撲",
    "Editable graph with autosave": "可編輯拓撲，含自動儲存",
    Topology: "拓撲",
    Nodes: "節點",
    Workspace: "工作區",
    "Add Components": "新增元件",
    Layout: "佈局",
    Export: "匯出",
    New: "新增",
    Save: "儲存",
    Undo: "復原",
    Redo: "重做",
    "Auto Layout": "自動佈局",
    "End-gap per layer": "每層末端保留間距",
    "Load JSON": "匯入 JSON",
    "Export JSON": "匯出 JSON",
    "Loading...": "載入中...",
    "Saving...": "儲存中...",
    "Up to date": "已更新",
    Error: "錯誤",
    "Saved {time}": "已儲存 {time}",
    "Topology name": "拓撲名稱",
    Delete: "刪除",
    Inspector: "檢視器",
    "Select a node or edge.": "請選擇節點或連線。",
    Type: "類型",
    Kind: "種類",
    Split: "分裂",
    Tier: "階層",
    Label: "標籤",
    "Drag nodes, click to select, drag from handles to connect. Hold Shift to lasso select multiple items.":
      "拖曳節點，點擊選取，從端點拖曳連線。按住 Shift 可框選多個物件。",
    "Build the virtual data center, model cabling, and validate full paths.":
      "建置虛擬資料中心、模擬布線並驗證完整路徑。",
    "Auto Layout (High → Low)": "自動佈局（高 → 低）",
    "Topology Generator": "拓撲產生器",
    Custom: "自訂",
    "Leaf-Spine": "Leaf-Spine",
    "Fat-Tree": "Fat-Tree",
    "3-Tier": "三層式",
    "Expanded Clos": "擴展 Clos",
    "Core-and-Pod": "核心/Pod",
    "2D Torus": "2D Torus",
    "3D Torus": "3D Torus",
    Dragonfly: "Dragonfly",
    Butterfly: "Butterfly",
    Mesh: "Mesh",
    Ring: "Ring",
    Star: "Star",
    "Layer Gap": "層間距",
    Spines: "Spine 數量",
    "Spine Kind": "Spine 種類",
    Leaves: "Leaf 數量",
    "Leaf Kind": "Leaf 種類",
    "k (even)": "k（偶數）",
    "Core Kind": "Core 種類",
    "Agg Kind": "Agg 種類",
    "Edge Kind": "Edge 種類",
    Core: "Core",
    Aggregation: "Aggregation",
    Access: "Access",
    "Aggregation Kind": "Aggregation 種類",
    "Access Kind": "Access 種類",
    Tiers: "層數",
    "Nodes / Tier": "每層節點數",
    Cores: "Core 數量",
    Pods: "Pod 數量",
    "Pod Leaves": "Pod Leaf 數量",
    "Pod Leaf Kind": "Pod Leaf 種類",
    "Pod Aggs": "Pod Agg 數量",
    "Pod Agg Kind": "Pod Agg 種類",
    Rows: "列數",
    Cols: "欄數",
    "Edge Label": "連線標籤",
    X: "X",
    Y: "Y",
    Z: "Z",
    Groups: "群組數",
    "Routers / Group": "每群組路由數",
    Stages: "Stages",
    Width: "寬度",
    Count: "數量",
    Rack: "機櫃",
    Switch: "交換器",
    Server: "伺服器",
    ASIC: "ASIC",
    "Patch Panel": "配線盤",
    "+ Rack": "+ 機櫃",
    "+ Switch": "+ 交換器",
    "+ Server": "+ 伺服器",
    "+ ASIC": "+ ASIC",
    "+ Patch": "+ 配線盤",
    Language: "語言",
    "View Mode": "檢視模式",
    Edit: "編輯",
    Present: "展示",
    English: "英文",
    繁體中文: "繁體中文",
    Untitled: "未命名",
    Default: "預設",
    "Delete this topology?": "要刪除此拓撲嗎？",
    "Failed to load JSON. Check console for details.":
      "載入 JSON 失敗，請查看主控台。",
    "Failed to export PNG. Check console for details.":
      "匯出 PNG 失敗，請查看主控台。",
    Generate: "產生",
    "Add to Topology": "加入拓撲",
  },
};

const KIND_CONFIG: KindConfigMap = {
  rack: { label: "Rack", color: "#0ea5e9" },
  switch: { label: "Switch", color: "#f59e0b" },
  server: { label: "Server", color: "#10b981" },
  asic: { label: "ASIC", color: "#7c3aed" },
  patch: { label: "Patch Panel", color: "#0f766e" },
};

const DEFAULT_TIER: DefaultTierMap = {
  switch: 3,
  rack: 2,
  server: 1,
  asic: 1,
  patch: 2,
};

const RackIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <line x1="8" y1="8" x2="16" y2="8" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="16" y2="16" />
  </svg>
);

const SwitchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="8" width="18" height="8" rx="2" />
    <circle cx="8" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="16" cy="12" r="1.5" />
  </svg>
);

const AsicIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <line x1="3" y1="9" x2="7" y2="9" />
    <line x1="3" y1="12" x2="7" y2="12" />
    <line x1="3" y1="15" x2="7" y2="15" />
    <line x1="17" y1="9" x2="21" y2="9" />
    <line x1="17" y1="12" x2="21" y2="12" />
    <line x1="17" y1="15" x2="21" y2="15" />
  </svg>
);

const PatchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <circle cx="7" cy="10" r="1.2" />
    <circle cx="11" cy="10" r="1.2" />
    <circle cx="15" cy="10" r="1.2" />
    <circle cx="7" cy="14" r="1.2" />
    <circle cx="11" cy="14" r="1.2" />
    <circle cx="15" cy="14" r="1.2" />
  </svg>
);

const ServerIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="6" rx="2" />
    <rect x="4" y="14" width="16" height="6" rx="2" />
    <circle cx="8" cy="7" r="1.2" />
    <circle cx="8" cy="17" r="1.2" />
  </svg>
);

const ICONS = {
  rack: RackIcon,
  switch: SwitchIcon,
  server: ServerIcon,
  asic: AsicIcon,
  patch: PatchIcon,
};

let currentLocale: Locale = "en";

const setCurrentLocale = (nextLocale: Locale): void => {
  currentLocale = nextLocale;
};

const getKindLabel = (kind: NodeKind): string => {
  const base = KIND_CONFIG[kind]?.label || kind;
  return TRANSLATIONS[currentLocale]?.[base] || base;
};

const CustomNodeTree = memo<CustomNodeProps>(({ data }) => {
  const config = KIND_CONFIG[data.kind] || KIND_CONFIG.rack;
  const Icon = ICONS[data.kind] || RackIcon;
  const split = data.kind === "patch" ? data.splitCount || 2 : null;

  return (
    <div className="custom-node" style={{ borderColor: config.color }}>
      <Handle id="left-in" type="target" position={Position.Left} />
      <Handle id="left-out" type="source" position={Position.Left} />
      <Handle id="right-in" type="target" position={Position.Right} />
      <Handle id="right-out" type="source" position={Position.Right} />
      <Handle id="top-in" type="target" position={Position.Top} />
      <Handle id="top-out" type="source" position={Position.Top} />
      <Handle id="bottom-in" type="target" position={Position.Bottom} />
      <Handle id="bottom-out" type="source" position={Position.Bottom} />
      <div className="node-icon" style={{ color: config.color }}>
        <Icon />
      </div>
      <div className="node-body">
        <div className="node-title">{data.label}</div>
        <div className="node-kind">{getKindLabel(data.kind)}</div>
      </div>
      {split && <div className="node-badge">1→{split}</div>}
    </div>
  );
});

const CustomNodeGrid = memo<CustomNodeProps>(({ data }) => {
  const config = KIND_CONFIG[data.kind] || KIND_CONFIG.rack;
  const Icon = ICONS[data.kind] || RackIcon;
  const split = data.kind === "patch" ? data.splitCount || 2 : null;

  return (
    <div className="custom-node" style={{ borderColor: config.color }}>
      <Handle id="left-in" type="target" position={Position.Left} />
      <Handle id="left-out" type="source" position={Position.Left} />
      <Handle id="right-in" type="target" position={Position.Right} />
      <Handle id="right-out" type="source" position={Position.Right} />
      <Handle id="top-in" type="target" position={Position.Top} />
      <Handle id="top-out" type="source" position={Position.Top} />
      <Handle id="bottom-in" type="target" position={Position.Bottom} />
      <Handle id="bottom-out" type="source" position={Position.Bottom} />
      <div className="node-icon" style={{ color: config.color }}>
        <Icon />
      </div>
      <div className="node-body">
        <div className="node-title">{data.label}</div>
        <div className="node-kind">{getKindLabel(data.kind)}</div>
      </div>
      {split && <div className="node-badge">1→{split}</div>}
    </div>
  );
});

export default function App() {
  const [locale, setLocale] = useState<Locale>("en");
  const [theme, setTheme] = useState<Theme>(() => {
    // Load theme from localStorage or detect system preference
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
    // Fallback to system preference if no saved theme
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedMode = localStorage.getItem("viewMode") as ViewMode | null;
    return savedMode === "present" ? "present" : "edit";
  });
  const [topologies, setTopologies] = useState<TopologySummary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [name, setName] = useState<string>("Default");
  const [topoType, setTopoType] = useState<TopologyType>("custom");
  const [topoParams, setTopoParams] = useState<TopologyParamsMap>({});
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [status, setStatus] = useState<AppStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("topology");
  const [layoutEndGap, setLayoutEndGap] = useState<boolean>(false);
  const [customKind, setCustomKind] = useState<NodeKind>("switch");
  const [customTier, setCustomTier] = useState<number>(2);
  const [customCount, setCustomCount] = useState<number>(1);
  const [customSplit, setCustomSplit] = useState<number>(8);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [expandedSections, setExpandedSections] = useState<Set<SidebarSectionId>>(
    new Set(["workspace", "addNodes", "layout"])
  );

  const statusTimerRef = useRef<number | null>(null);
  const historyRef = useRef<HistoryState>({ past: [], future: [] });
  const suppressHistoryRef = useRef<boolean>(false);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<AppNode[]>([]);
  const edgesRef = useRef<AppEdge[]>([]);

  const t = useCallback<TranslationFunction>(
    (text, vars) => {
      const table = TRANSLATIONS[locale] || {};
      let out = table[text] ?? text;
      if (vars) {
        Object.entries(vars).forEach(([key, value]) => {
          out = out.replaceAll(`{${key}}`, String(value));
        });
      }
      return out;
    },
    [locale],
  );

  useEffect(() => {
    setCurrentLocale(locale);
  }, [locale]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const selectedType = selected?.type;
  const selectedId = selected?.id;

  const hasSelection = Boolean(selectedType && selectedId);
  const nodeTypes = useMemo(
    () => ({
      custom: CustomNodeTree,
      "custom-tree": CustomNodeTree,
      "custom-grid": CustomNodeGrid,
    }),
    [],
  );
  const renderNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        type: node.data?.layout === "grid" ? "custom-grid" : "custom-tree",
      })),
    [nodes],
  );

  // Sidebar section toggle
  const toggleSection = useCallback((sectionId: SidebarSectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarState");
    if (savedState) {
      try {
        const { open, sections } = JSON.parse(savedState);
        setSidebarOpen(open);
        setExpandedSections(new Set(sections));
      } catch (e) {
        console.error("Failed to load sidebar state:", e);
      }
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem(
      "sidebarState",
      JSON.stringify({
        open: sidebarOpen,
        sections: Array.from(expandedSections),
      })
    );
  }, [sidebarOpen, expandedSections]);

  const handleSelectionChange = useCallback((items: OnSelectionChangeParams) => {
    let nextSelection: Selection | null = null;
    if (items.nodes?.length) {
      nextSelection = { type: "node", id: items.nodes[0]!.id };
    } else if (items.edges?.length) {
      nextSelection = { type: "edge", id: items.edges[0]!.id };
    }
    setSelected((prev) => {
      if (
        prev?.type === nextSelection?.type &&
        prev?.id === nextSelection?.id
      ) {
        return prev;
      }
      return nextSelection;
    });
  }, []);

  const computeLayoutNodes = useCallback(
    (
      inputNodes: AppNode[],
      inputEdges: AppEdge[],
      typeValue?: TopologyType,
      paramsValue?: TopologyParamsMap,
      layoutOptions: LayoutOptions = {}
    ): AppNode[] => {
      const endGap = Boolean(layoutOptions?.endGap);
      const topoTypeValue = typeValue || topoType;
      const topoParamsValue = paramsValue || topoParams;
      if (topoTypeValue === "torus-2d" || topoTypeValue === "mesh") {
        const rows = topoParamsValue.rows || 3;
        const cols = topoParamsValue.cols || 3;
        const spacingX = topoParamsValue.nodeSpacingX || 180;
        const spacingY = topoParamsValue.layerGap || 140;
        return inputNodes.map((node) => {
          const match = node.id.match(/^n-(\d+)-(\d+)$/);
          const r = match ? Number(match[1]) : 0;
          const c = match ? Number(match[2]) : 0;
          return {
            ...node,
            position: { x: 140 + c * spacingX, y: 120 + r * spacingY },
          };
        });
      }
      if (topoTypeValue === "torus-3d") {
        const xCount = topoParamsValue.x || 3;
        const yCount = topoParamsValue.y || 3;
        const zCount = topoParamsValue.z || 3;
        const spacingX = topoParamsValue.nodeSpacingX || 160;
        const spacingY = topoParamsValue.layerGap || 120;
        const layerGap = topoParamsValue.layerGap3d || 260;
        return inputNodes.map((node) => {
          const match = node.id.match(/^n-(\d+)-(\d+)-(\d+)$/);
          const i = match ? Number(match[1]) : 0;
          const j = match ? Number(match[2]) : 0;
          const k = match ? Number(match[3]) : 0;
          const layerX = (k % zCount) * layerGap;
          return {
            ...node,
            position: { x: 140 + layerX + i * spacingX, y: 120 + j * spacingY },
          };
        });
      }
      if (topoTypeValue === "dragonfly") {
        const groups = topoParamsValue.groups || 3;
        const routersPerGroup = topoParamsValue.routers_per_group || 4;
        const groupCols = Math.ceil(Math.sqrt(groups));
        const groupSpacingX = topoParamsValue.groupGapX || 320;
        const groupSpacingY = topoParamsValue.layerGap || 260;
        const nodeSpacingX = topoParamsValue.nodeSpacingX || 120;
        const nodeSpacingY = topoParamsValue.nodeSpacingY || 90;
        return inputNodes.map((node) => {
          const match = node.id.match(/^g(\d+)-r(\d+)$/);
          const g = match ? Number(match[1]) - 1 : 0;
          const r = match ? Number(match[2]) - 1 : 0;
          const groupRow = Math.floor(g / groupCols);
          const groupCol = g % groupCols;
          const localCol = r % Math.ceil(Math.sqrt(routersPerGroup));
          const localRow = Math.floor(
            r / Math.ceil(Math.sqrt(routersPerGroup)),
          );
          return {
            ...node,
            position: {
              x: 140 + groupCol * groupSpacingX + localCol * nodeSpacingX,
              y: 120 + groupRow * groupSpacingY + localRow * nodeSpacingY,
            },
          };
        });
      }
      if (topoTypeValue === "butterfly") {
        const stages = topoParamsValue.stages || 3;
        const width = topoParamsValue.width || 4;
        const spacingX = topoParamsValue.nodeSpacingX || 180;
        const spacingY = topoParamsValue.layerGap || 140;
        return inputNodes.map((node) => {
          const match = node.id.match(/^s(\d+)-n(\d+)$/);
          const stageIndex = match ? Number(match[1]) - 1 : 0;
          const nodeIndex = match ? Number(match[2]) - 1 : 0;
          const x = 140 + nodeIndex * spacingX;
          const y = 120 + stageIndex * spacingY;
          return {
            ...node,
            position: { x, y },
          };
        });
      }

      const tierOf = (node: AppNode): number =>
        node.data?.tier ?? DEFAULT_TIER[node.data?.kind] ?? DEFAULT_TIER.server;
      const edgesBySource: Record<string, string[]> = inputEdges.reduce((acc, edge) => {
        if (!acc[edge.source]) acc[edge.source] = [];
        acc[edge.source]!.push(edge.target);
        return acc;
      }, {} as Record<string, string[]>);
      const edgesByTarget: Record<string, string[]> = inputEdges.reduce((acc, edge) => {
        if (!acc[edge.target]) acc[edge.target] = [];
        acc[edge.target]!.push(edge.source);
        return acc;
      }, {} as Record<string, string[]>);

      const scoreNode = (node: AppNode): number => {
        const tier = tierOf(node);
        if (tier >= 3) return 1000;
        if (tier === 2) {
          const targets = edgesBySource[node.id] || [];
          return targets.length * 10;
        }
        const sources = edgesByTarget[node.id] || [];
        return sources.length;
      };

      const tiers = Array.from(
        new Set(inputNodes.map((node) => tierOf(node))),
      ).sort((a, b) => b - a);
      const maxInTier = Math.max(
        1,
        ...tiers.map(
          (tier) => inputNodes.filter((n) => tierOf(n) === tier).length,
        ),
      );
      const layerGap = topoParamsValue.layerGap || 220;
      const nodeSpacingX = topoParamsValue.nodeSpacingX || 220;
      return inputNodes.map((node) => {
        const tier = tierOf(node);
        const tierIndex = tiers.indexOf(tier);
        const group = inputNodes.filter((n) => tierOf(n) === tier);
        const ordered = [...group].sort((a, b) => {
          const scoreDiff = scoreNode(b) - scoreNode(a);
          if (scoreDiff !== 0) return scoreDiff;
          return String(a.data?.label || a.id).localeCompare(
            String(b.data?.label || b.id),
          );
        });
        const rowIndex = ordered.findIndex((n) => n.id === node.id);
        const offset = (maxInTier - group.length) / 2;
        const x =
          140 +
          Math.max(0, rowIndex + offset) * nodeSpacingX +
          (endGap && rowIndex === group.length - 1 ? nodeSpacingX : 0);
        const y = 120 + tierIndex * layerGap;
        return {
          ...node,
          position: { x, y },
        };
      });
    },
    [],
  );

  const autoLayout = useCallback(() => {
    setNodes(
      computeLayoutNodes(nodes, edges, topoType, topoParams, {
        endGap: layoutEndGap,
      }),
    );
  }, [
    computeLayoutNodes,
    edges,
    layoutEndGap,
    nodes,
    setNodes,
    topoParams,
    topoType,
  ]);

  const normalizeEdges = useCallback((inputEdges: AppEdge[]): AppEdge[] => {
    const mapHandle = (value: string | undefined | null, role: "source" | "target"): string => {
      if (!value) return role === "source" ? "bottom-out" : "top-in";
      if (value.endsWith("-out") || value.endsWith("-in")) return value;
      if (["left", "right", "top", "bottom"].includes(value)) {
        return `${value}-${role === "source" ? "out" : "in"}`;
      }
      return value;
    };

    return inputEdges.map((edge) => ({
      ...edge,
      sourceHandle: mapHandle(edge.sourceHandle, "source") as HandlePosition,
      targetHandle: mapHandle(edge.targetHandle, "target") as HandlePosition,
    }));
  }, []);

  const loadTopology = useCallback(
    async (id: number | null): Promise<void> => {
      if (!id) return;
      setStatus("loading");
      try {
        const res = await fetch(`/api/topologies/${id}`);
        const data: TopologyResponse = await res.json();
        setName(data.name || t("Default"));
        setTopoType(data.topo_type || "custom");
        setTopoParams(data.topo_params || {});
        const nextNodes = data.nodes || [];
        const nextEdges = normalizeEdges(data.edges || []);
        const isNonTree = NON_TREE_TYPES.has(data.topo_type);
        const withLayout = nextNodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            layout: node.data?.layout || (isNonTree ? "grid" : "tree"),
          },
        }));
        if (data.topo_type && data.topo_type !== "custom") {
          setNodes(
            computeLayoutNodes(
              withLayout,
              nextEdges,
              data.topo_type,
              data.topo_params,
            ),
          );
        } else {
          setNodes(withLayout);
        }
        setEdges(nextEdges);
        setSelected(null);
        setStatus("ready");
        setLastSaved(new Date());
        historyRef.current = { past: [], future: [] };
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    },
    [computeLayoutNodes, normalizeEdges, setEdges, setNodes, t],
  );

  const loadTopologies = useCallback(async (): Promise<void> => {
    setStatus("loading");
    try {
      const res = await fetch("/api/topologies");
      if (!res.ok) {
        throw new Error(`Failed to load topologies: ${res.status}`);
      }
      const data: TopologySummary[] = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid topology list payload");
      }
      setTopologies(data);
      const nextId = data?.[0]?.id;
      if (nextId) {
        setActiveId(nextId);
        await loadTopology(nextId);
      } else {
        setStatus("ready");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [loadTopology]);

  useEffect(() => {
    loadTopologies();
  }, [loadTopologies]);

  const saveTopology = useCallback(async (): Promise<void> => {
    if (!activeId) return;
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
    setStatus("saving");
    try {
      const res = await fetch(`/api/topologies/${activeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          topo_type: topoType,
          topo_params: topoParams,
          nodes,
          edges,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const savedAt = new Date();
      statusTimerRef.current = setTimeout(() => {
        setStatus("ready");
        setLastSaved(savedAt);
        statusTimerRef.current = null;
      }, 1200) as unknown as number;
      setTopologies((items) =>
        items.map((item) => (item.id === activeId ? { ...item, name } : item)),
      );
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [activeId, name, topoParams, topoType, nodes, edges]);

  useEffect(() => {
    if (status === "loading") return;
    const handle = setTimeout(() => {
      saveTopology();
    }, 800);
    return () => clearTimeout(handle);
  }, [name, nodes, edges, saveTopology, status]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, label: "link" }, eds)),
    [setEdges],
  );

  const addNode = (kind: NodeKind = "rack"): void => {
    const id = `node-${Date.now()}`;
    const config = KIND_CONFIG[kind] || KIND_CONFIG.rack;
    const next: AppNode = {
      id,
      type: "custom",
      position: { x: 100 + nodes.length * 40, y: 100 + nodes.length * 30 },
      data: {
        label: `${config.label} ${nodes.length + 1}`,
        kind,
        tier: DEFAULT_TIER[kind],
        splitCount: kind === "patch" ? 8 : undefined,
        layout: "tree",
      },
    };
    setNodes((nds) => nds.concat(next));
  };

  const addCustomBatch = (): void => {
    const count = Math.max(1, Number(customCount) || 1);
    const tier = Math.max(1, Number(customTier) || 1);
    const kind = customKind || "switch";
    const splitCount =
      kind === "patch" ? Math.max(2, Math.min(64, Number(customSplit) || 8)) : undefined;
    const baseNodes = nodesRef.current;
    const baseIndex = baseNodes.filter(
      (node) => node.data?.kind === kind,
    ).length;
    const stamp = Date.now();
    const nextNodes: AppNode[] = [];
    for (let i = 0; i < count; i += 1) {
      const id = `node-${stamp}-${i}`;
      nextNodes.push({
        id,
        type: "custom",
        position: {
          x: 120 + (baseNodes.length + i) * 30,
          y: 120 + (baseNodes.length + i) * 20,
        },
        data: {
          label: `${KIND_CONFIG[kind]?.label || kind} ${baseIndex + i + 1}`,
          kind,
          tier,
          splitCount,
          layout: "tree",
        },
      });
    }
    setNodes((nds) => nds.concat(nextNodes));

    const lowerTier = Math.max(
      ...baseNodes
        .map((node) => node.data?.tier)
        .filter((t) => typeof t === "number" && t < tier),
      -Infinity,
    );
    if (!Number.isFinite(lowerTier)) return;
    const lowerNodes = baseNodes.filter(
      (node) => node.data?.tier === lowerTier,
    );
    if (!lowerNodes.length) return;
    const newEdges: AppEdge[] = [];
    for (const newNode of nextNodes) {
      for (const target of lowerNodes) {
        newEdges.push({
          id: `e-custom-${newNode.id}-${target.id}`,
          source: newNode.id,
          target: target.id,
          sourceHandle: "bottom-out",
          targetHandle: "top-in",
          label: topoParams.edge_label ?? "link",
        });
      }
    }
    setEdges((eds) => eds.concat(newEdges));
  };

  const refreshTopologies = useCallback(async () => {
    try {
      const res = await fetch("/api/topologies");
      const data = await res.json();
      setTopologies(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const createTopology = async () => {
    const nextName = window.prompt(t("Topology name"), t("Untitled"));
    if (!nextName) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/topologies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nextName,
          topo_type: "custom",
          topo_params: {},
          nodes: [],
          edges: [],
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const data = await res.json();
      await refreshTopologies();
      setActiveId(data.id);
      await loadTopology(data.id);
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const deleteTopology = async () => {
    if (!activeId) return;
    const ok = window.confirm(t("Delete this topology?"));
    if (!ok) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/topologies/${activeId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      const resList = await fetch("/api/topologies");
      const data = await resList.json();
      setTopologies(data);
      const nextId = data?.[0]?.id;
      setActiveId(nextId || null);
      if (nextId) {
        await loadTopology(nextId);
      } else {
        setName(t("Untitled"));
        setNodes([]);
        setEdges([]);
        setSelected(null);
        setStatus("ready");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const selectTopology = async (id: number): Promise<void> => {
    if (!id || id === activeId) return;
    setActiveId(id);
    await loadTopology(id);
  };

  const selectTopologyNullable = async (id: number | null): Promise<void> => {
    if (id === null) return;
    await selectTopology(id);
  };

  const exportJson = (): void => {
    const payload = {
      name,
      topo_type: topoType,
      topo_params: topoParams,
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name || "topology"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const addNodeBatch = (
    kind: NodeKind,
    tier: number,
    count: number,
    splitCount?: number,
  ): void => {
    const resolvedSplit =
      kind === "patch"
        ? Math.max(2, Math.min(64, Number(splitCount) || 8))
        : undefined;
    for (let i = 0; i < count; i++) {
      const id = `${kind}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNode: AppNode = {
        id,
        type: "custom-tree",
        position: { x: 200 + i * 20, y: 200 + i * 20 },
        data: {
          label: `${kind.charAt(0).toUpperCase() + kind.slice(1)} ${nodes.length + i + 1}`,
          kind,
          tier,
          splitCount: resolvedSplit,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    }
  };

  const loadFromJson = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data: Partial<TopologyResponse> = JSON.parse(text);
      if (!data.nodes || !data.edges) {
        throw new Error("Invalid JSON: missing nodes/edges");
      }
      const nextType = data.topo_type || "custom";
      const nextParams = data.topo_params || {};
      setTopoType(nextType);
      setTopoParams(nextParams);
      setName(data.name || name);
      const nextEdges = normalizeEdges((data.edges || []) as AppEdge[]);
      const isNonTree = NON_TREE_TYPES.has(nextType);
      const withLayout = (data.nodes || []).map((node: AppNode) => ({
        ...node,
        data: {
          ...node.data,
          layout: node.data?.layout || (isNonTree ? "grid" : "tree"),
        },
      }));
      setNodes(
        nextType !== "custom"
          ? computeLayoutNodes(withLayout, nextEdges, nextType, nextParams)
          : withLayout,
      );
      setEdges(nextEdges);
      setStatus("ready");
      setLastSaved(new Date());
    } catch (err) {
      console.error(err);
      setStatus("error");
      window.alert(t("Failed to load JSON. Check console for details."));
    } finally {
      event.target.value = "";
    }
  };

  const exportPng = async () => {
    const instance = reactFlowInstanceRef.current;
    const wrapper = reactFlowWrapperRef.current;
    if (!instance || !wrapper) return;
    const nodes = instance.getNodes();
    if (!nodes.length) return;

    const bounds = getNodesBounds(nodes);
    const imageWidth = Math.max(400, Math.ceil(bounds.width + 200));
    const imageHeight = Math.max(300, Math.ceil(bounds.height + 200));
    const viewport = getViewportForBounds(
      bounds,
      imageWidth,
      imageHeight,
      0.1,
      2,
      0.2,
    );
    const viewportEl = wrapper.querySelector(".react-flow__viewport");
    if (!viewportEl || !(viewportEl instanceof HTMLElement)) return;
    const prevTransform = viewportEl.style.transform;
    const prevWidth = viewportEl.style.width;
    const prevHeight = viewportEl.style.height;

    try {
      viewportEl.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
      viewportEl.style.width = `${imageWidth}px`;
      viewportEl.style.height = `${imageHeight}px`;

      const dataUrl = await toPng(viewportEl, {
        width: imageWidth,
        height: imageHeight,
        backgroundColor: "#ffffff",
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${name || "topology"}.png`;
      link.click();
    } catch (err) {
      console.error(err);
      window.alert(t("Failed to export PNG. Check console for details."));
    } finally {
      viewportEl.style.transform = prevTransform;
      viewportEl.style.width = prevWidth;
      viewportEl.style.height = prevHeight;
    }
  };

  const generateTopology = async () => {
    if (!activeId) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/topologies/${activeId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topo_type: topoType, params: topoParams, name }),
      });
      if (!res.ok) throw new Error("Generate failed");
      const data = await res.json();
      setName(data.name || t("Default"));
      setTopoType(data.topo_type || "custom");
      setTopoParams(data.topo_params || {});
      const nextNodes = data.nodes || [];
      const isNonTree = NON_TREE_TYPES.has(data.topo_type);
      const withLayout = nextNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          layout: node.data?.layout || (isNonTree ? "grid" : "tree"),
        },
      }));
      const nextEdges = normalizeEdges(data.edges || []);
      setNodes(
        computeLayoutNodes(
          withLayout,
          nextEdges,
          data.topo_type,
          data.topo_params,
        ),
      );
      setEdges(nextEdges);
      setStatus("ready");
      setLastSaved(new Date());
      historyRef.current = { past: [], future: [] };
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const updateParam = (key, value) => {
    setTopoParams((prev) => ({ ...prev, [key]: value }));
  };

  const makeSnapshot = useCallback(() => {
    return {
      name,
      topoType,
      topoParams,
      nodes,
      edges,
    };
  }, [edges, name, nodes, topoParams, topoType]);

  const applySnapshot = useCallback(
    (snapshot) => {
      suppressHistoryRef.current = true;
      setName(snapshot.name);
      setTopoType(snapshot.topoType);
      setTopoParams(snapshot.topoParams);
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setTimeout(() => {
        suppressHistoryRef.current = false;
      }, 0);
    },
    [setEdges, setNodes],
  );

  const pushHistory = useCallback(() => {
    if (suppressHistoryRef.current) return;
    const snapshot = makeSnapshot();
    const past = historyRef.current.past;
    const last = past[past.length - 1];
    const same =
      last &&
      JSON.stringify(last.nodes) === JSON.stringify(snapshot.nodes) &&
      JSON.stringify(last.edges) === JSON.stringify(snapshot.edges) &&
      last.name === snapshot.name &&
      last.topoType === snapshot.topoType &&
      JSON.stringify(last.topoParams) === JSON.stringify(snapshot.topoParams);
    if (same) return;
    past.push(snapshot);
    if (past.length > 50) past.shift();
    historyRef.current.future = [];
  }, [makeSnapshot]);

  const undo = useCallback(() => {
    const past = historyRef.current.past;
    if (past.length < 2) return;
    const current = past.pop();
    if (current) historyRef.current.future.push(current);
    const prev = past[past.length - 1];
    if (prev) applySnapshot(prev);
  }, [applySnapshot]);

  const redo = useCallback(() => {
    const future = historyRef.current.future;
    if (future.length === 0) return;
    const next = future.pop();
    if (!next) return;
    historyRef.current.past.push(next);
    applySnapshot(next);
  }, [applySnapshot]);

  const renderKindSelect = (value, onChange) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="switch">{t("Switch")}</option>
      <option value="rack">{t("Rack")}</option>
      <option value="server">{t("Server")}</option>
      <option value="asic">{t("ASIC")}</option>
      <option value="patch">{t("Patch Panel")}</option>
    </select>
  );

  const removeSelection = () => {
    if (!hasSelection) return;
    if (selectedType === "node") {
      setNodes((nds) => nds.filter((n) => n.id !== selectedId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== selectedId && e.target !== selectedId),
      );
    }
    if (selectedType === "edge") {
      setEdges((eds) => eds.filter((e) => e.id !== selectedId));
    }
    setSelected(null);
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      pushHistory();
    }, 250);
    return () => clearTimeout(handle);
  }, [edges, name, nodes, topoParams, topoType, pushHistory]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (isInput) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, removeSelection, undo]);

  const updateLabel = (value) => {
    if (!hasSelection) return;
    if (selectedType === "node") {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedId ? { ...n, data: { ...n.data, label: value } } : n,
        ),
      );
    }
    if (selectedType === "edge") {
      setEdges((eds) =>
        eds.map((e) => (e.id === selectedId ? { ...e, label: value } : e)),
      );
    }
  };

  const selectionLabel = useMemo(() => {
    if (!hasSelection) return "";
    if (selectedType === "node") {
      const node = nodes.find((n) => n.id === selectedId);
      return node?.data?.label || "";
    }
    if (selectedType === "edge") {
      const edge = edges.find((e) => e.id === selectedId);
      return edge?.label || "";
    }
    return "";
  }, [edges, nodes, selectedId, selectedType, hasSelection]);

  const selectionKind = useMemo(() => {
    if (!hasSelection || selectedType !== "node") return "";
    const node = nodes.find((n) => n.id === selectedId);
    return node?.data?.kind || "rack";
  }, [hasSelection, nodes, selectedId, selectedType]);

  const updateKind = (value) => {
    if (!hasSelection || selectedType !== "node") return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId ? { ...n, data: { ...n.data, kind: value } } : n,
      ),
    );
  };

  const selectionSplit = useMemo(() => {
    if (!hasSelection || selectedType !== "node") return 2;
    const node = nodes.find((n) => n.id === selectedId);
    return node?.data?.splitCount ?? 2;
  }, [hasSelection, nodes, selectedId, selectedType]);

  const updateSplit = (value) => {
    if (!hasSelection || selectedType !== "node") return;
    const next = Math.max(2, Math.min(64, Number(value) || 2));
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId
          ? { ...n, data: { ...n.data, splitCount: next } }
          : n,
      ),
    );
  };

  const selectionTier = useMemo(() => {
    if (!hasSelection || selectedType !== "node") return DEFAULT_TIER.server;
    const node = nodes.find((n) => n.id === selectedId);
    const kind = node?.data?.kind || "server";
    return (
      node?.data?.tier ?? DEFAULT_TIER[kind] ?? DEFAULT_TIER.server
    );
  }, [hasSelection, nodes, selectedId, selectedType]);

  const updateTier = (value) => {
    if (!hasSelection || selectedType !== "node") return;
    const nextTier = Number(value);
    if (Number.isNaN(nextTier)) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId ? { ...n, data: { ...n.data, tier: nextTier } } : n,
      ),
    );
  };

  return (
    <div className={`app-shell ${viewMode === "present" ? "present-mode" : ""}`}>
      {viewMode === "edit" && (
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} locale={locale} status={status} lastSaved={lastSaved}>
        <SidebarSection
          id="workspace"
          title="Workspace"
          titleZhTW="工作區"
          icon="📁"
          expanded={expandedSections.has("workspace")}
          onToggle={() => toggleSection("workspace")}
          locale={locale}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={() => setSidebarOpen(true)}
        >
          <WorkspaceSection
            locale={locale}
            topologies={topologies}
            activeId={activeId}
            name={name}
            onLoadTopology={selectTopologyNullable}
            onNameChange={setName}
            onNewTopology={createTopology}
            onSaveTopology={saveTopology}
            onDeleteTopology={deleteTopology}
            onLoadFromJson={loadFromJson}
            onExportJson={exportJson}
          />
        </SidebarSection>

        <SidebarSection
          id="layout"
          title="Layout"
          titleZhTW="布局控制"
          icon="📐"
          expanded={expandedSections.has("layout")}
          onToggle={() => toggleSection("layout")}
          locale={locale}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={() => setSidebarOpen(true)}
        >
          <LayoutSection
            locale={locale}
            layerGap={topoParams.layerGap ?? 180}
            endGap={layoutEndGap}
            onAutoLayout={autoLayout}
            onUndo={undo}
            onRedo={redo}
            onLayerGapChange={(value) => updateParam("layerGap", value)}
            onEndGapChange={setLayoutEndGap}
            canUndo={historyRef.current.past.length > 0}
            canRedo={historyRef.current.future.length > 0}
          />
        </SidebarSection>

        <SidebarSection
          id="generator"
          title="Generator"
          titleZhTW="拓撲生成器"
          icon="🎨"
          expanded={expandedSections.has("generator")}
          onToggle={() => toggleSection("generator")}
          locale={locale}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={() => setSidebarOpen(true)}
        >
          <GeneratorSection
            locale={locale}
            topoType={topoType}
            topoParams={topoParams}
            customKind={customKind}
            customTier={customTier}
            customCount={customCount}
            customSplit={customSplit}
            onTopoTypeChange={setTopoType}
            onParamChange={updateParam}
            onCustomKindChange={setCustomKind}
            onCustomTierChange={setCustomTier}
            onCustomCountChange={setCustomCount}
            onCustomSplitChange={setCustomSplit}
            onAddCustomBatch={addCustomBatch}
          />
        </SidebarSection>

        <SidebarSection
          id="addNodes"
          title="Add Nodes"
          titleZhTW="新增節點"
          icon="➕"
          expanded={expandedSections.has("addNodes")}
          onToggle={() => toggleSection("addNodes")}
          locale={locale}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={() => setSidebarOpen(true)}
        >
          <AddNodesSection
            locale={locale}
            onAddNode={addNode}
            onAddCustomNodes={addNodeBatch}
          />
        </SidebarSection>

        <SidebarSection
          id="nodesList"
          title="Nodes"
          titleZhTW="節點列表"
          icon="📋"
          badge={nodes.length}
          expanded={expandedSections.has("nodesList")}
          onToggle={() => toggleSection("nodesList")}
          locale={locale}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={() => setSidebarOpen(true)}
        >
          <NodesListSection
            locale={locale}
            nodes={nodes}
            selectedNodeId={selected?.type === "node" ? selected.id : null}
            onSelectNode={(id) => setSelected({ type: "node", id })}
          />
        </SidebarSection>

        <SidebarSection
          id="settings"
          title="Settings"
          titleZhTW="設定"
          icon="🔧"
          expanded={expandedSections.has("settings")}
          onToggle={() => toggleSection("settings")}
          locale={locale}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={() => setSidebarOpen(true)}
        >
          <SettingsSection
            locale={locale}
            theme={theme}
            viewMode={viewMode}
            onLocaleChange={setLocale}
            onThemeChange={setTheme}
            onViewModeChange={setViewMode}
          />
        </SidebarSection>
      </Sidebar>
      )}

      <div className="canvas-container">
        <button
          className="btn ghost view-mode-toggle"
          onClick={() => setViewMode(viewMode === "edit" ? "present" : "edit")}
          title={viewMode === "edit" ? t("Present") : t("Edit")}
        >
          {viewMode === "edit" ? t("Present") : t("Edit")}
        </button>
        <ReactFlow
          nodes={renderNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={handleSelectionChange}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance;
          }}
          fitView
          defaultViewport={defaultViewport}
        >
          {viewMode === "edit" && <MiniMap />}
          {viewMode === "edit" && <Controls />}
          {viewMode === "edit" && <Background gap={18} size={1} />}
        </ReactFlow>

        {viewMode === "edit" && selected && (
          <Inspector
            selected={selected}
            nodes={nodes}
            edges={edges}
            locale={locale}
            onUpdateNode={(id, updates) => {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === id ? { ...n, data: { ...n.data, ...updates } } : n
                )
              );
            }}
            onUpdateEdge={(id, updates) => {
              setEdges((eds) =>
                eds.map((e) => (e.id === id ? { ...e, ...updates } : e))
              );
            }}
            onDelete={removeSelection}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}
