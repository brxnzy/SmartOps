const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-500 tracking-wide">
      {label}
    </label>
    {children}
  </div>
);

export default Field