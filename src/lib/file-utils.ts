import {
  pdfFileSchema,
  imageFileSchema,
  urlSchema,
  dataUrlSchema,
  type DetectedInput,
} from './validation-schemas';

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Generate a content-based hash for file caching
 * Uses file name, size, and a sample of content to create a stable identifier
 * This ensures the same file always gets the same cache key, regardless of lastModified
 */
export async function generateFileHash(file: File): Promise<string> {
  const SAMPLE_SIZE = 8192; // 8KB sample for hashing

  // Read a sample from the beginning of the file
  const arrayBuffer = await file.slice(0, Math.min(SAMPLE_SIZE, file.size)).arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Create a simple hash from the sample
  let hash = 0;
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash << 5) - hash) + bytes[i];
    hash = hash & hash; // Convert to 32bit integer
  }

  // Combine file metadata with content hash for a stable cache key
  return `${file.name}-${file.size}-${Math.abs(hash).toString(36)}`;
}

export function getMimeType(file: File): string {
  return file.type || 'application/octet-stream';
}

export function isValidPdfFile(file: File): boolean {
  return pdfFileSchema.safeParse(file).success;
}

export function isValidImageFile(file: File): boolean {
  return imageFileSchema.safeParse(file).success;
}

export function validateUrl(url: string): boolean {
  return urlSchema.safeParse(url).success;
}

export function isDataUrl(url: string): boolean {
  return dataUrlSchema.safeParse(url).success;
}

export function extractBase64FromDataUrl(dataUrl: string): { base64: string; mimeType: string } | null {
  const validation = dataUrlSchema.safeParse(dataUrl);
  if (!validation.success) return null;

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      base64: match[2],
    };
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export type InputType = 'url' | 'base64' | 'unknown';
export type ContentType = 'pdf' | 'image' | 'unknown';

/**
 * Detects if the input contains multiple URLs or domain patterns
 * Returns true if more than one URL/domain is found
 *
 * Matches:
 * - http://example.com/file.pdf
 * - https://example.com/file.pdf
 * - www.example.com/file.pdf
 * - example.com/file.pdf
 * - subdomain.example.com/file.pdf
 */
export function hasMultipleUrls(input: string): boolean {
  // First, remove all full URLs (http:// or https://) from the input
  // and count them
  const fullUrlPattern = /https?:\/\/[^\s,;]+/gi;
  const fullUrlMatches = input.match(fullUrlPattern) || [];

  // Remove full URLs from the input to avoid double-counting
  let remainingInput = input.replace(fullUrlPattern, '');

  // Pattern for www. domains (without protocol)
  const wwwPattern = /\bwww\.[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}[^\s,;]*/gi;
  const wwwMatches = remainingInput.match(wwwPattern) || [];

  // Remove www. domains to avoid double-counting
  remainingInput = remainingInput.replace(wwwPattern, '');

  // Pattern for bare domains (domain.tld/path with file extension)
  // Must have at least one dot, a TLD, a path, and a file extension
  const domainPattern = /\b([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\/[^\s,;]+\.(pdf|png|jpe?g|avif|webp|gif)\b/gi;
  const domainMatches = remainingInput.match(domainPattern) || [];

  const totalMatches = fullUrlMatches.length + wwwMatches.length + domainMatches.length;

  return totalMatches > 1;
}

/**
 * Automatically detects the type of input (URL or base64) and content type (PDF or image)
 */
export function detectInputType(input: string): DetectedInput {
  const trimmedInput = input.trim();

  // Check if it's a URL
  if (validateUrl(trimmedInput)) {
    const urlLower = trimmedInput.toLowerCase();

    // Check URL extension for content type
    if (urlLower.endsWith('.pdf') || urlLower.includes('.pdf?')) {
      return { inputType: 'url', contentType: 'pdf', value: trimmedInput };
    }

    // Check for common image extensions
    if (/\.(png|jpe?g|avif|webp|gif)(\?|$)/i.test(urlLower)) {
      return { inputType: 'url', contentType: 'image', value: trimmedInput };
    }

    // URL detected but content type unknown
    return { inputType: 'url', contentType: 'unknown', value: trimmedInput };
  }

  // Check if it's a data URL
  if (isDataUrl(trimmedInput)) {
    const extracted = extractBase64FromDataUrl(trimmedInput);
    if (extracted) {
      const contentType = extracted.mimeType.startsWith('image/') ? 'image' :
                          extracted.mimeType === 'application/pdf' ? 'pdf' : 'unknown';
      return { inputType: 'base64', contentType, value: extracted.base64 };
    }
  }

  // Check if it's raw base64 (at least 50 chars and base64 pattern)
  if (trimmedInput.length > 50 && /^[A-Za-z0-9+/]+=*$/.test(trimmedInput)) {
    // Try to detect PDF signature (starts with "JVBERi0" which is "%PDF-" in base64)
    if (trimmedInput.startsWith('JVBERi0')) {
      return { inputType: 'base64', contentType: 'pdf', value: trimmedInput };
    }

    // Try to detect common image signatures in base64
    // PNG: iVBORw0KGgo
    // JPEG: /9j/
    // GIF: R0lGODlh or R0lGODdh
    if (trimmedInput.startsWith('iVBORw0KGgo') ||
        trimmedInput.startsWith('/9j/') ||
        trimmedInput.startsWith('R0lGOD')) {
      return { inputType: 'base64', contentType: 'image', value: trimmedInput };
    }

    // Base64 detected but content type unknown
    return { inputType: 'base64', contentType: 'unknown', value: trimmedInput };
  }

  return { inputType: 'unknown', contentType: 'unknown', value: trimmedInput };
}

/**
 * Downloads text content as a markdown file
 * @param text - The text content to download
 * @param filename - Optional custom filename (without extension)
 */
export function downloadAsMarkdown(text: string, filename?: string): void {
  // Generate filename with timestamp if not provided
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const finalFilename = filename ? `${filename}.md` : `ocr-result-${timestamp}.md`;

  // Create blob with markdown content
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });

  // Create download link and trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
