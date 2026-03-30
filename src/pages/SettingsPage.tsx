{tab === "email" && (
            <Card title="Email & SMTP" sub="Supabase SMTP via Resend — active for password resets & notifications" color="#059669" icon={Mail}
              onSave={() => save(["smtp_host","smtp_port","smtp_user","smtp_pass","smtp_from_name","smtp_from_email","smtp_tls","smtp_enabled","smtp_provider","supabase_smtp_active","email_test_address"])} saving={saving}>

              <div style={{ margin:"0 0 14px",padding:"10px 14px",borderRadius:10,background:"rgba(5,150,105,0.12)",border:"1px solid rgba(5,150,105,0.35)",display:"flex" as const,alignItems:"center" as const,gap:10 }}>
                <CheckCircle style={{ width:16,height:16,color:"#10b981",flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:12.5,fontWeight:700,color:"#10b981" }}>Supabase SMTP Active — Powered by Resend</div>
                  <div style={{ fontSize:11,color:"#64748b",marginTop:1 }}>Password reset emails + system notifications live via send-email Edge Fn v4</div>
                </div>
              </div>

              <FR label="Email Provider" color="#059669">
                <select value={get("smtp_provider","supabase")} onChange={e=>set("smtp_provider",e.target.value)} style={{...inp,width:180}}>
                  <option value="supabase">Supabase + Resend</option>
                  <option value="resend">Resend Direct</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="mailgun">Mailgun</option>
                  <option value="custom">Custom SMTP</option>
                </select>
              </FR>

              {[
                {k:"smtp_host",         l:"SMTP Host",          p:"smtp.resend.com"},
                {k:"smtp_port",         l:"SMTP Port",          p:"465"},
                {k:"smtp_user",         l:"SMTP Username",      p:"resend"},
                {k:"smtp_from_name",    l:"From Name",          p:"ProcurBosse - EL5 MediProcure"},
                {k:"smtp_from_email",   l:"From Email",         p:"noreply@embu.go.ke"},
                {k:"email_test_address",l:"Test Email Address", p:"admin@embu.go.ke"},
              ].map(f => (
                <FR key={f.k} label={f.l} color="#059669">
                  <input value={get(f.k)} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:260}} placeholder={f.p} />
                </FR>
              ))}
              <FR label="SMTP Password / API Key" sub="Resend API key (re_...)" color="#059669">
                <div style={{ position:"relative" as const,width:260 }}>
                  <input type={showPw?"text":"password"} value={get("smtp_pass")} onChange={e=>set("smtp_pass",e.target.value)} style={{...inp,paddingRight:34}} placeholder="re_xxxxxxxxxxxx" />
                  <button onClick={() => setShowPw(p=>!p)} style={{ position:"absolute" as const,right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer" as const }}>
                    {showPw ? <EyeOff style={{ width:14,height:14,color:"#64748b" }} /> : <Eye style={{ width:14,height:14,color:"#64748b" }} />}
                  </button>
                </div>
              </FR>
              <FR label="Use SSL/TLS (Port 465)" color="#059669">
                <Tog on={get("smtp_tls","true")!=="false"} onChange={v=>set("smtp_tls",v?"true":"false")} />
              </FR>
              <FR label="Enable SMTP" sub="Use Supabase SMTP for all email delivery" color="#059669">
                <Tog on={get("smtp_enabled","true")==="true"} onChange={v=>set("smtp_enabled",v?"true":"false")} />
              </FR>
              <FR label="Supabase Auth SMTP" sub="Password reset emails via /reset-password" color="#059669">
                <Tog on={get("supabase_smtp_active","true")==="true"} onChange={v=>set("supabase_smtp_active",v?"true":"false")} />
              </FR>
              <div style={{ margin:"10px 0",padding:"10px 14px",borderRadius:8,background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)",fontSize:11,color:"#93c5fd",lineHeight:1.6 }}>
                <strong style={{color:"#60a5fa"}}>Supabase Auth SMTP setup:</strong> Dashboard &rarr; Project Settings &rarr; Authentication &rarr; SMTP Settings.<br/>
                Host: smtp.resend.com &nbsp; Port: 465 &nbsp; User: resend &nbsp; Pass: Resend API key.
              </div>
              {testRes && (
                <div style={{ margin:"10px 0",padding:"8px 12px",borderRadius:8,background:testRes.ok?"rgba(5,150,105,0.15)":"rgba(220,38,38,0.15)",border:`1px solid ${testRes.ok?"#059669":"#dc2626"}`,display:"flex" as const,alignItems:"center" as const,gap:8 }}>
                  {testRes.ok ? <CheckCircle style={{ width:14,height:14,color:"#10b981" }} /> : <AlertTriangle style={{ width:14,height:14,color:"#ef4444" }} />}
                  <span style={{ fontSize:12,color:testRes.ok?"#10b981":"#ef4444" }}>{testRes.msg}</span>
                </div>
              )}
              <div style={{ marginTop:12 }}>
                <button onClick={testEmail} disabled={testing} style={{ padding:"8px 18px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#059669,#047857)",color:"#fff",fontWeight:700,fontSize:12.5,cursor:testing?"not-allowed":"pointer",opacity:testing?0.6:1 }}>
                  {testing ? "Sending Test..." : "Send Test Email"}
                </button>
              </div>
            </Card>
          )}

          