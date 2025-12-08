/**
 * Public Chat API for Widget
 * Handles chat messages from embedded widgets
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { notifyTenantUsers } from "@/lib/notifications/email";
import { searchDocuments } from "@/lib/knowledge/actions";
import { trackSearchQuery, trackSearchHit, trackContextUsage } from "@/lib/knowledge/analytics";
import {
  triggerAgentCompletedEvent,
  triggerAgentFailedEvent,
  triggerConversationNewEvent,
} from "@/lib/webhooks/triggers";
import { executeAgent } from "@/lib/agents/execute"; // NEW - use unified agent execution

// Create Supabase client with service role (bypass RLS for public endpoint)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SearchDocument {
  id: string;
  content: string;
  metadata?: {
    originalFileName?: string;
    [key: string]: any;
  };
  similarity?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = await request.json();
    const { message, sessionId, history = [], leadId } = body;

    // Validate input
    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Load agent configuration
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Check if agent is active
    if (agent.status !== "active") {
      return NextResponse.json(
        { error: "Agent is not available" },
        { status: 503 }
      );
    }

    // Use unified executeAgent (includes RAG, integrations, webhooks)
    const userSession = `widget-${sessionId}-${Date.now()}`;
    const result = await executeAgent(agentId, {
      type: "chat",
      message,
      userSession
    });

    // Save conversation to database
    await saveConversation(agent.id, agent.tenant_id, sessionId, [
      ...history,
      { role: "user", content: message },
      { role: "assistant", content: result.message },
    ], leadId);

    // Return response with sources
    return NextResponse.json({
      message: result.message,
      sessionId,
      sources: result.sources,
    });
  } catch (error) {
    console.error("Widget chat error:", error);
    
    const errorMessage = (error as Error)?.message || "Unknown error";
    
    // Check if it's a usage limit or subscription error
    const isLimitError = errorMessage.includes("limit reached") || 
                         errorMessage.includes("upgrade your plan");
    
    const isSubscriptionError = errorMessage.includes("subscription") ||
                                errorMessage.includes("payment") ||
                                errorMessage.includes("Service unavailable") ||
                                errorMessage.includes("currently unavailable");
    
    const isModelRestriction = errorMessage.includes("not available on your") ||
                               errorMessage.includes("Available models:");
    
    // Try to trigger failure webhook if we have agent context
    try {
      const {agentId} = await params;
      const { data: agent } = await supabase
        .from("agents")
        .select("name, tenant_id")
        .eq("id", agentId)
        .single();
        
      if (agent) {
        await triggerAgentFailedEvent(
          agent.tenant_id,
          agentId,
          agent.name,
          { type: "chat" as const },
          errorMessage
        );
      }
    } catch (webhookError) {
      // Ignore webhook errors
    }
    
    // Return user-friendly error messages
    if (isModelRestriction) {
      return NextResponse.json(
        { 
          error: "This agent's configuration requires a plan upgrade. Please contact the site owner.",
          modelRestriction: true 
        },
        { status: 403 } // Forbidden
      );
    }
    
    if (isSubscriptionError) {
      return NextResponse.json(
        { 
          error: "This service is temporarily unavailable. Please contact support if this persists.",
          subscriptionError: true 
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    if (isLimitError) {
      return NextResponse.json(
        { 
          error: "This agent has reached its usage limit. Please try again later or contact support.",
          limitReached: true 
        },
        { status: 429 } // Too Many Requests
      );
    }
    
    return NextResponse.json(
      { error: "I'm having trouble responding right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}

/**
 * Search knowledge base and format context for AI (Widget version)
 */
async function getRAGContext(tenantId: string, agentId: string, message: string, userSession?: string) {
  try {
    console.log(`🔍 Widget RAG search for agent ${agentId}: "${message}"`);
    console.log(`   └─ Tenant: ${tenantId}, Agent: ${agentId || 'global'}, Threshold: 0.7`);
    
    const result = await searchDocuments(tenantId, message, agentId, 3, 0.7, userSession);
    
    if (result.success) {
      if (result.documents.length > 0) {
        console.log(`✅ Found ${result.documents.length} relevant documents for widget chat:`);
        
        // Log each document with similarity score
        result.documents.forEach((doc: SearchDocument, idx: number) => {
          const similarity = ((doc.similarity || 0) * 100).toFixed(1);
          const filename = doc.metadata?.originalFileName || 'Unknown';
          const preview = doc.content.substring(0, 100);
          console.log(`   ${idx + 1}. ${filename} (${similarity}% match)`);
          console.log(`      Preview: "${preview}${doc.content.length > 100 ? '...' : ''}"`);
        });
        
        // Track context usage for analytics
        try {
          for (const doc of result.documents as SearchDocument[]) {
            await trackContextUsage(
              tenantId,
              agentId,
              doc.id,
              message,
              doc.similarity || 0,
              userSession
            );
          }
        } catch (analyticsError) {
          console.error("Widget analytics tracking failed:", analyticsError);
        }
        
        const context = result.documents
          .map((doc: SearchDocument) => `[Document: ${doc.metadata?.originalFileName || 'Unknown'}]\n${doc.content}`)
          .join('\n\n---\n\n');
        
        return {
          hasContext: true,
          context,
          sources: result.documents.map((doc: SearchDocument) => doc.metadata?.originalFileName || 'Unknown'),
        };
      } else {
        // Check if there are ANY documents for this agent/tenant
        const { data: allDocs } = await supabase
          .from('documents')
          .select('id, name, metadata')
          .eq('tenant_id', tenantId)
          .eq('agent_id', agentId);
        
        const docCount = allDocs?.length || 0;
        console.log(`ℹ️  No relevant documents found for widget query: "${message}"`);
        console.log(`   └─ Available documents: ${docCount}`);
        
        if (docCount === 0) {
          console.log(`   └─ ⚠️  No documents uploaded for this agent yet`);
        } else {
          console.log(`   └─ Available docs:`);
          allDocs?.slice(0, 3).forEach((doc, idx) => {
            const filename = doc.metadata?.originalFileName || doc.name;
            console.log(`      ${idx + 1}. ${filename}`);
          });
          if (docCount > 3) {
            console.log(`      ... and ${docCount - 3} more`);
          }
          console.log(`   └─ 💡 Try lowering threshold or ask more specific questions`);
        }
        
        return { hasContext: false, context: '', sources: [] };
      }
    } else {
      console.error(`❌ Document search failed: ${result.error}`);
      return { hasContext: false, context: '', sources: [] };
    }
  } catch (error) {
    console.error('Widget RAG search error:', error);
    return { hasContext: false, context: '', sources: [] };
  }
}

