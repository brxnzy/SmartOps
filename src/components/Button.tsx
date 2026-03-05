import React from "react";
import type { ButtonProps } from "../types/interfaces";


const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ icon, fullWidth = false, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2.5
          px-4 py-2.5 rounded-md
          text-[#ededed] text-sm font-medium
          border 
          shadow-sm
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {icon && (
          <span className="flex items-center shrink-0 text-[#aaa]">{icon}</span>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
