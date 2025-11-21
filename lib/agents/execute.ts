/**
 * Agent Execution
 * Handles executing agents with various input types (chat, email, webhook, etc.)
 */

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { getIntegrationMap } from "@/lib/integrations/registry";

interface AgentInput {
  type: "chat" | "email" | "webhook" | "slack" | "sms";
  from?: string;
  to?: string | string[];
  subject?: string;
  body?: string;
  message?: string;
  payload?: any;
  timestamp?: string;
  attachments?: any[];
  html?: string;
}

interface AgentOutput {
  message: string;
  actions?: any[];
  metadata?: any;
}

/**
 * Execute an agent with given input
 */
export async function executeAgent(
  agentId: string,
  input: AgentInput
): Promise<AgentOutput> {
  const supabase = await createServerClient();

  try {
    // 1. Load agent configuration
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select(
        `
        *,
        tenants!inner(
          name,
          slug
        )
      `
      )
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // 2. Build context (conversation history, knowledge base)
    const context = await buildContext(agent, input);

    // 3. Build system prompt
    const systemPrompt = buildSystemPrompt(
      agent.name,
      agent.config.instructions,
      agent.config.tone,
      context
    );

    // 4. Prepare conversation messages
    const conversationMessages = [
      { role: "system" as const, content: systemPrompt },
      // Add context messages if available
      ...(context.messages || []),
      // Add current input as user message
      {
        role: "user" as const,
        content: buildUserPrompt(input),
      },
    ];

    // 5. Select and call AI model
    const model = selectAIModel(agent.config.model);

    const { text } = await generateText({
      model,
      messages: conversationMessages,
      temperature: 0.7,
    });

    // 6. Process agent actions based on response
    const actions = await processAgentActions(agent, input, text);

    // 7. Log execution
    await logExecution(agent.id, agent.tenant_id, input, {
      message: text,
      actions,
    });

    return {
      message: text,
      actions: actions || [],
    };
  } catch (error) {
    console.error("Agent execution error:", error);

    // Log error execution
    await logExecution(
      agentId,
      "unknown",
      input,
      { message: "" },
      (error as Error)?.message || "Unknown error"
    );

    throw error;
  }
}

/**
 * Build context for agent execution
 */
