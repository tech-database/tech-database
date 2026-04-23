import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import type { Category } from '@/types';

interface CategoryTreeProps {
  categories: Category[];
  onSelectCategory?: (categoryId: string) => void;
  selectedCategory?: string;
}

const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  onSelectCategory,
  selectedCategory,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children && category.children.length > 0;
    const isSelected = selectedCategory === category.id;

    return (
      <div key={category.id}>
        {/* 分类项 */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover-transition ${
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
          style={{ paddingLeft: `${3 + level * 18}px` }}
          onClick={(e) => {
            e.stopPropagation();
            
            if (hasChildren) {
              toggleExpand(category.id);
            }
            if (onSelectCategory) {
              onSelectCategory(category.id);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )
          ) : (
            <div className="w-4" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 shrink-0" />
          )}
          <span className="text-sm font-medium">{category.name}</span>
          {hasChildren && (
            <span className="ml-auto text-xs text-muted-foreground">({category.children?.length || 0})</span>
          )}
        </div>

        {/* 子分类 */}
        {isExpanded && hasChildren && (
          <div className="mt-1 space-y-1 expand-transition">
            {category.children?.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {categories.map((category) => renderCategory(category))}
    </div>
  );
};

export default CategoryTree;