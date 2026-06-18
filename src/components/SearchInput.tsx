import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export function SearchInput({ value, onChange, placeholder = "Buscar..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocal(value); }, [value]);

  function handleChange(v: string) {
    setLocal(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(v), 300);
  }

  function handleClear() {
    setLocal("");
    onChange("");
  }

  return (
    <div className="relative max-w-xs">
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm shadow-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
      />
      {local && (
        <button type="button" onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
