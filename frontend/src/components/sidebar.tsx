"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { 
  BarChart, 
  Phone, 
  PlayCircle, 
  ListMusic, 
  Send, 
  Settings, 
  FileCog,
  Headphones,
  LineChart,
  FileSpreadsheet,
  FileText,
  Download,
  Users,
  UserPlus,
  FileUp,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export function Sidebar() {
  const pathname = usePathname?.() || ""
  const [expandedItems, setExpandedItems] = useState<string[]>(['contacts'])
  
  const toggleExpand = (item: string) => {
    setExpandedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    )
  }
  
  const mainNavItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: BarChart
    },
    {
      name: 'Call Logs',
      href: '/call-logs',
      icon: ListMusic
    },
    {
      name: 'Live Calls',
      href: '/live-calls',
      icon: Phone
    },
    {
      name: 'Recordings',
      href: '/recordings',
      icon: Headphones
    },
    {
      name: 'Make Call',
      href: '/make-call',
      icon: Send
    },
    // New navigation items for Phase 4
    {
      name: 'Analytics',
      href: '/analytics',
      icon: LineChart
    },
    {
      name: 'Campaigns',
      href: '/campaigns',
      icon: FileSpreadsheet
    },
    {
      name: 'Contacts',
      href: '/contacts',
      icon: Users,
      isExpandable: true,
      id: 'contacts',
      subItems: [
        {
          name: 'All Contacts',
          href: '/contacts'
        },
        {
          name: 'New Contact',
          href: '/contacts/new'
        },
        {
          name: 'Import Contacts',
          href: '/contacts/import'
        },
        {
          name: 'Export Contacts',
          href: '/contacts/export'
        }
      ]
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: FileText
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings
    },
  ]
  
  return (
    <aside className="w-64 bg-card border-r min-h-screen p-4 flex flex-col">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-2">
          <PlayCircle className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Investor Signals AI Call Centre</h1>
        </div>
        <ThemeToggle />
      </div>
      <nav className="space-y-1 flex-1 overflow-auto">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          const isExpanded = item.isExpandable && expandedItems.includes(item.id || '')
          
          return (
            <div key={item.href} className="flex flex-col">
              {item.isExpandable ? (
                <button
                  onClick={() => toggleExpand(item.id || '')}
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm transition-colors w-full ${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </div>
                  {isExpanded ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )}
              
              {/* Sub-items */}
              {item.isExpandable && isExpanded && item.subItems && (
                <div className="pl-8 space-y-1 mt-1">
                  {item.subItems.map((subItem) => {
                    const isSubActive = pathname === subItem.href
                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                          isSubActive 
                            ? 'bg-primary text-primary-foreground' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                        }`}
                      >
                        {subItem.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
