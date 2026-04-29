import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
import debounce from '@/utils/debounce';

const CategoryBrowsePage: React.FC = () => {
  const { isAdmin } = useAdmin();
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalFiles, setTotalFiles] = useState(0);
  const isMounted = useRef(true);

  // 优化：使用useMemo缓存分类树
  const categories = useMemo(() => buildCategoryTree(allCategories), [allCategories]);

  // 优化：使用useCallback包装所有函数
  const fetchFiles = useCallback(async (currentPage: number) => {
    try {
      setFilesLoading(true);

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('files')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      if (searchKeyword) {
        query = query.ilike('name', `%${searchKeyword}%`);
      }

      const { data: filesData, error: filesError, count } = await query;

      if (filesError) throw filesError;

      const filesWithCategories: FileWithCategories[] = (filesData || []).map((file) => {
        const category = allCategories.find(c => c.id === file.category_id);
        return {
          ...file,
          category: category,
          categoryPath: buildCategoryPath(category, allCategories),
        };
      });

      if (isMounted.current) {
        setFiles(filesWithCategories);
        setTotalFiles(count || 0);
      }
    } catch (err) {
      console.error('获取文件失败:', err);
    } finally {
      if (isMounted.current) {
        setFilesLoading(false);
      }
    }
  }, [selectedCategory, searchKeyword, pageSize, allCategories]);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (categoriesError) throw categoriesError;

      if (isMounted.current) {
        setAllCategories(categoriesData || []);
      }
    } catch (err) {
      console.error('获取分类失败:', err);
      if (isMounted.current) {
        setError('加载分类失败,请稍后重试');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  // 优化：搜索防抖
  const debouncedSearch = useMemo(
    () => debounce((keyword: string) => {
      setSearchKeyword(keyword);
      setPage(1);
    }, 300),
    []
  );

  const handleSearch = useCallback((keyword: string) => {
    debouncedSearch(keyword);
  }, [debouncedSearch]);

  const handleSelectCategory = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchKeyword('');
    setIsSelectMode(false);
    setSelectedFiles(new Set());
    setPage(1);
  }, []);

  const deleteFileFromStorage = useCallback(async (fileUrl: string, bucketName: string) => {
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
  }, []);

  const handleDeleteFile = useCallback(async (fileId: string) => {
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

      if (isMounted.current) {
        toast.success('文件删除成功');
        fetchFiles(page);
      }
    } catch (err) {
      console.error('删除文件失败:', err);
      if (isMounted.current) {
        toast.error('删除文件失败，请稍后重试');
      }
    }
  }, [deleteFileFromStorage, fetchFiles, page]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    if (!confirm(`确定要删除选中的 ${selectedFiles.size} 个文件吗？`)) {
      return;
    }

    try {
      const fileIds = Array.from(selectedFiles);
      
      const { data: filesData } = await supabase
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

      if (isMounted.current) {
        toast.success(`成功删除 ${selectedFiles.size} 个文件`);
        setSelectedFiles(new Set());
        setIsSelectMode(false);
        fetchFiles(page);
      }
    } catch (err) {
      console.error('批量删除文件失败:', err);
      if (isMounted.current) {
        toast.error('批量删除文件失败，请稍后重试');
      }
    }
  }, [selectedFiles, deleteFileFromStorage, fetchFiles, page]);

  const handleSelectFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId);
      } else {
        newSelected.add(fileId);
      }
      return newSelected;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      const allFileIds = new Set(files.map(file => file.id));
      setSelectedFiles(allFileIds);
    }
  }, [selectedFiles, files]);

  const handleEditFile = useCallback((file: FileWithCategories) => {
    setEditingFile(file);
    setEditDialogOpen(true);
  }, []);

  const handleSaveFile = useCallback(async (
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

      if (isMounted.current) {
        toast.success('文件信息更新成功');
        fetchFiles(page);
      }
    } catch (err) {
      console.error('更新文件信息失败:', err);
      if (isMounted.current) {
        toast.error('更新文件信息失败，请稍后重试');
      }
      throw err;
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  }, [fetchFiles, page]);

  useEffect(() => {
    isMounted.current = true;
    fetchCategories();

    return () => {
      isMounted.current = false;
    };
  }, [fetchCategories]);

  useEffect(() => {
    if (selectedCategory) {
      setPage(1);
      fetchFiles(1);
    } else {
      if (isMounted.current) {
        setFiles([]);
        setTotalFiles(0);
      }
    }
  }, [selectedCategory, searchKeyword, fetchFiles]);

  useEffect(() => {
    if (selectedCategory && page > 0) {
      fetchFiles(page);
    }
  }, [page, pageSize, selectedCategory, fetchFiles]);

  // 优化：使用useMemo缓存侧边栏内容
  const categorySidebarContent = useMemo(() => (
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
  ), [loading, categories, handleSelectCategory, selectedCategory]);

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
          <>
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
            {files.length > 0 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* 每页显示数量 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">每页显示:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="border rounded-md px-3 py-1.5 text-sm"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* 分页控件 */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1 || filesLoading}
                  >
                    上一页
                  </Button>

                  <span className="px-4 py-1 text-sm text-gray-700">
                    第 {page} / {Math.ceil(totalFiles / pageSize)} 页，共 {totalFiles} 条
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= Math.ceil(totalFiles / pageSize) || filesLoading}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
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