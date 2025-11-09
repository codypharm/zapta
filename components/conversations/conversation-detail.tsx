"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Calendar, Bot, Trash2, Download, Sparkles, User, Mail, Phone, Building } from "lucide-react";
import { type Conversation } from "@/lib/conversations/actions";
import { type Lead } from "@/lib/leads/actions";
import { deleteConversation } from "@/lib/conversations/actions";

interface ConversationDetailProps {
  conversation: Conversation;
  lead?: Lead;
}

export function ConversationDetail({ conversation, lead }: ConversationDetailProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteConversation(conversation.id);

    if (result.error) {
      alert(result.error);
      setIsDeleting(false);
    } else {
      router.push("/conversations");
      router.refresh();
    }
  };

  const handleExport = () => {
    // Create JSON export
    const exportData = {
      conversationId: conversation.id,
      agent: conversation.agent,
      sessionId: conversation.metadata?.sessionId,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
      messages: conversation.messages,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${conversation.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <div className="p-8">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Header */}
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href="/conversations">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Conversations
              </Link>
            </Button>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Conversation Details
                </h1>
                <p className="text-muted-foreground mt-2">
                  View the full conversation thread
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>

          {/* Agent Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{conversation.agent?.name || "Unknown Agent"}</CardTitle>
                  <CardDescription className="capitalize">
                    {conversation.agent?.type || "unknown"} agent
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Created</div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDate(conversation.created_at)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Last Updated</div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDate(conversation.updated_at)}</span>
                  </div>
                </div>
                {conversation.metadata?.sessionId && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground mb-1">Session ID</div>
                    <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      {conversation.metadata.sessionId}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lead Information */}
          {lead && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>
                      Lead collected before conversation
                    </CardDescription>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/leads/${lead.id}`}>
                      View Full Profile
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lead.name && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Name</div>
                        <div className="font-medium">{lead.name}</div>
                      </div>
                    </div>
                  )}

                  {lead.email && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Email</div>
                        <div className="font-medium text-sm break-all">{lead.email}</div>
                      </div>
                    </div>
                  )}

                  {lead.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Phone</div>
                        <div className="font-medium">{lead.phone}</div>
                      </div>
                    </div>
                  )}

                  {lead.company && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Company</div>
                        <div className="font-medium">{lead.company}</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Conversation Thread</CardTitle>
              <CardDescription>
                {conversation.messages?.length || 0} messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversation.messages && conversation.messages.length > 0 ? (
                  conversation.messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}

                      <div
                        className={`max-w-[75%] rounded-lg p-4 ${
                          message.role === "user"
                            ? "bg-primary text-white"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={message.role === "user" ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {message.role}
                          </Badge>
                        </div>
                        <div className="whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      </div>

                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0 font-semibold text-sm">
                          U
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages in this conversation
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be
              undone.
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
