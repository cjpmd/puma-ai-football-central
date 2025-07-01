
import * as React from "react";
import { cn } from "@/lib/utils";

interface ShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Shell = React.forwardRef<HTMLDivElement, ShellProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("container mx-auto px-4 py-6", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Shell.displayName = "Shell";

export { Shell };
