/**
 * Twilio Integration Test Script
 * EL5 MediProcure - Embu Level 5 Hospital
 */

const SUPABASE_URL = "https://yvjfehnzbzjliizjvuhq.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";

const TEST_NUMBERS = ["+254720425195", "+254116647896"];

async function testEndpoint(name, url, options = {}) {
  console.log(`\n=== ${name} ===`);
  try {
    const r = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
        ...options.headers
      }
    });
    const d = await r.json().catch(() => r.text());
    console.log(`Status: ${r.status}`);
    console.log("Response:", JSON.stringify(d, null, 2));
    return { ok: r.ok, data: d, status: r.status };
  } catch (e) {
    console.error(`Error: ${e.message}`);
    return { ok: false, error: e.message };
  }
}

async function runTests() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   EL5 MediProcure - Twilio Integration Test Suite       ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);

  // Test 1: Send SMS Status
  await testEndpoint(
    "SMS Status Check",
    `${SUPABASE_URL}/functions/v1/send-sms?action=status`
  );

  // Test 2: Send SMS to test number
  await testEndpoint(
    "SMS Send Test",
    `${SUPABASE_URL}/functions/v1/send-sms`,
    {
      method: "POST",
      body: JSON.stringify({
        to: TEST_NUMBERS[0],
        message: "[EL5 MediProcure] Test message from integration script",
        channel: "sms",
        module: "test_script"
      })
    }
  );

  // Test 3: WhatsApp Send (sandbox mode)
  await testEndpoint(
    "WhatsApp Send Test",
    `${SUPABASE_URL}/functions/v1/send-sms`,
    {
      method: "POST",
      body: JSON.stringify({
        to: TEST_NUMBERS[0],
        message: "Test WhatsApp message from EL5 MediProcure",
        channel: "whatsapp",
        module: "test_script"
      })
    }
  );

  // Test 4: Twilio Engine Status
  await testEndpoint(
    "Twilio Engine Status",
    `${SUPABASE_URL}/functions/v1/twilio-engine`,
    {
      method: "POST",
      body: JSON.stringify({ action: "status" })
    }
  );

  // Test 5: WhatsApp Bot
  await testEndpoint(
    "WhatsApp Bot Test",
    `${SUPABASE_URL}/functions/v1/whatsapp-bot`,
    {
      method: "POST",
      body: JSON.stringify({
        to: TEST_NUMBERS[0],
        message: "HELP"
      })
    }
  );

  // Test 6: Send Email Status
  await testEndpoint(
    "Email Service Status",
    `${SUPABASE_URL}/functions/v1/send-email`,
    {
      method: "POST",
      body: JSON.stringify({ action: "status" })
    }
  );

  // Test 7: Health Check
  await testEndpoint(
    "System Health Check",
    `${SUPABASE_URL}/functions/v1/health-api`
  );

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   Test Suite Complete                                    ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
}

runTests();