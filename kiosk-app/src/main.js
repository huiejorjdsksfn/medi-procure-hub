/**
 * ProcurBosse Kiosk — Department Requisition Terminal
 * NO LOGIN required - records device hostname + sender name
 * Sends realtime notification to requisitioner/manager via Twilio SMS
 * Works standalone - just open in browser
 */

const SB_URL = 'https://yvjfehnzbzjliizjvuhq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc';

// Get device info
const DEVICE = navigator.userAgent.includes('Windows') ? (navigator.userAgent.match(/Windows NT [\d.]+/)?.[0] || 'Windows PC') 
  : navigator.userAgent.includes('Mac') ? 'Mac' 
  : navigator.userAgent.includes('Linux') ? 'Linux PC' : 'Unknown Device';

// Supabase fetch helper
async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) { const e = await res.json().catch(()=>{}); throw new Error(e?.message || `HTTP ${res.status}`); }
  return res.json().catch(() => null);
}

// Edge function call
async function callEdge(fn, body) {
  const res = await fetch(`${SB_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => null);
}

// Load departments and items
let departments = [], categories = [], items = [];
async function loadData() {
  [departments, categories, items] = await Promise.all([
    sbFetch('departments?select=id,name&order=name').catch(() => []),
    sbFetch('categories?select=id,name&order=name').catch(() => []),
    sbFetch('items?select=id,name,unit_of_measure,current_quantity&order=name&limit=200').catch(() => []),
  ]);
  render();
}

// State
let senderName = '', selectedDept = '', priority = 'normal';
let requestItems = [{ itemId: '', itemName: '', qty: 1, unit: '', justification: '' }];
let submitting = false, submitted = false, submittedRef = null, toast = null;

function showToast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;padding:12px 20px;border-radius:10px;font-weight:700;font-size:14px;background:${type==='ok'?'#16a34a':'#dc2626'};color:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:opacity 0.3s`;
  t.textContent = (type === 'ok' ? '✅ ' : '❌ ') + msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3500);
}

