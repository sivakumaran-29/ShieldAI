import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "sys-card border-divider bg-input backdrop-blur-[16px] h-[52px] w-full rounded-[20px] px-4 py-2 text-[15px] text-primary focus-visible:border-[#5B8CFF] focus-visible:ring-1 focus-visible:ring-[#5B8CFF] focus-visible:outline-none placeholder:text-tertiary font-medium transition-all shadow-inner shadow-black/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
