import type { AssetDefinition } from "../../assets/types";

export type SerializableVector3 = readonly [number, number, number];
export type SerializableQuaternion = readonly [number, number, number, number];

export interface SerializableTransform {
  readonly position: SerializableVector3;
  readonly quaternion: SerializableQuaternion;
  readonly scale: SerializableVector3;
}

export interface SerializableBox3 {
  readonly min: SerializableVector3;
  readonly max: SerializableVector3;
}

export interface CameraSnapshot {
  readonly position: SerializableVector3;
  readonly target: SerializableVector3;
  readonly fov: number;
}

export interface OverlayState {
  readonly wireframe: boolean;
  readonly bounds: boolean;
  readonly sockets: boolean;
  readonly colliders: boolean;
  readonly axes: boolean;
}

export interface EditorPartSelection {
  readonly nodePath: readonly string[];
  readonly nodeName: string;
  readonly partKey: string;
  readonly localTransform: SerializableTransform;
  readonly worldBounds: SerializableBox3;
}

export interface EditorSelection {
  readonly assetId: string;
  readonly category: AssetDefinition["category"];
  readonly sourceFiles: readonly string[];
  readonly focusedTests: readonly string[];
  readonly part: EditorPartSelection | null;
  readonly camera: CameraSnapshot;
  readonly overlays: OverlayState;
  readonly capturePath?: string;
}

export type EditMode = "plan" | "apply";

export type EditStatus =
  | "context-ready"
  | "planning"
  | "awaiting-approval"
  | "applying"
  | "reloading"
  | "verifying"
  | "completed"
  | "failed"
  | "cancelled";

export interface ValidationTarget {
  readonly id: "focused" | "lint" | "unit" | "build" | "e2e";
  readonly label: string;
}

export interface ResourceEditRequest {
  readonly requestId: string;
  readonly sessionId?: string;
  readonly instruction: string;
  readonly selection: EditorSelection;
  readonly mode: EditMode;
  readonly allowedWriteRoots: readonly string[];
  readonly validation: readonly ValidationTarget[];
}

export interface ApprovalRequestView {
  readonly approvalId: string;
  readonly requestId: string;
  readonly reason: string;
  readonly target: string;
  readonly options: readonly { readonly optionId: string; readonly label: string; readonly kind: string }[];
  readonly expiresAt: string;
}

export interface ValidationResultView {
  readonly id: ValidationTarget["id"];
  readonly label: string;
  readonly status: "running" | "passed" | "failed" | "cancelled";
  readonly durationMs?: number;
  readonly output?: string;
}

export type EditorHostEvent =
  | { readonly type: "connected"; readonly agent: "idle" | "connecting" | "ready" | "error"; readonly sessionId?: string }
  | { readonly type: "status"; readonly requestId: string; readonly status: EditStatus; readonly message: string }
  | { readonly type: "message"; readonly requestId: string; readonly role: "agent" | "thought"; readonly text: string }
  | { readonly type: "plan"; readonly requestId: string; readonly entries: readonly { readonly content: string; readonly status: string }[] }
  | { readonly type: "tool"; readonly requestId: string; readonly title: string; readonly status: string; readonly kind?: string }
  | { readonly type: "usage"; readonly requestId: string; readonly used: number; readonly size: number }
  | { readonly type: "approval"; readonly requestId: string; readonly approval: ApprovalRequestView }
  | { readonly type: "diff"; readonly requestId: string; readonly file: string; readonly patch: string }
  | { readonly type: "validation"; readonly requestId: string; readonly result: ValidationResultView }
  | { readonly type: "error"; readonly requestId?: string; readonly message: string };

export const DEFAULT_OVERLAYS: OverlayState = {
  wireframe: false,
  bounds: true,
  sockets: true,
  colliders: false,
  axes: false,
};

export const DEFAULT_VALIDATION: readonly ValidationTarget[] = [
  { id: "focused", label: "관련 테스트" },
  { id: "lint", label: "ESLint" },
  { id: "unit", label: "전체 단위 테스트" },
  { id: "build", label: "프로덕션 빌드" },
];
