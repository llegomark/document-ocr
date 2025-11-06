import { QueryClient, type DefaultOptions } from '@tanstack/react-query';

/**
 * Default options for all queries and mutations
 * Following TanStack Query best practices for OCR application
 */
const queryConfig: DefaultOptions = {
  queries: {
    // Stale time: OCR results are considered fresh for 10 minutes
    // This prevents unnecessary re-processing of the same document
    staleTime: 10 * 60 * 1000, // 10 minutes

    // Garbage collection time: Keep unused data in cache for 30 minutes
    // Allows quick access to recently processed documents
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)

    // Retry configuration
    retry: 2, // Retry failed requests twice (OCR can have transient errors)
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff

    // Refetch configuration
    refetchOnWindowFocus: false, // Don't refetch OCR results when window regains focus
    refetchOnReconnect: false, // Don't refetch when network reconnects
    refetchOnMount: false, // Don't refetch when component mounts if data exists

    // Network mode: fail immediately when offline
    networkMode: 'online',
  },
  mutations: {
    // Retry mutations once (OCR processing should be idempotent)
    retry: 1,
    retryDelay: 1000,

    // Network mode for mutations
    networkMode: 'online',

    // Global mutation callbacks can be added here if needed
  },
};

/**
 * Create and configure the QueryClient instance
 * This is the central cache for all server state
 */
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

/**
 * Query key factory for type-safe cache management
 * Following the recommended pattern from TanStack Query docs
 */
export const ocrKeys = {
  // Base key for all OCR-related queries
  all: ['ocr'] as const,

  // Keys for different OCR operations
  results: () => [...ocrKeys.all, 'results'] as const,
  result: (id: string) => [...ocrKeys.results(), id] as const,

  // Keys for specific input types
  urlDocument: (url: string) => [...ocrKeys.all, 'url-document', url] as const,
  urlImage: (url: string) => [...ocrKeys.all, 'url-image', url] as const,
  base64Document: (hash: string) => [...ocrKeys.all, 'base64-document', hash] as const,
  base64Image: (hash: string) => [...ocrKeys.all, 'base64-image', hash] as const,
  fileDocument: (name: string, size: number, lastModified: number) =>
    [...ocrKeys.all, 'file-document', name, size, lastModified] as const,
  fileImage: (name: string, size: number, lastModified: number) =>
    [...ocrKeys.all, 'file-image', name, size, lastModified] as const,
} as const;

/**
 * Helper to generate a simple hash for base64 data
 * Used for cache key generation
 */
export function generateBase64Hash(base64: string): string {
  // Use first and last 20 characters + length as a simple hash
  const length = base64.length;
  if (length < 40) return base64;

  return `${base64.slice(0, 20)}-${length}-${base64.slice(-20)}`;
}
