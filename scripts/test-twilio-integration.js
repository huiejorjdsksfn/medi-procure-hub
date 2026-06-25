/**
 * EL5 MediProcure - Communication Services Test Suite v2.0
 * Tests SMS (Africa's Talking + Twilio), Email (Resend + SMTP2GO), Voice (Twilio)
 * Embu Level 5 Hospital - Kenya
 */

const SUPABASE_URL = "https://yvjfehnzbzjliizjvuhq.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";

const TEST_NUMBERS = ["+254720425195", "+254116647896"];
const TEST_EMAIL = "tecnojin03@gmail.com";

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
    let d;
    const text = await r.text();
    try { d = JSON.parse(text); } catch { d = text; }
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
  console.log("║   EL5 MediProcure - Communication Services Test Suite  ║");
  console.log("║   Kenya-Optimized v2.0                               ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);

  // ══ SMS TESTS ═══════════════════════════════════════════════════════
  console.log("\n┌──────────────────────────────────────────────────────────┐");
  console.log("│  SMS TESTS (Africa's Talking Primary + Twilio Fallback) │");
  console.log("└──────────────────────────────────────────────────────────┘");

  // Test 1: SMS Status (GET)
  await testEndpoint(
    "SMS Status (GET)",
    `${SUPABASE_URL}/functions/v1/send-sms?action=status`
  );

  // Test 2: Voice Call Status
  await testEndpoint(
    "Voice Call Status",
    `${SUPABASE_URL}/functions/v1/make-call`,
    { method: "POST", body: JSON.stringify({ action: "status" }) }
  );

  // Test 3: SMS Send (will use Africa's Talking if configured)
  await testEndpoint(
    "SMS Send Test",
    `${SUPABASE_URL}/functions/v1/send-sms`,
    {
      method: "POST",
      body: JSON.stringify({
        to: TEST_NUMBERS[0],
        message: "[EL5 MediProcure] Test SMS from integration script - Kenya",
        channel: "sms",
        module: "test_script"
      })
    }
  );

  // ══ EMAIL TESTS ════════════════════════════════════════════════════
  console.log("\n┌──────────────────────────────────────────────────────────┐");
  console.log("│  EMAIL TESTS (Resend Primary + SMTP2GO Fallback)        │");
  console.log("└──────────────────────────────────────────────────────────┘");

  // Test 4: Email Status (GET)
  await testEndpoint(
    "Email Status (GET)",
    `${SUPABASE_URL}/functions/v1/send-email`
  );

  // Test 5: Send Test Email
  await testEndpoint(
    "Email Send Test",
    `${SUPABASE_URL}/functions/v1/send-email`,
    {
      method: "POST",
      body: JSON.stringify({
        to: TEST_EMAIL,
        subject: "[EL5 MediProcure] Test Email - Kenya Communication",
        body: "This is a test email from EL5 MediProcure at Embu Level 5 Hospital.\n\nIf you receive this, the email system is working correctly.\n\nBest regards,\nEL5 MediProcure System"
      })
    }
  );

  // ══ WHATSAPP TESTS ════════════════════════════════════════════════
  console.log("\n┌──────────────────────────────────────────────────────────┐");
  console.log("│  WHATSAPP TESTS (Twilio WhatsApp Sandbox)               │");
  console.log("└──────────────────────────────────────────────────────────┘");

  // Test 6: WhatsApp Send
  await testEndpoint(
    "WhatsApp Send Test",
    `${SUPABASE_URL}/functions/v1/send-sms`,
    {
      method: "POST",
      body: JSON.stringify({
        to: TEST_NUMBERS[0],
        message: "Hello from EL5 MediProcure! This is a WhatsApp test message.",
        channel: "whatsapp",
        module: "test_script"
      })
    }
  );

  // ══ VOICE CALL TESTS ═════════════════════════════════════════════
  console.log("\n┌──────────────────────────────────────────────────────────┐");
  console.log("│  VOICE CALL TESTS (Twilio TTS)                          │");
  console.log("└──────────────────────────────────────────────────────────┘");

  // Test 7: Make Call
  await testEndpoint(
    "Voice Call Test",
    `${SUPABASE_URL}/functions/v1/make-call`,
    {
      method: "POST",
      body: JSON.stringify({
        to: TEST_NUMBERS[0],
        message: "Hello, this is a test call from EL5 MediProcure at Embu Level 5 Hospital. The procurement system is working correctly. Thank you.",
        module: "test_script"
      })
    }
  );

  // ══ TWILIO ENGINE TESTS ══════════════════════════════════════════
  console.log("\n┌──────────────────────────────────────────────────────────┐");
  console.log("│  TWILIO ENGINE TESTS                                     │");
  console.log("└──────────────────────────────────────────────────────────┘");

  // Test 8: Twilio Engine Status
  await testEndpoint(
    "Twilio Engine Status",
    `${SUPABASE_URL}/functions/v1/twilio-engine`,
    { method: "POST", body: JSON.stringify({ action: "status" }) }
  );

  // ══ SUMMARY ═══════════════════════════════════════════════════════
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   Test Suite Complete                                   ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("\n📋 Configuration Checklist:");
  console.log("   □ AT_API_KEY - Africa's Talking (for Kenya SMS)");
  console.log("   □ AT_USERNAME - Africa's Talking username");
  console.log("   □ RESEND_API_KEY - Resend (for emails)");
  console.log("   □ SMTP2GO_API_KEY - SMTP2GO (email fallback)");
  console.log("   □ TWILIO_ACCOUNT_SID - Twilio Account");
  console.log("   □ TWILIO_AUTH_TOKEN - Twilio Auth Token");
  console.log("   □ TWILIO_FROM_NUMBER - Twilio phone number");
  console.log("");
  console.log("📖 See docs/KENYA_COMMUNICATION_SETUP.md for setup instructions");
}

runTests().catch(console.error);