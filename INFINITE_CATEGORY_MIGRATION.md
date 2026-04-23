# 无限层级分类系统迁移指南

## 一、数据库迁移

### 1. 创建新的分类表

**在 Supabase 控制台执行以下 SQL 语句：**

```sql
-- 创建新的分类表（支持无限层级）
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 创建索引以优化性能
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- 启用 RLS 并创建策略
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 公开读取策略
CREATE POLICY "公开读取分类" ON categories FOR SELECT TO anon, authenticated USING (true);

-- 公开写入策略
CREATE POLICY "公开插入分类" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "公开删除分类" ON categories FOR DELETE TO anon, authenticated USING (true);

-- 公开更新策略
CREATE POLICY "公开更新分类" ON categories FOR UPDATE TO anon, authenticated USING (true);
```

### 2. 更新文件表

**在 Supabase 控制台执行以下 SQL 语句：**

```sql
-- 添加 category_id 字段
ALTER TABLE files
  ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

-- 可选：如果有现有数据，将其迁移到新结构
-- 注意：这需要根据实际数据结构进行调整
-- 例如：UPDATE files SET category_id = category_level2_id;

-- 删除旧的分类字段
ALTER TABLE files
  DROP COLUMN IF EXISTS category_level1_id,
  DROP COLUMN IF EXISTS category_level2_id;
```

### 3. 插入初始分类数据（示例）

**在 Supabase 控制台执行以下 SQL 语句：**

```sql
-- 插入初始分类数据
INSERT INTO categories (name, parent_id) VALUES
('胶板', NULL),
('油漆', NULL),
('文件柜', (SELECT id FROM categories WHERE name = '胶板')),
('茶几', (SELECT id FROM categories WHERE name = '胶板')),
('两门文件柜', (SELECT id FROM categories WHERE name = '文件柜')),
('三门文件柜', (SELECT id FROM categories WHERE name = '文件柜')),
('大茶几', (SELECT id FROM categories WHERE name = '茶几')),
('小茶几', (SELECT id FROM categories WHERE name = '茶几'));
```

## 二、代码更新

### 1. 更新类型定义

**文件：`src/types/index.ts`**

```typescript
// 分类（支持无限层级）
export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  children?: Category[];
}

// 文件
export interface FileItem {
  id: string;
  name: string;
  image_url: string;
  source_file_url: string;
  category_id: string;
  created_at: string;
  updated_at: string;
}

// 带分类信息的文件
export interface FileWithCategories extends FileItem {
  category?: Category;
  categoryPath?: string[];
}
```

### 2. 更新分类树组件

**文件：`src/components/CategoryTree.tsx`**

```typescript
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
            // 三重阻断：彻底防止事件外溢、弹回主页
            e.stopPropagation();
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
            
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
            <span className="ml-auto text-xs text-muted-foreground">({category.children.length})</span>
          )}
        </div>

        {/* 子分类 */}
        {isExpanded && hasChildren && (
          <div className="mt-1 space-y-1 expand-transition">
            {category.children.map((child) => renderCategory(child, level + 1))}
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
```

### 3. 更新分类管理页面

