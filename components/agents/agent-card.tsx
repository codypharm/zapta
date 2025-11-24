"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Bot, MessageSquare, Edit, Trash2, MoreVertical, Sparkles, PlayCircle } from "lucide-react";
import { deleteAgent } from "@/lib/agents/actions";
import { useRouter } from "next/navigation";

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description: string;
    type: string;
    status: string;
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
  "gemini-1.5-flash": "Gemini 2.5 Flash",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-1.5-pro": "Gemini 2.5 Pro",
  "claude-3-5-sonnet": "Claude 3.5",
  "gpt-4": "GPT-4",
  "gpt-3.5-turbo": "GPT-3.5",
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

  const modelLabel = MODEL_LABELS[agent.config?.model] || agent.config?.model || "Unknown";

  return (
    <>
      <Card className="group hover:border-primary/50 hover:shadow-md transition-all duration-200">
        <CardHeader className="space-y-4">
          {/* Top Section: Icon, Status, Actions */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    agent.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {agent.status}
                </span>
              </div>
            </div>

            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
          <div>
            <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">
              {agent.name}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {agent.description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Agent Details */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-medium">{modelLabel}</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-muted-foreground capitalize">{agent.type}</span>
          </div>

          {/* Usage Stats */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            <span>{conversationCount} conversation{conversationCount !== 1 ? 's' : ''}</span>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Button asChild className="flex-1" size="sm">
              <Link href={`/agents/${agent.id}`}>
                <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                Test
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/agents/${agent.id}/edit`}>
                <Edit className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{agent.name}"? This action cannot be undone.
              All conversations and data associated with this agent will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
