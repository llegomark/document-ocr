import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';
import { NotFound } from '@/components/not-found';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        name: 'description',
        content: 'Extract text from documents and images using Mistral AI\'s Document OCR API. Support for PDFs and images with multiple input methods.',
      },
      {
        name: 'keywords',
        content: 'OCR, document OCR, image OCR, Mistral AI, text extraction, PDF OCR, image to text',
      },
      {
        name: 'author',
        content: 'Mark Anthony Llego',
      },
      // Open Graph meta tags for social media sharing
      {
        property: 'og:title',
        content: 'Mistral Document OCR',
      },
      {
        property: 'og:description',
        content: 'Extract text from documents and images using Mistral AI\'s Document OCR API',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      // Twitter Card meta tags
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'Mistral Document OCR',
      },
      {
        name: 'twitter:description',
        content: 'Extract text from documents and images using Mistral AI\'s Document OCR API',
      },
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/vite.svg',
      },
    ],
  }),
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <HeadContent />
      <div className="min-h-screen bg-linear-to-br from-background via-primary/5 to-background flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col w-full">
          <Outlet />
        </main>
        <Footer />
      </div>
      <Scripts />

      {/* Development tools - only in development */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      <TanStackRouterDevtools position="bottom-right" />
    </QueryClientProvider>
  );
}