**文件：`src/pages/CategoryManagementPage.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { supabase } from '@/db/supabase';
import type { Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Trash2, FolderTree, ChevronRight, ChevronDown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const CategoryManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (categoriesError) {
        console.error('获取分类失败:', categoriesError);
        // If categories table doesn't exist, show an error message
        if (categoriesError.code === '42P01') {
          toast.error('分类表不存在，请先创建分类表');
          setCategories([]);
          setAllCategories([]);
        } else {
          toast.error('加载分类失败');
        }
      } else {
        const categories = categoriesData || [];
        setAllCategories(categories);
        setCategories(buildCategoryTree(categories));
      }
    } catch (err) {
      console.error('获取分类失败:', err);
      toast.error('加载分类失败');
    }
  };

  const buildCategoryTree = (categories: Category[]): Category[] => {
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

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('请输入分类名称');
      return;
    }

    try {
      const { error } = await supabase.from('categories').insert({
        name: newCategoryName.trim(),
        parent_id: selectedParentId ? selectedParentId : null,
      });

      if (error) {
        console.error('添加分类失败:', error);
        toast.error(`添加失败: ${error.message || '未知错误'}`);
        return;
      }

      toast.success('分类添加成功');
      setNewCategoryName('');
      setSelectedParentId('');
      fetchCategories();
    } catch (err) {
      console.error('添加分类失败:', err);
      toast.error('添加失败,请重试');
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', deleteTarget.id);

      if (error) throw error;

      toast.success('删除成功');
      fetchCategories();
    } catch (err) {
      console.error('删除失败:', err);
      toast.error('删除失败,请重试');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

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

    return (
      <div key={category.id} className="space-y-2">
        {/* 分类项 */}
        <div className="flex items-center justify-between p-3 bg-secondary rounded" style={{ marginLeft: `${level * 20}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button
                type="button"
                className="shrink-0"
                onClick={() => toggleExpand(category.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            <span className="font-semibold text-foreground">{category.name}</span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteClick(category.id, category.name)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            删除
          </Button>
        </div>

        {/* 子分类 */}
        {isExpanded && hasChildren && (
          <div className="space-y-2">
            {category.children.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h2 className="text-3xl font-bold text-foreground mb-8">分类管理</h2>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
          {/* 添加分类 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                添加分类
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择所属分类（可选，不选则为顶级分类）" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="输入分类名称"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <Button onClick={handleAddCategory} className="w-full">
                添加
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 分类列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              分类列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map((category) => renderCategory(category))}

              {categories.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">暂无分类</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 删除确认对话框 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                删除分类"{deleteTarget?.name}"后,该分类下的所有子分类及文件将一并删除,是否继续?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>确认删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default CategoryManagementPage;
```

### 4. 更新分类浏览页面

**文件：`src/pages/CategoryBrowsePage.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import CategoryTree from '@/components/CategoryTree';
import FileCard from '@/components/FileCard';
import { supabase } from '@/db/supabase';
import type { FileWithCategories, Category } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Trash2, CheckSquare, Square } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CategoryBrowsePage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [files, setFiles] = useState<FileWithCategories[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchFiles();
    } else {
      setFiles([]);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (categoriesError) {
        console.error('获取分类失败:', categoriesError);
        setError('加载分类失败,请稍后重试');
      } else {
        const categories = categoriesData || [];
        setAllCategories(categories);
        setCategories(buildCategoryTree(categories));
      }
    } catch (err) {
      console.error('获取分类失败:', err);
      setError('加载分类失败,请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const buildCategoryTree = (categories: Category[]): Category[] => {
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

  const fetchFiles = async () => {
    try {
      setFilesLoading(true);

      let query = supabase.from('files').select('*').order('created_at', { ascending: false });

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      const { data: filesData, error: filesError } = await query;

      if (filesError) throw filesError;

      const categoryMap = new Map<string, Category>(
        allCategories.map((cat) => [cat.id, cat])
      );

      const filesWithCategories: FileWithCategories[] = (filesData || []).map((file) => {
        const category = categoryMap.get(file.category_id);
        return {
          ...file,
          category: category,
          categoryPath: buildCategoryPath(category, categoryMap),
        };
      });

      setFiles(filesWithCategories);
    } catch (err) {
      console.error('获取文件失败:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  const buildCategoryPath = (category: Category | undefined, categoryMap: Map<string, Category>): string[] => {
    if (!category) return [];
    const path: string[] = [category.name];
    let current = category;
    while (current.parent_id) {
      const parent = categoryMap.get(current.parent_id);
      if (parent) {
        path.unshift(parent.name);
        current = parent;
      } else {
        break;
      }
    }
    return path;
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsSelectMode(false);
    setSelectedFiles(new Set());
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('确定要删除这个文件吗？')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      toast.success('文件删除成功');
      fetchFiles();
    } catch (err) {
      console.error('删除文件失败:', err);
      toast.error('删除文件失败，请稍后重试');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedFiles.size === 0) return;

    if (!confirm(`确定要删除选中的 ${selectedFiles.size} 个文件吗？`)) {
      return;
    }

    try {
      const fileIds = Array.from(selectedFiles);
      const { error } = await supabase
        .from('files')
        .delete()
        .in('id', fileIds);

      if (error) throw error;

      toast.success(`成功删除 ${selectedFiles.size} 个文件`);
      setSelectedFiles(new Set());
      setIsSelectMode(false);
      fetchFiles();
    } catch (err) {
      console.error('批量删除文件失败:', err);
      toast.error('批量删除文件失败，请稍后重试');
    }
  };

  const handleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      const allFileIds = new Set(files.map(file => file.id));
      setSelectedFiles(allFileIds);
    }
  };

  const categorySidebarContent = (
    <div>
      <h3 className="font-semibold text-foreground mb-4">分类目录</h3>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-muted" />
          ))}
        </div>
      ) : (
        <CategoryTree
          categories={categories}
          onSelectCategory={handleSelectCategory}
          selectedCategory={selectedCategory}
        />
      )}
    </div>
  );

  return (
    <MainLayout sidebarContent={categorySidebarContent}>
      <div className="px-4 py-6 lg:px-6 lg:py-8 w-full max-w-none">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 lg:mb-8">分类浏览</h2>

        {error && (
          <Alert variant="destructive" className="mb-4 lg:mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {files.length > 0 && (
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSelectMode(!isSelectMode)}
            >
              {isSelectMode ? '取消选择' : '批量操作'}
            </Button>
            {isSelectMode && selectedFiles.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                删除 ({selectedFiles.size})
              </Button>
            )}
            {isSelectMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center gap-2"
              >
                {selectedFiles.size === files.length ? (
                  <><CheckSquare className="h-4 w-4" /> 取消全选</>
                ) : (
                  <><Square className="h-4 w-4" /> 全选 ({files.length})</>
                )}
              </Button>
            )}
          </div>
        )}

        {filesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video w-full bg-muted" />
                <Skeleton className="h-4 w-3/4 bg-muted" />
                <Skeleton className="h-4 w-1/2 bg-muted" />
              </div>
            ))}
          </div>
        ) : !selectedCategory ? (
          <div className="text-center py-8 lg:py-16">
            <p className="text-muted-foreground text-base lg:text-lg">请选择分类查看文件</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 lg:py-16">
            <p className="text-muted-foreground text-base lg:text-lg">该分类暂无文件</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onDelete={handleDeleteFile}
                isSelected={isSelectMode && selectedFiles.has(file.id)}
                onSelect={isSelectMode ? handleSelectFile : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CategoryBrowsePage;
```

### 5. 更新文件上传页面

**文件：`src/pages/FileUploadPage.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { supabase } from '@/db/supabase';
import type { Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import FileUpload from '@/components/dropzone';

interface FileUploadFormData {
  name: string;
  category_id: string;
  image: File | null;
  sourceFile: File | null;
}

// 图片压缩函数
const compressImage = async (file: File, maxSizeMB = 1): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 限制最大分辨率为1080p
        const maxDimension = 1920;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // 尝试不同质量直到文件小于1MB
        let quality = 0.8;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('压缩失败'));
                return;
              }

              const sizeMB = blob.size / 1024 / 1024;
              if (sizeMB <= maxSizeMB || quality <= 0.1) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/webp',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                quality -= 0.1;
                tryCompress();
              }
            },
            'image/webp',
            quality
          );
        };

        tryCompress();
      };
      img.onerror = () => reject(new Error('图片加载失败'));
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
  });
};

// 上传文件到Supabase Storage
const uploadToStorage = async (
  file: File,
  bucketName: string,
  folder: string
): Promise<string | null> => {
  try {
    // 生成安全的文件名(只包含英文字母和数字)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'file';
    const safeFileName = `${timestamp}_${randomStr}.${ext}`;
    const filePath = `${folder}/${safeFileName}`;

    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error('上传失败:', err);
    return null;
  }
};

const FileUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FileUploadFormData>({
    defaultValues: {
      name: '',
      category_id: '',
      image: null,
      sourceFile: null,
    },
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      setCategories(categoriesData || []);
    } catch (err) {
      console.error('获取分类失败:', err);
      toast.error('加载分类失败');
    }
  };

  const onSubmit = async (data: FileUploadFormData) => {
    if (!data.name.trim()) {
      toast.error('请输入文件名称');
      return;
    }

    if (!data.category_id) {
      toast.error('请选择分类');
      return;
    }

    if (!data.image) {
      toast.error('请上传图片');
      return;
    }

    if (!data.sourceFile) {
      toast.error('请上传源文件');
      return;
    }

    try {
      setSubmitting(true);

      // 检查并压缩图片
      let imageToUpload = data.image;
      const imageSizeMB = data.image.size / 1024 / 1024;
      if (imageSizeMB > 1) {
        toast.info('图片超过1MB,正在自动压缩...');
        imageToUpload = await compressImage(data.image);
        const compressedSizeMB = imageToUpload.size / 1024 / 1024;
        toast.success(`压缩完成,文件大小: ${compressedSizeMB.toFixed(2)}MB`);
      }

      // 上传图片
      const imageUrl = await uploadToStorage(imageToUpload, 'images', 'uploads');
      if (!imageUrl) {
        toast.error('图片上传失败');
        return;
      }

      // 上传源文件
      const sourceUrl = await uploadToStorage(data.sourceFile, 'source_files', 'uploads');
      if (!sourceUrl) {
        toast.error('源文件上传失败');
        return;
      }

      // 保存文件记录
      const { error: insertError } = await supabase.from('files').insert({
        name: data.name.trim(),
        image_url: imageUrl,
        source_file_url: sourceUrl,
        category_id: data.category_id,
      });

      if (insertError) throw insertError;

      toast.success('文件上传成功');
      navigate('/');
    } catch (err) {
      console.error('上传失败:', err);
      toast.error('上传失败,请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h2 className="text-3xl font-bold text-foreground mb-8">上传文件</h2>

        <Card>
          <CardHeader>
            <CardTitle>文件信息</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* 文件名称 */}
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: '请输入文件名称' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>文件名称</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入文件名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 分类选择 */}
                <FormField
                  control={form.control}
                  name="category_id"
                  rules={{ required: '请选择分类' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>分类</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择分类" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 图片上传 */}
                <FormField
                  control={form.control}
                  name="image"
                  rules={{ required: '请上传图片' }}
                  render={({ field: { onChange, value } }) => (
                    <FileUpload
                      name="image"
                      label="图片"
                      accept="image/*"
                      value={value}
                      onChange={onChange}
                      required
                    />
                  )}
                />

                {/* 源文件上传 */}
                <FormField
                  control={form.control}
                  name="sourceFile"
                  rules={{ required: '请上传源文件' }}
                  render={({ field: { onChange, value } }) => (
                    <FileUpload
                      name="sourceFile"
                      label="源文件"
                      value={value}
                      onChange={onChange}
                      required
                    />
                  )}
                />

                {/* 提交按钮 */}
                <div className="flex gap-4">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        上传中...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        提交上传
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/')}
                    disabled={submitting}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default FileUploadPage;
```

### 6. 更新文件卡片组件

**文件：`src/components/FileCard.tsx`**

```typescript
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FileWithCategories } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface FileCardProps {
  file: FileWithCategories;
  onDelete?: (fileId: string) => void;
  isSelected?: boolean;
  onSelect?: (fileId: string) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onDelete, isSelected, onSelect }) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: zhCN });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className={`hover-transition hover:bg-muted overflow-hidden min-w-0 max-w-[320px] ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-0">
        <div className="relative w-[200px] h-[200px] bg-muted">
          {onSelect && (
            <div className="absolute top-2 left-2 z-10">
              <button
                type="button"
                className={`w-6 h-6 rounded-full flex items-center justify-center ${isSelected ? 'bg-primary text-white' : 'bg-white/80 text-foreground'}`}
                onClick={() => onSelect(file.id)}
              >
                {isSelected ? '✓' : '○'}
              </button>
            </div>
          )}
          <img
            src={file.image_url}
            alt={file.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-muted"><svg class="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>`;
              }
            }}
          />
        </div>

        <div className="p-2 lg:p-3 space-y-1.5 lg:space-y-2 min-w-0">
          <h3 className="font-semibold text-foreground line-clamp-1 text-xs lg:text-sm">{file.name}</h3>
          
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            {file.categoryPath?.map((categoryName, index) => (
              <React.Fragment key={index}>
                <span className="px-1.5 py-0.5 bg-secondary rounded truncate">
                  {categoryName}
                </span>
                {index < file.categoryPath.length - 1 && <span>/</span>}
              </React.Fragment>
            )) || (
              <span className="px-1.5 py-0.5 bg-secondary rounded truncate">
                未分类
              </span>
            )}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground font-mono-time">
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0">上传时间:</span>
              <span className="truncate">{formatDate(file.created_at)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0">修改时间:</span>
              <span className="truncate">{formatDate(file.updated_at)}</span>
            </div>
          </div>

          <div className="flex gap-1 pt-1 lg:pt-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs min-w-0"
              onClick={() => window.open(file.image_url, '_blank')}
            >
              <FileText className="h-3 w-3 mr-1 shrink-0" />
              <span className="truncate">查看图片</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1 text-xs min-w-0"
              onClick={() => window.open(file.source_file_url, '_blank')}
            >
              <Download className="h-3 w-3 mr-1 shrink-0" />
              <span className="truncate">下载源文件</span>
            </Button>
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                className="text-xs min-w-0"
                onClick={() => onDelete(file.id)}
              >
                <Trash2 className="h-3 w-3 shrink-0" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileCard;
```

## 三、迁移步骤

### 1. 备份数据

在进行任何数据库修改之前，请确保备份您的现有数据。

### 2. 创建新的分类表

在 Supabase 控制台的 SQL 编辑器中执行第一步的 SQL 语句，创建新的 `categories` 表。

### 3. 更新文件表结构

在 Supabase 控制台的 SQL 编辑器中执行第二步的 SQL 语句，更新 `files` 表结构。

### 4. 迁移现有数据

在 Supabase 控制台的 SQL 编辑器中执行第三步的 SQL 语句，插入初始分类数据。

### 5. 替换代码文件

将上述更新后的代码文件替换到您的项目中：

- `src/types/index.ts`
- `src/components/CategoryTree.tsx`
- `src/pages/CategoryManagementPage.tsx`
- `src/pages/CategoryBrowsePage.tsx`
- `src/pages/FileUploadPage.tsx`
- `src/components/FileCard.tsx`

### 6. 测试功能

- 运行开发服务器
- 访问分类管理页面，添加新的分类和子分类
- 访问分类浏览页面，测试分类树的展开/折叠和文件显示
- 测试文件上传功能，确保可以选择任意层级的分类

## 四、注意事项

1. **数据迁移**：如果您有现有数据，需要手动将旧的分类结构迁移到新的结构中。

2. **权限设置**：确保新创建的 `categories` 表有正确的 RLS 策略，以允许公开访问。

3. **错误处理**：如果遇到 "分类表不存在" 的错误，请先在 Supabase 控制台创建 `categories` 表。

4. **性能优化**：对于大型分类树，可能需要进一步优化查询性能。

## 五、技术说明

1. **无限层级实现**：使用自关联表结构和递归组件实现无限层级分类。

2. **分类路径**：通过 `buildCategoryPath` 函数构建完整的分类路径，显示在文件卡片上。

3. **数据结构**：将原有的两级分类结构合并为单一的自关联表，简化了数据模型。

4. **用户体验**：保持了原有的样式和交互方式，确保用户体验的一致性。

通过以上步骤，您的系统将支持无限层级的分类结构，满足办公家具文件管理的需求。