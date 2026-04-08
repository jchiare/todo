"use node";

import { Id } from "../_generated/dataModel";
import { PDFDocument } from "pdf-lib";
import OpenAI from "openai";
import { traceable } from "langsmith/traceable";
import { wrapOpenAI } from "langsmith/wrappers";
import { END, START, StateGraph } from "@langchain/langgraph";

const WEB_SEARCH_TOOL: OpenAI.Responses.WebSearchTool = { type: "web_search" };

class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentError";
  }
}

// ── Types ──

type FieldInfo = {
  name: string;
  type: string;
};

type FieldMapping = {
  text_fields?: Record<string, unknown>;
  checkbox_fields?: Record<string, unknown>;
  radio_fields?: Record<string, unknown>;
  dropdown_fields?: Record<string, unknown>;
  missing_fields?: unknown;
};

export type TraceEvent = {
  node: string;
  status: "success" | "error";
  startedAt: number;
  durationMs: number;
  error?: string;
  tokensUsed?: number;
};

export type FillPdfResult = {
  storageId: Id<"_storage">;
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

type PdfFillState = {
  taskLabel: string;
  profileStr: string;
  convoStr: string;
  pdfUrl: string;
  filename: string;
  failedUrls: string[];
  downloadAttempts: number;
  pdfBytes: ArrayBuffer | null;
  fieldInfo: FieldInfo[];
  mapping: FieldMapping | null;
  invalidFields: string[];
  skippedFields: string[];
  traceEvents: TraceEvent[];
  result: FillPdfResult | null;
};

// ── Helpers ──

function getClient() {
  return wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
}

function normalizePdfUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new PermanentError(`Invalid PDF URL: ${rawUrl}`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new PermanentError(`Unsupported URL protocol: ${parsed.protocol}`);
  }
  return parsed.toString();
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1", "checked"].includes(normalized)) return true;
    if (["false", "no", "0", "unchecked"].includes(normalized)) return false;
  }
  return Boolean(value);
}

function normalizeMissingFields(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/** Wrap a node function to record a TraceEvent in state. */
function withTracing<T extends PdfFillUpdate>(
  nodeName: string,
  fn: (state: PdfFillState) => Promise<T>
): (state: PdfFillState) => Promise<T & { traceEvents: TraceEvent[] }> {
  return async (state: PdfFillState) => {
    const startedAt = Date.now();
    try {
      const result = await fn(state);
      const event: TraceEvent = {
        node: nodeName,
        status: "success",
        startedAt,
        durationMs: Date.now() - startedAt,
        tokensUsed: (result as any)._tokensUsed,
      };
      delete (result as any)._tokensUsed;
      return {
        ...result,
        traceEvents: [...state.traceEvents, event],
      };
    } catch (err) {
      const event: TraceEvent = {
        node: nodeName,
        status: "error",
        startedAt,
        durationMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      };
      // Still record the event before re-throwing
      state.traceEvents.push(event);
      throw err;
    }
  };
}

type PdfFillUpdate = Partial<PdfFillState> & { _tokensUsed?: number };
type OpenAIClient = ReturnType<typeof getClient>;

// ── JSON Schemas for structured outputs ──

const URL_RESPONSE_SCHEMA = {
  name: "pdf_url_response",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      pdf_url: { type: "string" as const, description: "Direct download URL for the PDF" },
      filename: { type: "string" as const, description: "Descriptive filename ending in .pdf" },
    },
    required: ["pdf_url", "filename"],
    additionalProperties: false,
  },
};

const FIELD_MAPPING_SCHEMA = {
  name: "field_mapping_response",
  strict: false,
  schema: {
    type: "object" as const,
    properties: {
      text_fields: {
        type: "object" as const,
        additionalProperties: { type: "string" as const },
        description: "Text field name -> value",
      },
      checkbox_fields: {
        type: "object" as const,
        additionalProperties: { type: "boolean" as const },
        description: "Checkbox field name -> checked state",
      },
      radio_fields: {
        type: "object" as const,
        additionalProperties: { type: "string" as const },
        description: "Radio group name -> selected option",
      },
      dropdown_fields: {
        type: "object" as const,
        additionalProperties: { type: "string" as const },
        description: "Dropdown field name -> selected option",
      },
      missing_fields: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Plain-English descriptions of fields that could not be filled",
      },
    },
    required: ["text_fields", "checkbox_fields", "radio_fields", "dropdown_fields", "missing_fields"],
    additionalProperties: false,
  },
};

