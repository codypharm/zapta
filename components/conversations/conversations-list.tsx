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
import { Search, MessageSquare, Calendar, Bot, Loader2 } from "lucide-react";
import { getConversations, type Conversation } from "@/lib/conversations/actions";

interface ConversationsListProps {
  agents: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export function ConversationsList({ agents }: ConversationsListProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, [selectedAgent]);

  const loadConversations = async () => {
    setLoading(true);
    setError(null);

    const result = await getConversations({
      agentId: selectedAgent === "all" ? undefined : selectedAgent,
      searchQuery: searchQuery || undefined,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setConversations(result.conversations || []);
    }

    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadConversations();
  };

  const getLastMessage = (messages: Conversation["messages"]) => {
    if (!messages || messages.length === 0) return "No messages";
    const lastMsg = messages[messages.length - 1];
    return lastMsg.content.substring(0, 100) + (lastMsg.content.length > 100 ? "..." : "");
  };

  const getMessageCount = (messages: Conversation["messages"]) => {
    return messages?.length || 0;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Conversations</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            View and manage all conversations across your agents
          </p>
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
                    placeholder="Search conversations..."
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

        {/* Conversations List */}
        {!loading && conversations.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Conversations will appear here when visitors use your embedded widgets or when you test agents
                </p>
                <Button asChild>
                  <Link href="/agents">Go to Agents</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && conversations.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""} found
            </div>

            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                className="hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => router.push(`/conversations/${conversation.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Bot className="w-4 h-4 text-primary shrink-0" />
                        <CardTitle className="text-base sm:text-lg truncate" title={conversation.agent?.name || "Unknown Agent"}>
                          {conversation.agent?.name || "Unknown Agent"}
                        </CardTitle>
                        <Badge variant="outline" className="capitalize text-xs shrink-0">
                          {conversation.agent?.type || "unknown"}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2 text-sm">
                        {getLastMessage(conversation.messages)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span>{getMessageCount(conversation.messages)} messages</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>{formatDate(conversation.updated_at)}</span>
                    </div>
                    {conversation.metadata?.sessionId && (
                      <div className="text-xs font-mono truncate">
                        Session: {conversation.metadata.sessionId.substring(0, 8)}...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
