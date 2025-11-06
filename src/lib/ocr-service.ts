import { Mistral } from '@mistralai/mistralai';
import type { OCRResponse, OCRImageObject } from '@mistralai/mistralai/models/components';
import {
  apiKeySchema,
  pdfUrlSchema,
  imageUrlSchema,
  base64Schema,
  ocrResultSchema,
} from './validation-schemas';

export interface OCRResult {
  text: string;
  pages?: number;
  processingTime?: number;
  images?: OCRImageObject[];
}

export interface OCROptions {
  includeImageBase64?: boolean;
  signal?: AbortSignal;
}

export class OCRService {
  private client: Mistral;

  constructor(apiKey: string) {
    // Validate API key
    const validatedKey = apiKeySchema.parse(apiKey);
    this.client = new Mistral({ apiKey: validatedKey });
  }

  async processDocumentUrl(
    documentUrl: string,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    // Validate PDF URL
    const validatedUrl = pdfUrlSchema.parse(documentUrl);

    const startTime = Date.now();

    const response: OCRResponse = await this.client.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl: validatedUrl,
      },
      includeImageBase64: options.includeImageBase64 ?? true,
    });

    const processingTime = Date.now() - startTime;

    const result = {
      text: this.extractText(response),
      pages: response.pages?.length,
      processingTime,
      images: this.extractImages(response),
    };

    // Validate result before returning
    return ocrResultSchema.parse(result);
  }

  async processImageUrl(
    imageUrl: string,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    // Validate image URL
    const validatedUrl = imageUrlSchema.parse(imageUrl);

    const startTime = Date.now();

    const response: OCRResponse = await this.client.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'image_url',
        imageUrl: validatedUrl,
      },
      includeImageBase64: options.includeImageBase64 ?? true,
    });

    const processingTime = Date.now() - startTime;

    const result = {
      text: this.extractText(response),
      pages: response.pages?.length,
      processingTime,
      images: this.extractImages(response),
    };

    // Validate result before returning
    return ocrResultSchema.parse(result);
  }

  async processBase64Document(
    base64Data: string,
    mimeType: string,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    // Validate base64 data
    const validatedBase64 = base64Schema.parse(base64Data);

    const startTime = Date.now();

    const documentUrl = `data:${mimeType};base64,${validatedBase64}`;

    const response: OCRResponse = await this.client.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl,
      },
      includeImageBase64: options.includeImageBase64 ?? true,
    });

    const processingTime = Date.now() - startTime;

    const result = {
      text: this.extractText(response),
      pages: response.pages?.length,
      processingTime,
      images: this.extractImages(response),
    };

    // Validate result before returning
    return ocrResultSchema.parse(result);
  }

  async processBase64Image(
    base64Data: string,
    mimeType: string,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    // Validate base64 data
    const validatedBase64 = base64Schema.parse(base64Data);

    const startTime = Date.now();

    const imageUrl = `data:${mimeType};base64,${validatedBase64}`;

    const response: OCRResponse = await this.client.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'image_url',
        imageUrl,
      },
      includeImageBase64: options.includeImageBase64 ?? true,
    });

    const processingTime = Date.now() - startTime;

    const result = {
      text: this.extractText(response),
      pages: response.pages?.length,
      processingTime,
      images: this.extractImages(response),
    };

    // Validate result before returning
    return ocrResultSchema.parse(result);
  }

  private extractText(response: OCRResponse): string {
    // Extract text from the OCR response
    // The response structure: { pages: Array<{ markdown: string, ... }>, model: string, usageInfo: {...} }
    if (!response.pages || !Array.isArray(response.pages) || response.pages.length === 0) {
      return 'No text extracted from document';
    }

    // Extract markdown from each page
    const extractedText = response.pages
      .map((page) => {
        if (page.markdown && page.markdown.trim().length > 0) {
          return page.markdown;
        }
        return '';
      })
      .filter((text) => text.trim().length > 0)
      .join('\n\n---\n\n'); // Separate pages with a divider

    if (extractedText.trim().length > 0) {
      return extractedText;
    }

    return 'No text found in document pages';
  }

  private extractImages(response: OCRResponse): OCRImageObject[] {
    // Extract images from pages array
    if (!response.pages || !Array.isArray(response.pages)) {
      return [];
    }

    const allImages: OCRImageObject[] = [];

    response.pages.forEach((page) => {
      if (page.images && Array.isArray(page.images)) {
        allImages.push(...page.images);
      }
    });

    return allImages;
  }
}
