"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FileText, Target } from "lucide-react";

interface KnowledgeBaseStatsProps {
  metrics: {
    totalSearches: number;
    documentsUsed: number;
    avgRelevance: number;
    hitRate: number;
    topDocuments: Array<{
      id: string;
      filename: string;
      usageCount: number;
    }>;
  };
}

export function KnowledgeBaseStats({ metrics }: KnowledgeBaseStatsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge Base Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Searches</p>
              <p className="text-2xl font-bold">{metrics.totalSearches}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Documents Used</p>
              <p className="text-2xl font-bold">{metrics.documentsUsed}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hit Rate</p>
              <p className="text-2xl font-bold">{metrics.hitRate}%</p>
            </div>
          </div>
        </div>

        {/* Top Documents */}
        {metrics.topDocuments && metrics.topDocuments.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Top Documents</h4>
            <div className="space-y-2">
              {metrics.topDocuments.map((doc, index) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-medium">{doc.filename}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {doc.usageCount} uses
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {metrics.topDocuments?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No documents used yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
