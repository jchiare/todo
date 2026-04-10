// ── Agent types — no framework dependencies ──

export type TraceEvent = {
  node: string;
  status: "success" | "error";
  startedAt: number;
  durationMs: number;
  error?: string;
  tokensUsed?: number;
};

export type FieldMapping = {
  text_fields?: Record<string, unknown>;
  checkbox_fields?: Record<string, unknown>;
  radio_fields?: Record<string, unknown>;
  dropdown_fields?: Record<string, unknown>;
  missing_fields?: unknown;
};

export type FillPdfResult = {
  storageId: string;
  filename: string;
  missingFields: string[];
  invalidFields: string[];
  skippedFields: string[];
  traceEvents: TraceEvent[];
  fieldMapping: FieldMapping | null;
};

export type PdfFillGraphInput = {
  taskLabel: string;
  profileStr: string;
  convoStr: string;
};

export type ClarificationResult = {
  title: string;
  ready: boolean;
  message: string;
  learned_facts: { fact: string; category: string }[];
};

export type TaskBreakdownResult = {
  tasks: {
    text: string;
    detail: string;
    subtasks: string[];
    agent_action: "" | "fill_pdf";
  }[];
  notices: { label: string; value: string }[];
  summary: string;
  learned_facts: { fact: string; category: string }[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
