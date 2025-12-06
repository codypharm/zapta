"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bot, MessageSquare, Edit, Trash2, MoreVertical, Sparkles, PlayCircle, Briefcase, Users, Wrench } from "lucide-react";
import { deleteAgent } from "@/lib/agents/actions";
import { useRouter } from "next/navigation";

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description: string;
    type: string;
    status: string;
    template?: string;
    config: {
      model: string;
      tone: string;
      instructions: string;
    };
    created_at: string;
  };
  conversationCount?: number;
}

const MODEL_LABELS: Record<string, string> = {
  "gemini-3-pro": "Gemini 3 Pro",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "gemini-2.0-flash-thinking": "Gemini 2.0 Thinking",
  "gemini-1.5-flash": "Gemini 1.5 Flash",
  "gemini-1.5-pro": "Gemini 1.5 Pro",
  "claude-3.5-sonnet": "Claude 3.5 Sonnet",
  "claude-3.5-haiku": "Claude 3.5 Haiku",
  "gpt-4o": "GPT-4o",
  "gpt-4.5": "GPT-4.5",
  "gpt-3.5-turbo": "GPT-3.5",
};

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<any>; label: string; color: string; bgGradient: string }> = {
  customer_assistant: { 
    icon: Users, 
    label: "Customer", 
    color: "text-blue-600",
    bgGradient: "from-blue-500/20 via-blue-400/10 to-cyan-500/5"
  },
  business_assistant: { 
    icon: Briefcase, 
    label: "Business", 
    color: "text-purple-600",
    bgGradient: "from-purple-500/20 via-purple-400/10 to-pink-500/5"
  },
  support: { 
    icon: Users, 
    label: "Support", 
    color: "text-green-600",
    bgGradient: "from-green-500/20 via-green-400/10 to-emerald-500/5"
  },
  sales: { 
    icon: Users, 
    label: "Sales", 
    color: "text-orange-600",
    bgGradient: "from-orange-500/20 via-orange-400/10 to-amber-500/5"
  },
};

export function AgentCard({ agent, conversationCount = 0 }: AgentCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteAgent(agent.id);

    if (result.error) {
      alert(result.error);
      setIsDeleting(false);
    } else {
      router.refresh();
    }
  };

  const modelLabel = MODEL_LABELS[agent.config?.model] || agent.config?.model || "AI Model";
  const typeConfig = TYPE_CONFIG[agent.type] || TYPE_CONFIG.customer_assistant;
  const TypeIcon = typeConfig.icon;
  const isBusinessAssistant = agent.type === 'business_assistant';

  return (
    <>
      <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-200 border hover:border-primary/30">
        {/* Gradient accent bar */}
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${typeConfig.bgGradient.replace('/20', '/60').replace('/10', '/40').replace('/5', '/20')}`} />
        
        <CardHeader className="relative space-y-4 pb-2">
          {/* Top Section: Icon, Status, Actions */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Icon with gradient background */}
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${typeConfig.bgGradient} flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-sm`}>
                {isBusinessAssistant ? (
                  <Briefcase className={`w-6 h-6 sm:w-7 sm:h-7 ${typeConfig.color}`} />
                ) : (
                  <Bot className={`w-6 h-6 sm:w-7 sm:h-7 ${typeConfig.color}`} />
                )}
              </div>
              
              {/* Status + Type badges */}
              <div className="flex flex-col gap-1.5">
                <Badge 
                  variant={agent.status === "active" ? "default" : "secondary"}
                  className={`text-[10px] sm:text-xs px-2 py-0.5 ${
                    agent.status === "active" 
                      ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400" 
                      : ""
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${agent.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                  {agent.status}
                </Badge>
                <Badge variant="outline" className={`text-[10px] sm:text-xs px-2 py-0.5 ${typeConfig.color} border-current/20`}>
                  <TypeIcon className="w-3 h-3 mr-1" />
                  {typeConfig.label}
                </Badge>
              </div>
            </div>

            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem asChild>
                  <Link href={`/agents/${agent.id}`} className="cursor-pointer">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Test Agent
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/agents/${agent.id}/edit`} className="cursor-pointer">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title & Description */}
          <div className="min-w-0 space-y-1">
            <CardTitle 
              className="text-lg sm:text-xl font-semibold group-hover:text-primary transition-colors truncate" 
              title={agent.name}
            >
              {agent.name}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-sm leading-relaxed">
              {agent.description || "No description provided"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4 pt-2">
          {/* Agent Details Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground bg-slate-100 dark:bg-slate-800 rounded-full px-2.5 py-1">
              <Sparkles className="w-3 h-3" />
              <span className="font-medium truncate max-w-[100px] sm:max-w-none">{modelLabel}</span>
            </div>
            {isBusinessAssistant && (
              <div className="flex items-center gap-1.5 text-purple-600 bg-purple-100 dark:bg-purple-900/30 rounded-full px-2.5 py-1">
                <Wrench className="w-3 h-3" />
                <span className="font-medium">27 Tools</span>
              </div>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              <span>{conversationCount} conversation{conversationCount !== 1 ? 's' : ''}</span>
            </div>
            <span className="text-xs">
              {new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button asChild className="flex-1 h-9" size="sm">
              <Link href={`/agents/${agent.id}`}>
                <PlayCircle className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Test Agent</span>
                <span className="sm:hidden">Test</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-9 px-3">
              <Link href={`/agents/${agent.id}/edit`}>
                <Edit className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<strong>{agent.name}</strong>"? This action cannot be undone.
              All conversations and data associated with this agent will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Agent"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
