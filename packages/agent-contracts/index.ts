export type Operation =
  | "createProject"
  | "readProject"
  | "updateFile"
  | "createComponent"
  | "removeComponent"
  | "createEffect"
  | "updateEffect"
  | "createControl"
  | "updateControl"
  | "runPreview"
  | "exportEffect";
export interface AgentRequest {
  id: string;
  operation: Operation;
  projectId: string;
  payload: unknown;
  expectedRevision?: number;
}
export interface AgentResult {
  id: string;
  ok: boolean;
  error?: string;
  data?: unknown;
}
