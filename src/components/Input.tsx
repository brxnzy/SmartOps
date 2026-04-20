import type { InputProps } from "../types/interfaces";

const Input: React.FC<InputProps> = ({
  className = "",
  type = "text",
  icon,
  rightElement,
  ...props
}: InputProps) => {
  const paddingClassName = icon
    ? rightElement
      ? "pl-12 pr-12"
      : "pl-12 pr-3"
    : rightElement
      ? "pl-3 pr-12"
      : "px-3";

  return (
    <div className="relative flex items-center ">
      {icon && (
        <span className="absolute left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
          {icon}
        </span>
      )}

      {rightElement && (
        <span className="absolute right-0 flex items-center pr-2 pointer-events-auto">
          {rightElement}
        </span>
      )}

      <input
        type={type}
        className={`block w-full py-3 bg-white border-2 border-gray-400 rounded-lg
          focus:border-blue-500  focus:ring-blue-300 focus:outline-none
          ${paddingClassName}
          ${className}
        `}
        {...props}
      />
    </div>
  );
};

export default Input;
