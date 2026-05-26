import React, { useCallback } from 'react'
import { useEvents } from '../hooks/useEvents'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import '@fullcalendar/core/main.css'
import '@fullcalendar/daygrid/main.css'
import '@fullcalendar/timegrid/main.css'
import '@fullcalendar/list/main.css'

const SOURCE_COLORS = {
  google: '#4285F4',
  outlook: '#0078D4',
  apple: '#000000',
  facebook: '#1877F2',
  work: '#EA580C',
  personal: '#10B981'
}

export default function CalendarFull(){
  // Use Supabase-backed events
  const { events, loading, createEvent, updateEvent, deleteEvent } = useEvents()

  const handleEventDrop = useCallback(async (info) => {
    const { event } = info
    try{
      await updateEvent(event.id, { start: event.start?.toISOString(), end: event.end?.toISOString() })
    }catch(err){
      console.error('Failed to update event', err)
      info.revert()
    }
  }, [updateEvent])

  const handleEventClick = useCallback(async (info) => {
    const shouldDelete = window.confirm(`Delete event "${info.event.title}"?`)
    if(shouldDelete){
      try{
        await deleteEvent(info.event.id)
      }catch(err){
        console.error('Failed to delete', err)
      }
    }
  }, [deleteEvent])

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <FullCalendar
        plugins={[ dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin ]}
        initialView="dayGridMonth"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
        editable={true}
        selectable={true}
        events={events.map(ev => ({ id: ev.id, title: ev.title, start: ev.start, end: ev.end, color: ev.color }))}
        eventDrop={handleEventDrop}
        eventClick={handleEventClick}
        height={'auto'}
      />
    </div>
  )
}
