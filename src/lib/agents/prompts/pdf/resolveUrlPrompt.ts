export function buildResolveUrlPrompt(taskLabel: string): string {
  return `Find the direct download URL for a fillable PDF form.

IMPORTANT: Use web search to find the CURRENT, working URL.

Task: ${taskLabel}`;
}
