import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import SearchBar from '@/components/SearchBar';
import FileCard from '@/components/FileCard';
import { supabase } from '@/db/supabase';
import type { FileWithCategories, CategoryLevel1, CategoryLevel2 } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const HomePage: React.FC = () => {
  const [files, setFiles] = useState<FileWithCategories[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [searchKeyword]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchKeyword) {
        query = query.ilike('name', `%${searchKeyword}%`);
      }

      const { data: filesData, error: filesError } = await query;

      if (filesError) throw filesError;

      // 获取分类信息
      const { data: level1Data } = await supabase
        .from('categories_level1')
        .select('*');

      const { data: level2Data } = await supabase
        .from('categories_level2')
        .select('*');

      const level1Map = new Map<string, CategoryLevel1>(
        (level1Data || []).map((cat) => [cat.id, cat])
      );
      const level2Map = new Map<string, CategoryLevel2>(
        (level2Data || []).map((cat) => [cat.id, cat])
      );

      const filesWithCategories: FileWithCategories[] = (filesData || []).map((file) => ({
        ...file,
        category_level1: level1Map.get(file.category_level1_id),
        category_level2: level2Map.get(file.category_level2_id),
      }));

      setFiles(filesWithCategories);
    } catch (err) {
      console.error('获取文件列表失败:', err);
      setError('加载文件列表失败,请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 搜索区域 */}
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-3xl font-bold text-foreground">文件快速查找</h2>
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 文件列表 */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video w-full bg-muted" />
                <Skeleton className="h-4 w-3/4 bg-muted" />
                <Skeleton className="h-4 w-1/2 bg-muted" />
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              {searchKeyword ? '未找到相关文件' : '暂无文件,请先上传'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default HomePage;
