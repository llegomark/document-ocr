import { useSyncExternalStore } from 'react';

const API_KEY_STORAGE_KEY = 'mistral-api-key';
const API_KEY_CLEARED_FLAG = 'mistral-api-key-cleared';

export interface UseApiKeyReturn {
  apiKey: string;
  isApiKeySet: boolean;
  setApiKey: (key: string) => void;
  saveApiKey: (key: string) => void;
  clearApiKey: () => void;
}

// Global state store for API key
let apiKeyState: string = '';
const listeners = new Set<() => void>();

function getStoredApiKey(): string {
  const envApiKey = import.meta.env.VITE_MISTRAL_API_KEY || '';
  try {
    const wasCleared = localStorage.getItem(API_KEY_CLEARED_FLAG) === 'true';
    if (wasCleared) {
      return '';
    }
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    return storedKey || envApiKey;
  } catch (error) {
    console.warn('Failed to read API key from localStorage:', error);
    return envApiKey;
  }
}

// Initialize global state on module load
apiKeyState = getStoredApiKey();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return apiKeyState;
}

function emitChange() {
  listeners.forEach(listener => listener());
}

/**
 * Custom hook for managing Mistral API key with localStorage persistence
 *
 * Features:
 * - Automatically loads API key from localStorage on mount
 * - Falls back to environment variable only if user hasn't explicitly cleared it
 * - Persists API key to localStorage when saved
 * - Provides methods to update and clear the key
 * - Synchronized across all components using the hook
 *
 * @returns {UseApiKeyReturn} API key state and management functions
 */
export function useApiKey(): UseApiKeyReturn {
  // Use external store for synchronized state across all components
  const apiKey = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Derive isApiKeySet from apiKey
  const isApiKeySet = !!apiKey;

  /**
   * Update the API key in state without persisting
   */
  const setApiKey = (key: string) => {
    apiKeyState = key;
    emitChange();
  };

  /**
   * Save the API key to both state and localStorage
   */
  const saveApiKey = (key: string) => {
    try {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
      // Remove the cleared flag when saving a new key
      localStorage.removeItem(API_KEY_CLEARED_FLAG);
      apiKeyState = key;
      emitChange();
    } catch (error) {
      console.error('Failed to save API key to localStorage:', error);
      throw new Error('Failed to save API key. Please check your browser storage settings.');
    }
  };

  /**
   * Clear the API key from both state and localStorage
   * Sets a flag to prevent falling back to env variable
   */
  const clearApiKey = () => {
    try {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      // Set a flag to indicate user explicitly cleared the key
      localStorage.setItem(API_KEY_CLEARED_FLAG, 'true');
      apiKeyState = '';
      emitChange();
    } catch (error) {
      console.error('Failed to clear API key from localStorage:', error);
    }
  };

  return {
    apiKey,
    isApiKeySet,
    setApiKey,
    saveApiKey,
    clearApiKey,
  };
}
