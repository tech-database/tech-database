import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FolderTree, Settings, FileText, Database, ArrowRight, ChevronRight } from 'lucide-react';
import { supabase } from '@/db/supabase';
import type { FileWithCategories } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const HomePage: React.FC = () => {
  const [recentFiles, setRecentFiles] = useState<FileWithCategories[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    fetchRecentFiles();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchRecentFiles = async () => {
    try {
      setLoading(true);
      const { data: filesData, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;

      const { data: categoriesData } = await supabase.from('categories').select('*');
      const categoriesMap = new Map((categoriesData || []).map(c => [c.id, c]));

      const filesWithCategories: FileWithCategories[] = (filesData || []).map(file => {
        const category = categoriesMap.get(file.category_id);
        return {
          ...file,
          category,
          categoryPath: category ? [category.name] : [],
        };
      });

      if (isMounted.current) {
        setRecentFiles(filesWithCategories);
      }
    } catch (err) {
      console.error('获取最近文件失败:', err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: zhCN });
    } catch {
      return dateString;
    }
  };

  const quickActions = [
    {
      title: '上传文件',
      description: '上传新的图纸或技术文件',
      icon: Upload,
      path: '/upload',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      title: '分类浏览',
      description: '浏览所有分类和文件',
      icon: FolderTree,
      path: '/categories',
      gradient: 'from-indigo-500 to-indigo-600',
    },
    {
      title: '分类管理',
      description: '管理文件分类结构',
      icon: Settings,
      path: '/manage',
      gradient: 'from-violet-500 to-violet-600',
    },
  ];

  const popularCategories = [
    { name: '油漆', icon: FileText },
    { name: '文件柜', icon: FolderTree },
    { name: '胶板', icon: Database },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 顶部标题区 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8 lg:p-12">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0YzAtMS4xLS45LTItMi0ycy0yIC45LTIgMiAuOSAyIDIgMm0yIDBoNHYtNGgtNHY0em0wLTE2aDR2LTRoLTR2NHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50"></div>
          
          <div className="relative z-10 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
              中泰技术组数据库
            </h1>
          </div>
        </div>

        {/* 快速功能入口 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.path} to={action.path} className="group">
                <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-slate-200">
                  <CardHeader className="pb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-slate-800">{action.title}</CardTitle>
                    <CardDescription className="text-slate-500">{action.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full group-hover:bg-slate-50 transition-colors">
                      立即前往
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 最近访问文件 */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">最近上传</h2>
              <Link to="/categories">
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
                  查看全部
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="h-32 bg-slate-100 animate-pulse"></div>
                    <CardHeader className="pb-2">
                      <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse mb-2"></div>
                      <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse"></div>
                    </CardHeader>
                  </Card>
                ))
              ) : recentFiles.length > 0 ? (
                recentFiles.map((file) => (
                  <Card key={file.id} className="overflow-hidden hover:shadow-md transition-shadow group">
                    <div className="h-32 bg-slate-100 relative">
                      <img
                        src={file.image_url}
                        alt={file.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium line-clamp-1">{file.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {file.categoryPath?.[0] || '未分类'} · {formatDate(file.created_at)}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center text-slate-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>暂无文件记录</p>
                    <Link to="/upload">
                      <Button className="mt-4">上传第一个文件</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* 常用分类 */}
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">常用分类</h2>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-200">
                  {popularCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <Link
                        key={category.name}
                        to="/categories"
                        className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{category.name}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                      </Link>
                    );
                  })}
                  <Link
                    to="/categories"
                    className="flex items-center justify-center p-4 text-sm text-blue-600 hover:bg-slate-50 transition-colors font-medium"
                  >
                    浏览全部分类
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;
