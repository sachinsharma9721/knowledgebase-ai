// Recursive character text splitter for chunking documents

export interface Chunk {
  content: string;
  chunkIndex: number;
}

export interface ChunkerOptions {
  chunkSize?: number;     // Max characters per chunk (default ~1500 chars ≈ 375 tokens)
  chunkOverlap?: number;  // Overlap between chunks (default 200 chars ≈ 50 tokens)
}

const DEFAULT_CHUNK_SIZE = 1500;
const DEFAULT_CHUNK_OVERLAP = 200;

// Separators in order of preference for splitting
const SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " "];

function splitBySeparator(text: string, separator: string): string[] {
  const parts = text.split(separator);
  // Re-attach the separator to the end of each part (except the last)
  return parts.map((part, i) =>
    i < parts.length - 1 ? part + separator : part
  ).filter((part) => part.length > 0);
}

function recursiveSplit(
  text: string,
  separators: string[],
  chunkSize: number
): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  // Find the best separator
  const separator = separators.find((sep) => text.includes(sep));

  if (!separator) {
    // No separator found — hard-split at chunkSize
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }

  const parts = splitBySeparator(text, separator);
  const remainingSeparators = separators.slice(separators.indexOf(separator) + 1);

  const result: string[] = [];
  let current = "";

  for (const part of parts) {
    if ((current + part).length <= chunkSize) {
      current += part;
    } else {
      if (current.length > 0) {
        result.push(current);
      }
      // If this single part is still too large, split it recursively
      if (part.length > chunkSize) {
        const subParts = recursiveSplit(part, remainingSeparators, chunkSize);
        result.push(...subParts);
        current = "";
      } else {
        current = part;
      }
    }
  }

  if (current.length > 0) {
    result.push(current);
  }

  return result;
}

export function chunkText(text: string, options?: ChunkerOptions): Chunk[] {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  console.log(`[CHUNKER] Starting chunking, text length: ${text.length}, chunkSize: ${chunkSize}, overlap: ${chunkOverlap}`);

  // Clean the text
  const cleanedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, "  ")
    .trim();

  if (cleanedText.length === 0) {
    console.log(`[CHUNKER] Empty text after cleaning, returning 0 chunks`);
    return [];
  }

  // Split into raw chunks
  const rawChunks = recursiveSplit(cleanedText, SEPARATORS, chunkSize);
  console.log(`[CHUNKER] Raw split produced ${rawChunks.length} chunks`);

  // Apply overlap
  const chunks: Chunk[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    let content = rawChunks[i].trim();

    // Add overlap from previous chunk
    if (i > 0 && chunkOverlap > 0) {
      const prevChunk = rawChunks[i - 1];
      const overlapText = prevChunk.slice(-chunkOverlap).trim();
      if (overlapText.length > 0) {
        content = overlapText + " " + content;
      }
    }

    if (content.length > 0) {
      chunks.push({
        content,
        chunkIndex: i,
      });
    }
  }

  console.log(`[CHUNKER] Final chunk count: ${chunks.length}`);
  return chunks;
}
