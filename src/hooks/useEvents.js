import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const mapRowToEvent = (row) => ({
  id: row.id,
  title: row.title,
  start: row.start,
  end: row.end,
  allDay: row.all_day,
  color: row.color,
  source: row.source,
  description: row.description
})

export function useEvents(){
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    let isMounted = true

    const fetchEvents = async () => {
      setLoading(true)
      const { data, error } = await supabase.from('events').select('*')
      if(error){
        console.error('Error fetching events', error)
      } else if(isMounted){
        setEvents((data || []).map(mapRowToEvent))
      }
      setLoading(false)
    }

    fetchEvents()

    const channel = supabase.channel('events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload) => {
        const ev = payload.new ? mapRowToEvent(payload.new) : payload.old ? mapRowToEvent(payload.old) : null
        if(!ev) return
        if(payload.eventType === 'INSERT'){
          setEvents(prev => {
            if(prev.find(e=>e.id===ev.id)) return prev
            return [...prev, ev]
          })
        } else if(payload.eventType === 'UPDATE'){
          setEvents(prev => prev.map(e=> e.id===ev.id ? ev : e))
        } else if(payload.eventType === 'DELETE'){
          setEvents(prev => prev.filter(e=> e.id !== ev.id))
        }
      })
      .subscribe()

    return ()=>{
      isMounted = false
      try{ channel.unsubscribe() }catch(e){/* ignore */}
    }
  }, [])

  const createEvent = useCallback(async (event) => {
    const { data, error } = await supabase.from('events').insert([{
      title: event.title,
      start: event.start,
      end: event.end,
      all_day: event.allDay || false,
      source: event.source || 'personal',
      color: event.color || null,
      description: event.description || null
    }]).select().single()
    if(error) throw error
    return mapRowToEvent(data)
  }, [])

  const updateEvent = useCallback(async (id, changes) => {
    const payload = {}
    if(changes.title !== undefined) payload.title = changes.title
    if(changes.start !== undefined) payload.start = changes.start
    if(changes.end !== undefined) payload.end = changes.end
    if(changes.allDay !== undefined) payload.all_day = changes.allDay
    if(changes.color !== undefined) payload.color = changes.color
    if(changes.description !== undefined) payload.description = changes.description
    if(changes.source !== undefined) payload.source = changes.source

    const { data, error } = await supabase.from('events').update(payload).eq('id', id).select().single()
    if(error) throw error
    return mapRowToEvent(data)
  }, [])

  const deleteEvent = useCallback(async (id) => {
    const { data, error } = await supabase.from('events').delete().eq('id', id).select().single()
    if(error) throw error
    return mapRowToEvent(data)
  }, [])

  return { events, loading, createEvent, updateEvent, deleteEvent }
}
