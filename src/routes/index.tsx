import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { OCRProcessor } from '@/components/ocr-processor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Key, AlertCircle } from 'lucide-react';
import { apiKeySchema } from '@/lib/validation-schemas';
import { ZodError } from 'zod';
import { useApiKey } from '@/hooks/use-api-key';

export const Route = createFileRoute('/')({
  component: Index,
  head: () => ({
    meta: [
      {
        title: 'Mistral Document OCR - Extract Text from Documents and Images',
      },
    ],
  }),
});

function Index() {
  const { apiKey, isApiKeySet, saveApiKey } = useApiKey();
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [apiKeyError, setApiKeyError] = useState<string>('');

  const handleSetApiKey = () => {
    try {
      // Validate API key with Zod
      apiKeySchema.parse(apiKeyInput);
      setApiKeyError('');
      // Save to localStorage and state
      saveApiKey(apiKeyInput);
    } catch (err) {
      if (err instanceof ZodError) {
        const firstError = err.issues[0];
        setApiKeyError(firstError.message);
      } else {
        setApiKeyError('Invalid API key format');
      }
    }
  };

  if (!isApiKeySet) {
    return (
      <div className="container mx-auto px-4 py-6 lg:py-8 flex items-center justify-center flex-1">
        <Card className="w-full max-w-md shadow-2xl border-2 animate-in fade-in zoom-in duration-500">
          <CardHeader className="text-center bg-linear-to-br from-primary/5 via-primary/3 to-transparent">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shadow-lg ring-4 ring-primary/20">
                <Key className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Mistral Document OCR
            </CardTitle>
            <CardDescription className="mt-2">
              Extract text from documents and images using Mistral AI's OCR API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-sm font-semibold">Mistral API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your Mistral API key"
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setApiKeyError(''); // Clear error on change
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSetApiKey();
                  }
                }}
                className={`transition-all focus:ring-2 focus:ring-primary/20 ${apiKeyError ? 'border-destructive' : ''
                  }`}
              />
              {apiKeyError && (
                <div className="flex items-center gap-2 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="h-4 w-4" />
                  <span>{apiKeyError}</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Your API key is stored in your browser's localStorage and never sent to any third party
              </p>
            </div>
            <Button
              onClick={handleSetApiKey}
              disabled={!apiKeyInput.trim()}
              className="w-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
            >
              Continue
            </Button>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Don't have an API key?{' '}
                <a
                  href="https://console.mistral.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-semibold transition-colors"
                >
                  Get one from Mistral AI
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 lg:py-8 flex flex-col flex-1">
      <OCRProcessor apiKey={apiKey} />
    </div>
  );
}
