/**
 * Twilio Configuration Fix Script
 * Fixes the FROM number mismatch in EL5 MediProcure
 * 
 * Issue: The send-sms function uses FROM number +18777804236 which doesn't belong
 *        to the Twilio account <ACCOUNT_SID>
 * 
 * Fix: Update system_settings with correct numbers:
 *       - FROM: +16812972643 (verified number on this account)
 *       - WhatsApp: whatsapp:+14155238886 (Twilio sandbox)
 */

const SUPABASE_URL = "https://yvjfehnzbzjliizjvuhq.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";

// Correct Twilio Configuration
const TWILIO_CONFIG = {
  twilio_account_sid: "<ACCOUNT_SID>",
  twilio_auth_token: "SET_IN_SUPABASE_SECRETS",  // Actual token stored in secrets
  twilio_from_number: "+16812972643",            // Verified number on this account
  twilio_whatsapp_from: "whatsapp:+14155238886", // Twilio sandbox
  twilio_messaging_service_sid: "",              // Optional - for bulk SMS
};

async function updateSystemSetting(key, value) {
  console.log(`\nUpdating ${key}...`);
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/system_settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ value })
    });
    
    if (r.status === 204 || r.status === 200) {
      console.log(`✓ ${key} = ${value}`);
      return true;
    }
    
    // Try upsert if patch fails
    const upsert = await fetch(`${SUPABASE_URL}/rest/v1/system_settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`,
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({ key, value })
    });
    
    if (upsert.ok) {
      console.log(`✓ ${key} = ${value} (upserted)`);
      return true;
    }
    
    console.log(`✗ ${key} failed: ${upsert.status}`);
    return false;
  } catch (e) {
    console.error(`✗ ${key} error: ${e.message}`);
    return false;
  }
}

async function getCurrentSettings() {
  console.log("\n=== Current System Settings ===");
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?select=key,value`, {
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`
      }
    });
    const data = await r.json();
    console.log(JSON.stringify(data, null, 2));
    return data;
  } catch (e) {
    console.error(`Error fetching settings: ${e.message}`);
    return [];
  }
}

async function testAfterFix() {
  console.log("\n=== Testing After Fix ===");
  
  try {
    // Test send-sms status
    const statusRes = await fetch(`${SUPABASE_URL}/functions/v1/send-sms?action=status`, {
      headers: { "apikey": ANON_KEY }
    });
    const status = await statusRes.json();
    console.log("\nSMS Status:", JSON.stringify(status, null, 2));
    
    // Test SMS send
    const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
      body: JSON.stringify({
        to: "+254720425195",
        message: "[EL5 MediProcure] Configuration fix test",
        channel: "sms"
      })
    });
    const send = await sendRes.json();
    console.log("\nSMS Send Result:", JSON.stringify(send, null, 2));
    
  } catch (e) {
    console.error(`Test error: ${e.message}`);
  }
}

async function applyFix() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   EL5 MediProcure - Twilio Configuration Fix             ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  
  // First, see current settings
  await getCurrentSettings();
  
  console.log("\n=== Applying Fix ===");
  
  // Apply fixes
  const results = [];
  for (const [key, value] of Object.entries(TWILIO_CONFIG)) {
    results.push(await updateSystemSetting(key, value));
  }
  
  // Wait a moment for changes to propagate
  console.log("\nWaiting for changes to propagate...");
  await new Promise(r => setTimeout(r, 2000));
  
  // Test the fix
  await testAfterFix();
  
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   Fix Complete                                          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("\nNOTE: If Twilio Auth Token is still 'SET_IN_SUPABASE_SECRETS',");
  console.log("it must be set as a Supabase Edge Function secret:");
  console.log("  1. Go to Supabase Dashboard > Edge Functions > Secrets");
  console.log("  2. Add: TWILIO_AUTH_TOKEN = your_actual_auth_token");
}

applyFix();