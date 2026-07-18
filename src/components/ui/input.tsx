import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "sys-card border-[#38383a] bg-[#1c1c1e] h-[52px] w-full rounded-2xl px-4 py-2 text-[15px] text-white focus-visible:border-[#5B8CFF] focus-visible:ring-1 focus-visible:ring-[#5B8CFF] focus-visible:outline-none placeholder:text-[#48484a] font-medium transition-all shadow-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
