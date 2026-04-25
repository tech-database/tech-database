import React, { useEffect, useState, useMemo } from 'react';
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
import { Plus, Trash2, FolderTree, ChevronRight, ChevronDown, Edit, Save, X } from 'lucide-react';
import { buildCategoryTree, buildFlatCategoryList, getAllCategoryIds } from '@/lib/categoryUtils';

const CategoryManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

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

  // 构建带层级关系的分类列表
  const flatCategoryList = useMemo(() => {
    return buildFlatCategoryList(categories);
  }, [categories]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('请输入分类名称');
      return;
    }

    try {
      const { error } = await supabase.from('categories').insert({
        name: newCategoryName.trim(),
        parent_id: selectedParentId,
      });

      if (error) {
        console.error('添加分类失败:', error);
        toast.error(`添加失败: ${error.message || '未知错误'}`);
        return;
      }

      toast.success('分类添加成功');
      setNewCategoryName('');
      setSelectedParentId(null);
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

  // 从Storage中删除文件的辅助函数
  const deleteFileFromStorage = async (fileUrl: string, bucketName: string) => {
    try {
      const urlParts = fileUrl.split('/');
      const uploadsIndex = urlParts.indexOf('uploads');
      if (uploadsIndex !== -1 && uploadsIndex < urlParts.length - 1) {
        const filePath = urlParts.slice(uploadsIndex).join('/');
        
        const { error } = await supabase.storage
          .from(bucketName)
          .remove([filePath]);
        
        if (error) console.error('删除Storage文件失败:', error);
      }
    } catch (err) {
      console.error('删除Storage文件时出错:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      // 先获取完整的分类树以找到所有子分类
      const categoryTree = buildCategoryTree(allCategories);
      const targetCategory = findCategoryById(categoryTree, deleteTarget.id);
      
      let filesData: any[] = [];
      
      if (targetCategory) {
        // 获取所有相关分类ID
        const allCategoryIds = getAllCategoryIds(targetCategory);
        
        // 获取所有相关文件
        const { data: filesResult, error: fetchError } = await supabase
          .from('files')
          .select('id, image_url, source_file_url')
          .in('category_id', allCategoryIds);

        if (fetchError) throw fetchError;

        filesData = filesResult || [];

        // 删除Storage中的文件
        if (filesData.length > 0) {
          const storageDeleteErrors: string[] = [];
          for (const file of filesData) {
            if (file.image_url) {
              try {
                await deleteFileFromStorage(file.image_url, 'images');
              } catch (err) {
                console.error('删除图片失败:', err);
                storageDeleteErrors.push(`图片: ${file.image_url}`);
              }
            }
            if (file.source_file_url) {
              try {
                await deleteFileFromStorage(file.source_file_url, 'source_files');
              } catch (err) {
                console.error('删除源文件失败:', err);
                storageDeleteErrors.push(`源文件: ${file.source_file_url}`);
              }
            }
          }
          
          // Storage删除有错误，但继续删除数据库
          if (storageDeleteErrors.length > 0) {
            console.warn('部分Storage文件删除失败:', storageDeleteErrors);
          }
        }
      }

      // 删除数据库中的分类（会级联删除子分类和文件）
      const { error: deleteError } = await supabase.from('categories').delete().eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;

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

  const handleEditClick = (id: string, name: string) => {
    setEditingCategory({ id, name });
    setEditCategoryName(name);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editCategoryName.trim()) {
      toast.error('请输入分类名称');
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editCategoryName.trim() })
        .eq('id', editingCategory.id);

      if (error) {
        console.error('更新分类失败:', error);
        toast.error(`更新失败: ${error.message || '未知错误'}`);
        return;
      }

      toast.success('分类更新成功');
      setEditingCategory(null);
      setEditCategoryName('');
      fetchCategories();
    } catch (err) {
      console.error('更新分类失败:', err);
      toast.error('更新失败,请重试');
    }
  };

  // 辅助函数：通过ID查找分类
  const findCategoryById = (categories: Category[], id: string): Category | null => {
    for (const category of categories) {
      if (category.id === id) {
        return category;
      }
      if (category.children) {
        const found = findCategoryById(category.children, id);
        if (found) return found;
      }
    }
    return null;
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
    const isEditing = editingCategory?.id === category.id;

    return (
      <div key={category.id} className="space-y-2">
        {/* 分类项 */}
        <div className="flex items-center justify-between p-3 bg-secondary rounded" style={{ marginLeft: `${level * 20}px` }}>
          <div className="flex items-center gap-2 flex-1">
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
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveEdit}
                  className="shrink-0"
                >
                  <Save className="h-4 w-4 mr-1" />
                  保存
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="shrink-0"
                >
                  <X className="h-4 w-4 mr-1" />
                  取消
                </Button>
              </div>
            ) : (
              <span className="font-semibold text-foreground">{category.name}</span>
            )}
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[32px] min-w-[60px] px-4"
                onClick={() => handleEditClick(category.id, category.name)}
              >
                <Edit className="h-4 w-4 mr-1" />
                编辑
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="min-h-[32px] min-w-[60px] px-4"
                onClick={() => handleDeleteClick(category.id, category.name)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                删除
              </Button>
            </div>
          )}
        </div>

        {/* 子分类 */}
        {isExpanded && hasChildren && (
          <div className="space-y-2">
            {category.children?.map((child) => renderCategory(child, level + 1))}
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
              <Select 
                value={selectedParentId || 'root'} 
                onValueChange={(value) => setSelectedParentId(value === 'root' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择所属分类（可选，不选则为顶级分类）" />
                </SelectTrigger>
                <SelectContent>
                  {/* 无父分类选项 */}
                  <SelectItem value="root">顶级分类</SelectItem>
                  {flatCategoryList.map((cat) => (
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
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
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
