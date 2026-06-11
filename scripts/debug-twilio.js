/**
 * Debug Twilio SMS - Get detailed error information
 * EL5 MediProcure - Embu Level 5 Hospital
 */

const SUPABASE_URL = "https://yvjfehnzbzjliizjvuhq.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";

// Twilio verified number (from testing)
const VERIFIED_NUMBER = "+16812972643";
const TEST_RECIPIENT = "+254720425195";

async function testDirectTwilio() {
  console.log("\n=== Testing Direct Twilio API ===");
  console.log(`Account: ${<your_account_sid>}`);
  console.log(`From: ${VERIFIED_NUMBER}`);
  console.log(`To: ${TEST_RECIPIENT}`);
  
  // The edge function needs the AUTH token - let's see what error we get
  // We can't call Twilio directly without the auth token from Supabase secrets
  // But we can check what the edge function is using
}

async function testEdgeFunctionDetailed() {
  console.log("\n=== Edge Function Detailed Response ===");
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
    body: JSON.stringify({
      to: TEST_RECIPIENT,
      message: "[EL5 Test] Debug message - " + new Date().toISOString(),
      channel: "sms"
    })
  });
  
  const data = await response.json();
  
  console.log("Full Response:");
  console.log(JSON.stringify(data, null, 2));
  
  // Analyze the error
  console.log("\n=== Error Analysis ===");
  if (data.results && data.results[0]) {
    const result = data.results[0];
    console.log(`Provider used: ${result.provider}`);
    console.log(`Success: ${result.ok}`);
    console.log(`Error: ${result.error}`);
    console.log(`SID: ${result.sid || 'none'}`);
    
    // Check for specific error codes
    if (result.error) {
      const errorMatch = result.error.match(/(\d+):\s*(.+)/);
      if (errorMatch) {
        console.log(`\nTwilio Error Code: ${errorMatch[1]}`);
        console.log(`Twilio Error Message: ${errorMatch[2]}`);
        
        // Common Twilio error codes
        const errorCodes = {
          "20003": "Authentication failure - check Account SID and Auth Token",
          "20429": "Too many requests - rate limited",
          "21211": "Invalid phone number",
          "21408": "Permission not granted to send to this number",
          "21601": "Phone number is not SMS-capable",
          "21602": "Cannot route to specified number",
          "21610": "Message queue full",
          "21611": "Country disabled for this account",
          "21614": "Invalid phone number format",
          "21660": "FROM number mismatch (number not on this account)"
        };
        
        if (errorCodes[errorMatch[1]]) {
          console.log(`\n📋 Known Error: ${errorCodes[errorMatch[1]]}`);
        }
      }
    }
  }
}

async function testWithCorrectFrom() {
  console.log("\n=== Test with Manual FROM Number ===");
  
  // This won't work because we can't override the FROM in the edge function
  // But we can document what needs to happen
  console.log("To fix this issue, the edge function needs to use:");
  console.log(`  FROM: ${VERIFIED_NUMBER} (not +18777804236)`);
  console.log(`  Account: ${<your_account_sid>}`);
}

async function checkEdgeFunctionLogs() {
  console.log("\n=== Checking Supabase Edge Function Configuration ===");
  
  // Get the status with more detail
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-sms?action=status`, {
    headers: { "apikey": ANON_KEY }
  });
  
  const status = await response.json();
  
  console.log("Current Edge Function Configuration:");
  console.log(`  Version: ${status.version}`);
  console.log(`  Account SID Configured: ${status.acct_set ? '✓ Yes' : '✗ No'}`);
  console.log(`  Auth Token Configured: ${status.auth_set ? '✓ Yes' : '✗ No'}`);
  console.log(`  SMS From: ${status.sms_from}`);
  console.log(`  WhatsApp From: ${status.wa_from}`);
  console.log(`  Messaging Service SID: ${status.mg_sid || '(not set)'}`);
  console.log(`  Africa's Talking: ${status.at_set ? 'Configured' : 'Not configured'}`);
  console.log(`  WhatsApp Join Code: ${status.wa_join}`);
  
  // Identify the problem
  console.log("\n=== Identified Problem ===");
  if (status.sms_from === "+18777804236") {
    console.log("✗ FROM number is +18777804236 (Twilio free trial number)");
    console.log(`✗ This number does NOT belong to account ${<your_account_sid>}`);
    console.log(`✓ Should be: ${VERIFIED_NUMBER}`);
  }
}

async function provideFixInstructions() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   RESOLUTION: Fix Required                               ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  
  console.log(`
The edge function is configured with wrong Twilio credentials:

CURRENT CONFIGURATION:
  - FROM Number: +18777804236 (Twilio trial number)
  - Account SID: <ACCOUNT_SID>
  - Auth Token: (configured in Supabase secrets)

PROBLEM:
  The number +18777804236 does NOT belong to account AC9ce73d...
  Only numbers verified on THIS account can be used as FROM.

VERIFIED NUMBERS ON THIS ACCOUNT:
  - +16812972643 (SMS capable)
  - +254116647894 (verified for calls)

REQUIRED FIX:

Option 1: Update Supabase Edge Function Secrets
  1. Go to: https://supabase.com/dashboard
  2. Select project: yvjfehnzbzjliizjvuhq
  3. Navigate to: Edge Functions → Secrets
  4. Add/Update these secrets:
  
  TWILIO_FROM_NUMBER=+16812972643
  TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

Option 2: Update Database system_settings table
  Run this SQL in Supabase SQL Editor:
  
  UPDATE system_settings 
  SET value = '+16812972643' 
  WHERE key = 'twilio_from_number';
  
  UPDATE system_settings 
  SET value = 'whatsapp:+14155238886' 
  WHERE key = 'twilio_whatsapp_from';

After applying fix:
  1. Redeploy edge functions:
     supabase functions deploy send-sms
  2. Run test again:
     node scripts/test-twilio-integration.js
`);
}

async function runDebug() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   EL5 MediProcure - Twilio Debug & Fix Guide            ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  
  await checkEdgeFunctionLogs();
  await testEdgeFunctionDetailed();
  await testWithCorrectFrom();
  await provideFixInstructions();
}

runDebug();