import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import CategoryTree from '@/components/CategoryTree';
import FileCard from '@/components/FileCard';
import FileEditDialog from '@/components/FileEditDialog';
import SearchBar from '@/components/SearchBar';
import { supabase } from '@/db/supabase';
import type { FileWithCategories, Category } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Trash2, CheckSquare, Square } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { buildCategoryTree, buildCategoryPath } from '@/lib/categoryUtils';
import { useAdmin } from '@/contexts/AdminContext';

const CategoryBrowsePage: React.FC = () => {
  const { isAdmin } = useAdmin();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [files, setFiles] = useState<FileWithCategories[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileWithCategories | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchFiles();
    } else {
      setFiles([]);
    }
  }, [selectedCategory, searchKeyword]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (categoriesError) throw categoriesError;

      const categories = categoriesData || [];
      setAllCategories(categories);
      setCategories(buildCategoryTree(categories));
    } catch (err) {
      console.error('获取分类失败:', err);
      setError('加载分类失败,请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      setFilesLoading(true);

      let query = supabase.from('files').select('*').order('created_at', { ascending: false });

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      if (searchKeyword) {
        query = query.ilike('name', `%${searchKeyword}%`);
      }

      const { data: filesData, error: filesError } = await query;

      if (filesError) throw filesError;

      const filesWithCategories: FileWithCategories[] = (filesData || []).map((file) => {
        const category = allCategories.find(c => c.id === file.category_id);
        return {
          ...file,
          category: category,
          categoryPath: buildCategoryPath(category, allCategories),
        };
      });

      setFiles(filesWithCategories);
    } catch (err) {
      console.error('获取文件失败:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword);
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchKeyword('');
    setIsSelectMode(false);
    setSelectedFiles(new Set());
  };

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

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('确定要删除这个文件吗？')) {
      return;
    }

    try {
      const { data: fileData, error: fetchError } = await supabase
        .from('files')
        .select('image_url, source_file_url')
        .eq('id', fileId)
        .single();

      if (fetchError) throw fetchError;

      if (fileData?.image_url) {
        await deleteFileFromStorage(fileData.image_url, 'images');
      }
      if (fileData?.source_file_url) {
        await deleteFileFromStorage(fileData.source_file_url, 'source_files');
      }

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
      
      const { data: filesData, error: fetchError } = await supabase
        .from('files')
        .select('id, image_url, source_file_url')
        .in('id', fileIds);

      if (filesData) {
        for (const file of filesData) {
          if (file.image_url) {
            await deleteFileFromStorage(file.image_url, 'images');
          }
          if (file.source_file_url) {
            await deleteFileFromStorage(file.source_file_url, 'source_files');
          }
        }
      }

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

  const handleEditFile = (file: FileWithCategories) => {
    setEditingFile(file);
    setEditDialogOpen(true);
  };

  const handleSaveFile = async (
    fileId: string,
    data: { name: string; category_id: string; specification?: string }
  ) => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('files')
        .update({
          name: data.name,
          category_id: data.category_id,
          specification: data.specification || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId);

      if (error) throw error;

      toast.success('文件信息更新成功');
      fetchFiles();
    } catch (err) {
      console.error('更新文件信息失败:', err);
      toast.error('更新文件信息失败，请稍后重试');
      throw err;
    } finally {
      setIsSaving(false);
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

        {selectedCategory && (
          <div className="mb-4 lg:mb-6">
            <SearchBar onSearch={handleSearch} />
          </div>
        )}

        {files.length > 0 && isAdmin && (
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSelectMode(!isSelectMode)}
            >
              {isSelectMode ? '取消选择' : '批量操作'}
            </Button>
            {isSelectMode && (
              <div className="flex items-center gap-2">
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
                {selectedFiles.size > 0 && (
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
              </div>
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
                onDelete={isAdmin ? handleDeleteFile : undefined}
                onEdit={isAdmin ? handleEditFile : undefined}
                isSelected={isSelectMode && selectedFiles.has(file.id)}
                onSelect={isSelectMode && isAdmin ? handleSelectFile : undefined}
              />
            ))}
          </div>
        )}
      </div>
      <FileEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        file={editingFile}
        categories={allCategories}
        onSave={handleSaveFile}
        isSaving={isSaving}
      />
    </MainLayout>
  );
};

export default CategoryBrowsePage;