export async function saveProviderToken({ fnUrl, userId, provider, access_token, refresh_token, expires_in, scope, token_type, provider_account_id }){
  if(!fnUrl) throw new Error('save-token function URL not provided')
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, provider, access_token, refresh_token, expires_in, scope, token_type, provider_account_id })
  })
  if(!res.ok) throw new Error('Failed to save token')
  return res.json()
}
