"use client"

import { Button } from "@/components/ui/button"

interface DashboardHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function DashboardHeader({
  title,
  description,
  actions
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
      </div>
    </div>
  )
}
