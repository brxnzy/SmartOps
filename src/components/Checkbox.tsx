import React from "react";

interface CheckboxProps extends Omit<React.ComponentProps<"input">, "type"> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={`h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${className}`}
        {...props}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