/**
 * Build system prompt based on agent configuration
 */
function buildSystemPrompt(name: string, instructions: string, tone: string, context?: string): string {
  const toneInstructions = {
    professional:
      "Maintain a professional and courteous tone in all responses.",
    friendly:
      "Be warm, friendly, and approachable while remaining helpful and informative.",
    casual:
      "Use a casual, conversational tone as if chatting with a friend.",
    formal:
      "Use formal language and maintain a serious, respectful tone throughout.",
  };

  const contextSection = context ? `

RELEVANT KNOWLEDGE BASE CONTENT:
${context}

Use the above knowledge base content to inform your responses when relevant. If the user's question relates to information in the knowledge base, prioritize that information in your answer. If the knowledge base doesn't contain relevant information, rely on your general knowledge.` : '';

  return `You are ${name}, an AI assistant.

${instructions}

${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professional}${contextSection}

Important guidelines:
- Be concise and clear in your responses
- If you don't know something, admit it rather than making up information
- Stay focused on helping the user with their query
- Always be respectful and helpful
${context ? '- When using knowledge base information, be specific and cite the relevant documents when helpful' : ''}`;
}

/**
 * Select and configure AI model
 */
function selectAIModel(modelName: string) {
  if (modelName.includes("gemini")) {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY!,
    });

    const modelMap: Record<string, string> = {
      "gemini-1.5-flash": "gemini-flash-latest",
      "gemini-2.5-flash": "gemini-flash-latest",
      "gemini-1.5-pro": "gemini-pro-latest",
      "gemini-pro": "gemini-pro-latest",
    };

    const actualModel = modelMap[modelName] || "gemini-flash-latest";
    return google(actualModel);
  } else if (modelName.includes("claude")) {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const modelMap: Record<string, string> = {
      "claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
      "claude-3-sonnet": "claude-3-sonnet-20240229",
      "claude-3-opus": "claude-3-opus-20240229",
    };

    const actualModel = modelMap[modelName] || modelMap["claude-3-5-sonnet"];
    return anthropic(actualModel);
  } else if (modelName.includes("gpt")) {
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    return openai(modelName);
  } else {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY!,
    });
    return google("gemini-flash-latest");
  }
}

/**
 * Save conversation to database
 */
async function saveConversation(
  agentId: string,
  tenantId: string,
  sessionId: string,
  messages: Message[],
  leadId?: string
) {
  try {
    // Check if conversation exists for this session
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("agent_id", agentId)
      .eq("metadata->>sessionId", sessionId)
      .maybeSingle();

    if (existing) {
      // Update existing conversation
      await supabase
        .from("conversations")
        .update({
          messages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Create new conversation
      const { data: newConversation } = await supabase
        .from("conversations")
        .insert({
          tenant_id: tenantId,
          agent_id: agentId,
          messages,
          metadata: { sessionId },
        })
        .select("id, created_at")
        .single();

      // If leadId is provided, link the lead to this conversation
      if (leadId && newConversation) {
        await supabase
          .from("leads")
          .update({ conversation_id: newConversation.id })
          .eq("id", leadId);
      }

      // Send notification for new conversation (non-blocking)
      if (newConversation) {
        // Get agent name for notification
        const { data: agentData } = await supabase
          .from("agents")
          .select("name, type, description")
          .eq("id", agentId)
          .single();

        if (agentData) {
          notifyTenantUsers(tenantId, "new_conversation", {
            conversation: {
              id: newConversation.id,
              messages,
              created_at: newConversation.created_at,
            },
            agent: agentData,
          }).catch((error) => {
            console.error("Failed to send conversation notification:", error);
            // Don't fail the request if notification fails
          });
          
          // Trigger conversation.new webhook (non-blocking)
          triggerConversationNewEvent(
            tenantId,
            agentId,
            agentData.name,
            {
              id: newConversation.id,
              visitor_id: sessionId,
              source: "widget",
            }
          ).catch((error) => {
            console.error("Failed to trigger conversation.new webhook:", error);
          });
        }
      }
    }
  } catch (error) {
    console.error("Failed to save conversation:", error);
    // Don't throw - conversation saving failure shouldn't block the response
  }
}
