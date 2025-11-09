/**
 * New Lead Email Template
 * Sent when a new lead is captured by an agent
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

interface NewLeadEmailProps {
  lead: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
  agent: {
    name: string;
    type: string;
  };
  appUrl: string;
}

export const NewLeadEmail = ({ lead, agent, appUrl }: NewLeadEmailProps) => {
  const leadName = lead.name || lead.email || "Anonymous";
  const previewText = `New lead captured: ${leadName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Lead Captured! 🎉</Heading>

          <Text style={text}>
            Your agent <strong>{agent.name}</strong> just captured a new lead:
          </Text>

          <Section style={leadInfo}>
            {lead.name && (
              <Text style={infoRow}>
                <strong>Name:</strong> {lead.name}
              </Text>
            )}
            {lead.email && (
              <Text style={infoRow}>
                <strong>Email:</strong> {lead.email}
              </Text>
            )}
            {lead.phone && (
              <Text style={infoRow}>
                <strong>Phone:</strong> {lead.phone}
              </Text>
            )}
            {lead.company && (
              <Text style={infoRow}>
                <strong>Company:</strong> {lead.company}
              </Text>
            )}
          </Section>

          <Section style={buttonContainer}>
            <Button
              style={button}
              href={`${appUrl}/leads/${lead.id}`}
            >
              View Lead Details
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            You're receiving this because you have new lead notifications enabled.{" "}
            <Link href={`${appUrl}/settings`} style={link}>
              Manage preferences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default NewLeadEmail;

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

const leadInfo = {
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
