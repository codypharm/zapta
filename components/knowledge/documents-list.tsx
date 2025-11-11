"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Trash2, Search, Calendar, Hash } from "lucide-react";
import { getDocuments, deleteDocument, Document } from "@/lib/knowledge/client-actions";
import { Input } from "@/components/ui/input";

interface DocumentsListProps {
  agentId?: string;
  refreshKey?: number;
}

export function DocumentsList({ agentId, refreshKey }: DocumentsListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const result = await getDocuments(agentId);
      
      if (result.success) {
        setDocuments(result.documents);
        setError("");
      } else {
        setError(result.error || "Failed to fetch documents");
      }
    } catch (err) {
      setError("An unexpected error occurred while fetching documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [agentId, refreshKey]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDocuments(filtered);
    } else {
      setFilteredDocuments(documents);
    }
  }, [documents, searchTerm]);

  const handleDelete = async (documentName: string) => {
    setDeletingDoc(documentName);
    
    try {
      const result = await deleteDocument(documentName);
      
      if (result.success) {
        await fetchDocuments(); // Refresh the list
      } else {
        setError(result.error || "Failed to delete document");
      }
    } catch (err) {
      setError("An unexpected error occurred while deleting the document.");
    } finally {
      setDeletingDoc(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading documents...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Knowledge Base Documents
        </CardTitle>
        <CardDescription>
          Manage documents in your knowledge base. Documents are automatically chunked for optimal RAG performance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-blue-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <FileText className="h-10 w-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              {searchTerm ? "No documents match your search" : "🧠 Build Your Knowledge Base"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm 
                ? "Try adjusting your search terms or upload more documents."
                : "Upload documents like FAQs, policies, guides, and product information. Your agent will use this content to provide accurate, helpful answers to users."
              }
            </p>
            {!searchTerm && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Better responses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Accurate information</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Instant search</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Smart context</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{doc.name}</h4>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      {doc.totalChunks} chunks
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                    {agentId && (
                      <Badge variant="outline">
                        Agent-specific
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.name)}
                  disabled={deletingDoc === doc.name}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {filteredDocuments.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} in knowledge base
          </div>
        )}
      </CardContent>
    </Card>
  );
}