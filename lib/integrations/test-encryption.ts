import {
  encryptCredentials,
  decryptCredentials,
  isEncrypted,
} from "./encryption";

async function testEncryption() {
  console.log("🔐 Testing Encryption Helpers\n");

  // Test data
  const credentials = {
    api_key: "re_test_1234567890",
    from_email: "support@test.com",
    from_name: "Test Support",
  };

  console.log("1. Original credentials:");
  console.log(credentials);

  // Test encryption
  const encrypted = encryptCredentials(credentials);
  console.log("\n2. Encrypted (should be unreadable):");
  console.log(encrypted.substring(0, 100) + "...");
  console.log(`Length: ${encrypted.length} characters`);

  // Test isEncrypted
  console.log("\n3. Is encrypted?", isEncrypted(encrypted));

  // Test decryption
  const decrypted = decryptCredentials(encrypted);
  console.log("\n4. Decrypted (should match original):");
  console.log(decrypted);

  // Verify match
  const matches = JSON.stringify(credentials) === JSON.stringify(decrypted);
  console.log("\n5. Encryption/Decryption successful?", matches ? "✅" : "❌");

  if (!matches) {
    console.error("ERROR: Decrypted data doesn't match original!");
    process.exit(1);
  }

  console.log("\n✅ All encryption tests passed!");
}

testEncryption().catch((error) => {
  console.error("❌ Encryption test failed:", error);
  process.exit(1);
});
