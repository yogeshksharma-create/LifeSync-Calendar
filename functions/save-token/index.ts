// Supabase Edge Function: save-token
// Receives JSON with provider token data and upserts into oauth_tokens table.
// Expected JSON: { user_id, provider, access_token, refresh_token, expires_in, scope, token_type, provider_account_id }
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'std/server'

const SUPABASE_URL = Deno.env.get('https://nmxtbgpvcucjkupuislq.supabase.co') || ''
const SERVICE_KEY = Deno.env.get('sb_publishable_0QR3XBX2K60PHqs-i-tkhQ_shq0swOw') || ''

async function getExisting(user_id: string, provider: string, provider_account_id?: string){
  let url = `${SUPABASE_URL}/rest/v1/oauth_tokens?select=*&user_id=eq.${user_id}&provider=eq.${provider}`
  if(provider_account_id) url += `&provider_account_id=eq.${provider_account_id}`
  const res = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } })
  const data = await res.json()
  return data && data[0]
}

async function insertRow(payload: any){
  const url = `${SUPABASE_URL}/rest/v1/oauth_tokens`
  const res = await fetch(url, { method: 'POST', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(payload) })
  return res.json()
}

async function updateRow(id: string, payload: any){
  const url = `${SUPABASE_URL}/rest/v1/oauth_tokens?id=eq.${id}`
  const res = await fetch(url, { method: 'PATCH', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(payload) })
  return res.json()
}

serve(async (req) => {
  try{
    const body = await req.json()
    const { user_id, provider, access_token, refresh_token, expires_in, scope, token_type, provider_account_id } = body
    if(!user_id || !provider || !access_token){
      return new Response(JSON.stringify({ error: 'missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const expires_at = expires_in ? new Date(Date.now() + Number(expires_in) * 1000).toISOString() : null

    const payload: any = {
      user_id,
      provider,
      access_token,
      refresh_token: refresh_token || null,
      expires_at,
      scope: scope || null,
      token_type: token_type || null,
      provider_account_id: provider_account_id || null
    }

    const existing = await getExisting(user_id, provider, provider_account_id)
    let result
    if(existing && existing.id){
      result = await updateRow(existing.id, payload)
    } else {
      result = await insertRow(payload)
    }

    return new Response(JSON.stringify({ ok: true, result }), { headers: { 'Content-Type': 'application/json' } })
  }catch(err){
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
