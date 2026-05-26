import React from 'react'
import { NavLink } from 'react-router-dom'

const items = [
  ['Dashboard','/'],
  ['Calendar','/calendar'],
  ['Notifications','/notifications'],
  ['Connected Accounts','/connected'],
  ['AI Assistant','/assistant'],
  ['Settings','/settings']
]

export default function Sidebar(){
  return (
    <aside className="w-64 p-4 border-r border-gray-200 dark:border-gray-800 hidden md:block">
      <div className="text-2xl font-semibold mb-6">LifeSync</div>
      <nav className="space-y-2">
        {items.map(([label, to])=> (
          <NavLink key={to} to={to} className={({isActive})=> isActive? 'block p-2 rounded bg-gray-200 dark:bg-gray-800' : 'block p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800'}>{label}</NavLink>
        ))}
      </nav>
    </aside>
  )
}
