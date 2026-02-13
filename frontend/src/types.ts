import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from "reactflow";

// ============================================================================
// Node & Edge Types
// ============================================================================

/**
 * Node kinds representing different network component types
 */
export type NodeKind = "rack" | "switch" | "server" | "asic" | "patch";

/**
 * Node layout modes
 */
export type NodeLayout = "tree" | "grid";

/**
 * Custom node data structure
 */
export interface CustomNodeData {
  label: string;
  kind: NodeKind;
  tier: number;
  splitCount?: number; // Only for patch panels (2-64)
  layout?: NodeLayout;
}

/**
 * Handle positions for connections
 */
export type HandlePosition =
  | "top-out"
  | "bottom-out"
  | "left-out"
  | "right-out"
  | "top-in"
  | "bottom-in"
  | "left-in"
  | "right-in";

/**
 * Application node type extending ReactFlow's Node
 */
export type AppNode = ReactFlowNode<CustomNodeData>;

/**
 * Application edge type - using ReactFlow's Edge type directly
 */
export type AppEdge = ReactFlowEdge;

// ============================================================================
// Topology Types
// ============================================================================

/**
 * All supported topology types
 */
export type TopologyType =
  | "custom"
  | "leaf-spine"
  | "fat-tree"
  | "three-tier"
  | "expanded-clos"
  | "core-and-pod"
  | "torus-2d"
  | "torus-3d"
  | "dragonfly"
  | "butterfly"
  | "mesh"
  | "ring"
  | "star";

/**
 * Base parameters common to all topologies
 */
interface BaseTopologyParams {
  layerGap?: number;
  nodeSpacingX?: number;
  nodeSpacingY?: number;
  edge_label?: string;
}

/**
 * Leaf-Spine topology parameters
 */
interface LeafSpineParams extends BaseTopologyParams {
  spines?: number;
  spine_kind?: NodeKind;
  leaves?: number;
  leaf_kind?: NodeKind;
}

/**
 * Fat-Tree topology parameters
 */
interface FatTreeParams extends BaseTopologyParams {
  k?: number; // Must be even
  core_kind?: NodeKind;
  agg_kind?: NodeKind;
  edge_kind?: NodeKind;
}

/**
 * Three-Tier topology parameters
 */
interface ThreeTierParams extends BaseTopologyParams {
  core?: number;
  core_kind?: NodeKind;
  aggregation?: number;
  agg_kind?: NodeKind;
  access?: number;
  access_kind?: NodeKind;
}

/**
 * Expanded Clos topology parameters
 */
interface ExpandedClosParams extends BaseTopologyParams {
  tiers?: number;
  nodes_per_tier?: number;
  kind?: NodeKind;
}

/**
 * Core-and-Pod topology parameters
 */
interface CoreAndPodParams extends BaseTopologyParams {
  cores?: number;
  core_kind?: NodeKind;
  pods?: number;
  pod_leaves?: number;
  leaf_kind?: NodeKind;
  pod_aggs?: number;
  agg_kind?: NodeKind;
}

/**
 * 2D Torus topology parameters
 */
interface Torus2DParams extends BaseTopologyParams {
  rows?: number;
  cols?: number;
  kind?: NodeKind;
}

/**
 * 3D Torus topology parameters
 */
interface Torus3DParams extends BaseTopologyParams {
  x?: number;
  y?: number;
  z?: number;
  kind?: NodeKind;
  layerGap3d?: number;
}

/**
 * Dragonfly topology parameters
 */
interface DragonflyParams extends BaseTopologyParams {
  groups?: number;
  routers_per_group?: number;
  kind?: NodeKind;
  groupGapX?: number;
}

/**
 * Butterfly topology parameters
 */
interface ButterflyParams extends BaseTopologyParams {
  stages?: number;
  width?: number;
  kind?: NodeKind;
}

/**
 * Mesh topology parameters
 */
interface MeshParams extends BaseTopologyParams {
  rows?: number;
  cols?: number;
  kind?: NodeKind;
}

/**
 * Ring topology parameters
 */
interface RingParams extends BaseTopologyParams {
  count?: number;
  kind?: NodeKind;
}

/**
 * Star topology parameters
 */
interface StarParams extends BaseTopologyParams {
  count?: number;
  kind?: NodeKind;
}

/**
 * Generic params object - since the app uses dynamic param updates
 * This is a union of all possible topology parameters
 */
export type TopologyParamsMap = Partial<
  BaseTopologyParams &
    LeafSpineParams &
    FatTreeParams &
    ThreeTierParams &
    ExpandedClosParams &
    CoreAndPodParams &
    Torus2DParams &
    Torus3DParams &
    DragonflyParams &
    ButterflyParams &
    MeshParams &
    RingParams &
    StarParams
>;

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Topology summary from GET /api/topologies
 */
export interface TopologySummary {
  id: number;
  name: string;
  updated_at: string;
}

/**
 * Full topology data from GET/PUT /api/topologies/:id
 */
export interface TopologyResponse {
  id: number;
  name: string;
  topo_type: TopologyType;
  topo_params: TopologyParamsMap;
  nodes: AppNode[];
  edges: AppEdge[];
  updated_at: string;
}

/**
 * Request body for topology generation
 */
export interface GenerateTopologyRequest {
  topo_type: TopologyType;
  params: TopologyParamsMap;
  name: string;
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Application status states
 */
export type AppStatus = "idle" | "loading" | "saving" | "ready" | "error";

/**
 * Active tab in the UI
 */
export type ActiveTab = "topology" | "nodes";

/**
 * Selection type
 */
export interface Selection {
  type: "node" | "edge";
  id: string;
}

/**
 * History snapshot for undo/redo
 */
export interface HistorySnapshot {
  name: string;
  topoType: TopologyType;
  topoParams: TopologyParamsMap;
  nodes: AppNode[];
  edges: AppEdge[];
}

/**
 * History state
 */
export interface HistoryState {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
}

/**
 * Locale types
 */
export type Locale = "en" | "zh-TW";

/**
 * Theme types
 */
export type Theme = "light" | "dark";

/**
 * Translation function type
 */
export type TranslationFunction = (
  text: string,
  vars?: Record<string, string | number>
) => string;

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Custom node component props
 */
export interface CustomNodeProps {
  data: CustomNodeData;
}

/**
 * Layout computation options
 */
export interface LayoutOptions {
  endGap?: boolean;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Kind configuration for visual styling
 */
export interface KindConfig {
  label: string;
  color: string;
}

/**
 * Complete kind configuration map
 */
export type KindConfigMap = Record<NodeKind, KindConfig>;

/**
 * Default tier assignments
 */
export type DefaultTierMap = Record<NodeKind, number>;

// ============================================================================
// Sidebar Types
// ============================================================================

/**
 * Sidebar section identifiers
 */
export type SidebarSectionId =
  | "workspace"
  | "generator"
  | "addNodes"
  | "nodesList"
  | "layout"
  | "settings";

/**
 * Sidebar state
 */
export interface SidebarState {
  open: boolean;
  expandedSections: Set<SidebarSectionId>;
}

/**
 * Sidebar section component props
 */
export interface SidebarSectionProps {
  id: SidebarSectionId;
  title: string;
  titleZhTW: string;
  icon: string;
  badge?: string | number;
  expanded: boolean;
  onToggle: () => void;
  locale: Locale;
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  children: React.ReactNode;
}

/**
 * Main sidebar component props
 */
export interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  locale: Locale;
  status?: AppStatus;
  lastSaved?: Date | null;
  children: React.ReactNode;
}
