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
import { searchDocuments } from "@/lib/knowledge/actions";
import { trackContextUsage } from "@/lib/knowledge/analytics";
import { knowledgeConfig } from "@/lib/knowledge/config";
import {
  triggerAgentCompletedEvent,
  triggerAgentFailedEvent,
} from "@/lib/webhooks/triggers";

interface AgentInput {
  type: "chat" | "email" | "webhook" | "slack" | "sms";
  from?: string;
  to?: string | string[];
  subject?: string;
  body?: string;
  message?: string;
  userSession?: string; // NEW - for RAG tracking and analytics
  payload?: any;
  timestamp?: string;
  attachments?: any[];
  html?: string;
}

interface AgentOutput {
  message: string;
  actions?: any[];
  sources?: string[]; // NEW - source documents from knowledge base
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
  
  let agent: any = null; // Declare outside try-catch for error handling

  try {
    // 1. Load agent configuration
    const { data: agentData, error: agentError } = await supabase
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

    if (agentError || !agentData) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    agent = agentData; // Assign to outer variable

    // 1.25. Check subscription validity and message usage limit (for chat messages)
    if (input.type === "chat") {
      const { validateSubscription, checkMessageLimit, incrementMessageUsage } = await import("@/lib/billing/usage");
      const { canUseModel, getPlanLimits } = await import("@/lib/billing/plans");
      
      // Get tenant's subscription plan - check subscriptions table first (source of truth)
      const { data: tenant } = await supabase
        .from("tenants")
        .select("subscription_plan")
        .eq("id", agent.tenant_id)
        .single();
      
      // Check subscriptions table for active subscription (source of truth for paid plans)
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("plan_id, status")
        .eq("tenant_id", agent.tenant_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      
      const subscription = subscriptions?.[0];
      
      // Use subscription plan_id if available, fallback to tenants.subscription_plan
      const planId = subscription?.plan_id || tenant?.subscription_plan || "free";
      
      console.log(`[EXECUTE] Tenant plan detected: ${planId} (from ${subscription?.plan_id ? 'subscriptions' : 'tenants'} table)`);
      
      // First, validate subscription (checks for expired/canceled/past_due)
      const subscriptionCheck = await validateSubscription(agent.tenant_id);
      
      if (!subscriptionCheck.valid) {
        const errorMessages: Record<string, string> = {
          canceled: "This service is currently unavailable (subscription canceled).",
          past_due: "This service is currently unavailable (payment overdue).",
          incomplete: "This service is currently unavailable (payment incomplete).",
          expired: "This service is currently unavailable (subscription expired).",
        };
        
        throw new Error(
          errorMessages[subscriptionCheck.subscriptionStatus || ''] || 
          subscriptionCheck.reason || 
          "Service unavailable"
        );
      }
      
      // Check if agent's model is allowed on current plan
      const agentModel = agent.config?.model || "gemini-2.0-flash";
      if (!canUseModel(planId, agentModel)) {
        const planLimits = getPlanLimits(planId);
        const allowedModels = planLimits.models === '*' 
          ? 'all models' 
          : (planLimits.models as readonly string[]).join(', ');
        
        throw new Error(
          `This agent uses ${agentModel} which is not available on your ${planId} plan. ` +
          `Available models: ${allowedModels}. Please upgrade your plan or change the agent's model.`
        );
      }
      
      // Then check message limits
      const usageCheck = await checkMessageLimit(agent.tenant_id);
      
      if (!usageCheck.allowed) {
        throw new Error(
          `Message limit reached (${usageCheck.current}/${usageCheck.limit}). Please upgrade your plan to continue.`
        );
      }
      
      // Increment usage after successful checks
      await incrementMessageUsage(agent.tenant_id);
    }

    // 1.5. Retrieve RAG context from knowledge base (if applicable)
    let ragContext = { hasContext: false, context: '', sources: [] as string[] };
    
    if (input.type === "chat" && input.message) {
      try {
        const result = await searchDocuments(
          agent.tenant_id,
          input.message,
          agentId,
          knowledgeConfig.rag.contextLimit,
          knowledgeConfig.rag.contextThreshold,
          input.userSession
        );
        
        if (result.success && result.documents && result.documents.length > 0) {
          // Track usage for each document
          for (const doc of result.documents) {
            try {
              await trackContextUsage(
                agent.tenant_id,
                agentId,
                doc.id,
                input.message,
                doc.similarity || 0,
                input.userSession
              );
            } catch (trackError) {
              console.error("Failed to track context usage:", trackError);
            }
          }
          
          // Format context for AI
          ragContext = {
            hasContext: true,
            context: result.documents
              .map((doc: any) => `[Document: ${doc.metadata?.originalFileName || 'Unknown'}]\n${doc.content}`)
              .join('\n\n---\n\n'),
            sources: result.documents.map((doc: any) => doc.metadata?.originalFileName || 'Unknown')
          };
          
          console.log(`[RAG] Found ${result.documents.length} relevant documents for agent ${agentId}`);
        }
      } catch (ragError) {
        console.error("RAG search error:", ragError);
        // Continue without RAG context
      }
    }

    // 2. Build context (conversation history, knowledge base)
    const context = await buildContext(agent, input);

    // 3. Build system prompt
    const systemPrompt = buildSystemPrompt(
      agent.name,
      agent.config.instructions,
      agent.config.tone,
      context,
      ragContext.context // Pass RAG context to system prompt
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

    // 6. Load tools for Business Assistants only (not Customer Assistants/widget)
    let availableTools = {};
    let toolCallResults: any[] = [];
    let integrationMap: Map<string, any> = new Map();
    
    if (agent.type === 'business_assistant') {
      // Only load integrations for Business Assistants
      integrationMap = await getIntegrationMap(agent.tenant_id, agent.id);
      
      const { createTools } = await import('./tools');
      
      // Create tools with context injected via closure
      const allTools = createTools({
        integrationMap,
        tenantId: agent.tenant_id,
        agentId: agent.id,
      });
      
      availableTools = allTools;
      
      console.log(`🔧 Loaded ${Object.keys(availableTools).length} tools for Business Assistant`);
    }


    // 7. Execute with tools (if Business Assistant) or without (if Customer Assistant)
    const generateOptions: any = {
      model,
      messages: conversationMessages,
      temperature: 0.7,
    };

    // Add tools and enable multi-step execution for Business Assistants
    if (Object.keys(availableTools).length > 0) {
      generateOptions.tools = availableTools;
      generateOptions.maxSteps = 5; // Allow up to 5 tool calls in sequence
    }

    const result = await generateText(generateOptions);
    
    const text = result.text;
    
    // Extract tool calls if any were made
    if (result.steps) {
      for (const step of result.steps) {
        if (step.toolCalls && step.toolCalls.length > 0) {
          toolCallResults.push(...step.toolCalls.map((tc: any, index: number) => ({
            toolName: tc.toolName,
            args: tc.args,
            result: step.toolResults?.[index],
          })));
        }
      }
    }

    // 8. Log tool usage if any tools were called
    if (toolCallResults.length > 0) {
      await logToolUsage(agent.tenant_id, agent.id, toolCallResults);
      console.log(`✅ Executed ${toolCallResults.length} tool calls`);
    }

    // 9. Process legacy agent actions (for Customer Assistants or as fallback)
    const actions = agent.type === 'customer_assistant' 
      ? await processAgentActions(agent, input, text)
      : []; // Business Assistants use tools instead

    // 10. Log execution
    await logExecution(agent.id, agent.tenant_id, input, {
      message: text,
      actions,
    });

    // 8. Trigger webhook event for agent completion
    await triggerAgentCompletedEvent(
      agent.tenant_id,
      agent.id,
      agent.name,
      input,
      { message: text, actions }
    );

    return {
      message: text,
      actions: actions || [],
      sources: ragContext.hasContext ? ragContext.sources : undefined, // Include RAG sources if available
    };
  } catch (error) {
    console.error("Agent execution error:", error);

    // Log error execution
    const tenantId = agent?.tenant_id || "unknown";
    const agentName = agent?.name || "Unknown Agent";
    
    await logExecution(
      agentId,
      tenantId,
      input,
      { message: "" },
      (error as Error)?.message || "Unknown error"
    );

    // Trigger webhook event for agent failure
    if (tenantId !== "unknown") {
      await triggerAgentFailedEvent(
        tenantId,
        agentId,
        agentName,
        input,
        (error as Error)?.message || "Unknown error"
      );
    }

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
  context: any,
  ragContext?: string // NEW - RAG context from knowledge base
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
    ? `\n\nCONTEXT:\n- Tenant: ${context.tenant}\n- Agent Type: ${context.type}\n${context.messages ? `- Recent Messages: ${context.messages.length} messages` : ""}\n${context.knowledge ? `- Knowledge Base: ${context.knowledge.documents?.length || 0} documents available` : ""}\n\nUse this context to inform your responses.`
    : "";

  // Add RAG context if available
  const ragContextSection = ragContext
    ? `\n\nKNOWLEDGE BASE CONTEXT:\n${ragContext}\n\nUse the above information from the knowledge base to provide accurate, context-specific answers. If the answer is in the knowledge base, use it. If not, provide general assistance.`
    : "";

  return `You are ${name}, an AI assistant.\n\n${instructions}\n\n${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professional}${contextSection}${ragContextSection}\n\nGuidelines:\n- Be helpful and accurate\n- Stay in character as defined\n- Use available context when relevant\n- If you don't know something, admit it clearly\n- Keep responses concise but complete`;
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
      // Gemini 3 Pro (preview - may require paid API)
      "gemini-3-pro": "gemini-3-pro-preview",
      "gemini-3-pro-preview": "gemini-3-pro-preview",
      // Gemini 2.5 Pro  
      "gemini-2.5-pro": "gemini-2.5-pro",
      // Gemini 2.5 Flash (speed + cost efficient)
      "gemini-2.5-flash": "gemini-2.5-flash",
      // Gemini 2.5 Flash-Lite (fastest/cheapest)
      "gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
      // Gemini 2.0 Flash (stable)
      "gemini-2.0-flash": "gemini-2.0-flash",
      "gemini-2.0-flash-exp": "gemini-2.0-flash-exp",
      "gemini-2.0-flash-thinking": "gemini-2.0-flash-thinking-exp",
      // Gemini 1.5
      "gemini-1.5-flash": "gemini-1.5-flash-latest",
      "gemini-1.5-flash-8b": "gemini-1.5-flash-8b-latest",
      "gemini-1.5-pro": "gemini-1.5-pro-latest",
      // Legacy
      "gemini-pro": "gemini-1.5-pro-latest",
    };

    // Use mapped model or fallback to stable gemini-2.0-flash
    const actualModel = modelMap[modelName] || "gemini-2.0-flash";
    console.log(`[MODEL] Requested: ${modelName} → Using: ${actualModel}`);
    return google(actualModel);
  } else if (modelName.includes("claude")) {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const modelMap: Record<string, string> = {
      // Claude Sonnet 4.5 (latest - best coding model)
      "claude-sonnet-4-5": "claude-sonnet-4-5",
      "claude-4-sonnet": "claude-sonnet-4-5",
      // Claude 3.5
      "claude-3.5-sonnet": "claude-3-5-sonnet-20241022",
      "claude-3.5-haiku": "claude-3-5-haiku-20241022",
      // Claude 3
      "claude-3-sonnet": "claude-3-sonnet-20240229",
      "claude-3-opus": "claude-3-opus-20240229",
      "claude-3-haiku": "claude-3-haiku-20240307",
    };

    const actualModel = modelMap[modelName] || modelMap["claude-sonnet-4-5"];
    return anthropic(actualModel);
  } else if (modelName.includes("gpt")) {
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Support common GPT model names
    return openai(modelName);
  } else {
    // Default to latest Gemini 2.0 Flash
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY!,
    });
    return google("gemini-2.0-flash-exp");
  }
}

