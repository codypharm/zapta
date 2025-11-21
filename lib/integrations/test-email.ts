import { EmailIntegration } from "./email";

async function testEmailIntegration() {
  console.log("📧 Testing Email Integration\n");

  // Create test integration record
  const integrationRecord = {
    id: "test-integration-id",
    tenant_id: "test-tenant-id",
    provider: "email",
    type: "email",
    credentials: {
      api_key: process.env.RESEND_API_KEY!,
      from_email: "onboarding@resend.dev",
      from_name: "Zapta Test",
    },
    config: {},
    status: "connected",
    webhook_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log("1. Creating Email Integration instance...");
  const emailIntegration = new EmailIntegration(integrationRecord);
  console.log("✅ Instance created\n");

  console.log("2. Testing connection...");
  const isConnected = await emailIntegration.testConnection();
  console.log("Connection status:", isConnected ? "✅ Connected" : "❌ Failed\n");

  if (!isConnected) {
    console.error("❌ Connection test failed - check your RESEND_API_KEY");
    process.exit(1);
  }

  console.log("3. Testing send email...");
  try {
    const result = await emailIntegration.executeAction("send_email", {
      to: "delivered@resend.dev", // Resend's test recipient
      subject: "Test Email from Zapta",
      body: "This is a test email sent via the integration system!",
    });
    
    console.log("✅ Email sent successfully!");
    console.log("Message ID:", result.messageId);
    console.log("\n📬 Check the Resend dashboard to see the email!");
    console.log("   https://resend.com/emails");
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    process.exit(1);
  }

  console.log("\n4. Getting config schema...");
  const schema = emailIntegration.getConfigSchema();
  console.log("Config type:", schema.type);
  console.log("Required fields:", schema.fields.filter(f => f.required).map(f => f.key));

  console.log("\n5. Getting capabilities...");
  const capabilities = emailIntegration.getCapabilities();
  console.log("Capabilities:", capabilities);

  console.log("\n✅ All Email Integration tests passed!");
}

testEmailIntegration().catch((error) => {
  console.error("❌ Email integration test failed:", error);
  process.exit(1);
});
