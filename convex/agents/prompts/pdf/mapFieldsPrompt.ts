type FieldInfo = {
  name: string;
  type: string;
};

type BuildMapFieldsPromptArgs = {
  fieldInfo: FieldInfo[];
  profileStr: string;
  convoStr: string;
  taskLabel: string;
};

export function buildMapFieldsPrompt(args: BuildMapFieldsPromptArgs): string {
  return `You are filling out a PDF form. Here are the EXACT field names and types in the form:

${JSON.stringify(args.fieldInfo, null, 2)}

Fill in every field you can based on the user context below. Use the EXACT field names from the list above.

Rules:
- Use ONLY field names that appear in the list above — exact spelling, exact casing.
- For text fields, provide string values.
- For checkbox fields, use true to check or false to uncheck.
- For radio/dropdown fields, provide the option value as a string.
- Fill EVERY field where you have the information. Be thorough.
- For "missing_fields": describe fields you couldn't fill in plain English. Do NOT include sensitive fields (SSN, passport numbers, financial info).
- User profile is grouped into [category] sections with bullet points.
- Treat "Still needed: X" as explicitly missing info: do not invent a value for X.

User profile:
${args.profileStr}

Conversation:
${args.convoStr}

Task: ${args.taskLabel}`;
}

