import { z } from 'zod';

// File validation schemas
export const VALID_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/avif',
  'image/webp',
  'image/gif',
] as const;

export const VALID_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.avif', '.webp', '.gif'] as const;
export const PDF_EXTENSION = '.pdf';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// PDF file validation
export const pdfFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, 'File cannot be empty')
  .refine((file) => file.size <= MAX_FILE_SIZE, `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  .refine(
    (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith(PDF_EXTENSION),
    'File must be a PDF'
  );

// Image file validation
export const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, 'File cannot be empty')
  .refine((file) => file.size <= MAX_FILE_SIZE, `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  .refine(
    (file) =>
      VALID_IMAGE_TYPES.includes(file.type as typeof VALID_IMAGE_TYPES[number]) ||
      VALID_IMAGE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)),
    `File must be an image (${VALID_IMAGE_EXTENSIONS.join(', ')})`
  );

// URL validation with specific protocols
export const urlSchema = z.string().url().refine(
  (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  },
  'URL must use HTTP or HTTPS protocol'
);

// PDF URL validation (must end with .pdf)
export const pdfUrlSchema = urlSchema.refine(
  (url) => {
    const urlLower = url.toLowerCase();
    return urlLower.endsWith(PDF_EXTENSION) || urlLower.includes('.pdf?');
  },
  'URL must point to a PDF file (.pdf extension required)'
);

// Image URL validation (must end with valid image extension)
export const imageUrlSchema = urlSchema.refine(
  (url) => {
    const urlLower = url.toLowerCase();
    return VALID_IMAGE_EXTENSIONS.some(
      (ext) => urlLower.endsWith(ext) || urlLower.includes(`${ext}?`)
    );
  },
  `URL must point to an image file (${VALID_IMAGE_EXTENSIONS.join(', ')} extensions)`
);

// Base64 validation
export const base64Schema = z
  .string()
  .min(50, 'Base64 string is too short')
  .regex(/^[A-Za-z0-9+/]+=*$/, 'Invalid base64 format');

// PDF base64 validation (starts with PDF signature)
export const pdfBase64Schema = base64Schema.refine(
  (data) => data.startsWith('JVBERi0'),
  'Base64 data does not appear to be a PDF (missing PDF signature)'
);

// Image base64 validation (starts with common image signatures)
export const imageBase64Schema = base64Schema.refine(
  (data) =>
    data.startsWith('iVBORw0KGgo') || // PNG
    data.startsWith('/9j/') || // JPEG
    data.startsWith('R0lGOD'), // GIF
  'Base64 data does not appear to be a valid image (missing image signature)'
);

// Data URL validation
export const dataUrlSchema = z
  .string()
  .regex(/^data:([^;]+);base64,(.+)$/, 'Invalid data URL format');

// Mistral API key validation (basic format check)
export const apiKeySchema = z
  .string()
  .min(10, 'API key is too short')
  .refine((key) => key.trim().length > 0, 'API key cannot be empty or whitespace');

// OCR Result validation
export const ocrResultSchema = z.object({
  text: z.string(),
  pages: z.number().int().positive().optional(),
  processingTime: z.number().positive(),
  images: z.array(z.any()).optional(),
});

// Mistral API response validation
export const mistralResponseSchema = z.object({
  pages: z.array(
    z.object({
      markdown: z.string(),
      images: z.array(z.any()).optional(),
    })
  ),
  model: z.string(),
  usageInfo: z.object({}).passthrough().optional(),
});

// Input type detection result
export const detectedInputSchema = z.object({
  inputType: z.enum(['url', 'base64', 'unknown']),
  contentType: z.enum(['pdf', 'image', 'unknown']),
  value: z.string(),
});

// Export types from schemas
export type PdfFile = z.infer<typeof pdfFileSchema>;
export type ImageFile = z.infer<typeof imageFileSchema>;
export type OcrResult = z.infer<typeof ocrResultSchema>;
export type MistralResponse = z.infer<typeof mistralResponseSchema>;
export type DetectedInput = z.infer<typeof detectedInputSchema>;
