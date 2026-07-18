import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "sys-card border-white/5 bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] h-[52px] w-full rounded-[20px] px-4 py-2 text-[15px] text-white focus-visible:border-[#5B8CFF] focus-visible:ring-1 focus-visible:ring-[#5B8CFF] focus-visible:outline-none placeholder:text-[#A1A1AA] font-medium transition-all shadow-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
