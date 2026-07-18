import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "sys-btn-primary",
        outline: "sys-btn-secondary",
        secondary: "sys-btn-secondary",
        ghost: "hover:bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] text-white transition-colors rounded-2xl",
        destructive: "sys-btn-secondary border-[#F87171]/50 text-[#F87171] hover:bg-[#F87171]/10",
        link: "text-white underline-offset-4 hover:underline",
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