async function buildContext(agent: any, input: AgentInput): Promise<any> {
  const context: any = {
    tenant: agent.tenants?.name,
    agent: agent.name,
    type: input.type,
  };

  // Add recent conversation history for chat/email
  if (input.type === "chat" || input.type === "email") {
    const supabase = await createServerClient();

    const { data: conversations } = await supabase
      .from("conversations")
      .select("messages")
      .eq("agent_id", agent.id)
      .eq("tenant_id", agent.tenant_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (conversations && conversations.length > 0) {
      context.messages = conversations
        .flatMap((conv) => conv.messages || [])
        .slice(-10) // Last 10 messages
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
    }
  }

  // Add knowledge base context if available
  // This would integrate with your existing knowledge base system
  context.knowledge = await getKnowledgeContext(agent.id, input);

  return context;
}

/**
 * Build system prompt for agent
 */
function buildSystemPrompt(
  name: string,
  instructions: string,
  tone: string,
  context: any
): string {
  const toneInstructions = {
    professional:
      "Maintain a professional and courteous tone in all responses.",
    friendly:
      "Be warm, friendly, and approachable while remaining helpful and informative.",
    casual: "Use a casual, conversational tone as if chatting with a friend.",
    formal:
      "Use formal language and maintain a serious, respectful tone throughout.",
  };

  const contextSection = context
    ? `

CONTEXT:
- Tenant: ${context.tenant}
- Agent Type: ${context.type}
${context.messages ? `- Recent Messages: ${context.messages.length} messages` : ""}
${context.knowledge ? `- Knowledge Base: ${context.knowledge.documents?.length || 0} documents available` : ""}

Use this context to inform your responses.`
    : "";

  return `You are ${name}, an AI assistant.

${instructions}

${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professional}${contextSection}

Guidelines:
- Be helpful and accurate
- Stay in character as defined
- Use available context when relevant
- If you don't know something, admit it clearly
- Keep responses concise but complete`;
}

/**
 * Build user prompt based on input type
 */
function buildUserPrompt(input: AgentInput): string {
  switch (input.type) {
    case "email":
      return `From: ${input.from}
To: ${Array.isArray(input.to) ? input.to.join(", ") : input.to}
Subject: ${input.subject}
${input.attachments && input.attachments.length > 0 ? `Attachments: ${input.attachments.map((a) => a.filename).join(", ")}` : ""}

${input.body}`;

    case "webhook":
      return `Webhook Event: ${input.payload ? JSON.stringify(input.payload, null, 2) : "No payload"}
Timestamp: ${input.timestamp || new Date().toISOString()}`;

    case "slack":
      return `Slack Message
Channel: ${input.to}
User: ${input.from}
Message: ${input.message}`;

    case "sms":
      return `SMS From: ${input.from}
To: ${input.to}
Message: ${input.message}`;

    case "chat":
    default:
      return input.message || "";
  }
}

/**
 * Select AI model based on configuration
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
    // Default to Gemini
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY!,
    });
    return google("gemini-flash-latest");
  }
}

/**
 * Process agent actions based on response
 */
async function processAgentActions(
  agent: any,
  input: AgentInput,
  response: string
): Promise<any[]> {
  const actions: any[] = [];

  try {
    // Get integration instances with credentials loaded from database
    const integrationMap = await getIntegrationMap(agent.tenant_id);

    console.log(
      `🔌 Available integrations for tenant: ${Array.from(integrationMap.keys()).join(", ")}`
    );

    // Example: Send email response if email integration is available
    if (input.type === "email" && integrationMap.has("email")) {
      const emailIntegration = integrationMap.get("email");
      
      if (emailIntegration && input.from) {
        try {
          await emailIntegration.executeAction("send_email", {
            to: input.from,
            subject: `Re: ${input.subject || "Your message"}`,
            body: response,
          });
          
          actions.push({
            type: "email",
            action: "send_email",
            result: { to: input.from },
            success: true,
          });
        } catch (error) {
          actions.push({
            type: "email",
            action: "send_email",
            error: "Failed to send email response",
            success: false,
          });
        }
      }
    }

    // Example: Create HubSpot contact if mentioned in chat
    if (input.type === "chat" && response.toLowerCase().includes("contact")) {
      if (integrationMap.has("hubspot")) {
        const hubspotIntegration = integrationMap.get("hubspot");

        // Extract contact info from the conversation (simplified)
        const emailMatch = input.message?.match(/(\S+@\S+\.\S+)/);
        const nameMatch = input.message?.match(/my name is (\w+)/i);

        if (emailMatch && hubspotIntegration) {
          const contactData = {
            properties: {
              email: emailMatch[1],
              firstname: nameMatch?.[1] || "",
              lastname: "",
              phone: "",
              company: "",
            },
          };

          try {
            const result = await hubspotIntegration.executeAction(
              "create_contact",
              contactData
            );
            actions.push({
              type: "hubspot",
              action: "create_contact",
              result: { contactId: result.id, email: emailMatch[1] },
              success: true,
            });
          } catch (error) {
            actions.push({
              type: "hubspot",
              action: "create_contact",
              error: "Failed to create contact",
              success: false,
            });
          }
        }
      }
    }

    // Create deals for qualified leads
    if (
      input.type === "chat" &&
      response.toLowerCase().includes("interested")
    ) {
      if (integrationMap.has("hubspot")) {
        const hubspotIntegration = integrationMap.get("hubspot");

        if (hubspotIntegration) {
          try {
            const dealData = {
              properties: {
                dealname: "New Lead from Chat",
                amount: "1000",
                dealstage: "appointmentscheduled",
              },
              amount: 1000,
              stage: "appointmentscheduled",
            };

            const result = await hubspotIntegration.executeAction(
              "create_deal",
              dealData
            );
            actions.push({
              type: "hubspot",
              action: "create_deal",
              result: { dealId: result.id, dealName: "New Lead from Chat" },
              success: true,
            });
          } catch (error) {
            actions.push({
              type: "hubspot",
              action: "create_deal",
              error: "Failed to create deal",
              success: false,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing agent actions:", error);
  }

  return actions;
}

/**
 * Log agent execution for analytics
 */
async function logExecution(
  agentId: string,
  tenantId: string,
  input: AgentInput,
  output: any,
  error?: string
): Promise<void> {
  const supabase = await createServerClient();

  try {
    await supabase.from("agent_executions").insert({
      agent_id: agentId,
      tenant_id: tenantId,
      status: error ? "error" : "success",
      input,
      output,
      error,
      duration_ms: null, // Could be calculated if needed
    });
  } catch (logError) {
    console.error("Failed to log execution:", logError);
  }
}

/**
 * Get knowledge base context (placeholder - integrate with your existing system)
 */
async function getKnowledgeContext(
  agentId: string,
  input: AgentInput
): Promise<any> {
  // This would integrate with your existing knowledge base system
  // For now, return empty context
  return {
    documents: [],
    relevant: [],
  };
}
