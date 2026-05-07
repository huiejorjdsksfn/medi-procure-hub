/**
 * Twilio WhatsApp Sandbox Renewal Engine
 * EL5 MediProcure — ProcurBosse v5.8
 * 
 * Keeps the Twilio WhatsApp sandbox session alive by
 * sending periodic opt-in messages before the 72-hour timeout.
 * 
 * Usage: node scripts/twilio-sandbox-renew.js
 */

import twilio from 'twilio';

const CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || 'SUPABASE_SECRET',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  sandboxNumber: '+14155238886',     // Twilio WhatsApp sandbox
  smsNumber: '+16812972643',          // EL5H SMS number
  messagingServiceSid: 'MG2fffc3a381c44a202c316dcc6400707d',
  sandboxCode: 'join bad-machine',
  // Phone numbers to keep sandbox alive (comma-separated in env)
  targetNumbers: (process.env.SANDBOX_NUMBERS || '').split(',').filter(Boolean),
  // Re-send interval: every 48 hours (before 72h expiry)
  renewIntervalMs: 48 * 60 * 60 * 1000,
};

const client = twilio(CONFIG.accountSid, CONFIG.authToken);

/**
 * Send a sandbox renewal ping to a WhatsApp number
 */
async function renewSandboxSession(toNumber: string): Promise<void> {
  const to = toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber}`;
  const from = `whatsapp:${CONFIG.sandboxNumber}`;

  try {
    const message = await client.messages.create({
      from,
      to,
      body: `🏥 EL5 MediProcure — System Active\nProcurBosse v5.8 | ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    });
    console.log(`[${new Date().toISOString()}] ✅ Renewal sent to ${to} — SID: ${message.sid}`);
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to renew ${to}:`, err.message);
  }
}

/**
 * Send a bulk renewal to all registered numbers
 */
async function runRenewalCycle(): Promise<void> {
  console.log(`\n[${new Date().toISOString()}] 🔄 Starting WhatsApp sandbox renewal cycle`);
  console.log(`  Sandbox: ${CONFIG.sandboxNumber} (${CONFIG.sandboxCode})`);
  console.log(`  Targets: ${CONFIG.targetNumbers.length} numbers`);

  if (CONFIG.targetNumbers.length === 0) {
    console.log('  ⚠️  No target numbers configured. Set SANDBOX_NUMBERS env var.');
    console.log('  Example: SANDBOX_NUMBERS=+254700000000,+254711111111');
    return;
  }

  for (const number of CONFIG.targetNumbers) {
    await renewSandboxSession(number.trim());
    await new Promise(r => setTimeout(r, 500)); // 500ms between sends
  }

  console.log(`[${new Date().toISOString()}] ✅ Renewal cycle complete`);
}

/**
 * Send SMS join instructions to a new number
 */
async function sendSandboxJoinInstructions(toNumber: string): Promise<void> {
  try {
    const message = await client.messages.create({
      from: CONFIG.smsNumber,
      to: toNumber,
      body: `EL5 MediProcure WhatsApp Setup:\n\n1. Open WhatsApp\n2. Send message to: ${CONFIG.sandboxNumber}\n3. Message: ${CONFIG.sandboxCode}\n\nYou will receive procurement notifications via WhatsApp.`,
      messagingServiceSid: CONFIG.messagingServiceSid,
    });
    console.log(`[${new Date().toISOString()}] ✅ Join instructions sent — SID: ${message.sid}`);
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to send instructions:`, err.message);
  }
}

/**
 * Check sandbox status via Twilio API
 */
async function checkSandboxStatus(): Promise<void> {
  try {
    const sandbox = await (client as any).preview.wireless.sims.list({ limit: 1 });
    console.log('[INFO] Twilio account active');
  } catch {
    console.log('[INFO] Sandbox status check skipped (preview API not available)');
  }

  // Check account balance
  try {
    const balance = await client.balance.fetch();
    console.log(`[INFO] Account balance: ${balance.currency} ${balance.balance}`);
  } catch (err: any) {
    console.log('[INFO] Balance check skipped:', err.message);
  }
}

/**
 * Main: run once or as a daemon
 */
async function main() {
  const args = process.argv.slice(2);
  const daemon = args.includes('--daemon');
  const once = args.includes('--once');
  const join = args.find(a => a.startsWith('--join='))?.split('=')[1];
  const check = args.includes('--check');

  if (check) {
    await checkSandboxStatus();
    return;
  }

  if (join) {
    await sendSandboxJoinInstructions(join);
    return;
  }

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  EL5 MediProcure — Twilio WhatsApp Sandbox Engine        ║');
  console.log('║  Sandbox: +14155238886  |  Code: join bad-machine        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await checkSandboxStatus();
  await runRenewalCycle();

  if (daemon) {
    console.log(`\n[DAEMON] Running every ${CONFIG.renewIntervalMs / 3600000}h`);
    setInterval(runRenewalCycle, CONFIG.renewIntervalMs);
    // Keep process alive
    process.stdin.resume();
  }
}

main().catch(console.error);
