export function Footer() {
  return (
    <footer className="border-t backdrop-blur-sm bg-background/80 shrink-0">
      <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
        <p>
          Mark Anthony Llego &middot;{' '}
          <a
            href="https://docs.mistral.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-semibold transition-colors"
          >
            Documentation
          </a>
        </p>
      </div>
    </footer>
  );
}
