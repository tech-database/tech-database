import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Edit, FolderTree, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '@/components/layouts/MainLayout';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/db/supabase';
import { buildCategoryTree, buildFlatCategoryList } from '@/lib/categoryUtils';
import type { Category } from '@/types';

const CategoryManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const flatCategoryList = useMemo(() => buildFlatCategoryList(categoryTree), [categoryTree]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('加载分类失败:', error);
      toast.error('加载分类失败');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (editingCategory && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingCategory]);

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
      if (error) throw error;

      toast.success('分类已添加');
      setNewCategoryName('');
      setSelectedParentId(null);
      fetchCategories();
    } catch (error) {
      console.error('添加分类失败:', error);
      toast.error('添加分类失败');
    }
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
        .eq('id', editingCategory);
      if (error) throw error;

      toast.success('分类已更新');
      setEditingCategory(null);
      setEditCategoryName('');
      fetchCategories();
    } catch (error) {
      console.error('更新分类失败:', error);
      toast.error('更新分类失败');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', deleteTarget.id);
      if (error) throw error;

      toast.success('分类已删除');
      setDeleteTarget(null);
      fetchCategories();
    } catch (error) {
      console.error('删除分类失败:', error);
      toast.error('删除分类失败');
    }
  };

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((previous) => {
      const next = new Set(previous);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const renderCategory = (category: Category, level = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = Boolean(category.children?.length);
    const isEditing = editingCategory === category.id;

    return (
      <div key={category.id} className="space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-white/70 p-3" style={{ marginLeft: `${level * 18}px` }}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {hasChildren ? (
              <button type="button" className="rounded-full p-1 hover:bg-cyan-50" onClick={() => toggleExpand(category.id)}>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-6" />
            )}

            {isEditing ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                <Input
                  ref={editInputRef}
                  value={editCategoryName}
                  onChange={(event) => setEditCategoryName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSaveEdit();
                    if (event.key === 'Escape') {
                      setEditingCategory(null);
                      setEditCategoryName('');
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Save className="h-4 w-4" />
                    保存
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCategory(null);
                      setEditCategoryName('');
                    }}
                  >
                    <X className="h-4 w-4" />
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <span className="truncate font-semibold text-slate-900">{category.name}</span>
            )}
          </div>

          {!isEditing && (
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingCategory(category.id);
                  setEditCategoryName(category.name);
                }}
              >
                <Edit className="h-4 w-4" />
                编辑
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteTarget({ id: category.id, name: category.name })}>
                <Trash2 className="h-4 w-4" />
                删除
              </Button>
            </div>
          )}
        </div>

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
      <div className="mx-auto max-w-5xl px-4 py-5 lg:px-8 lg:py-7">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-sm font-semibold text-primary">
            <FolderTree className="h-4 w-4" />
            目录维护
          </div>
          <h2 className="text-3xl font-bold text-slate-950">分类管理</h2>
          <p className="mt-2 text-sm text-slate-500">维护资料目录层级，让检索路径更轻快清晰。</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                添加分类
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedParentId || 'root'} onValueChange={(value) => setSelectedParentId(value === 'root' ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择所属分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">顶级分类</SelectItem>
                  {flatCategoryList.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="输入分类名称"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleAddCategory()}
              />
              <Button onClick={handleAddCategory} className="w-full">
                添加分类
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5" />
                分类列表
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryTree.map((category) => renderCategory(category))}
                {categoryTree.length === 0 && (
                  <div className="rounded-[1.25rem] bg-white/70 py-10 text-center text-slate-500">暂无分类</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                删除分类“{deleteTarget?.name}”后，该分类及关联内容可能无法恢复，是否继续？
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
