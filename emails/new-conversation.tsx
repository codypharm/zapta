/**
 * New Conversation Email Template
 * Sent when a new conversation is started with an agent
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface NewConversationEmailProps {
  conversation: {
    id: string;
    messages?: any[];
    created_at: string;
  };
  agent: {
    name: string;
    type: string;
    description?: string;
  };
  appUrl: string;
}

export const NewConversationEmail = ({
  conversation,
  agent,
  appUrl,
}: NewConversationEmailProps) => {
  const previewText = `New conversation started with ${agent.name}`;
  const messageCount = conversation.messages?.length || 0;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Conversation Started 💬</Heading>

          <Text style={text}>
            A new conversation has been started with your agent{" "}
            <strong>{agent.name}</strong>.
          </Text>

          <Section style={conversationInfo}>
            <Text style={infoRow}>
              <strong>Agent:</strong> {agent.name}
            </Text>
            <Text style={infoRow}>
              <strong>Type:</strong> {agent.type.charAt(0).toUpperCase() + agent.type.slice(1)}
            </Text>
            {agent.description && (
              <Text style={infoRow}>
                <strong>Description:</strong> {agent.description}
              </Text>
            )}
            <Text style={infoRow}>
              <strong>Messages:</strong> {messageCount} message{messageCount !== 1 ? "s" : ""}
            </Text>
          </Section>

          {conversation.messages && conversation.messages.length > 0 && (
            <Section style={messagePreview}>
              <Text style={messageLabel}>First Message:</Text>
              <Text style={messageContent}>
                "{conversation.messages[0]?.content?.substring(0, 150)}
                {(conversation.messages[0]?.content?.length || 0) > 150 ? "..." : ""}"
              </Text>
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button
              style={button}
              href={`${appUrl}/conversations/${conversation.id}`}
            >
              View Conversation
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            You're receiving this because you have new conversation notifications enabled.{" "}
            <Link href={`${appUrl}/settings`} style={link}>
              Manage preferences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default NewConversationEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
  width: "100%",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
  textAlign: "center" as const,
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 20px",
};

const conversationInfo = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 20px",
  border: "1px solid #e5e7eb",
  boxSizing: "border-box" as const,
  maxWidth: "calc(100% - 40px)",
};

const infoRow = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "4px 0",
  wordBreak: "break-word" as const,
};

const messagePreview = {
  backgroundColor: "#eff6ff",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 20px",
  border: "1px solid #dbeafe",
  boxSizing: "border-box" as const,
  maxWidth: "calc(100% - 40px)",
};

const messageLabel = {
  color: "#1e40af",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px 0",
};

const messageContent = {
  color: "#1e3a8a",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
  fontStyle: "italic",
  wordBreak: "break-word" as const,
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#FF7A59",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 20px",
};

const footer = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "16px 20px",
  textAlign: "center" as const,
};

const link = {
  color: "#FF7A59",
  textDecoration: "underline",
};
