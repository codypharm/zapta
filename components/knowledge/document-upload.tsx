"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { uploadDocument } from "@/lib/knowledge/client-actions";

interface DocumentUploadProps {
  agentId?: string;
  onUploadComplete?: () => void;
}

interface FileWithStatus {
  file: File;
  id: string;
  status: 'pending' | 'extracting' | 'uploading' | 'success' | 'error';
  error?: string;
  extractedText?: string;
  chunksCreated?: number;
}

export function DocumentUpload({ agentId, onUploadComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const allowedExtensions = ['.txt', '.md', '.csv', '.json', '.pdf', '.docx', '.doc'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return "Unsupported file type. Please upload .txt, .md, .csv, .json, .pdf, or .docx files";
    }

    if (file.size > 10 * 1024 * 1024) {
      return "File size must be less than 10MB";
    }

    return null;
  };

  const handleFilesSelect = useCallback(async (selectedFiles: FileList | File[]) => {
    setGeneralError("");
    const fileArray = Array.from(selectedFiles);

    const newFiles: FileWithStatus[] = fileArray.map(file => {
      const validationError = validateFile(file);
      return {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: validationError ? 'error' : 'pending',
        error: validationError || undefined,
      };
    });

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      await handleFilesSelect(event.target.files);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const extractTextViaAPI = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/knowledge/extract', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Server-side extraction failed');
    }

    if (!data.success || !data.text) {
      throw new Error('No text extracted from file');
    }

    return data.text;
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    switch (fileExtension) {
      case '.pdf':
      case '.docx':
      case '.doc':
        return await extractTextViaAPI(file);
      case '.txt':
      case '.md':
      case '.csv':
      case '.json':
      default:
        return await readFileAsText(file);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await handleFilesSelect(droppedFiles);
    }
  }, [handleFilesSelect]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setGeneralError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadAll = async () => {
    const filesToUpload = files.filter(f => f.status === 'pending' || f.status === 'error');

    if (filesToUpload.length === 0) {
      setGeneralError("No files to upload. Please add some files first.");
      return;
    }

    setIsProcessing(true);
    setGeneralError("");

    // Process files sequentially
    for (const fileWithStatus of filesToUpload) {
      try {
        // Update status to extracting
        setFiles(prev => prev.map(f =>
          f.id === fileWithStatus.id
            ? { ...f, status: 'extracting' as const, error: undefined }
            : f
        ));

        // Extract text from file
        const extractedText = await extractTextFromFile(fileWithStatus.file);

        // Update status to uploading
        setFiles(prev => prev.map(f =>
          f.id === fileWithStatus.id
            ? { ...f, status: 'uploading' as const, extractedText }
            : f
        ));

        // Upload to server
        const result = await uploadDocument(
          fileWithStatus.file.name,
          extractedText,
          agentId,
          {
            fileType: fileWithStatus.file.type,
            fileSize: fileWithStatus.file.size,
          }
        );

        if (result.success) {
          // Update status to success
          setFiles(prev => prev.map(f =>
            f.id === fileWithStatus.id
              ? { ...f, status: 'success' as const, chunksCreated: result.chunksCreated }
              : f
          ));
        } else {
          throw new Error(result.error || "Upload failed");
        }
      } catch (error) {
        // Update status to error
        setFiles(prev => prev.map(f =>
          f.id === fileWithStatus.id
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : "Unknown error"
              }
            : f
        ));
      }
    }

    setIsProcessing(false);
    onUploadComplete?.();
  };

  const pendingCount = files.filter(f => f.status === 'pending' || f.status === 'error').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const processingCount = files.filter(f => f.status === 'extracting' || f.status === 'uploading').length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Documents
        </CardTitle>
        <CardDescription>
          Add multiple documents to your knowledge base. Files will be automatically processed and indexed for semantic search.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {generalError && (
          <Alert variant="destructive">
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        {/* Drag and Drop Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  {isDragging ? "Drop your files here" : "Drop files here or click to browse"}
                </span>
              </label>
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                accept=".txt,.md,.csv,.json,.pdf,.docx,.doc"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Supports .txt, .md, .csv, .json, .pdf, .docx files up to 10MB each
            </p>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Files ({files.length})
                {successCount > 0 && (
                  <span className="ml-2 text-green-600">
                    {successCount} uploaded
                  </span>
                )}
              </h3>
              {!isProcessing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs"
                >
                  Clear All
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {files.map((fileWithStatus) => (
                <div
                  key={fileWithStatus.id}
                  className={`p-3 rounded-md border ${
                    fileWithStatus.status === 'success'
                      ? 'bg-green-50 border-green-200'
                      : fileWithStatus.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {fileWithStatus.status === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : fileWithStatus.status === 'error' ? (
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      ) : fileWithStatus.status === 'extracting' || fileWithStatus.status === 'uploading' ? (
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
                      ) : (
                        <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {fileWithStatus.file.name}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            ({(fileWithStatus.file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>

                        {fileWithStatus.status === 'extracting' && (
                          <p className="text-xs text-blue-600 mt-1">
                            Extracting text...
                          </p>
                        )}

                        {fileWithStatus.status === 'uploading' && (
                          <p className="text-xs text-blue-600 mt-1">
                            Uploading to knowledge base...
                          </p>
                        )}

                        {fileWithStatus.status === 'success' && fileWithStatus.chunksCreated && (
                          <p className="text-xs text-green-600 mt-1">
                            Uploaded! Created {fileWithStatus.chunksCreated} chunk{fileWithStatus.chunksCreated > 1 ? 's' : ''}
                          </p>
                        )}

                        {fileWithStatus.status === 'error' && fileWithStatus.error && (
                          <p className="text-xs text-red-600 mt-1">
                            {fileWithStatus.error}
                          </p>
                        )}
                      </div>
                    </div>

                    {!isProcessing && fileWithStatus.status !== 'extracting' && fileWithStatus.status !== 'uploading' && (
                      <button
                        type="button"
                        onClick={() => removeFile(fileWithStatus.id)}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <Button
            onClick={handleUploadAll}
            disabled={isProcessing || pendingCount === 0}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing {processingCount} of {files.length} files...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {pendingCount} File{pendingCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
