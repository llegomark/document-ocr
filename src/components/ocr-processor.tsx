import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { OCRResult } from '@/lib/ocr-service';
import {
  isValidPdfFile,
  isValidImageFile,
  formatFileSize,
  detectInputType,
  hasMultipleUrls,
  downloadAsMarkdown,
} from '@/lib/file-utils';
import { FileText, Image as ImageIcon, Upload, Loader2, CheckCircle2, AlertCircle, Copy, Check, Sparkles, Link as LinkIcon, Download, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ZodError } from 'zod';
import { useOCRMutation, type OCRInputType } from '@/hooks/use-ocr';

interface OCRProcessorProps {
  apiKey: string;
}

export function OCRProcessor({ apiKey }: OCRProcessorProps) {
  const [result, setResult] = useState<OCRResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the OCR mutation hook
  const ocrMutation = useOCRMutation(apiKey, {
    onSuccess: (data) => {
      // Update local result state
      setResult(data);

      // Clear inputs after successful processing
      setTextInput('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      // Error is handled by mutation.error below
      console.error('OCR Error:', error);
    },
  });

  const handleError = (err: unknown) => {
    console.error('OCR Error:', err);
    // ZodError is now handled automatically by the mutation
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isPdf = isValidPdfFile(file);
    const isImage = isValidImageFile(file);

    if (!isPdf && !isImage) {
      // We'll show this as a validation error
      return;
    }

    setSelectedFile(file);
    // Clear any previous errors
    ocrMutation.reset();
  };

  const handleProcessFile = async () => {
    if (!selectedFile) {
      return;
    }

    // Create the input object
    const input: OCRInputType = {
      type: 'file',
      file: selectedFile,
    };

    // Process using the mutation
    ocrMutation.mutate(input);
  };

  const handleProcessText = async () => {
    if (!textInput.trim()) {
      return;
    }

    try {
      // Detect input type automatically
      const detected = detectInputType(textInput);

      if (detected.inputType === 'unknown') {
        return;
      }

      // Validate URL has proper file extension
      if (detected.inputType === 'url' && detected.contentType === 'unknown') {
        return;
      }

      let input: OCRInputType;

      if (detected.inputType === 'url') {
        // Process URL
        if (detected.contentType === 'pdf') {
          input = { type: 'url-document', url: detected.value };
        } else if (detected.contentType === 'image') {
          input = { type: 'url-image', url: detected.value };
        } else {
          return;
        }
      } else {
        // Process base64
        if (detected.contentType === 'pdf') {
          input = { type: 'base64-document', base64: detected.value, mimeType: 'application/pdf' };
        } else if (detected.contentType === 'image') {
          input = { type: 'base64-image', base64: detected.value, mimeType: 'image/jpeg' };
        } else {
          // Default to image
          input = { type: 'base64-image', base64: detected.value, mimeType: 'image/jpeg' };
        }
      }

      // Process using the mutation
      ocrMutation.mutate(input);
    } catch (err) {
      handleError(err);
    }
  };

  const handleCopyResult = async () => {
    if (!result?.text) return;

    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownloadResult = () => {
    if (!result?.text) return;
    downloadAsMarkdown(result.text);
  };

  const getDetectedBadge = () => {
    if (!textInput.trim()) return null;

    // Check for multiple URLs using the robust detection function
    if (hasMultipleUrls(textInput)) {
      return (
        <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">Multiple URLs detected. Only one URL is supported per request.</span>
        </div>
      );
    }

    const detected = detectInputType(textInput);

    if (detected.inputType === 'unknown') return null;

    // For URLs, validate that they have proper file extensions
    if (detected.inputType === 'url' && detected.contentType === 'unknown') {
      return (
        <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">URL must end with .pdf, .png, .jpg, .jpeg, .avif, .webp, or .gif</span>
        </div>
      );
    }

    const typeLabel = detected.inputType === 'url' ? 'URL' : 'Base64';
    const contentLabel = detected.contentType === 'pdf' ? 'PDF' :
      detected.contentType === 'image' ? 'Image' :
        'Auto-detect';

    return (
      <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm text-muted-foreground">Detected:</span>
        <Badge variant="secondary" className="font-mono text-xs">
          {typeLabel}
        </Badge>
        <Badge variant="outline" className="font-mono text-xs">
          {contentLabel}
        </Badge>
      </div>
    );
  };

  // Format error message for display
  const getErrorMessage = () => {
    if (!ocrMutation.error) return null;

    const error = ocrMutation.error;

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return firstError.path.length > 0
        ? `Validation error (${firstError.path.join('.')}): ${firstError.message}`
        : `Validation error: ${firstError.message}`;
    }

    // Handle standard errors
    return error.message || 'An error occurred during OCR processing';
  };

  // Check for file validation errors
  const fileValidationError = selectedFile && !isValidPdfFile(selectedFile) && !isValidImageFile(selectedFile)
    ? 'Please select a valid PDF or image file (PNG, JPEG, AVIF, WebP, GIF)'
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 flex-1 lg:h-full">
      {/* Input Section */}
      <div className="space-y-4 flex flex-col min-h-[600px] lg:h-[calc(100vh-12rem)]">
        <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow duration-300 flex-1 flex flex-col min-h-[600px] lg:min-h-0 overflow-hidden">
          <CardHeader className="bg-linear-to-br from-primary/5 via-primary/3 to-transparent shrink-0">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              Smart Document OCR
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-sm">
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold">What is OCR?</p>
                        <p className="opacity-90">Optical Character Recognition extracts text from PDFs and images using AI.</p>
                      </div>
                      <div>
                        <p className="font-semibold">Use Cases</p>
                        <p className="opacity-90">Digitize scanned documents, extract data from receipts, convert screenshots to text, parse forms and invoices.</p>
                      </div>
                      <div>
                        <p className="font-semibold">Features</p>
                        <p className="opacity-90">Preserves document structure (headers, lists, tables), returns markdown format, handles multi-column layouts, extracts image metadata.</p>
                      </div>
                      <div>
                        <p className="font-semibold">Limitations</p>
                        <p className="opacity-90">Accuracy depends on image quality. Works best with clear, well-lit documents. Handwriting recognition may be limited.</p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>
              Automatically detects PDFs and images from URLs, base64, or file uploads
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-6 flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* URL or Base64 Input */}
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <Label htmlFor="text-input" className="text-sm font-semibold flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                URL or Base64
              </Label>
              <Textarea
                id="text-input"
                placeholder="Paste a single URL or base64 data here...&#x0a;&#x0a;Examples:&#x0a;• https://example.com/document.pdf&#x0a;• https://example.com/image.png&#x0a;• JVBERi0xLjQKJeLjz9MKMy... (base64)&#x0a;&#x0a;Note: Only one URL is supported per request"
                value={textInput}
                onChange={(e) => {
                  setTextInput(e.target.value);
                  ocrMutation.reset(); // Clear errors when input changes
                }}
                className="font-mono text-sm transition-all focus:ring-2 focus:ring-primary/20 resize-none flex-1 min-h-0"
              />
              {getDetectedBadge()}
            </div>
            <Button
              onClick={handleProcessText}
              disabled={
                ocrMutation.isPending ||
                !textInput.trim() ||
                hasMultipleUrls(textInput) ||
                (detectInputType(textInput).inputType === 'url' && detectInputType(textInput).contentType === 'unknown')
              }
              className="w-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
            >
              {textInput.trim() && detectInputType(textInput).inputType === 'url' ? (
                <><LinkIcon className="mr-2 h-4 w-4" /> Process URL</>
              ) : textInput.trim() && detectInputType(textInput).inputType === 'base64' ? (
                <><Sparkles className="mr-2 h-4 w-4" /> Process Base64</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Process Document</>
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or upload file</span>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-input" className="text-sm font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload File
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full transition-all hover:border-primary/50"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose File
                </Button>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg,image/avif,image/webp,image/gif"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  className="hidden"
                />
              </div>
              {selectedFile && (isValidPdfFile(selectedFile) || isValidImageFile(selectedFile)) && (
                <div className="flex items-center gap-2 text-sm bg-accent/50 p-3 rounded-md border border-accent animate-in fade-in slide-in-from-top-1 duration-200">
                  <CheckCircle2 className="h-4 w-4 text-accent-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-accent-foreground truncate">
                      {selectedFile.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {isValidPdfFile(selectedFile) ? 'PDF' : 'Image'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Accepts PDF and image files (PNG, JPEG, AVIF, WebP, GIF)
              </p>
            </div>
            <Button
              onClick={handleProcessFile}
              disabled={ocrMutation.isPending || !selectedFile || !!fileValidationError}
              className="w-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
            >
              {selectedFile && isValidPdfFile(selectedFile) ? (
                <><FileText className="mr-2 h-4 w-4" /> Process PDF</>
              ) : selectedFile && isValidImageFile(selectedFile) ? (
                <><ImageIcon className="mr-2 h-4 w-4" /> Process Image</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> Process File</>
              )}
            </Button>

            {/* Error Display */}
            {(ocrMutation.error || fileValidationError) && (
              <div className="border-destructive border-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-300 p-4 bg-destructive/5">
                <div className="flex items-start gap-3 text-destructive">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-base">Error</p>
                    <p className="text-sm mt-1">{fileValidationError || getErrorMessage()}</p>
                  </div>
                </div>
              </div>
            )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Output Section */}
      <div className="space-y-4 flex flex-col min-h-[600px] lg:h-[calc(100vh-12rem)]">
        <Card className="flex-1 flex flex-col shadow-lg border-2 hover:shadow-xl transition-shadow duration-300 min-h-[600px] lg:min-h-0 overflow-hidden">
          <CardHeader className="bg-linear-to-br from-primary/5 via-primary/3 to-transparent shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  OCR Result
                </CardTitle>
                <CardDescription className="mt-2">
                  {result
                    ? `Processed ${result.pages ? `${result.pages} page${result.pages !== 1 ? 's' : ''}` : ''} in ${result.processingTime}ms`
                    : 'The extracted text will appear here'}
                </CardDescription>
              </div>
              {result && (
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCopyResult}
                          className="shrink-0 shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-accent-foreground" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{copied ? 'Copied!' : 'Copy to clipboard'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleDownloadResult}
                          className="shrink-0 shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download as markdown</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6 flex-1 flex flex-col overflow-hidden">
            {ocrMutation.isPending ? (
              <div className="flex items-center justify-center flex-1 min-h-[300px]">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary drop-shadow-lg" />
                  <p className="text-muted-foreground font-medium">Processing document...</p>
                </div>
              </div>
            ) : result ? (
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                <div className="border-2 rounded-lg p-4 bg-linear-to-br from-muted/30 to-muted/50 shadow-inner flex-1 overflow-auto min-h-0 scrollbar-custom">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                    {result.text}
                  </pre>
                </div>
                {result.images && result.images.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg border border-accent shrink-0">
                    <ImageIcon className="h-4 w-4 text-accent-foreground" />
                    <p className="text-sm font-semibold text-accent-foreground">
                      Images detected: {result.images.length}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center flex-1 min-h-[300px] text-muted-foreground">
                <div className="text-center space-y-3">
                  <div className="p-4 rounded-full bg-muted/50 inline-block">
                    <FileText className="h-12 w-12 opacity-50" />
                  </div>
                  <p className="font-medium">No results yet</p>
                  <p className="text-sm max-w-xs mx-auto">
                    Paste a URL or base64 data, or upload a file to extract text
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
