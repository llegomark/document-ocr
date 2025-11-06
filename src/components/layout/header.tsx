import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Key, Github, LogOut } from 'lucide-react';
import { useApiKey } from '@/hooks/use-api-key';
import { queryClient } from '@/lib/query-client';

export function Header() {
  const { isApiKeySet, clearApiKey } = useApiKey();

  const handleResetApiKey = () => {
    clearApiKey();
    // Clear React Query cache to remove any cached OCR results
    queryClient.clear();
  };

  return (
    <header className="border-b backdrop-blur-sm bg-background/80 sticky top-0 z-50 shadow-sm shrink-0">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shadow-md ring-2 ring-primary/20">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Mistral Document OCR
            </h1>
            <p className="text-sm text-muted-foreground">
              Powered by Mistral AI
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {isApiKeySet && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetApiKey}
              className="shadow-sm hover:shadow-md transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Clear API Key
            </Button>
          )}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-primary/5"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
