import { Eval } from "braintrust";
import OpenAI from "openai";
import { wrapOpenAI } from "braintrust";
import { PDFDocument } from "pdf-lib";

/**
 * Braintrust eval for the PDF filling pipeline.
 *
 * Tests the core "field mapping" step: given real PDF field names/types and
 * user context, does the AI correctly map values to the right fields?
 *
 * Run: npx braintrust eval evals/pdf-filling.eval.ts
 */

function getClient() {
  return wrapOpenAI(new OpenAI());
}

// ---------- Test cases ----------

interface TestCase {
  name: string;
  pdfUrl: string;
  profileStr: string;
  convoStr: string;
  taskText: string;
  expectedTextFields: Record<string, string>; // fieldName -> expected value (substring match)
  expectedCheckboxFields: Record<string, boolean>; // fieldName -> expected checked state
  minFilledCount: number; // minimum number of fields we expect to be filled
}

const DS11_PROFILE = `family: Daughter Clara Margaret Chiarella, born 2026-02-20 in San Francisco
family: Parent 1 — Jay Chiarella, DOB May 26 1993, born in Montreal, jay.gch93@gmail.com
family: Parent 2 — Anastasia Aleksandra Vinar, DOB Jan 21 1993, born in New York, vinarstacey@gmail.com
location: 559A 24th Avenue, San Francisco, CA
personal: Emergency contact — Nina Chiarella, 415 900 9040`;

const DS11_CONVO = `user: I need to get a passport for my newborn daughter Clara
assistant: Got it — I have enough to help break this down.
user: Select both passport book and passport card
user: Choose expedited service`;

const TEST_CASES: TestCase[] = [
  {
    name: "DS-11 Passport Application — newborn",
    pdfUrl: "https://eforms.state.gov/Forms/ds11.pdf",
    profileStr: DS11_PROFILE,
    convoStr: DS11_CONVO,
    taskText: "Fill out DS-11 application",
    expectedTextFields: {
      // We check substrings — the exact field names will be extracted from the PDF
      "Last Name": "Chiarella",
      "First Name": "Clara",
      "Middle Name": "Margaret",
      "Place of Birth": "San Francisco",
    },
    expectedCheckboxFields: {
      // Passport book and card should both be checked
      "Book": true,
      "Card": true,
    },
    minFilledCount: 10,
  },
];

// ---------- The mapping prompt (mirrors agent.ts Step 4) ----------

