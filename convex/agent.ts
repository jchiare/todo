"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { PDFDocument } from "pdf-lib";
import OpenAI from "openai";
import { wrapOpenAI } from "braintrust";

function getClient() {
  return wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
}

// Error class for permanent failures that should NOT be retried
class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentError";
  }
}

// Internal action: fill a PDF form (called as a workflow step)
export const doFillPdf = internalAction({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args): Promise<{ storageId: any; filename: string; missingFields: string[] }> => {
    const task = await ctx.runQuery(api.tasks.getTask, { id: args.taskId });
    if (!task || !task.agentAction) throw new PermanentError("Task not found or no agent action");

    const facts = await ctx.runQuery(api.profile.list);
    const item = await ctx.runQuery(api.items.get, { id: task.itemId });
    const messages = await ctx.runQuery(api.messages.listByItem, {
      itemId: task.itemId,
    });

    const profileStr = facts
      .map((f: any) => `${f.category}: ${f.fact}`)
      .join("\n");
    const convoStr = messages
      .map((m: any) => `${m.role}: ${m.content}`)
      .join("\n");

    // Step 1: Ask AI for the PDF URL only
    const urlResponse = await getClient().responses.create({
      model: "gpt-5.4",
      tools: [{ type: "web_search" as any }],
      input: [
        {
          role: "system",
          content: `Find the direct download URL for a fillable PDF form.

IMPORTANT: Use web search to find the CURRENT, working URL. Government sites change URLs frequently.

Return ONLY a JSON object with this exact format, no other text:
{
  "pdf_url": "https://...",
  "filename": "descriptive-name.pdf"
}

Task: ${item?.title || task.text}`,
        },
      ],
      text: { format: { type: "text" } },
    });

    const urlText = urlResponse.output_text.trim();
    const urlJsonMatch = urlText.match(/\{[\s\S]*\}/);
    if (!urlJsonMatch) throw new PermanentError("Could not parse AI response for PDF URL");

    const urlConfig = JSON.parse(urlJsonMatch[0]);
    const { pdf_url, filename } = urlConfig;
    if (!pdf_url) throw new PermanentError("No PDF URL determined");

    // Step 2: Download the PDF, retrying with AI up to 3 times if URL is stale
    const failedUrls: string[] = [];
    let currentUrl = pdf_url;
    let pdfResponse: Response | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      pdfResponse = await fetch(currentUrl);

      if (pdfResponse.ok) break;

      if (pdfResponse.status >= 500) {
        throw new Error(`Failed to download PDF: ${pdfResponse.status}`);
      }

      failedUrls.push(currentUrl);

      if (attempt === 2) {
        throw new PermanentError(
          `PDF not found after 3 attempts. Tried URLs:\n${failedUrls.join("\n")}`
        );
      }

      const retryResponse = await getClient().responses.create({
        model: "gpt-5.4",
        tools: [{ type: "web_search" as any }],
        input: [
          {
            role: "system",
            content: `The following PDF URLs all returned errors and are broken or outdated:
${failedUrls.map((u) => `- ${u}`).join("\n")}

Use web search to find the CURRENT, working download URL for this exact form. Government websites frequently reorganize their URLs. Do NOT suggest any of the URLs listed above.

Search for the form on the official government website. Return ONLY the direct URL to the downloadable PDF, no other text.`,
          },
        ],
        text: { format: { type: "text" } },
      });

      const retryUrl = retryResponse.output_text.trim().match(/https?:\/\/[^\s"'<>]+\.pdf[^\s"'<>]*/i);
      if (!retryUrl) {
        throw new PermanentError(
          `PDF not found after ${attempt + 1} attempts. Tried URLs:\n${failedUrls.join("\n")}\nRetry could not find a new URL.`
        );
      }

      currentUrl = retryUrl[0];
    }

    const pdfBytes = await pdfResponse!.arrayBuffer();

    // Step 3: Extract actual field names and types from the downloaded PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const allFields = form.getFields();

    const fieldInfo = allFields.map((f) => {
      const name = f.getName();
      const type = f.constructor.name
        .replace("PDF", "")
        .replace("Field", "")
        .toLowerCase(); // "text", "checkbox", "radiogroup", "dropdown"
      return { name, type };
    });

    // Step 4: Ask AI to map user data to the ACTUAL field names from the PDF
    const mappingResponse = await getClient().responses.create({
      model: "gpt-5.4",
      input: [
        {
          role: "system",
          content: `You are filling out a PDF form. Here are the EXACT field names and types in the form:

${JSON.stringify(fieldInfo, null, 2)}

Fill in every field you can based on the user context below. Use the EXACT field names from the list above.

Return ONLY a JSON object with this format:
{
  "text_fields": { "Exact Field Name": "value", ... },
  "checkbox_fields": { "Exact Field Name": true, ... },
  "radio_fields": { "Exact Field Name": "option value", ... },
  "dropdown_fields": { "Exact Field Name": "option value", ... },
  "missing_fields": ["plain-English description of unfilled fields"]
}

Rules:
- Use ONLY field names that appear in the list above — exact spelling, exact casing.
- For text fields, provide string values.
- For checkbox fields, use true to check or false to uncheck.
- For radio/dropdown fields, provide the option value as a string.
- Fill EVERY field where you have the information. Be thorough.
- For "missing_fields": describe fields you couldn't fill in plain English. Do NOT include sensitive fields (SSN, passport numbers, financial info).

User profile:
${profileStr}

Conversation:
${convoStr}

Task: ${item?.title || task.text}`,
        },
      ],
      text: { format: { type: "text" } },
    });

    const mappingText = mappingResponse.output_text.trim();
    const mappingMatch = mappingText.match(/\{[\s\S]*\}/);
    if (!mappingMatch) throw new PermanentError("Could not parse AI field mapping response");

    const mapping = JSON.parse(mappingMatch[0]);
    let filledCount = 0;

    // Fill text fields
    for (const [fieldName, value] of Object.entries(mapping.text_fields || {})) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(String(value));
        filledCount++;
      } catch {
        // skip — field name mismatch
      }
    }

    // Fill checkbox fields
    for (const [fieldName, value] of Object.entries(mapping.checkbox_fields || {})) {
      try {
        const field = form.getCheckBox(fieldName);
        if (value) field.check();
        else field.uncheck();
        filledCount++;
      } catch {
        // skip
      }
    }

    // Fill radio fields
    for (const [fieldName, value] of Object.entries(mapping.radio_fields || {})) {
      try {
        const field = form.getRadioGroup(fieldName);
        field.select(String(value));
        filledCount++;
      } catch {
        // skip
      }
    }

    // Fill dropdown fields
    for (const [fieldName, value] of Object.entries(mapping.dropdown_fields || {})) {
      try {
        const field = form.getDropdown(fieldName);
        field.select(String(value));
        filledCount++;
      } catch {
        // skip
      }
    }

    const missing_fields = mapping.missing_fields || [];

    // Save the filled PDF to Convex storage
    const filledBytes = await pdfDoc.save();
    const blob = new Blob([filledBytes as BlobPart], { type: "application/pdf" });
    const storageId = await ctx.storage.store(blob);

    return {
      storageId,
      filename: filename || "filled-form.pdf",
      missingFields: missing_fields,
    };
  },
});
