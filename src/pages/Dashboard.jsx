import React from 'react'

export default function Dashboard(){
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Unified Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-2 bg-white dark:bg-gray-800 p-4 rounded shadow">Combined calendar preview (placeholder)</div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">Daily agenda</div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">To-dos & habits</div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">Weather</div>
      </div>
    </div>
  )
}
