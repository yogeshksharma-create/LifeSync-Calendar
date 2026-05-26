export async function refreshAccessToken({ userId, provider }){
  const fnUrl = import.meta.env.VITE_REFRESH_TOKEN_FN
  if(!fnUrl) throw new Error('VITE_REFRESH_TOKEN_FN not configured')
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, provider })
  })
  if(!res.ok) throw new Error('Failed to refresh token')
  return res.json()
}
