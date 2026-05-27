// Edge Function to handle provider OAuth callbacks, exchange code for tokens,
// and upsert into oauth_tokens table. Expects query params: provider, code, state
// State should include the user_id (e.g. base64 JSON: { "user_id": "..." })

import { serve } from 'std/server'

const SUPABASE_URL = Deno.env.get('https://nmxtbgpvcucjkupuislq.supabase.co') || ''
const SERVICE_KEY = Deno.env.get('sb_publishable_0QR3XBX2K60PHqs-i-tkhQ_shq0swOw') || ''
const GOOGLE_CLIENT_ID = Deno.env.get('370334788542-c6mu8j5deel1dvpu5agagq6flgcvot98.apps.googleusercontent.com') || ''
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''
const MS_CLIENT_ID = Deno.env.get('18b1e2f1-fd95-47dc-a7e9-7a426228fd07') || ''
const MS_CLIENT_SECRET = Deno.env.get('MS_CLIENT_SECRET') || ''

async function postJson(url: string, body: any, headers: any = {}){
  const res = await fetch(url, { method: 'POST', body: new URLSearchParams(body), headers })
  return res.json()
}

async function upsertTokenRow(payload: any){
  // attempt to find existing row by user_id & provider
  const getUrl = `${SUPABASE_URL}/rest/v1/oauth_tokens?select=*&user_id=eq.${payload.user_id}&provider=eq.${payload.provider}`
  const getRes = await fetch(getUrl, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } })
  const existing = await getRes.json()

  if(existing && existing[0] && existing[0].id){
    const id = existing[0].id
    const url = `${SUPABASE_URL}/rest/v1/oauth_tokens?id=eq.${id}`
    const res = await fetch(url, { method: 'PATCH', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type':'application/json', Prefer:'return=representation' }, body: JSON.stringify(payload) })
    return res.json()
  } else {
    const url = `${SUPABASE_URL}/rest/v1/oauth_tokens`
    const res = await fetch(url, { method: 'POST', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type':'application/json', Prefer:'return=representation' }, body: JSON.stringify(payload) })
    return res.json()
  }
}

async function upsertConnectedAccount(user_id: string, provider: string, provider_user_id: string | null, metadata: any){
  try{
    const getUrl = `${SUPABASE_URL}/rest/v1/connected_accounts?select=*&user_id=eq.${user_id}&provider=eq.${provider}` + (provider_user_id?`&provider_user_id=eq.${provider_user_id}`:'')
    const getRes = await fetch(getUrl, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } })
    const existing = await getRes.json()
    const payload = {
      user_id,
      provider,
      provider_user_id: provider_user_id || null,
      metadata: metadata || null
    }
    if(existing && existing[0] && existing[0].id){
      const id = existing[0].id
      const url = `${SUPABASE_URL}/rest/v1/connected_accounts?id=eq.${id}`
      const res = await fetch(url, { method: 'PATCH', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type':'application/json', Prefer:'return=representation' }, body: JSON.stringify(payload) })
      return res.json()
    } else {
      const url = `${SUPABASE_URL}/rest/v1/connected_accounts`
      const res = await fetch(url, { method: 'POST', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type':'application/json', Prefer:'return=representation' }, body: JSON.stringify(payload) })
      return res.json()
    }
  }catch(err){
    console.error('connected account upsert failed', err)
    return null
  }
}

serve(async (req) => {
  try{
    const url = new URL(req.url)
    const provider = url.searchParams.get('provider')
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if(!provider || !code || !state) return new Response('Missing provider, code, or state', { status: 400 })

    // decode state (expect base64-encoded JSON with user_id)
    let stateJson: any = {}
    try{
      const decoded = atob(state)
      stateJson = JSON.parse(decoded)
    }catch(e){
      console.error('Failed to parse state', e)
      return new Response('Invalid state', { status: 400 })
    }

    const user_id = stateJson.user_id
    if(!user_id) return new Response('Missing user_id in state', { status: 400 })

    let tokenResp: any

    if(provider === 'google'){
      tokenResp = await postJson('https://oauth2.googleapis.com/token', {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: Deno.env.get('OAUTH_CALLBACK_URL') || '',
        grant_type: 'authorization_code'
      })
    } else if(provider === 'microsoft' || provider === 'azure'){
      tokenResp = await postJson('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        code,
        redirect_uri: Deno.env.get('OAUTH_CALLBACK_URL') || '',
        grant_type: 'authorization_code'
      })
    } else {
      return new Response('Unsupported provider', { status: 400 })
    }

    if(tokenResp.error) return new Response(JSON.stringify({ error: tokenResp }), { status: 500, headers: { 'Content-Type': 'application/json' } })

    const expires_at = tokenResp.expires_in ? new Date(Date.now() + tokenResp.expires_in*1000).toISOString() : null

    let provider_user_id: string | null = null

    const payload: any = {
      user_id,
      provider,
      access_token: tokenResp.access_token,
      refresh_token: tokenResp.refresh_token || null,
      expires_at,
      scope: tokenResp.scope || null,
      token_type: tokenResp.token_type || null,
      provider_account_id: tokenResp.id_token || null
    }

    const upserted = await upsertTokenRow(payload)

    // Fetch provider userinfo to get provider-specific account id and metadata
    try{
      let userinfo: any = null
      if(provider === 'google'){
        const r = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokenResp.access_token}` } })
        userinfo = await r.json()
        provider_user_id = userinfo.sub || userinfo.id || null
      } else if(provider === 'microsoft' || provider === 'azure'){
        const r = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${tokenResp.access_token}` } })
        userinfo = await r.json()
        provider_user_id = userinfo.id || null
      }

      // upsert connected account row
      await upsertConnectedAccount(user_id, provider, provider_user_id, userinfo)
      // also update oauth_tokens row with provider_account_id if available
      if(provider_user_id){
        payload.provider_account_id = provider_user_id
        await upsertTokenRow(payload)
      }
    }catch(e){
      console.error('Failed to fetch userinfo or upsert connected account', e)
    }

    // Redirect back to app (state may include return_to)
    const returnTo = stateJson.return_to || (Deno.env.get('APP_URL') || '/')
    return new Response(`Saved tokens. Redirecting... <a href="${returnTo}">Continue</a>`, { status: 200, headers: { 'Content-Type': 'text/html' } })
  }catch(err){
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
