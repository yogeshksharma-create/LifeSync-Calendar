import React from 'react'

export default function Topbar(){
  return (
    <header className="flex items-center justify-between mb-6">
      <div className="text-lg font-medium">Dashboard</div>
      <div className="flex items-center gap-4">
        <button className="px-3 py-1 rounded bg-indigo-600 text-white">New Event</button>
      </div>
    </header>
  )
}
