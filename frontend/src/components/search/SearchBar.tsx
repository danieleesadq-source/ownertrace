import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/Input';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Input
        type="search"
        placeholder="Enter name, address, or SSN..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        icon={<Search className="h-4 w-4" />}
      />
    </form>
  );
}
