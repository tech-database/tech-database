import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import type { CategoryLevel1, CategoryLevel2 } from '@/types';

interface CategoryTreeProps {
  categories: CategoryLevel1[];
  subCategories: CategoryLevel2[];
  onSelectCategory?: (level1Id: string, level2Id: string) => void;
  selectedLevel1?: string;
  selectedLevel2?: string;
}

const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  subCategories,
  onSelectCategory,
  selectedLevel1,
  selectedLevel2,
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

  const getSubCategories = (parentId: string) => {
    return subCategories.filter((sub) => sub.parent_id === parentId);
  };

  return (
    <div className="space-y-1">
      {categories.map((category) => {
        const isExpanded = expandedCategories.has(category.id);
        const subs = getSubCategories(category.id);
        const hasChildren = subs.length > 0;

        return (
          <div key={category.id}>
            {/* 一级分类 */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover-transition ${
                selectedLevel1 === category.id && !selectedLevel2
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
              onClick={() => {
                if (hasChildren) {
                  toggleExpand(category.id);
                }
                if (onSelectCategory) {
                  onSelectCategory(category.id, '');
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
                <span className="ml-auto text-xs text-muted-foreground">({subs.length})</span>
              )}
            </div>

            {/* 二级分类 */}
            {isExpanded && hasChildren && (
              <div className="ml-6 mt-1 space-y-1 expand-transition">
                {subs.map((sub) => (
                  <div
                    key={sub.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover-transition ${
                      selectedLevel2 === sub.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      if (onSelectCategory) {
                        onSelectCategory(category.id, sub.id);
                      }
                    }}
                  >
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="text-sm">{sub.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CategoryTree;
