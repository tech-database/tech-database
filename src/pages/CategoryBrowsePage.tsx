import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckSquare, FolderTree, Square, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import CategoryTree from '@/components/CategoryTree';
import FileCard from '@/components/FileCard';
import FileEditDialog from '@/components/FileEditDialog';
import MainLayout from '@/components/layouts/MainLayout';
import SearchBar from '@/components/SearchBar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/db/supabase';
import { buildCategoryPath, buildCategoryTree } from '@/lib/categoryUtils';
import type { Category, FileWithCategories } from '@/types';

const CategoryBrowsePage: React.FC = () => {
  const { isAdmin } = useAdmin();
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [files, setFiles] = useState<FileWithCategories[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileWithCategories | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalFiles, setTotalFiles] = useState(0);
  const isMounted = useRef(true);

  const categories = useMemo(() => buildCategoryTree(allCategories), [allCategories]);
  const selectedCategoryName = useMemo(
    () => allCategories.find((category) => category.id === selectedCategory)?.name,
    [allCategories, selectedCategory]
  );

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (categoriesError) throw categoriesError;
      if (isMounted.current) setAllCategories(data || []);
    } catch (fetchError) {
      console.error('加载分类失败:', fetchError);
      if (isMounted.current) setError('加载分类失败，请稍后重试');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    if (!selectedCategory) {
      setFiles([]);
      setTotalFiles(0);
      return;
    }

    try {
      setFilesLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from('files')
        .select('*', { count: 'exact' })
        .eq('category_id', selectedCategory)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (searchKeyword) query = query.ilike('name', `%${searchKeyword}%`);

      const { data, error: filesError, count } = await query;
      if (filesError) throw filesError;

      const filesWithCategories: FileWithCategories[] = (data || []).map((file) => {
        const category = allCategories.find((item) => item.id === file.category_id);
        return {
          ...file,
          category,
          categoryPath: buildCategoryPath(category, allCategories),
        };
      });

      if (isMounted.current) {
        setFiles(filesWithCategories);
        setTotalFiles(count || 0);
      }
    } catch (fetchError) {
      console.error('加载文件失败:', fetchError);
      toast.error('加载文件失败，请稍后重试');
    } finally {
      if (isMounted.current) setFilesLoading(false);
    }
  }, [allCategories, page, pageSize, searchKeyword, selectedCategory]);

  const deleteFileFromStorage = useCallback(async (fileUrl: string, bucketName: string) => {
    const urlParts = fileUrl.split('/');
    const uploadsIndex = urlParts.indexOf('uploads');
    if (uploadsIndex === -1 || uploadsIndex >= urlParts.length - 1) return;
    const filePath = urlParts.slice(uploadsIndex).join('/');
    await supabase.storage.from(bucketName).remove([filePath]);
  }, []);

  const handleDeleteFile = useCallback(
    async (fileId: string) => {
      if (!confirm('确定删除这个文件吗？')) return;

      try {
        const { data } = await supabase
          .from('files')
          .select('image_url, source_file_url')
          .eq('id', fileId)
          .single();

        if (data?.image_url) await deleteFileFromStorage(data.image_url, 'images');
        if (data?.source_file_url) await deleteFileFromStorage(data.source_file_url, 'source_files');

        const { error: deleteError } = await supabase.from('files').delete().eq('id', fileId);
        if (deleteError) throw deleteError;

        toast.success('文件删除成功');
        fetchFiles();
      } catch (deleteError) {
        console.error('删除文件失败:', deleteError);
        toast.error('删除文件失败，请稍后重试');
      }
    },
    [deleteFileFromStorage, fetchFiles]
  );

  const handleBatchDelete = useCallback(async () => {
    if (selectedFiles.size === 0 || !confirm(`确定删除选中的 ${selectedFiles.size} 个文件吗？`)) return;
    try {
      const fileIds = Array.from(selectedFiles);
      const { error: deleteError } = await supabase.from('files').delete().in('id', fileIds);
      if (deleteError) throw deleteError;
      toast.success(`已删除 ${selectedFiles.size} 个文件`);
      setSelectedFiles(new Set());
      setIsSelectMode(false);
      fetchFiles();
    } catch (batchError) {
      console.error('批量删除失败:', batchError);
      toast.error('批量删除失败，请稍后重试');
    }
  }, [fetchFiles, selectedFiles]);

  const handleSaveFile = useCallback(
    async (fileId: string, data: { name: string; category_id: string; specification?: string }) => {
      try {
        setIsSaving(true);
        const { error: updateError } = await supabase
          .from('files')
          .update({
            name: data.name,
            category_id: data.category_id,
            specification: data.specification || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', fileId);

        if (updateError) throw updateError;
        toast.success('文件信息已更新');
        fetchFiles();
      } finally {
        setIsSaving(false);
      }
    },
    [fetchFiles]
  );

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchCategories();
    return () => {
      isMounted.current = false;
    };
  }, [fetchCategories]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const sidebarContent = (
    <div>
      <h3 className="mb-3 text-sm font-bold text-slate-900">分类目录</h3>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-full bg-white/70" />
          ))}
        </div>
      ) : (
        <CategoryTree
          categories={categories}
          onSelectCategory={(categoryId) => {
            setSelectedCategory(categoryId);
            setSearchKeyword('');
            setSelectedFiles(new Set());
            setIsSelectMode(false);
            setPage(1);
          }}
          selectedCategory={selectedCategory}
        />
      )}
    </div>
  );

  return (
    <MainLayout sidebarContent={sidebarContent}>
      <div className="px-4 py-5 lg:px-8 lg:py-7">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-sm font-semibold text-primary">
              <FolderTree className="h-4 w-4" />
              分类浏览
            </div>
            <h2 className="text-3xl font-bold text-slate-950">{selectedCategoryName || '选择一个分类开始浏览'}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {selectedCategory ? `当前共 ${totalFiles} 个文件` : '从左侧目录选择分类后查看文件'}
            </p>
          </div>
          {selectedCategory && <SearchBar onSearch={handleSearch} />}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-5 rounded-[1.25rem]">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {files.length > 0 && isAdmin && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={() => setIsSelectMode(!isSelectMode)}>
              {isSelectMode ? '取消选择' : '批量操作'}
            </Button>
            {isSelectMode && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFiles(
                      selectedFiles.size === files.length ? new Set() : new Set(files.map((file) => file.id))
                    );
                  }}
                >
                  {selectedFiles.size === files.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  {selectedFiles.size === files.length ? '取消全选' : `全选 ${files.length}`}
                </Button>
                {selectedFiles.size > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
                    <Trash2 className="h-4 w-4" />
                    删除 {selectedFiles.size}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {filesLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-[1.5rem] bg-white/70" />
                <Skeleton className="h-4 w-3/4 rounded-full bg-white/70" />
                <Skeleton className="h-4 w-1/2 rounded-full bg-white/70" />
              </div>
            ))}
          </div>
        ) : !selectedCategory ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FolderTree className="mx-auto mb-4 h-14 w-14 text-cyan-300" />
              <p className="text-lg font-semibold text-slate-900">请选择分类</p>
              <p className="mt-2 text-sm text-slate-500">左侧目录会显示全部资料分类。</p>
            </CardContent>
          </Card>
        ) : files.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-lg font-semibold text-slate-900">该分类暂无文件</p>
              <p className="mt-2 text-sm text-slate-500">可以切换分类或上传新的资料。</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onDelete={isAdmin ? handleDeleteFile : undefined}
                  onEdit={isAdmin ? (target) => { setEditingFile(target); setEditDialogOpen(true); } : undefined}
                  isSelected={isSelectMode && selectedFiles.has(file.id)}
                  onSelect={
                    isSelectMode && isAdmin
                      ? (fileId) => {
                          setSelectedFiles((previous) => {
                            const next = new Set(previous);
                            if (next.has(fileId)) next.delete(fileId);
                            else next.add(fileId);
                            return next;
                          });
                        }
                      : undefined
                  }
                />
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-[1.5rem] bg-white/65 p-4 sm:flex-row">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">每页显示</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="rounded-full border border-white/80 bg-white px-3 py-1.5 text-sm"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                  上一页
                </Button>
                <span className="px-3 text-sm text-slate-600">
                  第 {page} / {Math.max(1, Math.ceil(totalFiles / pageSize))} 页，共 {totalFiles} 条
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(totalFiles / pageSize)}
                >
                  下一页
                </Button>
              </div>
            </div>
          </>
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
