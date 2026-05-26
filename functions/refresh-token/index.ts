// Supabase Edge Function: refresh-token
// Receives JSON { user_id, provider } and refreshes the access token using stored refresh_token.
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, MS_CLIENT_ID, MS_CLIENT_SECRET

import { serve } from 'std/server'

const SUPABASE_URL = Deno.env.get('https://nmxtbgpvcucjkupuislq.supabase.co') || ''
const SERVICE_KEY = Deno.env.get('sb_publishable_0QR3XBX2K60PHqs-i-tkhQ_shq0swOw') || ''
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || ''
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''
const MS_CLIENT_ID = Deno.env.get('MS_CLIENT_ID') || ''
const MS_CLIENT_SECRET = Deno.env.get('MS_CLIENT_SECRET') || ''

async function getTokenRow(user_id: string, provider: string){
  const url = `${SUPABASE_URL}/rest/v1/oauth_tokens?select=*&user_id=eq.${user_id}&provider=eq.${provider}`
  const res = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } })
  const data = await res.json()
  return data && data[0]
}

async function updateTokenRow(id: string, payload: any){
  const url = `${SUPABASE_URL}/rest/v1/oauth_tokens?id=eq.${id}`
  const res = await fetch(url, { method: 'PATCH', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(payload) })
  return res.json()
}

async function refreshGoogle(refresh_token: string){
  const params = new URLSearchParams()
  params.set('client_id', GOOGLE_CLIENT_ID)
  params.set('client_secret', GOOGLE_CLIENT_SECRET)
  params.set('refresh_token', refresh_token)
  params.set('grant_type', 'refresh_token')

  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params })
  return res.json()
}

async function refreshMicrosoft(refresh_token: string){
  const params = new URLSearchParams()
  params.set('client_id', MS_CLIENT_ID)
  params.set('client_secret', MS_CLIENT_SECRET)
  params.set('refresh_token', refresh_token)
  params.set('grant_type', 'refresh_token')
  params.set('scope', 'offline_access openid openid profile Calendars.ReadWrite')

  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', body: params })
  return res.json()
}

serve(async (req) => {
  try{
    const { user_id, provider } = await req.json()
    if(!user_id || !provider) return new Response(JSON.stringify({ error: 'missing user_id or provider' }), { status: 400 })

    const row = await getTokenRow(user_id, provider)
    if(!row) return new Response(JSON.stringify({ error: 'no token row found' }), { status: 404 })

    let tokenResp
    if(provider === 'google') tokenResp = await refreshGoogle(row.refresh_token)
    else if(provider === 'microsoft' || provider === 'azure') tokenResp = await refreshMicrosoft(row.refresh_token)
    else return new Response(JSON.stringify({ error: 'unsupported provider' }), { status: 400 })

    if(tokenResp.error) return new Response(JSON.stringify({ error: tokenResp }), { status: 500 })

    const expiresAt = tokenResp.expires_in ? new Date(Date.now() + tokenResp.expires_in*1000).toISOString() : null

    const updatePayload: any = {
      access_token: tokenResp.access_token,
      refresh_token: tokenResp.refresh_token || row.refresh_token,
      expires_at: expiresAt,
      scope: tokenResp.scope || row.scope,
      token_type: tokenResp.token_type || row.token_type
    }

    const updated = await updateTokenRow(row.id, updatePayload)

    return new Response(JSON.stringify({ ok: true, token: updatePayload, updated }), { headers: { 'Content-Type': 'application/json' }})
  }catch(err){
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' }})
  }
})
