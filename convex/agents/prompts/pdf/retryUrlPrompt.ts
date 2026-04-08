export function buildRetryUrlPrompt(failedUrls: string[]): string {
  return `The following PDF URLs all returned errors and are broken or outdated:
${failedUrls.map((u) => `- ${u}`).join("\n")}

Use web search to find the CURRENT, working download URL for this exact form. Do NOT suggest any of the URLs listed above.

Return ONLY the direct URL to the downloadable PDF, no other text.`;
}

