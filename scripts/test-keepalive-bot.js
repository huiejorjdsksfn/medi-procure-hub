/**
 * Keepalive Bot Test Script
 * EL5 MediProcure - Embu Level 5 Hospital
 * 
 * Tests the keepalive-bot edge function and verifies projections
 */

const SUPABASE_URL = "https://yvjfehnzbzjliizjvuhq.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";

async function testKeepalive(action = "status") {
  console.log(`\n=== Testing keepalive-bot (action: ${action}) ===`);
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/keepalive-bot?action=${action}`, {
      headers: { "apikey": ANON_KEY }
    });
    const d = await r.json();
    console.log(`Status: ${r.status}`);
    console.log(JSON.stringify(d, null, 2));
    return d;
  } catch (e) {
    console.error(`Error: ${e.message}`);
    return null;
  }
}

async function runTests() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   EL5 MediProcure - Keep-Alive Bot Test Suite           ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  // Test 1: Status check
  await testKeepalive("status");

  // Test 2: Single ping
  await testKeepalive("ping");

  // Test 3: Health check
  await testKeepalive("health");

  // Test 4: Run full loop (this will take ~55 seconds)
  console.log("\n=== Running full keepalive cycle (~55 seconds) ===");
  const loopResult = await testKeepalive("loop");
  
  // Test 5: Cleanup
  await testKeepalive("cleanup");

  // Final status
  console.log("\n=== Final Status ===");
  await testKeepalive("status");

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   Test Complete                                         ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
}

runTests();