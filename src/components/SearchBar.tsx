import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  onSearch: (keyword: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder = '搜索文件名称...' }) => {
  const [keyword, setKeyword] = useState('');
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  const handleSearch = useCallback(() => {
    onSearchRef.current(keyword.trim());
  }, [keyword]);

  const handleClear = useCallback(() => {
    setKeyword('');
    onSearchRef.current('');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchRef.current(keyword.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword]);

  return (
    <div className="flex w-full max-w-2xl gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSearch();
          }}
          className="pl-11 pr-11"
        />
        {keyword && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2"
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
