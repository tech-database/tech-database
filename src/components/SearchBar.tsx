import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  onSearch: (keyword: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder = '搜索文件名称...' }) => {
  const [keyword, setKeyword] = useState('');

  const handleSearch = useCallback(() => {
    onSearch(keyword.trim());
  }, [keyword, onSearch]);

  const handleClear = useCallback(() => {
    setKeyword('');
    onSearch('');
  }, [onSearch]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // 防抖搜索 - 300ms延迟
  useEffect(() => {
    const timer = setTimeout(() => {
      if (keyword) {
        onSearch(keyword.trim());
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword, onSearch]);

  return (
    <div className="flex gap-2 w-full max-w-2xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-10 pr-10"
        />
        {keyword && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Button onClick={handleSearch}>搜索</Button>
    </div>
  );
};

export default SearchBar;
