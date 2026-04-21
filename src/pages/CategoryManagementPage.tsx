import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { supabase } from '@/db/supabase';
import type { CategoryLevel1, CategoryLevel2 } from '@/types';
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
import { Plus, Trash2, FolderTree } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const CategoryManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryLevel1[]>([]);
  const [subCategories, setSubCategories] = useState<CategoryLevel2[]>([]);
  const [newLevel1Name, setNewLevel1Name] = useState('');
  const [newLevel2Name, setNewLevel2Name] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'level1' | 'level2';
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data: level1Data } = await supabase
        .from('categories_level1')
        .select('*')
        .order('created_at', { ascending: true });

      const { data: level2Data } = await supabase
        .from('categories_level2')
        .select('*')
        .order('created_at', { ascending: true });

      setCategories(level1Data || []);
      setSubCategories(level2Data || []);
    } catch (err) {
      console.error('获取分类失败:', err);
      toast.error('加载分类失败');
    }
  };

  const handleAddLevel1 = async () => {
    if (!newLevel1Name.trim()) {
      toast.error('请输入一级分类名称');
      return;
    }

    try {
      const { error } = await supabase
        .from('categories_level1')
        .insert({ name: newLevel1Name.trim() });

      if (error) throw error;

      toast.success('一级分类添加成功');
      setNewLevel1Name('');
      fetchCategories();
    } catch (err) {
      console.error('添加一级分类失败:', err);
      toast.error('添加失败,请检查分类名称是否重复');
    }
  };

  const handleAddLevel2 = async () => {
    if (!newLevel2Name.trim()) {
      toast.error('请输入二级分类名称');
      return;
    }

    if (!selectedParentId) {
      toast.error('请选择所属一级分类');
      return;
    }

    try {
      const { error } = await supabase.from('categories_level2').insert({
        name: newLevel2Name.trim(),
        parent_id: selectedParentId,
      });

      if (error) throw error;

      toast.success('二级分类添加成功');
      setNewLevel2Name('');
      setSelectedParentId('');
      fetchCategories();
    } catch (err) {
      console.error('添加二级分类失败:', err);
      toast.error('添加失败,请检查分类名称是否重复');
    }
  };

  const handleDeleteClick = (type: 'level1' | 'level2', id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      const table = deleteTarget.type === 'level1' ? 'categories_level1' : 'categories_level2';
      const { error } = await supabase.from(table).delete().eq('id', deleteTarget.id);

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

  const getSubCategoriesForParent = (parentId: string) => {
    return subCategories.filter((sub) => sub.parent_id === parentId);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h2 className="text-3xl font-bold text-foreground mb-8">分类管理</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 添加一级分类 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                添加一级分类
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="输入一级分类名称"
                value={newLevel1Name}
                onChange={(e) => setNewLevel1Name(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddLevel1()}
              />
              <Button onClick={handleAddLevel1} className="w-full">
                添加
              </Button>
            </CardContent>
          </Card>

          {/* 添加二级分类 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                添加二级分类
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择所属一级分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="输入二级分类名称"
                value={newLevel2Name}
                onChange={(e) => setNewLevel2Name(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddLevel2()}
              />
              <Button onClick={handleAddLevel2} className="w-full">
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
              {categories.map((category) => {
                const subs = getSubCategoriesForParent(category.id);
                return (
                  <div key={category.id} className="space-y-2">
                    {/* 一级分类 */}
                    <div className="flex items-center justify-between p-3 bg-secondary rounded">
                      <span className="font-semibold text-foreground">{category.name}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick('level1', category.id, category.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        删除
                      </Button>
                    </div>

                    {/* 二级分类 */}
                    {subs.length > 0 && (
                      <div className="ml-6 space-y-2">
                        {subs.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between p-2 bg-muted rounded"
                          >
                            <span className="text-sm text-foreground">{sub.name}</span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick('level2', sub.id, sub.name)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              删除
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Separator />
                  </div>
                );
              })}

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
                {deleteTarget?.type === 'level1'
                  ? `删除一级分类"${deleteTarget.name}"后,该分类下的所有二级分类及文件将一并删除,是否继续?`
                  : `删除二级分类"${deleteTarget?.name}"后,该分类下的所有文件将一并删除,是否继续?`}
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
