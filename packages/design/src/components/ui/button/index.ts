import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Button } from "./Button.vue"

export const buttonVariants = cva(
  // `active:scale-[0.97]` + ease-out gives every button the iOS press-down
  // feel; motion-reduce guards it for accessibility.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-[color-mix(in_oklab,var(--primary)_95%,#000)] hover:bg-primary/90",
        destructive:
          "bg-destructive text-white border border-[color-mix(in_oklab,var(--destructive)_95%,#000)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        // iOS "gray button": quiet filled surface, no hard outline. Keeps a
        // transparent border so swapping variants never shifts layout.
        outline:
          "border border-transparent bg-muted/70 text-foreground hover:bg-muted dark:bg-input/40 dark:hover:bg-input/60",
        secondary:
          "bg-secondary text-secondary-foreground border border-[color-mix(in_oklab,var(--secondary)_96%,#000)] hover:bg-secondary/80",
        // iOS "tinted button": primary at low opacity — louder than gray,
        // quieter than filled. For mid-emphasis actions.
        tinted:
          "border border-transparent bg-primary/12 text-primary hover:bg-primary/18",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        "default": "h-9 px-4 py-2 has-[>svg]:px-3",
        "sm": "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        "lg": "h-10 rounded-md px-6 has-[>svg]:px-4",
        "icon": "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
