"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <motion.aside 
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-64 glass-panel border-r border-white/10 min-h-screen p-4 flex flex-col backdrop-blur-xl"
    >
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex items-center justify-between mb-8 px-2"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <PlayCircle className="h-6 w-6 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          </motion.div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            AI Call Centre
          </h1>
        </div>
        <ThemeToggle />
      </motion.div>
      <nav className="space-y-2 flex-1 overflow-auto">
        {mainNavItems.map((item, index) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          const isExpanded = item.isExpandable && expandedItems.includes(item.id || '')
          
          return (
            <motion.div 
              key={item.href} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 + 0.3 }}
              className="flex flex-col"
            >
              {item.isExpandable ? (
                <motion.button
                  onClick={() => toggleExpand(item.id || '')}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-300 w-full relative overflow-hidden group ${
                    isActive 
                      ? 'bg-gradient-to-r from-gray-800/40 to-gray-900/40 text-white border border-gray-600/30 shadow-lg shadow-black/50' 
                      : 'text-white/70 hover:text-white hover:bg-gray-800/30 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : ''}`} />
                    {item.name}
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.div>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-gray-700/20 to-gray-800/20 rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.button>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-300 relative overflow-hidden group ${
                      isActive 
                        ? 'bg-gradient-to-r from-gray-800/40 to-gray-900/40 text-white border border-gray-600/30 shadow-lg shadow-black/50' 
                        : 'text-white/70 hover:text-white hover:bg-gray-800/30 border border-transparent'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : ''}`} />
                    {item.name}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-gray-700/20 to-gray-800/20 rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                </motion.div>
              )}
              
              {/* Sub-items */}
              <AnimatePresence>
                {item.isExpandable && isExpanded && item.subItems && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="pl-8 space-y-1 mt-2 overflow-hidden"
                  >
                    {item.subItems.map((subItem, subIndex) => {
                      const isSubActive = pathname === subItem.href
                      return (
                        <motion.div
                          key={subItem.href}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: subIndex * 0.05 }}
                          whileHover={{ scale: 1.02, x: 4 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Link
                            href={subItem.href}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-300 relative ${
                              isSubActive 
                                ? 'bg-gradient-to-r from-gray-700/30 to-gray-800/30 text-white border-l-2 border-gray-400' 
                                : 'text-white/60 hover:text-white hover:bg-gray-800/20'
                            }`}
                          >
                            <div className="w-1 h-1 bg-current rounded-full opacity-60" />
                            {subItem.name}
                          </Link>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </nav>
    </motion.aside>
  )
}
