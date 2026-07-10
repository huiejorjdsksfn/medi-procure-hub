import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { preloadRoute } from "@/lib/performance";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, onMouseEnter, onFocus, ...props }, ref) => {
    const warm = useCallback(() => {
      try { preloadRoute(typeof to === "string" ? to : (to as any)?.pathname || "/"); } catch { /* ignore */ }
    }, [to]);
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        onMouseEnter={(e) => { warm(); onMouseEnter?.(e); }}
        onFocus={(e) => { warm(); onFocus?.(e); }}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
