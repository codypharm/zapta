/**
 * AI Chat Integration
 * Handles sending messages to AI models and tracking usage with RAG support
 */

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { searchDocuments } from "@/lib/knowledge/actions";
import { trackContextUsage } from "@/lib/knowledge/analytics";
import { knowledgeConfig } from "@/lib/knowledge/config";

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

/**
 * Search knowledge base and format context for AI
 */
async function getRAGContext(tenantId: string, agentId: string, message: string, userSession?: string) {
  try {
    const result = await searchDocuments(
      tenantId,
      message,
      agentId,
      knowledgeConfig.rag.contextLimit,
      knowledgeConfig.rag.contextThreshold,
      userSession
    );
    
    if (result.success && result.documents.length > 0) {
      // Track context usage for analytics
      try {
        for (const doc of result.documents) {
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
        console.error("Failed to track context usage:", analyticsError);
      }
      
      const context = result.documents
        .map((doc: SearchDocument) => `[Document: ${doc.metadata?.originalFileName || 'Unknown'}]\n${doc.content}`)
        .join('\n\n---\n\n');
      
      return {
        hasContext: true,
        context,
        sources: result.documents.map((doc: SearchDocument) => doc.metadata?.originalFileName || 'Unknown'),
      };
    }
    
    return { hasContext: false, context: '', sources: [] };
  } catch (error) {
    console.error('RAG search error:', error);
    return { hasContext: false, context: '', sources: [] };
  }
}

/**
 * Send a message to an agent and get AI response with RAG support
 */
export async function sendMessage(
  agentId: string,
  message: string,
  history: Message[]
) {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return { error: "User profile not found" };
  }

  try {
    // Fetch agent configuration
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (agentError || !agent) {
      return { error: "Agent not found" };
    }

    // Check if agent is active
    if (agent.status !== "active") {
      return { error: "Agent is not active" };
    }

    // Check usage limits (100 messages per month for MVP)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: metrics } = await supabase
      .from("usage_metrics")
      .select("value")
      .eq("tenant_id", profile.tenant_id)
      .eq("metric_type", "messages")
      .gte("date", startOfMonth.toISOString().split('T')[0]);

    // Sum all message counts for the month
    const totalMessages = metrics?.reduce((sum, m) => sum + (m.value || 0), 0) || 0;

    if (totalMessages >= 100) {
      return {
        error:
          "Monthly message limit reached (100 messages). Please upgrade your plan.",
      };
    }

    // Search knowledge base for relevant context
    const userSession = `${user.id}-${Date.now()}`;
    const ragContext = await getRAGContext(profile.tenant_id, agentId, message, userSession);

    // Build the prompt with agent configuration
    const systemPrompt = buildSystemPrompt(
      agent.name,
      agent.config.instructions,
      agent.config.tone,
      ragContext.hasContext ? ragContext.context : undefined
    );

    // Prepare conversation history
    const conversationMessages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Select AI model and call it
    const model = selectAIModel(agent.config.model);

    const { text, usage } = await generateText({
      model,
      messages: conversationMessages,
      temperature: 0.7,
    });

    // Log usage to database
    await logUsage(
      supabase,
      profile.tenant_id,
      agentId,
      usage?.inputTokens || 0,
      usage?.outputTokens || 0
    );

    return { 
      message: text,
      sources: ragContext.hasContext ? ragContext.sources : undefined
    };
  } catch (error) {
    console.error("AI chat error:", error);
    return { error: "Failed to get AI response. Please try again." };
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
 * Select and configure the AI model
 */
function selectAIModel(modelName: string) {
  if (modelName.includes("gemini")) {
    // Create Google AI instance with API key
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY!,
    });

    // Map to actual Google Gemini model names (without "models/" prefix - SDK adds it)
    const modelMap: Record<string, string> = {
      "gemini-1.5-flash": "gemini-flash-latest", // Latest stable flash model (free)
      "gemini-2.5-flash": "gemini-flash-latest", // Latest stable flash model (free)
      "gemini-1.5-pro": "gemini-pro-latest", // Latest stable pro model (free)
      "gemini-pro": "gemini-pro-latest",
    };

    const actualModel = modelMap[modelName] || "gemini-flash-latest";
    return google(actualModel);
  } else if (modelName.includes("claude")) {
    // Create Anthropic instance with API key
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    // Map to specific Claude model
    const modelMap: Record<string, string> = {
      "claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
      "claude-3-sonnet": "claude-3-sonnet-20240229",
      "claude-3-opus": "claude-3-opus-20240229",
    };

    const actualModel = modelMap[modelName] || modelMap["claude-3-5-sonnet"];
    return anthropic(actualModel);
  } else if (modelName.includes("gpt")) {
    // Create OpenAI instance with API key
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    return openai(modelName);
  } else {
    // Default to Gemini Flash (fastest free model)
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY!,
    });
    return google("gemini-flash-latest");
  }
}

/**
 * Log usage metrics to database
 */
async function logUsage(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tenantId: string,
  agentId: string,
  promptTokens: number,
  completionTokens: number
) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Try to increment existing metric, or create new one
    const { data: existing } = await supabase
      .from('usage_metrics')
      .select('id, value')
      .eq('tenant_id', tenantId)
      .eq('metric_type', 'messages')
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      // Update existing value
      await supabase
        .from('usage_metrics')
        .update({ value: existing.value + 1 })
        .eq('id', existing.id);
    } else {
      // Create new record
      await supabase.from('usage_metrics').insert({
        tenant_id: tenantId,
        metric_type: 'messages',
        value: 1,
        date: today,
      });
    }
  } catch (error) {
    console.error("Failed to log usage:", error);
    // Don't throw error - usage tracking failure shouldn't block the response
  }
}
