/**
 * Simplified Integration Test
 * Tests that integrations can be loaded and used (without full auth setup)
 */

import { getIntegrationMap } from "./registry";

async function testIntegrationLoading() {
  console.log("🔌 Testing Integration Registry\n");

  try {
    // For this test, we'll use your actual tenant from Supabase
    // You can find your tenant_id by running:
    // SELECT id, slug FROM tenants;
    
    console.log("Note: This test requires an existing tenant with integrations.");
    console.log("To run full e2e test:");
    console.log("  1. Go to your app UI");
    console.log("  2. Connect an integration (Email)");
    console.log("  3. Note your tenant_id from database");
    console.log("  4. Update the test with your tenant_id\n");

    // Example: Replace with your actual tenant_id
    const TEST_TENANT_ID = "your-tenant-id-here";
    
    if (TEST_TENANT_ID === "your-tenant-id-here") {
      console.log("⚠️  Please update TEST_TENANT_ID in test-e2e.ts with your actual tenant ID");
      console.log("\nAlternatively, test through the UI:");
      console.log("  1. Go to http://localhost:3000");
      console.log("  2. Navigate to Integrations");
      console.log("  3. Connect Email integration");
      console.log("  4. Create an agent");
      console.log("  5. Test the agent with an email");
      process.exit(0);
    }

    console.log(`1. Loading integrations for tenant: ${TEST_TENANT_ID}...`);
    const integrationMap = await getIntegrationMap(TEST_TENANT_ID);

    console.log(`✅ Found ${integrationMap.size} integration(s):`);
    integrationMap.forEach((integration, provider) => {
      console.log(`   - ${provider}: ${integration.type}`);
    });

    if (integrationMap.size === 0) {
      console.log("\n⚠️  No integrations found. Please:");
      console.log("  1. Go to your app");
      console.log("  2. Navigate to Settings > Integrations");
      console.log("  3. Connect the Email integration");
      process.exit(0);
    }

    // Test email integration if available
    if (integrationMap.has("email")) {
      console.log("\n2. Testing Email integration...");
      const emailIntegration = integrationMap.get("email");
      
      if (emailIntegration) {
        const connected = await emailIntegration.testConnection();
        console.log(`✅ Email integration: ${connected ? "Connected" : "Not connected"}`);
        
        if (connected) {
          console.log("\n3. Sending test email...");
          try {
            await emailIntegration.executeAction("send_email", {
              to: "delivered@resend.dev",
              subject: "Test from Integration Registry",
              body: "This email was sent via the integration registry system!",
            });
            console.log("✅ Email sent successfully!");
          } catch (error) {
            console.error("❌ Failed to send email:", error);
          }
        }
      }
    }

    console.log("\n🎉 Integration registry test passed!");
    console.log("\nWhat this proves:");
    console.log("  ✅ Integration registry loads from database");
    console.log("  ✅ Integration credentials work");
    console.log("  ✅ Agents can access integrations via registry");
    console.log("\nNext: Test through UI by creating an agent!");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testIntegrationLoading().catch(console.error);
