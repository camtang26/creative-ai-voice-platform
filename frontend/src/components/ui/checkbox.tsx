"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

// Simple CheckboxTrigger component that works with form control
const CheckboxTrigger = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
    onCheckedChange?: (checked: boolean) => void;
    checked?: boolean;
  }
>(({ className, onCheckedChange, checked, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    checked={checked}
    onCheckedChange={onCheckedChange}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
CheckboxTrigger.displayName = "CheckboxTrigger"

// Custom Checkbox Item for use in forms
const CheckboxItem = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { 
    label: string;
    description?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }
>(({ label, description, checked, onCheckedChange, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-start space-x-3 space-y-0 rounded-md border p-4", className)}
    {...props}
  >
    <CheckboxTrigger checked={checked} onCheckedChange={onCheckedChange} />
    <div className="space-y-1 leading-none">
      <label className="font-medium cursor-pointer">{label}</label>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  </div>
))
CheckboxItem.displayName = "CheckboxItem"

export { Checkbox, CheckboxTrigger, CheckboxItem }
