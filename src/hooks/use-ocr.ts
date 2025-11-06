import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { OCRService, type OCRResult } from '@/lib/ocr-service';
import { ocrKeys, generateBase64Hash } from '@/lib/query-client';
import { fileToBase64, getMimeType, isValidPdfFile, generateFileHash } from '@/lib/file-utils';

/**
 * Input types for OCR processing
 */
export type OCRInputType =
  | { type: 'url-document'; url: string }
  | { type: 'url-image'; url: string }
  | { type: 'base64-document'; base64: string; mimeType: string }
  | { type: 'base64-image'; base64: string; mimeType: string }
  | { type: 'file'; file: File };

export interface OCRMutationContext {
  apiKey: string;
}

/**
 * Helper to generate cache key from input
 * For files, uses content-based hashing to ensure same file = same cache key
 */
async function getCacheKey(input: OCRInputType): Promise<readonly unknown[]> {
  switch (input.type) {
    case 'url-document':
      return ocrKeys.urlDocument(input.url);
    case 'url-image':
      return ocrKeys.urlImage(input.url);
    case 'base64-document':
      return ocrKeys.base64Document(generateBase64Hash(input.base64));
    case 'base64-image':
      return ocrKeys.base64Image(generateBase64Hash(input.base64));
    case 'file': {
      // Use content-based hash instead of lastModified timestamp
      // This ensures the same file always gets the same cache key
      const fileHash = await generateFileHash(input.file);
      return isValidPdfFile(input.file)
        ? ocrKeys.fileDocument(fileHash, input.file.size, 0) // Use 0 for timestamp
        : ocrKeys.fileImage(fileHash, input.file.size, 0);
    }
  }
}

/**
 * Custom hook for OCR mutations with cache-first strategy
 * Follows TanStack Query best practices
 *
 * IMPORTANT: This hook implements a cache-first approach:
 * 1. Check cache before making API call
 * 2. Return cached data immediately if available and fresh (< 10 min old)
 * 3. Only call API if cache miss or stale
 */
export function useOCRMutation(
  apiKey: string,
  options?: Omit<UseMutationOptions<OCRResult, Error, OCRInputType, unknown>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation<OCRResult, Error, OCRInputType, unknown>({
    mutationFn: async (input) => {
      // CACHE-FIRST STRATEGY: Check cache before making API call
      const cacheKey = await getCacheKey(input);
      const cachedData = queryClient.getQueryData<OCRResult>(cacheKey);

      // If we have cached data, return it immediately (no API call!)
      if (cachedData) {
        return cachedData;
      }

      // Cache miss - proceed with API call
      const ocrService = new OCRService(apiKey);

      let result: OCRResult;

      switch (input.type) {
        case 'url-document':
          result = await ocrService.processDocumentUrl(input.url);
          break;

        case 'url-image':
          result = await ocrService.processImageUrl(input.url);
          break;

        case 'base64-document':
          result = await ocrService.processBase64Document(input.base64, input.mimeType);
          break;

        case 'base64-image':
          result = await ocrService.processBase64Image(input.base64, input.mimeType);
          break;

        case 'file': {
          const base64Data = await fileToBase64(input.file);
          const mimeType = getMimeType(input.file);

          result = isValidPdfFile(input.file)
            ? await ocrService.processBase64Document(base64Data, mimeType)
            : await ocrService.processBase64Image(base64Data, mimeType);
          break;
        }

        default:
          throw new Error('Invalid input type');
      }

      // Store in cache immediately after API call (before returning)
      queryClient.setQueryData(cacheKey, result);

      return result;
    },

    // Additional options provided by the consumer
    ...options,
  });
}

/**
 * Hook to check if a specific OCR operation is in progress
 * Useful for showing loading states across components
 */
export function useOCRStatus() {
  const queryClient = useQueryClient();

  return {
    // Check if any OCR mutation is in progress
    isMutating: queryClient.isMutating({ mutationKey: ocrKeys.all }),

    // Get all pending mutations
    getPendingMutations: () =>
      queryClient
        .getMutationCache()
        .getAll()
        .filter((mutation) => mutation.state.status === 'pending'),
  };
}

/**
 * Hook to access cached OCR results
 * Allows components to read previously processed documents
 * Note: For file inputs, this requires async file hashing, so use with caution
 */
export function useCachedOCRResult(input: OCRInputType | null) {
  const queryClient = useQueryClient();

  if (!input) return null;

  // For file inputs, we can't use this hook synchronously due to hashing
  // The cache check is done inside the mutation itself
  if (input.type === 'file') {
    return null;
  }

  // For non-file inputs, we can get cache key synchronously
  const cacheKey =
    input.type === 'url-document' ? ocrKeys.urlDocument(input.url) :
    input.type === 'url-image' ? ocrKeys.urlImage(input.url) :
    input.type === 'base64-document' ? ocrKeys.base64Document(generateBase64Hash(input.base64)) :
    ocrKeys.base64Image(generateBase64Hash(input.base64));

  return queryClient.getQueryData<OCRResult>(cacheKey);
}

/**
 * Hook to clear all OCR cache
 * Useful for "Clear History" functionality
 */
export function useClearOCRCache() {
  const queryClient = useQueryClient();

  return {
    clearAll: () => queryClient.removeQueries({ queryKey: ocrKeys.all }),
    clearResults: () => queryClient.removeQueries({ queryKey: ocrKeys.results() }),
  };
}
