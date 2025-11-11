"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  Search, 
  FileText, 
  Target, 
  Clock,
  Zap
} from "lucide-react";

interface DocumentUsage {
  document_name: string;
  usage_count: number;
  avg_similarity: number;
  last_used: string;
}

interface SearchEffectiveness {
  total_searches: number;
  successful_searches: number;
  success_rate: number;
  avg_results_count: number;
  avg_similarity_score: number;
  avg_execution_time: number;
}

interface TopQuery {
  query: string;
  count: number;
  avg_score: number;
}

interface AnalyticsDashboard {
  mostUsedDocuments: DocumentUsage[];
  searchEffectiveness: SearchEffectiveness | null;
  topSearchQueries: TopQuery[];
  dailyStats: any[];
}

interface KnowledgeAnalyticsProps {
  agentId?: string;
}

export function KnowledgeAnalytics({ agentId }: KnowledgeAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/knowledge/analytics', window.location.origin);
      if (agentId) url.searchParams.set('agentId', agentId);
      url.searchParams.set('daysBack', timeRange.toString());

      const response = await fetch(url.toString());
      const data = await response.json();

      if (response.ok) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [agentId, timeRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Failed to load analytics data.</p>
        </CardContent>
      </Card>
    );
  }

  const { searchEffectiveness, mostUsedDocuments, topSearchQueries } = analytics;

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map((days) => (
          <button
            key={days}
            onClick={() => setTimeRange(days)}
            className={`px-3 py-1 rounded text-sm ${
              timeRange === days 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {days}d
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {searchEffectiveness?.total_searches || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Last {timeRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {searchEffectiveness?.success_rate 
                ? searchEffectiveness.success_rate.toFixed(1)
                : '0'}%
            </div>
            <Progress 
              value={searchEffectiveness?.success_rate || 0} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Similarity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {searchEffectiveness?.avg_similarity_score 
                ? (searchEffectiveness.avg_similarity_score * 100).toFixed(1)
                : '0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average match quality
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {searchEffectiveness?.avg_execution_time 
                ? searchEffectiveness.avg_execution_time.toFixed(0)
                : '0'}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Search performance
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Most Used Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Most Used Documents
            </CardTitle>
            <CardDescription>
              Documents that appear most often in chat responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mostUsedDocuments.length > 0 ? (
              <div className="space-y-3">
                {mostUsedDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {doc.document_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(doc.avg_similarity * 100).toFixed(1)}% avg similarity
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {doc.usage_count} uses
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No document usage data yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Search Queries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Top Search Queries
            </CardTitle>
            <CardDescription>
              Most common questions users ask
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topSearchQueries.length > 0 ? (
              <div className="space-y-3">
                {topSearchQueries.map((query, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium line-clamp-2">
                        {query.query}
                      </p>
                      <Badge variant="outline">
                        {query.count}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={query.avg_score * 100} 
                        className="flex-1 h-1"
                      />
                      <span className="text-xs text-muted-foreground">
                        {(query.avg_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No search data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart */}
      {mostUsedDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Document Usage Distribution</CardTitle>
            <CardDescription>
              Visual breakdown of document usage frequency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mostUsedDocuments.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="document_name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="usage_count" 
                    fill="hsl(var(--primary))"
                    name="Uses"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}