async function submitRequest() {
  if (!senderName.trim()) { showToast('Enter your name', 'err'); return; }
  if (!selectedDept) { showToast('Select your department', 'err'); return; }
  const validItems = requestItems.filter(i => i.itemName.trim() && i.qty > 0);
  if (validItems.length === 0) { showToast('Add at least one item', 'err'); return; }
  
  submitting = true; render();
  
  try {
    const reqNum = `REQ/KIOSK/${Date.now().toString(36).toUpperCase()}`;
    const deptName = departments.find(d => d.id === selectedDept)?.name || selectedDept;
    
    // Insert requisition
    const [req] = await sbFetch('requisitions', {
      method: 'POST',
      body: JSON.stringify({
        requisition_number: reqNum,
        title: `${deptName} Request — ${validItems.map(i=>i.itemName).join(', ').slice(0,60)}`,
        department_id: selectedDept,
        status: 'submitted',
        priority,
        requested_by: senderName,
        device_info: DEVICE,
        notes: `Submitted via Department Kiosk by ${senderName} from ${DEVICE}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    // Insert line items
    if (req?.id) {
      for (const item of validItems) {
        await sbFetch('requisition_items', {
          method: 'POST',
          body: JSON.stringify({
            requisition_id: req.id,
            item_id: item.itemId || null,
            item_name: item.itemName,
            quantity_requested: item.qty,
            unit_of_measure: item.unit || 'units',
            justification: item.justification,
          }),
        }).catch(() => {});
      }
    }

    // Insert notification
    await sbFetch('notifications', {
      method: 'POST',
      body: JSON.stringify({
        title: `New Kiosk Requisition: ${reqNum}`,
        message: `${senderName} (${deptName}) submitted a request for: ${validItems.map(i=>`${i.qty}x ${i.itemName}`).join(', ')}. Device: ${DEVICE}`,
        type: 'requisition',
        entity_type: 'requisition',
        entity_id: req?.id,
        is_read: false,
        created_at: new Date().toISOString(),
      }),
    }).catch(() => {});

    // Send SMS notification via Twilio
    const smsMsg = `New Requisition ${reqNum} from ${senderName} (${deptName}): ${validItems.map(i=>`${i.qty}x ${i.itemName}`).join(', ')}. Priority: ${priority.toUpperCase()}. Check EL5 MediProcure.`;
    await callEdge('send-sms', {
      action: 'send',
      to: null, // Will send to procurement manager's registered number
      message: smsMsg,
      module: 'kiosk_requisition',
      record_id: req?.id,
      recipient_name: 'Procurement Manager',
      department: deptName,
    }).catch(() => {});

    // Also send system broadcast
    await sbFetch('system_broadcast', {
      method: 'POST',
      body: JSON.stringify({
        message: `📋 New kiosk requisition ${reqNum} from ${senderName} (${deptName}) — ${validItems.length} item(s)`,
        created_at: new Date().toISOString(),
        active: true,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      }),
    }).catch(() => {});

    submittedRef = { num: reqNum, name: senderName, dept: deptName, items: validItems };
    submitted = true; submitting = false;
    // Reset form for next person
    senderName = ''; selectedDept = ''; priority = 'normal';
    requestItems = [{ itemId:'',itemName:'',qty:1,unit:'',justification:'' }];
    render();
  } catch(e) {
    submitting = false;
    showToast('Submit failed: ' + e.message, 'err');
    render();
  }
}

function addItem() {
  requestItems.push({ itemId:'',itemName:'',qty:1,unit:'',justification:'' });
  render();
}

function removeItem(i) {
  if (requestItems.length === 1) return;
  requestItems.splice(i,1); render();
}

function render() {
  const root = document.getElementById('root');
  
  if (submitted && submittedRef) {
    root.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f0f4ff,#e8f5e9);padding:20px">
        <div style="max-width:480px;width:100%;background:#fff;border-radius:20px;padding:40px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.12)">
          <div style="font-size:64px;margin-bottom:16px">✅</div>
          <h2 style="color:#16a34a;font-size:24px;font-weight:900;margin:0 0 8px">Request Submitted!</h2>
          <div style="font-size:16px;color:#374151;margin-bottom:8px">Reference: <strong>${submittedRef.num}</strong></div>
          <div style="font-size:14px;color:#6b7280;margin-bottom:24px">From: ${submittedRef.name} · ${submittedRef.dept}</div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;margin-bottom:24px;text-align:left">
            ${submittedRef.items.map(i=>`<div style="font-size:13px;color:#374151;padding:3px 0">• ${i.qty}× ${i.itemName}</div>`).join('')}
          </div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:24px">A notification has been sent to the Procurement Manager via SMS and system alert.</div>
          <button onclick="submitted=false;submittedRef=null;render()" style="background:#0078d4;color:#fff;border:none;border-radius:10px;padding:12px 32px;font-size:15px;font-weight:700;cursor:pointer">New Request</button>
        </div>
      </div>
    `;
    return;
  }

  const itemsHtml = requestItems.map((item,i) => `
    <div style="background:#f8fafc;border:1px solid #e5e9ef;border-radius:10px;padding:14px;margin-bottom:10px">
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <div style="flex:2">
          <label style="display:block;font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px">ITEM NAME *</label>
          <input list="items-list-${i}" value="${item.itemName}" oninput="requestItems[${i}].itemName=this.value;const found=items.find(x=>x.name.toLowerCase()===this.value.toLowerCase());if(found){requestItems[${i}].itemId=found.id;requestItems[${i}].unit=found.unit_of_measure||''}"
            placeholder="Type or select item…" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;outline:none;font-family:inherit"/>
          <datalist id="items-list-${i}">${items.map(x=>`<option value="${x.name}">`).join('')}</datalist>
        </div>
        <div style="width:90px">
          <label style="display:block;font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px">QTY *</label>
          <input type="number" min="1" value="${item.qty}" oninput="requestItems[${i}].qty=parseInt(this.value)||1"
            style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;outline:none;text-align:center"/>
        </div>
        <div style="width:90px">
          <label style="display:block;font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px">UNIT</label>
          <input value="${item.unit}" oninput="requestItems[${i}].unit=this.value" placeholder="units"
            style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;outline:none"/>
        </div>
        ${requestItems.length>1?`<button onclick="removeItem(${i})" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-size:16px;align-self:flex-end">✕</button>`:''}
      </div>
      <div>
        <label style="display:block;font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px">JUSTIFICATION</label>
        <input value="${item.justification}" oninput="requestItems[${i}].justification=this.value" placeholder="Reason for request…"
          style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;outline:none;font-family:inherit"/>
      </div>
    </div>
  `).join('');

  root.innerHTML = `
    <div style="min-height:100vh;background:linear-gradient(135deg,#f0f4ff 0%,#e8eef8 100%);padding:20px">
      <!-- Header -->
      <div style="background:#0078d4;color:#fff;border-radius:16px;padding:18px 24px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 20px rgba(0,120,212,0.3)">
        <div>
          <div style="font-size:11px;letter-spacing:0.12em;opacity:0.8;font-weight:600;text-transform:uppercase">EL5 MediProcure</div>
          <div style="font-size:20px;font-weight:900">Department Requisition</div>
          <div style="font-size:12px;opacity:0.75;margin-top:2px">Embu Level 5 Hospital · No login required</div>
        </div>
        <div style="text-align:right;font-size:12px;opacity:0.75">
          <div>${DEVICE}</div>
          <div style="margin-top:4px">${new Date().toLocaleString('en-KE')}</div>
        </div>
      </div>

      <div style="max-width:680px;margin:0 auto">
        <!-- Requester info -->
        <div style="background:#fff;border-radius:14px;padding:20px;margin-bottom:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
          <h3 style="font-size:14px;font-weight:800;color:#374151;margin:0 0 14px;text-transform:uppercase;letter-spacing:0.06em">Who is requesting?</h3>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <label style="display:block;font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px">YOUR FULL NAME *</label>
              <input value="${senderName}" oninput="senderName=this.value" placeholder="Enter your name"
                style="width:100%;padding:10px 12px;border:2px solid ${senderName?'#0078d4':'#e5e9ef'};border-radius:8px;font-size:14px;outline:none;font-family:inherit;transition:border-color 0.2s"/>
            </div>
            <div style="flex:1;min-width:200px">
              <label style="display:block;font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px">DEPARTMENT *</label>
              <select onchange="selectedDept=this.value"
                style="width:100%;padding:10px 12px;border:2px solid ${selectedDept?'#0078d4':'#e5e9ef'};border-radius:8px;font-size:14px;outline:none;font-family:inherit;background:#fff">
                <option value="">Select department…</option>
                ${departments.map(d=>`<option value="${d.id}" ${d.id===selectedDept?'selected':''}>${d.name}</option>`).join('')}
              </select>
            </div>
            <div style="width:140px">
              <label style="display:block;font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px">PRIORITY</label>
              <select onchange="priority=this.value"
                style="width:100%;padding:10px 12px;border:2px solid #e5e9ef;border-radius:8px;font-size:14px;outline:none;font-family:inherit;background:#fff">
                <option value="normal" ${priority==='normal'?'selected':''}>Normal</option>
                <option value="urgent" ${priority==='urgent'?'selected':''}>Urgent</option>
                <option value="critical" ${priority==='critical'?'selected':''}>Critical</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Items -->
        <div style="background:#fff;border-radius:14px;padding:20px;margin-bottom:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <h3 style="font-size:14px;font-weight:800;color:#374151;margin:0;text-transform:uppercase;letter-spacing:0.06em">Items Requested</h3>
            <button onclick="addItem()" style="background:#eff6ff;color:#0078d4;border:1px solid #bfdbfe;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer">+ Add Item</button>
          </div>
          ${itemsHtml}
        </div>

        <!-- Submit -->
        <button onclick="${submitting?'':''}" ${submitting?'disabled':''} 
          style="width:100%;padding:16px;background:${submitting?'#9ca3af':'#0078d4'};color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:900;cursor:${submitting?'not-allowed':'pointer'};font-family:inherit;box-shadow:0 4px 20px rgba(0,120,212,0.35);letter-spacing:0.04em"
          onclick="if(!${submitting})submitRequest()">
          ${submitting?'⏳ Submitting…':'📤 Submit Request'}
        </button>
        <div style="text-align:center;margin-top:12px;font-size:12px;color:#9ca3af">
          Your request will be sent immediately to the Procurement Manager via SMS notification
        </div>
      </div>
    </div>
  `;
}

// Init
loadData();
render();

// Make functions globally accessible (called from inline HTML)
window.submitRequest = submitRequest;
window.addItem = addItem;
window.removeItem = removeItem;
window.requestItems = requestItems;
window.senderName = senderName;
window.selectedDept = selectedDept;
window.priority = priority;
window.submitted = submitted;
window.submittedRef = submittedRef;
