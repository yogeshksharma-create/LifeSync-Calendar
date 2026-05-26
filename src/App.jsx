import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import CalendarView from './pages/CalendarView'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import ConnectedAccounts from './pages/ConnectedAccounts'
import Assistant from './pages/Assistant'

export default function App(){
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6">
          <Topbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/connected" element={<ConnectedAccounts />} />
            <Route path="/assistant" element={<Assistant />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
