"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { uploadDocument } from "@/lib/knowledge/client-actions";

interface DocumentUploadProps {
  agentId?: string;
  onUploadComplete?: () => void;
}

export function DocumentUpload({ agentId, onUploadComplete }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    // Check file type
    const allowedTypes = [
      'text/plain', 
      'text/markdown', 
      'text/csv', 
      'application/json',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // DOCX
    ];
    const allowedExtensions = ['.txt', '.md', '.csv', '.json', '.pdf', '.docx', '.doc'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(selectedFile.type) && !allowedExtensions.includes(fileExtension)) {
      setError("Please upload a supported file type (.txt, .md, .csv, .json, .pdf, .docx)");
      return;
    }

    // Check file size (10MB limit for PDF/DOCX)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    setName(selectedFile.name);
    setError("");

    // Read file content based on type
    try {
      const text = await extractTextFromFile(selectedFile);
      setContent(text);
    } catch (err) {
      setError("Failed to read file. Please ensure it's a valid document.");
    }
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    await handleFileSelect(selectedFile);
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    switch (fileExtension) {
      case '.pdf':
        return await extractTextFromPDF(file);
      case '.docx':
      case '.doc':
        return await extractTextFromDocx(file);
      case '.txt':
      case '.md':
      case '.csv':
      case '.json':
      default:
        return await readFileAsText(file);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const { PDFParse } = await import('pdf-parse');
    
    try {
      const uint8Array = new Uint8Array(arrayBuffer);
      const parser = new PDFParse({ data: uint8Array });
      const result = await parser.getText();
      await parser.destroy();
      return result.text;
    } catch (error) {
      throw new Error("Failed to extract text from PDF. The file may be corrupted or password protected.");
    }
  };

  const extractTextFromDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const mammoth = await import('mammoth');
    
    try {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      throw new Error("Failed to extract text from Word document. The file may be corrupted or password protected.");
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

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const removeFile = () => {
    setFile(null);
    setName("");
    setContent("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) {
      setError("Please provide both a name and content for the document.");
      return;
    }

    setIsUploading(true);
    setError("");
    setSuccess("");

    try {
      const result = await uploadDocument(
        name.trim(),
        content.trim(),
        agentId,
        {
          fileType: file?.type,
          fileSize: file?.size,
        }
      );

      if (result.success) {
        setSuccess(`Document uploaded successfully! Created ${result.chunksCreated} chunks for optimal search.`);
        setName("");
        setContent("");
        setFile(null);
        onUploadComplete?.();
      } else {
        setError(result.error || "Failed to upload document");
      }
    } catch (err) {
      setError("An unexpected error occurred while uploading the document.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Document
        </CardTitle>
        <CardDescription>
          Add documents to your knowledge base. Text will be automatically chunked and indexed for semantic search.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
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
                    {isDragging ? "Drop your file here" : "Drop files here or click to browse"}
                  </span>
                </label>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  accept=".txt,.md,.csv,.json,.pdf,.docx,.doc"
                  onChange={handleFileChange}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Supports .txt, .md, .csv, .json, .pdf, .docx files up to 10MB
              </p>
            </div>

            {file && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Document Name *
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a descriptive name for this document"
              required
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              Document Content *
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or type the document content here..."
              className="min-h-[200px]"
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              Content will be automatically chunked for optimal search performance
            </p>
          </div>

          <Button
            type="submit"
            disabled={isUploading || !name.trim() || !content.trim()}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Document...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Upload Document
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}