/**
 * Weekly Summary Email Template
 * Sent weekly with activity summary
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

interface WeeklySummaryEmailProps {
  userName: string;
  activity: {
    conversations: number;
    leads: number;
    agentActivity: Array<{
      name: string;
      conversations: number;
      leads: number;
    }>;
  };
  weekStart: string;
  weekEnd: string;
  appUrl: string;
}

export const WeeklySummaryEmail = ({
  userName,
  activity,
  weekStart,
  weekEnd,
  appUrl,
}: WeeklySummaryEmailProps) => {
  const previewText = `Your weekly summary for ${weekStart} - ${weekEnd}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Weekly Activity Summary 📈</Heading>

          <Text style={text}>
            Hi {userName}, here's your activity summary for the week of{" "}
            {weekStart} - {weekEnd}:
          </Text>

          {/* Summary Cards */}
          <Section style={metricsContainer}>
            <table style={metricsTable}>
              <tr>
                <td style={metricCard}>
                  <Text style={metricValue}>{activity.conversations}</Text>
                  <Text style={metricLabel}>Conversations</Text>
                </td>
                <td style={metricCard}>
                  <Text style={metricValue}>{activity.leads}</Text>
                  <Text style={metricLabel}>New Leads</Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* Agent Activity */}
          {activity.agentActivity.length > 0 && (
            <>
              <Text style={sectionTitle}>Agent Performance This Week</Text>
              <Section style={agentSection}>
                {activity.agentActivity.map((agent, index) => (
                  <div key={index} style={agentRow}>
                    <Text style={agentName}>{agent.name}</Text>
                    <Text style={agentStats}>
                      {agent.conversations} conversations • {agent.leads} leads
                    </Text>
                  </div>
                ))}
              </Section>
            </>
          )}

          {activity.conversations === 0 && activity.leads === 0 && (
            <Section style={emptyState}>
              <Text style={emptyText}>
                No activity this week. Your agents are ready when you need them!
              </Text>
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button style={button} href={`${appUrl}/analytics`}>
              View Full Analytics
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            You're receiving this weekly summary because it's enabled in your settings.{" "}
            <Link href={`${appUrl}/settings`} style={link}>
              Manage preferences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WeeklySummaryEmail;

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

const sectionTitle = {
  color: "#333",
  fontSize: "18px",
  fontWeight: "600",
  margin: "24px 20px 12px",
};

const metricsContainer = {
  margin: "24px 20px",
};

const metricsTable = {
  width: "100%",
  borderCollapse: "separate" as const,
  borderSpacing: "12px",
};

const metricCard = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "20px",
  textAlign: "center" as const,
  border: "1px solid #e5e7eb",
};

const metricValue = {
  color: "#FF7A59",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "0 0 8px 0",
};

const metricLabel = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0",
};

const agentSection = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  margin: "12px 20px",
  border: "1px solid #e5e7eb",
  boxSizing: "border-box" as const,
  maxWidth: "calc(100% - 40px)",
};

const agentRow = {
  padding: "12px 0",
  borderBottom: "1px solid #e5e7eb",
};

const agentName = {
  color: "#333",
  fontSize: "15px",
  fontWeight: "600",
  margin: "0 0 4px 0",
};

const agentStats = {
  color: "#6b7280",
  fontSize: "13px",
  margin: "0",
};

const emptyState = {
  textAlign: "center" as const,
  padding: "40px 20px",
};

const emptyText = {
  color: "#6b7280",
  fontSize: "15px",
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
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
