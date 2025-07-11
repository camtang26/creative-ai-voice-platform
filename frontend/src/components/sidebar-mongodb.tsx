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
  ChevronRight,
  Database
} from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname?.() || ""
  const [expandedItems, setExpandedItems] = useState<string[]>(['contacts', 'analytics'])
  
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
    // Analytics section with expandable options
    {
      name: 'Analytics',
      href: '/analytics',
      icon: LineChart,
      isExpandable: true,
      id: 'analytics',
      subItems: [
        {
          name: 'Standard Analytics',
          href: '/analytics'
        },
        {
          name: 'MongoDB Analytics',
          href: '/analytics-mongodb'
        }
      ]
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
    <aside className="w-64 bg-card border-r min-h-screen p-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <PlayCircle className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">Investor Signals AI Call Centre</h1>
      </div>
      <nav className="space-y-1 max-h-[calc(100vh-12rem)] overflow-auto">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/') || 
                          (item.subItems?.some(subItem => pathname === subItem.href) ?? false)
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
                    
                    // Special icon for MongoDB Analytics
                    const showMongoIcon = subItem.href === '/analytics-mongodb'
                    
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
                        {showMongoIcon && <Database className="h-3.5 w-3.5" />}
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
