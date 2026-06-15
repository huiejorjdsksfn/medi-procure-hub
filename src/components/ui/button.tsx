/**
 * EL5 MediProcure — Enhanced Button v2.0
 * Tactile press, ripple, shimmer-on-hover, responsive sizing
 * ProcurBosse · Embu Level 5 Hospital
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    // Base layout
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium",
    "overflow-hidden select-none cursor-pointer",
    // Focus ring
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    // Disabled
    "disabled:pointer-events-none disabled:opacity-50",
    // SVG
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    // Smooth transitions: colour + shadow + transform
    "transition-all duration-150 ease-out",
    // Press-down tactile effect
    "active:scale-[0.97] active:brightness-90",
    // Touch target
    "touch-manipulation",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground shadow-sm",
          "hover:bg-primary/90 hover:shadow-md hover:-translate-y-[1px]",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground shadow-sm",
          "hover:bg-destructive/90 hover:shadow-md hover:-translate-y-[1px]",
        ].join(" "),
        outline: [
          "border border-input bg-background shadow-sm",
          "hover:bg-accent hover:text-accent-foreground hover:border-accent hover:shadow-md hover:-translate-y-[1px]",
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground shadow-sm",
          "hover:bg-secondary/80 hover:shadow-md hover:-translate-y-[1px]",
        ].join(" "),
        ghost: [
          "hover:bg-accent hover:text-accent-foreground",
          "hover:-translate-y-[1px]",
        ].join(" "),
        link: "text-primary underline-offset-4 hover:underline",
        success: [
          "bg-green-700 text-white shadow-sm",
          "hover:bg-green-800 hover:shadow-md hover:-translate-y-[1px]",
        ].join(" "),
        warning: [
          "bg-amber-600 text-white shadow-sm",
          "hover:bg-amber-700 hover:shadow-md hover:-translate-y-[1px]",
        ].join(" "),
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm:      "h-8 rounded-md px-3 text-xs",
        lg:      "h-11 rounded-md px-8 text-base",
        xl:      "h-12 rounded-md px-10 text-base font-semibold",
        icon:    "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size:    "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Show an animated ripple on click */
  ripple?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ripple = true, onClick, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const [ripples, setRipples] = React.useState<{ x: number; y: number; id: number }[]>([]);
    const nextId = React.useRef(0);

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (ripple && !asChild && variant !== "link" && variant !== "ghost") {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const id = nextId.current++;
          setRipples(r => [...r, { x, y, id }]);
          setTimeout(() => setRipples(r => r.filter(rr => rr.id !== id)), 600);
        }
        onClick?.(e);
      },
      [ripple, asChild, variant, onClick],
    );

    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        {...props}
      >
        {/* Ripple layer */}
        {ripples.map(r => (
          <span
            key={r.id}
            className="pointer-events-none absolute rounded-full bg-white/30 animate-ripple"
            style={{
              left: r.x - 4,
              top:  r.y - 4,
              width: 8,
              height: 8,
            }}
          />
        ))}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
