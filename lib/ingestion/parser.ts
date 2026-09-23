// Document parsing utilities for PDF, DOCX, TXT, and URL sources

export async function parsePdf(buffer: Buffer): Promise<string> {
  // pdf-parse is a Node.js-only module
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

export async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export function parseTxt(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

export async function parseUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "KnowledgeBaseAI/1.0 (Document Indexer)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Simple HTML to text conversion — strip tags, decode entities
  return html
    // Remove script and style contents
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    // Remove HTML tags
    .replace(/<[^>]+>/g, " ")
    // Decode common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

export async function parseDocument(
  buffer: Buffer,
  sourceType: string
): Promise<string> {
  switch (sourceType) {
    case "pdf":
      return parsePdf(buffer);
    case "docx":
      return parseDocx(buffer);
    case "txt":
      return parseTxt(buffer);
    default:
      throw new Error(`Unsupported source type: ${sourceType}`);
  }
}
