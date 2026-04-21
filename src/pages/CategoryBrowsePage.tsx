import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import CategoryTree from '@/components/CategoryTree';
import FileCard from '@/components/FileCard';
import { supabase } from '@/db/supabase';
import type { FileWithCategories, CategoryLevel1, CategoryLevel2 } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CategoryBrowsePage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryLevel1[]>([]);
  const [subCategories, setSubCategories] = useState<CategoryLevel2[]>([]);
  const [files, setFiles] = useState<FileWithCategories[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedLevel1, setSelectedLevel1] = useState<string>('');
  const [selectedLevel2, setSelectedLevel2] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedLevel1 || selectedLevel2) {
      fetchFiles();
    } else {
      setFiles([]);
    }
  }, [selectedLevel1, selectedLevel2]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: level1Data, error: level1Error } = await supabase
        .from('categories_level1')
        .select('*')
        .order('created_at', { ascending: true });

      if (level1Error) throw level1Error;

      const { data: level2Data, error: level2Error } = await supabase
        .from('categories_level2')
        .select('*')
        .order('created_at', { ascending: true });

      if (level2Error) throw level2Error;

      setCategories(level1Data || []);
      setSubCategories(level2Data || []);
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

      if (selectedLevel2) {
        query = query.eq('category_level2_id', selectedLevel2);
      } else if (selectedLevel1) {
        query = query.eq('category_level1_id', selectedLevel1);
      }

      const { data: filesData, error: filesError } = await query;

      if (filesError) throw filesError;

      const level1Map = new Map<string, CategoryLevel1>(
        categories.map((cat) => [cat.id, cat])
      );
      const level2Map = new Map<string, CategoryLevel2>(
        subCategories.map((cat) => [cat.id, cat])
      );

      const filesWithCategories: FileWithCategories[] = (filesData || []).map((file) => ({
        ...file,
        category_level1: level1Map.get(file.category_level1_id),
        category_level2: level2Map.get(file.category_level2_id),
      }));

      setFiles(filesWithCategories);
    } catch (err) {
      console.error('获取文件失败:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  const handleSelectCategory = (level1Id: string, level2Id: string) => {
    setSelectedLevel1(level1Id);
    setSelectedLevel2(level2Id);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-foreground mb-8">分类浏览</h2>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧分类树 */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded p-4 sticky top-4">
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
                  subCategories={subCategories}
                  onSelectCategory={handleSelectCategory}
                  selectedLevel1={selectedLevel1}
                  selectedLevel2={selectedLevel2}
                />
              )}
            </div>
          </div>

          {/* 右侧文件列表 */}
          <div className="lg:col-span-3">
            {filesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video w-full bg-muted" />
                    <Skeleton className="h-4 w-3/4 bg-muted" />
                    <Skeleton className="h-4 w-1/2 bg-muted" />
                  </div>
                ))}
              </div>
            ) : !selectedLevel1 && !selectedLevel2 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">请选择分类查看文件</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">该分类暂无文件</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {files.map((file) => (
                  <FileCard key={file.id} file={file} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CategoryBrowsePage;
