import React from 'react'

export default function ConnectedAccounts(){
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Connected Accounts</h1>
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
            <p>Connect Google, Microsoft, Apple, or add ICS links.</p>
      </div>
    </div>
  )
}
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useEvents } from '../hooks/useEvents'

export default function ConnectedAccounts(){
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const { createEvent } = useEvents()
  const [connectedAccounts, setConnectedAccounts] = useState([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const userRes = await supabase.auth.getUser()
      const userId = userRes?.data?.user?.id
      if(!userId) return
      const { data, error } = await supabase.from('connected_accounts').select('*').eq('user_id', userId)
      if(error){
        console.error('Failed to load connected accounts', error)
        return
      }
      const accounts = data || []

      // fetch last sync info from oauth_tokens for each account
      const withSync = await Promise.all(accounts.map(async (acc) => {
        try{
          const { data: tokenRow } = await supabase.from('oauth_tokens').select('updated_at').match({ user_id: acc.user_id, provider: acc.provider, provider_account_id: acc.provider_user_id }).limit(1).single()
          return { ...acc, last_sync: tokenRow?.updated_at || null }
        }catch(e){
          return { ...acc, last_sync: null }
        }
      }))

      if(mounted) setConnectedAccounts(withSync)
    }
    load()
    return () => { mounted = false }
  }, [])

  const connectGoogle = async () => {
    setLoading(true)
    setStatus('Redirecting to Google...')
    try{
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { scopes: 'openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly' } })
    }catch(err){
      console.error(err)
      setStatus('Failed to start Google OAuth')
    }finally{ setLoading(false) }
  }

  const connectMicrosoft = async () => {
    setLoading(true)
    setStatus('Redirecting to Microsoft...')
    try{
      await supabase.auth.signInWithOAuth({ provider: 'azure', options: { scopes: 'openid email profile offline_access Calendars.ReadWrite' } })
    }catch(err){
      console.error(err)
      setStatus('Failed to start Microsoft OAuth')
    }finally{ setLoading(false) }
  }

  const connectGoogleDirect = async () => {
    const userRes = await supabase.auth.getUser()
    const userId = userRes?.data?.user?.id
    if(!userId){ setStatus('Please sign in first'); return }
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirect = import.meta.env.VITE_OAUTH_CALLBACK_URL
    const scope = encodeURIComponent('openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly')
    const state = btoa(JSON.stringify({ user_id: userId, return_to: window.location.origin + '/connected' }))
    const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&scope=${scope}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`
    window.location.href = url
  }

  const connectMicrosoftDirect = async () => {
    const userRes = await supabase.auth.getUser()
    const userId = userRes?.data?.user?.id
    if(!userId){ setStatus('Please sign in first'); return }
    const clientId = import.meta.env.VITE_MS_CLIENT_ID
    const redirect = import.meta.env.VITE_OAUTH_CALLBACK_URL
    const scope = encodeURIComponent('openid profile offline_access Calendars.ReadWrite')
    const state = btoa(JSON.stringify({ user_id: userId, return_to: window.location.origin + '/connected' }))
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirect)}&response_mode=query&scope=${scope}&prompt=consent&state=${encodeURIComponent(state)}`
    window.location.href = url
  }

  const handleIcs = async (e) => {
    const file = e.target.files && e.target.files[0]
    if(!file) return
    const text = await file.text()
    const vevents = text.split(/BEGIN:VEVENT/).slice(1)
    for(const raw of vevents){
      const summaryMatch = raw.match(/SUMMARY:(.*)/)
      const dtstartMatch = raw.match(/DTSTART(?:;[^:]*)?:(.*)/)
      const dtendMatch = raw.match(/DTEND(?:;[^:]*)?:(.*)/)
      const descMatch = raw.match(/DESCRIPTION:(.*)/)
      const title = summaryMatch ? summaryMatch[1].trim() : 'Imported Event'
      const startRaw = dtstartMatch ? dtstartMatch[1].trim() : null
      const endRaw = dtendMatch ? dtendMatch[1].trim() : null
      const description = descMatch ? descMatch[1].trim() : null

      const toIso = (icsStr) => {
        if(!icsStr) return null
        // simple handling for basic UTC/Z times and local
        if(icsStr.endsWith('Z')) return new Date(icsStr).toISOString()
        if(/T/.test(icsStr)) return new Date(icsStr).toISOString()
        // date-only
        return new Date(icsStr).toISOString()
      }

      try{
        await createEvent({ title, start: toIso(startRaw), end: toIso(endRaw), description, source: 'ics', color: '#6366F1' })
      }catch(err){
        console.error('Failed to import event', err)
      }
    }
    setStatus('ICS import complete')
  }

  const disconnectAccount = async (account) => {
    const ok = window.confirm(`Disconnect ${account.provider}? This will remove access and stored tokens.`)
    if(!ok) return
    try{
      // delete connected_accounts row
      const { error: delErr } = await supabase.from('connected_accounts').delete().eq('id', account.id)
      if(delErr) throw delErr
      // also delete oauth_tokens that match
      const { error: tokErr } = await supabase.from('oauth_tokens').delete().match({ user_id: account.user_id, provider: account.provider, provider_account_id: account.provider_user_id })
      if(tokErr) console.warn('Failed to delete oauth_tokens', tokErr)
      setConnectedAccounts(prev => prev.filter(a => a.id !== account.id))
      setStatus('Disconnected')
    }catch(err){
      console.error('Failed to disconnect', err)
      setStatus('Failed to disconnect')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Connected Accounts</h1>
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow space-y-4">
        <div className="flex gap-2">
          <button onClick={connectGoogle} disabled={loading} className="px-3 py-2 rounded bg-red-600 text-white">Connect Google (via Supabase)</button>
          <button onClick={connectMicrosoft} disabled={loading} className="px-3 py-2 rounded bg-blue-600 text-white">Connect Microsoft (via Supabase)</button>
          <button onClick={connectGoogleDirect} disabled={loading} className="px-3 py-2 rounded bg-red-400 text-white">Connect Google (direct)</button>
          <button onClick={connectMicrosoftDirect} disabled={loading} className="px-3 py-2 rounded bg-blue-400 text-white">Connect Microsoft (direct)</button>
        </div>

        <div>
          <label className="block mb-2">Import ICS file</label>
          <input type="file" accept=".ics" onChange={handleIcs} />
        </div>

        {status && <div className="text-sm text-gray-600">{status}</div>}

        <div className="mt-4">
          <h3 className="font-medium mb-2">Connected Accounts</h3>
          {connectedAccounts.length === 0 && <div className="text-sm text-gray-500">No connected accounts.</div>}
          <ul className="space-y-2">
            {connectedAccounts.map(acc => (
              <li key={acc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  {acc.metadata && acc.metadata.picture ? (
                    <img src={acc.metadata.picture} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold">{(acc.metadata && (acc.metadata.name || acc.metadata.email) ? (acc.metadata.name || acc.metadata.email).split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase() : acc.provider.slice(0,2).toUpperCase())}</div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{acc.provider}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        {/* provider icon */}
                        {acc.provider === 'google' && <span className="text-lg">🔵</span>}
                        {acc.provider === 'microsoft' && <span className="text-lg">🟦</span>}
                        {acc.provider === 'azure' && <span className="text-lg">🟦</span>}
                        {acc.provider === 'facebook' && <span className="text-lg">📘</span>}
                        {acc.provider === 'apple' && <span className="text-lg"></span>}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {acc.metadata?.email ? acc.metadata.email : acc.provider_user_id}
                      {acc.last_sync && <span className="ml-2">· Last sync: {new Date(acc.last_sync).toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => disconnectAccount(acc)} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Disconnect</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
