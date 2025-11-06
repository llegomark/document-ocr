import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Home, ArrowLeft } from 'lucide-react'

export function NotFound() {
  return (
    <div className="container mx-auto px-4 py-6 lg:py-8 flex items-center justify-center flex-1">
      <Card className="w-full max-w-md shadow-2xl border-2 animate-in fade-in zoom-in duration-500">
        <CardHeader className="text-center bg-linear-to-br from-destructive/5 via-destructive/3 to-transparent">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center shadow-lg ring-4 ring-destructive/20">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">404 - Page Not Found</CardTitle>
          <CardDescription className="mt-2">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3">
            <Link to="/">
              <Button className="w-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                <Home className="h-4 w-4 mr-2" />
                Go to Home
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full shadow-sm hover:shadow-md transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              If you believe this is an error, please{' '}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold transition-colors"
              >
                report it on GitHub
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
