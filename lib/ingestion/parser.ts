// Document parsing utilities for PDF, DOCX, TXT, and URL sources

export async function parsePdf(buffer: Buffer): Promise<string> {
  console.log(`[PARSER] Parsing PDF, buffer size: ${buffer.length}`);
  // pdf-parse is a Node.js-only module
  const pdfParse = (await import("pdf-parse")).default;
  console.log(`[PARSER] pdf-parse module loaded`);
  const data = await pdfParse(buffer);
  console.log(`[PARSER] PDF parsed, text length: ${data.text.length}`);
  return data.text;
}

export async function parseDocx(buffer: Buffer): Promise<string> {
  console.log(`[PARSER] Parsing DOCX, buffer size: ${buffer.length}`);
  const mammoth = await import("mammoth");
  console.log(`[PARSER] mammoth module loaded`);
  const result = await mammoth.extractRawText({ buffer });
  console.log(`[PARSER] DOCX parsed, text length: ${result.value.length}`);
  return result.value;
}

export function parseTxt(buffer: Buffer): string {
  console.log(`[PARSER] Parsing TXT, buffer size: ${buffer.length}`);
  const text = buffer.toString("utf-8");
  console.log(`[PARSER] TXT parsed, text length: ${text.length}`);
  return text;
}

export async function parseUrl(url: string): Promise<string> {
  console.log(`[PARSER] Fetching URL: ${url}`);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "KnowledgeBaseAI/1.0 (Document Indexer)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  console.log(`[PARSER] URL fetched, HTML length: ${html.length}`);

  // Simple HTML to text conversion — strip tags, decode entities
  const text = html
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

  console.log(`[PARSER] URL text extracted, length: ${text.length}`);
  return text;
}

export async function parseDocument(
  buffer: Buffer,
  sourceType: string
): Promise<string> {
  console.log(`[PARSER] parseDocument called, type: ${sourceType}, buffer size: ${buffer.length}`);
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

