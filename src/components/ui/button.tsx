import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#3f6ad5] hover:bg-[#3254a8] text-primary hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] font-semibold h-[52px] px-6 rounded-[20px] cursor-pointer transition-all duration-300 shadow-lg hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:scale-[0.98] active:shadow-[0_0_8px_rgba(63,106,213,0.4)]",
        outline: "bg-panel backdrop-blur-[16px] hover:bg-[#3f6ad5] border border-divider text-primary font-medium h-[52px] px-6 rounded-[20px] cursor-pointer transition-all duration-300 hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:scale-[0.98] active:shadow-[0_0_8px_rgba(63,106,213,0.4)]",
        secondary: "bg-panel backdrop-blur-[16px] hover:bg-[#3f6ad5] border border-divider text-primary font-medium h-[52px] px-6 rounded-[20px] cursor-pointer transition-all duration-300 hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:scale-[0.98] active:shadow-[0_0_8px_rgba(63,106,213,0.4)]",
        ghost: "hover:bg-[#3f6ad5] backdrop-blur-[16px] text-primary transition-colors rounded-2xl hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:scale-[0.98]",
        destructive: "bg-[#F87171]/10 border border-[#F87171]/50 text-[#F87171] hover:bg-[#F87171] hover:text-primary transition-all duration-300 hover:shadow-[0_0_15px_rgba(248,113,113,0.6)] active:scale-[0.98]",
        link: "text-[#3f6ad5] underline-offset-4 hover:underline hover:text-[#3254a8]",
      },
      size: {
        default: "", // Handled by sys- classes
        sm: "h-9 px-4 rounded-xl text-xs",
        lg: "h-14 px-8 rounded-2xl text-base",
        icon: "sys-btn-icon size-10",
        "icon-sm": "sys-btn-icon size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