// ── Graph Nodes ──

const resolveUrlNode = traceable(
  async (state: PdfFillState, client: OpenAIClient): Promise<PdfFillUpdate> => {
    const urlResponse = await client.responses.create({
      model: "gpt-5.4",
      tools: [WEB_SEARCH_TOOL],
      input: [
        {
          role: "system",
          content: `Find the direct download URL for a fillable PDF form.

IMPORTANT: Use web search to find the CURRENT, working URL.

Task: ${state.taskLabel}`,
        },
      ],
      text: { format: { type: "json_schema", ...URL_RESPONSE_SCHEMA } },
    });

    const parsed = JSON.parse(urlResponse.output_text);
    const pdfUrl = typeof parsed.pdf_url === "string" ? parsed.pdf_url.trim() : "";
    const filename =
      typeof parsed.filename === "string" && parsed.filename.trim()
        ? parsed.filename.trim()
        : "filled-form.pdf";

    if (!pdfUrl) throw new PermanentError("No PDF URL determined");

    const tokensUsed = urlResponse.usage?.total_tokens;

    return {
      pdfUrl: normalizePdfUrl(pdfUrl),
      filename,
      _tokensUsed: tokensUsed,
    };
  },
  { name: "resolveUrl", run_type: "chain" }
);

const downloadPdfNode = traceable(
  async (state: PdfFillState): Promise<PdfFillUpdate> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(normalizePdfUrl(state.pdfUrl), {
        signal: controller.signal,
      });

      if (response.ok) {
        return { pdfBytes: await response.arrayBuffer() };
      }

      if (response.status >= 500) {
        throw new Error(`Failed to download PDF: ${response.status}`);
      }

      return {
        failedUrls: [...state.failedUrls, state.pdfUrl],
        downloadAttempts: state.downloadAttempts + 1,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
  { name: "downloadPdf", run_type: "tool" }
);

const retryUrlNode = traceable(
  async (state: PdfFillState, client: OpenAIClient): Promise<PdfFillUpdate> => {
    const retryResponse = await client.responses.create({
      model: "gpt-5.4",
      tools: [WEB_SEARCH_TOOL],
      input: [
        {
          role: "system",
          content: `The following PDF URLs all returned errors and are broken or outdated:
${state.failedUrls.map((u) => `- ${u}`).join("\n")}

Use web search to find the CURRENT, working download URL for this exact form. Do NOT suggest any of the URLs listed above.

Return ONLY the direct URL to the downloadable PDF, no other text.`,
        },
      ],
      text: { format: { type: "text" } },
    });

    const retryUrl = retryResponse.output_text
      .trim()
      .match(/https?:\/\/[^\s"'<>]+\.pdf[^\s"'<>]*/i);

    if (!retryUrl) {
      throw new PermanentError(
        `PDF not found after ${state.downloadAttempts} attempts. Tried URLs:\n${state.failedUrls.join("\n")}\nRetry could not find a new URL.`
      );
    }

    return {
      pdfUrl: normalizePdfUrl(retryUrl[0]),
      _tokensUsed: retryResponse.usage?.total_tokens,
    };
  },
  { name: "retryUrl", run_type: "chain" }
);

function downloadFailedNode(state: PdfFillState): never {
  throw new PermanentError(
    `PDF not found after 3 attempts. Tried URLs:\n${state.failedUrls.join("\n")}`
  );
}

const extractFieldsNode = traceable(
  async (state: PdfFillState): Promise<PdfFillUpdate> => {
    if (!state.pdfBytes) throw new PermanentError("No PDF bytes downloaded");

    const pdfDoc = await PDFDocument.load(state.pdfBytes);
    const form = pdfDoc.getForm();
    const fieldInfo = form.getFields().map((field) => ({
      name: field.getName(),
      type: field.constructor.name.replace("PDF", "").replace("Field", "").toLowerCase(),
    }));

    return { fieldInfo };
  },
  { name: "extractFields", run_type: "tool" }
);

const mapFieldsNode = traceable(
  async (state: PdfFillState, client: OpenAIClient): Promise<PdfFillUpdate> => {
    const mappingResponse = await client.responses.create({
      model: "gpt-5.4",
      input: [
        {
          role: "system",
          content: `You are filling out a PDF form. Here are the EXACT field names and types in the form:

${JSON.stringify(state.fieldInfo, null, 2)}

Fill in every field you can based on the user context below. Use the EXACT field names from the list above.

Rules:
- Use ONLY field names that appear in the list above — exact spelling, exact casing.
- For text fields, provide string values.
- For checkbox fields, use true to check or false to uncheck.
- For radio/dropdown fields, provide the option value as a string.
- Fill EVERY field where you have the information. Be thorough.
- For "missing_fields": describe fields you couldn't fill in plain English. Do NOT include sensitive fields (SSN, passport numbers, financial info).

User profile:
${state.profileStr}

Conversation:
${state.convoStr}

Task: ${state.taskLabel}`,
        },
      ],
      text: { format: { type: "json_schema", ...FIELD_MAPPING_SCHEMA } },
    });

    return {
      mapping: JSON.parse(mappingResponse.output_text) as FieldMapping,
      _tokensUsed: mappingResponse.usage?.total_tokens,
    };
  },
  { name: "mapFields", run_type: "chain" }
);

/** Validates that AI-returned field names actually exist in the PDF. */
const validateMappingNode = traceable(
  async (state: PdfFillState): Promise<PdfFillUpdate> => {
    const validNames = new Set(state.fieldInfo.map((f) => f.name));
    const mapping = state.mapping ?? {};
    const invalidFields: string[] = [];

    const allMappedNames = [
      ...Object.keys(mapping.text_fields ?? {}),
      ...Object.keys(mapping.checkbox_fields ?? {}),
      ...Object.keys(mapping.radio_fields ?? {}),
      ...Object.keys(mapping.dropdown_fields ?? {}),
    ];

    for (const name of allMappedNames) {
      if (!validNames.has(name)) {
        invalidFields.push(name);
      }
    }

    // Remove invalid fields from the mapping so we don't try to write them
    if (invalidFields.length > 0) {
      const clean = (obj: Record<string, unknown> | undefined) => {
        if (!obj) return obj;
        const result = { ...obj };
        for (const name of invalidFields) {
          delete result[name];
        }
        return result;
      };

      return {
        invalidFields,
        mapping: {
          text_fields: clean(mapping.text_fields as Record<string, unknown>),
          checkbox_fields: clean(mapping.checkbox_fields as Record<string, unknown>),
          radio_fields: clean(mapping.radio_fields as Record<string, unknown>),
          dropdown_fields: clean(mapping.dropdown_fields as Record<string, unknown>),
          missing_fields: mapping.missing_fields,
        },
      };
    }

    return { invalidFields: [] };
  },
  { name: "validateMapping", run_type: "tool" }
);

const fillAndStoreNode = traceable(
  async (
    state: PdfFillState,
    storeArtifact: (blob: Blob) => Promise<Id<"_storage">>
  ): Promise<PdfFillUpdate> => {
    if (!state.pdfBytes) throw new PermanentError("No PDF bytes to fill");

    const mapping = state.mapping ?? {};
    const pdfDoc = await PDFDocument.load(state.pdfBytes);
    const form = pdfDoc.getForm();
    const skippedFields: string[] = [];

    for (const [fieldName, value] of Object.entries(mapping.text_fields ?? {})) {
      try {
        form.getTextField(fieldName).setText(String(value ?? ""));
      } catch {
        skippedFields.push(`text:${fieldName}`);
      }
    }

    for (const [fieldName, value] of Object.entries(mapping.checkbox_fields ?? {})) {
      try {
        const field = form.getCheckBox(fieldName);
        if (toBoolean(value)) field.check();
        else field.uncheck();
      } catch {
        skippedFields.push(`checkbox:${fieldName}`);
      }
    }

    for (const [fieldName, value] of Object.entries(mapping.radio_fields ?? {})) {
      try {
        form.getRadioGroup(fieldName).select(String(value ?? ""));
      } catch {
        skippedFields.push(`radio:${fieldName}`);
      }
    }

    for (const [fieldName, value] of Object.entries(mapping.dropdown_fields ?? {})) {
      try {
        form.getDropdown(fieldName).select(String(value ?? ""));
      } catch {
        skippedFields.push(`dropdown:${fieldName}`);
      }
    }

    const filledBytes = await pdfDoc.save();
    const blob = new Blob([filledBytes as BlobPart], { type: "application/pdf" });
    const storageId = await storeArtifact(blob);

    return {
      skippedFields,
      result: {
        storageId,
        filename: state.filename || "filled-form.pdf",
        missingFields: normalizeMissingFields(mapping.missing_fields),
        invalidFields: state.invalidFields,
        skippedFields,
        traceEvents: state.traceEvents,
        fieldMapping: state.mapping,
      },
    };
  },
  { name: "fillAndStore", run_type: "tool" }
);

// ── Routing ──

function nextNodeAfterDownload(
  state: PdfFillState
): "extractFields" | "retryUrl" | "downloadFailed" {
  if (state.pdfBytes) return "extractFields";
  if (state.downloadAttempts >= 3) return "downloadFailed";
  return "retryUrl";
}

// ── Main entry point ──

export const runPdfFillGraph = traceable(
  async function runPdfFillGraph(
    input: PdfFillGraphInput,
    storeArtifact: (blob: Blob) => Promise<Id<"_storage">>
  ): Promise<FillPdfResult> {
    const initialState: PdfFillState = {
      taskLabel: input.taskLabel,
      profileStr: input.profileStr,
      convoStr: input.convoStr,
      pdfUrl: "",
      filename: "filled-form.pdf",
      failedUrls: [],
      downloadAttempts: 0,
      pdfBytes: null,
      fieldInfo: [],
      mapping: null,
      invalidFields: [],
      skippedFields: [],
      traceEvents: [],
      result: null,
    };

    const client = getClient();

    const graph = new StateGraph<PdfFillState>({
      channels: {
        taskLabel: null,
        profileStr: null,
        convoStr: null,
        pdfUrl: null,
        filename: null,
        failedUrls: null,
        downloadAttempts: null,
        pdfBytes: null,
        fieldInfo: null,
        mapping: null,
        invalidFields: null,
        skippedFields: null,
        traceEvents: null,
        result: null,
      },
    })
      .addNode("resolveUrl", withTracing("resolveUrl", (s) => resolveUrlNode(s, client)))
      .addNode("downloadPdf", withTracing("downloadPdf", downloadPdfNode))
      .addNode("retryUrl", withTracing("retryUrl", (s) => retryUrlNode(s, client)))
      .addNode("downloadFailed", downloadFailedNode)
      .addNode("extractFields", withTracing("extractFields", extractFieldsNode))
      .addNode("mapFields", withTracing("mapFields", (s) => mapFieldsNode(s, client)))
      .addNode("validateMapping", withTracing("validateMapping", validateMappingNode))
      .addNode("fillAndStore", withTracing("fillAndStore", (s) => fillAndStoreNode(s, storeArtifact)))
      .addEdge(START, "resolveUrl")
      .addEdge("resolveUrl", "downloadPdf")
      .addConditionalEdges(
        "downloadPdf",
        nextNodeAfterDownload,
        ["extractFields", "retryUrl", "downloadFailed"]
      )
      .addEdge("retryUrl", "downloadPdf")
      .addEdge("downloadFailed", END)
      .addEdge("extractFields", "mapFields")
      .addEdge("mapFields", "validateMapping")
      .addEdge("validateMapping", "fillAndStore")
      .addEdge("fillAndStore", END)
      .compile();

    const finalState = await graph.invoke(initialState);
    const result = finalState.result as FillPdfResult | null;
    if (!result) {
      throw new PermanentError("PDF agent completed without producing an artifact");
    }

    return result;
  },
  { name: "pdfFillGraph", run_type: "chain" }
);
