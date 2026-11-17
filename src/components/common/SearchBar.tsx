import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
  value?: string;
  onChange?: (val: string) => void;
  onSubmit?: (val: string) => void;
  placeholder?: string;
  variant?: 'dark' | 'light';
  className?: string;
  autoNavigate?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value: controlledValue,
  onChange,
  onSubmit,
  placeholder = 'Search skin by name, design number or category...',
  variant = 'dark',
  className = '',
  autoNavigate = false,
}) => {
  const [internalValue, setInternalValue] = useState(controlledValue || '');
  const navigate = useNavigate();

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalValue(val);
    if (onChange) onChange(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(internalValue);
    } else if (autoNavigate) {
      navigate(`/catalog?q=${encodeURIComponent(internalValue)}`);
    }
  };

  const handleClear = () => {
    setInternalValue('');
    if (onChange) onChange('');
  };

  const isDark = variant === 'dark';

  return (
    <form onSubmit={handleSubmit} className={`relative flex items-center w-full ${className}`}>
      <Search
        size={16}
        className={`absolute left-3.5 pointer-events-none transition-colors ${
          isDark ? 'text-gray-400' : 'text-brand-navy/50'
        }`}
      />
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full pl-9 pr-8 py-2 text-xs md:text-[13px] rounded-full transition-all duration-200 outline-none ${
          isDark
            ? 'bg-[#18191E] text-white placeholder-gray-400 border border-white/10 focus:border-brand-lime focus:bg-[#202228]'
            : 'bg-white text-brand-navy placeholder-brand-navy/40 border border-brand-border focus:border-brand-navy/60 shadow-sm'
        }`}
      />
      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          className={`absolute right-3 p-0.5 rounded-full hover:opacity-80 transition-opacity ${
            isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
          }`}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </form>
  );
};
