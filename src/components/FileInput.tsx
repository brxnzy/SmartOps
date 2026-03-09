import React, { useEffect, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import type { FileInputProps } from "../types/interfaces";

const FileInput: React.FC<FileInputProps> = ({
  label,
  className = "",
  accept = "image/*",
  onChange,
  ...props
}) => {
  const [fileName, setFileName] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (file) {
      setFileName(file.name);
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      }
    } else {
      setFileName("");
    }

    onChange?.(e);
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-500 tracking-wide">
          {label}
        </label>
      )}

      <div className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-white transition-colors focus-within:border-blue-700 focus-within:ring focus-within:ring-blue-700 focus-within:ring-opacity-20 hover:border-gray-400">

        {/* Input always in DOM */}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleChange}
          {...props}
        />

        {/* State: file selected */}
        {fileName ? (
          <div className="p-4 flex items-center gap-3">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Vista previa"
                className="h-16 w-24 rounded-lg object-contain border border-gray-200 bg-gray-50 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-md font-medium text-gray-700 truncate">{fileName}</p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          /* State: empty */
          <label
            htmlFor={props.id}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-6 cursor-pointer select-none"
          >
            <UploadCloud size={20} className="text-gray-400" />
            <span className="text-sm text-gray-500 text-center">
              <span className="text-blue-700 font-medium">Haz clic para seleccionar</span>
              {" "}o arrastra aquí
            </span>
          </label>
        )}

      </div>
    </div>
  );
};

export default FileInput;