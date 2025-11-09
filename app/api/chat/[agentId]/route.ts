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

// Create Supabase client with service role (bypass RLS for public endpoint)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = await request.json();
    const { message, sessionId, history = [] } = body;

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

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      agent.config.instructions,
      agent.config.tone
    );

    // Prepare conversation messages
    const conversationMessages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((msg: Message) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Select and call AI model
    const model = selectAIModel(agent.config.model);

    const { text } = await generateText({
      model,
      messages: conversationMessages,
      temperature: 0.7,
    });

    // Save conversation to database
    await saveConversation(agent.id, agent.tenant_id, sessionId, [
      ...history,
      { role: "user", content: message },
      { role: "assistant", content: text },
    ]);

    // Return response
    return NextResponse.json({
      message: text,
      sessionId,
    });
  } catch (error) {
    console.error("Widget chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

/**
 * Build system prompt based on agent configuration
 */
function buildSystemPrompt(instructions: string, tone: string): string {
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

  return `${instructions}

${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professional}

Important guidelines:
- Be concise and clear in your responses
- If you don't know something, admit it rather than making up information
- Stay focused on helping the user with their query
- Always be respectful and helpful`;
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
  messages: Message[]
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
      await supabase.from("conversations").insert({
        tenant_id: tenantId,
        agent_id: agentId,
        messages,
        metadata: { sessionId },
      });
    }
  } catch (error) {
    console.error("Failed to save conversation:", error);
    // Don't throw - conversation saving failure shouldn't block the response
  }
}
