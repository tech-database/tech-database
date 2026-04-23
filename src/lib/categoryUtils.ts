import type { Category } from '@/types';

// 构建分类树
export const buildCategoryTree = (categories: Category[]): Category[] => {
  const categoryMap = new Map<string, Category>();
  const rootCategories: Category[] = [];

  // First pass: create a map of all categories
  categories.forEach(category => {
    categoryMap.set(category.id, { ...category, children: [] });
  });

  // Second pass: build the tree structure
  categories.forEach(category => {
    const categoryWithChildren = categoryMap.get(category.id);
    if (categoryWithChildren) {
      if (category.parent_id === null) {
        rootCategories.push(categoryWithChildren);
      } else {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(categoryWithChildren);
        }
      }
    }
  });

  return rootCategories;
};

// 构建带层级前缀的分类列表（用于下拉选择）
export const buildFlatCategoryList = (categories: Category[], prefix = ''): Array<{ id: string; name: string; level: number }> => {
  const result: Array<{ id: string; name: string; level: number }> = [];
  const level = prefix ? (prefix.match(/├─|│  |└─/g) || []).length : 0;

  for (const category of categories) {
    result.push({
      id: category.id,
      name: `${prefix}${category.name}`,
      level,
    });

    if (category.children && category.children.length > 0) {
      const newPrefix = prefix ? prefix.replace(/├─|└─/g, '│  ') + '├─' : '├─';
      result.push(...buildFlatCategoryList(category.children, newPrefix));
    }
  }

  return result;
};

// 构建分类路径（用于显示）
export const buildCategoryPath = (category?: Category, allCategories?: Category[]): string[] => {
  if (!category || !allCategories) return [];

  const categoryMap = new Map<string, Category>();
  allCategories.forEach(cat => categoryMap.set(cat.id, cat));

  const path: string[] = [category.name];
  let current = category;
  let loopCount = 0;
  const maxLoop = 100; // 防止无限循环

  while (current.parent_id && loopCount < maxLoop) {
    const parent = categoryMap.get(current.parent_id);
    if (parent) {
      path.unshift(parent.name);
      current = parent;
    } else {
      break;
    }
    loopCount++;
  }

  return path;
};

// 获取所有子分类ID（包括自身）
export const getAllCategoryIds = (category: Category): string[] => {
  const ids: string[] = [category.id];
  
  if (category.children) {
    for (const child of category.children) {
      ids.push(...getAllCategoryIds(child));
    }
  }
  
  return ids;
};