async function runFieldMapping(
  fieldInfo: { name: string; type: string }[],
  profileStr: string,
  convoStr: string,
  taskText: string,
): Promise<Record<string, any>> {
  const client = getClient();

  const response = await client.responses.create({
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

Task: ${taskText}`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "field_mapping_response",
        strict: false,
        schema: {
          type: "object",
          properties: {
            text_fields: {
              type: "object",
              additionalProperties: { type: "string" },
            },
            checkbox_fields: {
              type: "object",
              additionalProperties: { type: "boolean" },
            },
            radio_fields: {
              type: "object",
              additionalProperties: { type: "string" },
            },
            dropdown_fields: {
              type: "object",
              additionalProperties: { type: "string" },
            },
            missing_fields: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["text_fields", "checkbox_fields", "radio_fields", "dropdown_fields", "missing_fields"],
          additionalProperties: false,
        },
      },
    },
  });

  return JSON.parse(response.output_text);
}

// ---------- Scoring functions ----------

function scoreFieldCoverage(
  mapping: Record<string, any>,
  fieldInfo: { name: string; type: string }[],
  minFilledCount: number,
): number {
  const totalMapped =
    Object.keys(mapping.text_fields || {}).length +
    Object.keys(mapping.checkbox_fields || {}).length +
    Object.keys(mapping.radio_fields || {}).length +
    Object.keys(mapping.dropdown_fields || {}).length;

  // Score: what fraction of minFilledCount did we hit? Capped at 1.0
  return Math.min(1, totalMapped / minFilledCount);
}

function scoreFieldNameAccuracy(
  mapping: Record<string, any>,
  fieldInfo: { name: string; type: string }[],
): number {
  const validNames = new Set(fieldInfo.map((f) => f.name));
  const allMappedNames = [
    ...Object.keys(mapping.text_fields || {}),
    ...Object.keys(mapping.checkbox_fields || {}),
    ...Object.keys(mapping.radio_fields || {}),
    ...Object.keys(mapping.dropdown_fields || {}),
  ];

  if (allMappedNames.length === 0) return 0;

  const validCount = allMappedNames.filter((n) => validNames.has(n)).length;
  return validCount / allMappedNames.length;
}

function scoreExpectedValues(
  mapping: Record<string, any>,
  expectedTextFields: Record<string, string>,
  expectedCheckboxFields: Record<string, boolean>,
  fieldInfo: { name: string; type: string }[],
): number {
  const textFields = mapping.text_fields || {};
  const checkboxFields = mapping.checkbox_fields || {};
  let matched = 0;
  let total = 0;

  // Check expected text fields (match by substring in field name)
  for (const [expectedNamePart, expectedValue] of Object.entries(expectedTextFields)) {
    total++;
    // Find any mapped field whose name contains the expected substring
    const matchingEntry = Object.entries(textFields).find(
      ([name]) => name.toLowerCase().includes(expectedNamePart.toLowerCase()),
    );
    if (matchingEntry) {
      const [, actualValue] = matchingEntry;
      if (String(actualValue).toLowerCase().includes(expectedValue.toLowerCase())) {
        matched++;
      }
    }
  }

  // Check expected checkbox fields (match by substring in field name)
  for (const [expectedNamePart, expectedValue] of Object.entries(expectedCheckboxFields)) {
    total++;
    const matchingEntry = Object.entries(checkboxFields).find(
      ([name]) => name.toLowerCase().includes(expectedNamePart.toLowerCase()),
    );
    if (matchingEntry) {
      const [, actualValue] = matchingEntry;
      if (actualValue === expectedValue) {
        matched++;
      }
    }
  }

  return total > 0 ? matched / total : 0;
}

// ---------- Eval ----------

Eval("pdf-filling", {
  data: async () => {
    // For each test case, download the PDF and extract field info
    const data = [];

    for (const tc of TEST_CASES) {
      let fieldInfo: { name: string; type: string }[];

      try {
        const resp = await fetch(tc.pdfUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const bytes = await resp.arrayBuffer();
        const pdfDoc = await PDFDocument.load(bytes);
        const form = pdfDoc.getForm();
        fieldInfo = form.getFields().map((f) => ({
          name: f.getName(),
          type: f.constructor.name
            .replace("PDF", "")
            .replace("Field", "")
            .toLowerCase(),
        }));
      } catch (e) {
        console.error(`Failed to download/parse PDF for "${tc.name}":`, e);
        continue;
      }

      data.push({
        input: {
          fieldInfo,
          profileStr: tc.profileStr,
          convoStr: tc.convoStr,
          taskText: tc.taskText,
        },
        expected: {
          expectedTextFields: tc.expectedTextFields,
          expectedCheckboxFields: tc.expectedCheckboxFields,
          minFilledCount: tc.minFilledCount,
          fieldInfo,
        },
        metadata: { name: tc.name, pdfUrl: tc.pdfUrl },
      });
    }

    return data;
  },

  task: async (input) => {
    const mapping = await runFieldMapping(
      input.fieldInfo,
      input.profileStr,
      input.convoStr,
      input.taskText,
    );
    return mapping;
  },

  scores: [
    async ({ output, expected }: any) => ({
      name: "field_coverage",
      score: scoreFieldCoverage(output, expected.fieldInfo, expected.minFilledCount),
    }),
    async ({ output, expected }: any) => ({
      name: "field_name_accuracy",
      score: scoreFieldNameAccuracy(output, expected.fieldInfo),
    }),
    async ({ output, expected }: any) => ({
      name: "expected_values",
      score: scoreExpectedValues(
        output,
        expected.expectedTextFields,
        expected.expectedCheckboxFields,
        expected.fieldInfo,
      ),
    }),
  ],
});
