const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const clean = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const escapeHtml = value => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character]));

async function sendEmail(env, payload){
 return fetch('https://api.resend.com/emails', {
  method:'POST',
  headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},
  body:JSON.stringify(payload)
 });
}

export async function onRequestPost({request, env}){
 try{
  if(!env.RESEND_API_KEY){console.error('RESEND_API_KEY is missing');return json({error:'Email service is not configured.'},500)}
  if(Number(request.headers.get('content-length')||0)>12000)return json({error:'Submission is too large.'},413);

  const body=await request.json();
  if(clean(body.company,100))return json({ok:true});

  const name=clean(body.name,100);
  const email=clean(body.email,200).toLowerCase();
  const phone=clean(body.phone,40);
  const area=clean(body.area,100);
  const path=clean(body.path,100);
  const goal=clean(body.goal,150);
  const details=clean(body.details,1200);
  const consent=body.consent===true;
  const validEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if(!name||!validEmail||!path||!goal||!consent)return json({error:'Please complete your name, email, request type, and contact consent.'},400);

  const from=env.CONTACT_FROM_EMAIL||'OpenFootLab Website <forms@openfootlab.com>';
  const care=env.CONTACT_TO_EMAIL||'flo@openfootlab.com';

  const internal=await sendEmail(env,{
   from,
   to:[care],
   reply_to:email,
   subject:`New OpenFootLab request — ${goal}`,
   html:`<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#18332c"><h1 style="font-family:Georgia,serif;font-weight:400">New OpenFootLab request</h1><table style="width:100%;border-collapse:collapse"><tr><td style="padding:10px;border-bottom:1px solid #d7ddd8"><strong>Name</strong></td><td style="padding:10px;border-bottom:1px solid #d7ddd8">${escapeHtml(name)}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #d7ddd8"><strong>Email</strong></td><td style="padding:10px;border-bottom:1px solid #d7ddd8">${escapeHtml(email)}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #d7ddd8"><strong>Phone</strong></td><td style="padding:10px;border-bottom:1px solid #d7ddd8">${escapeHtml(phone||'Not provided')}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #d7ddd8"><strong>Service area</strong></td><td style="padding:10px;border-bottom:1px solid #d7ddd8">${escapeHtml(area||'Not provided')}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #d7ddd8"><strong>Request for</strong></td><td style="padding:10px;border-bottom:1px solid #d7ddd8">${escapeHtml(path)}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #d7ddd8"><strong>Goal</strong></td><td style="padding:10px;border-bottom:1px solid #d7ddd8">${escapeHtml(goal)}</td></tr></table><h2 style="font-family:Georgia,serif;font-weight:400">General message</h2><p style="line-height:1.6;white-space:pre-wrap">${escapeHtml(details||'No message provided.')}</p><p style="font-size:12px;color:#66766f">Submitted through the OpenFootLab website. Reply directly to contact the sender.</p></div>`
  });

  if(!internal.ok){console.error('Resend internal notification failed',internal.status,await internal.text());return json({error:'We could not send your request. Please email flo@openfootlab.com.'},502)}

  const firstName=escapeHtml(name.split(/\s+/)[0]||name);
  const receipt=await sendEmail(env,{
   from,
   to:[email],
   reply_to:care,
   subject:'We received your OpenFootLab request',
   text:`Hello ${name.split(/\s+/)[0]||name},\n\nThank you for reaching out to OpenFootLab. We received your request and a real person will review it.\n\nWhat happens next:\n1. We review your request and introduce the 15-Day FLO Foot Profile when appropriate.\n2. We send the right information and, when needed, a dedicated secure link.\n3. We follow up directly to clarify the next step.\n\nQuestions? Reply to this email or contact flo@openfootlab.com.\n\nOpenFootLab / FLO\n1609 Berkshire Ave\nJupiter, FL 33469\n561.532.7120`,
   html:`<!doctype html><html><body style="margin:0;background:#f4f1e9;padding:24px"><div style="display:none;max-height:0;overflow:hidden">FLO received your OpenFootLab request.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-collapse:collapse"><tr><td style="padding:34px 40px 24px;border-bottom:1px solid #d7ddd8"><div style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;color:#18332c">FLO / OPENFOOTLAB</div><div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:1.5px;color:#66766f;margin-top:5px">LOCAL FOOT SUPPORT · CONTINUITY BY DESIGN</div></td></tr><tr><td style="padding:0"><img src="https://openfootlab.com/email/openfootlab-insert.png" width="620" alt="Personalized OpenFootLab foot insert" style="display:block;width:100%;max-width:620px;height:auto;border:0"></td></tr><tr><td style="padding:44px 40px;color:#18332c"><div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;color:#315f52">FLO RECEIVED IT</div><h1 style="font-family:Georgia,serif;font-size:38px;line-height:1.15;font-weight:400;margin:16px 0 22px">Thank you, ${firstName}.</h1><p style="font-family:Arial,sans-serif;font-size:16px;line-height:1.7;color:#52645e;margin:0 0 28px">We received your OpenFootLab request. A real person will review it and follow up with the appropriate information.</p><div style="background:#edf5f0;padding:24px 26px"><div style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.4px;margin-bottom:16px">WHAT HAPPENS NEXT</div><p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.65;margin:0 0 9px"><strong>1.</strong>&nbsp; We review your request and introduce the 15-Day FLO Foot Profile when appropriate.</p><p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.65;margin:0 0 9px"><strong>2.</strong>&nbsp; We send the right information and, when needed, a dedicated secure link.</p><p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.65;margin:0"><strong>3.</strong>&nbsp; We follow up directly to clarify the next step.</p></div><p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#52645e;margin:28px 0 0">Questions? Reply to this email or contact <a href="mailto:flo@openfootlab.com" style="color:#18332c">flo@openfootlab.com</a>.</p></td></tr><tr><td style="padding:25px 40px;background:#18332c;color:#ffffff"><div style="font-family:Georgia,serif;font-size:18px">Build the baseline before the build.</div><div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.4px;color:#ffffff;margin-top:10px">FLO · OPENFOOTLAB</div><div style="font-family:Arial,sans-serif;font-size:11px;color:#bdccc7;margin-top:8px">1609 Berkshire Ave · Jupiter, FL 33469 · 561.532.7120</div></td></tr></table></td></tr></table></body></html>`
  });

  if(!receipt.ok)console.error('Resend client receipt failed',receipt.status,await receipt.text());
  return json({ok:true});
 }catch(error){console.error('Contact function failed',error);return json({error:'We could not send your request. Please email flo@openfootlab.com.'},500)}
}

export function onRequestGet(){return json({error:'Method not allowed.'},405)}