/**
 * Process agent actions based on response
 * Note: This is primarily for email/sms trigger-based agents, not widget chat
 */
async function processAgentActions(
  agent: any,
  input: AgentInput,
  response: string
): Promise<any[]> {
  const actions: any[] = [];

  // Skip integration loading for widget chat - Customer Assistants don't use integrations
  if (input.type === "chat") {
    return actions;
  }

  try {
    // Get integration instances with credentials loaded from database
    // Only needed for email/sms triggered agents
    const integrationMap = await getIntegrationMap(agent.tenant_id, agent.id);

    console.log(
      `🔌 Available integrations for triggered agent: ${Array.from(integrationMap.keys()).join(", ")}`
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

    // Note: Chat-type inputs return early above since Customer Assistants don't use integrations
    // The remaining code handles email/sms triggered agents only
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
 * Log tool usage for analytics
 */
async function logToolUsage(
  tenantId: string,
  agentId: string,
  toolCalls: any[]
): Promise<void> {
  const supabase = await createServerClient();

  try {
    // Log each tool call individually
    const records = toolCalls.map(call => ({
      agent_id: agentId,
      tenant_id: tenantId,
      status: call.result?.error ? 'error' : 'success',
      input: {
        tool: call.toolName,
        args: call.args,
      },
      output: {
        result: call.result,
      },
      error: call.result?.error || null,
      duration_ms: null, // Could track this if needed
    }));

    // Store in agent_executions with tool_call metadata
    await supabase.from('agent_executions').insert(records);

    console.log(`📊 Logged ${toolCalls.length} tool calls for agent ${agentId}`);
  } catch (error) {
    console.error('Failed to log tool usage:', error);
    // Don't throw - logging failure shouldn't break execution
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
