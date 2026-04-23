import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { FileWithCategories, Category } from '@/types';
import { buildCategoryTree, buildFlatCategoryList } from '@/lib/categoryUtils';

interface FileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileWithCategories | null;
  categories: Category[];
  onSave: (fileId: string, data: { name: string; category_id: string; specification?: string }) => Promise<void>;
  isSaving?: boolean;
}

const FileEditDialog: React.FC<FileEditDialogProps> = ({
  open,
  onOpenChange,
  file,
  categories,
  onSave,
  isSaving = false,
}) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [specification, setSpecification] = useState('');

  // 构建带层级前缀的分类列表
  const flatCategoryList = useMemo(() => {
    const categoryTree = buildCategoryTree(categories);
    return buildFlatCategoryList(categoryTree);
  }, [categories]);

  useEffect(() => {
    if (file) {
      setName(file.name);
      setCategoryId(file.category_id);
      setSpecification(file.specification || '');
    }
  }, [file]);

  const handleSave = async () => {
    if (!file || !name.trim() || !categoryId) return;
    await onSave(file.id, {
      name: name.trim(),
      category_id: categoryId,
      specification: specification.trim() || undefined,
    });
    onOpenChange(false);
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>编辑文件信息</DialogTitle>
          <DialogDescription>修改文件的名称、分类和规格信息。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">文件名称</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入文件名称"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">分类</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category">
                <SelectValue placeholder="请选择分类" />
              </SelectTrigger>
              <SelectContent>
                {flatCategoryList.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="specification">规格</Label>
            <Textarea
              id="specification"
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              placeholder="请输入规格信息（可选）"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !categoryId}
          >
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileEditDialog;
