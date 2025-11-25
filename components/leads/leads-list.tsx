"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Calendar, Mail, Phone, Building, Loader2, Download } from "lucide-react";
import { getLeads, exportLeadsToCSV, type Lead } from "@/lib/leads/actions";

interface LeadsListProps {
  agents: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export function LeadsList({ agents }: LeadsListProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");

  // Load leads
  useEffect(() => {
    loadLeads();
  }, [selectedAgent]);

  const loadLeads = async () => {
    setLoading(true);
    setError(null);

    const result = await getLeads({
      agentId: selectedAgent === "all" ? undefined : selectedAgent,
      searchQuery: searchQuery || undefined,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setLeads(result.leads || []);
    }

    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLeads();
  };

  const handleExport = async () => {
    setExporting(true);
    const result = await exportLeadsToCSV();

    if (result.error) {
      alert(result.error);
    } else if (result.csv) {
      // Download CSV
      const blob = new Blob([result.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    setExporting(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Leads</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Manage contact information collected from visitors
            </p>
          </div>
          <Button onClick={handleExport} disabled={exporting || leads.length === 0} variant="outline" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by name, email, or company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  Search
                </Button>
              </form>

              {/* Agent Filter */}
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Leads List */}
        {!loading && leads.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No leads yet</h3>
                <p className="text-muted-foreground mb-4">
                  Leads will appear here when visitors submit the contact form on your widget
                </p>
                <Button asChild>
                  <Link href="/agents">Go to Agents</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && leads.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {leads.length} lead{leads.length !== 1 ? "s" : ""} found
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {leads.map((lead) => (
                <Card
                  key={lead.id}
                  className="hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate">{lead.name || "Anonymous"}</span>
                        </CardTitle>
                        {lead.agent && (
                          <CardDescription className="mt-1 text-sm truncate" title={`via ${lead.agent.name}`}>
                            via {lead.agent.name}
                          </CardDescription>
                        )}
                      </div>
                      {lead.conversation_id && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          Has chat
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    {lead.email && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate" title={lead.email}>{lead.email}</span>
                      </div>
                    )}

                    {lead.phone && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{lead.phone}</span>
                      </div>
                    )}

                    {lead.company && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
                        <Building className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate" title={lead.company}>{lead.company}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>{formatDate(lead.created_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
