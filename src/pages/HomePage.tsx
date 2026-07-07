import Lightfall from '@/components/Lightfall';
﻿import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
 ArrowRight,
  Eye,
 ChevronRight,
  Database,
  FileText,
  FolderTree,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/db/supabase';
import type { FileWithCategories } from '@/types';

const quickActions = [
  {
    title: '上传文件',
    description: '添加图纸、图片与源文件',
    icon: Upload,
    path: '/upload',
    surface: 'bg-emerald-100 text-emerald-700',
  },
  {
    title: '分类浏览',
    description: '按层级快速定位资源',
    icon: FolderTree,
    path: '/categories',
    surface: 'bg-cyan-100 text-cyan-700',
  },
  {
    title: '分类管理',
    description: '维护资料库目录结构',
    icon: Wand2,
    path: '/manage',
    surface: 'bg-pink-100 text-pink-700',
  },
];

const popularCategories = [
  { name: '油漆', icon: Sparkles, color: 'bg-yellow-100 text-yellow-700' },
  { name: '文件', icon: FolderTree, color: 'bg-cyan-100 text-cyan-700' },
  { name: '胶板', icon: Database, color: 'bg-emerald-100 text-emerald-700' },
];

const HomePage: React.FC = () => {
  const [recentFiles, setRecentFiles] = useState<FileWithCategories[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

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
        const categoriesMap = new Map((categoriesData || []).map((category) => [category.id, category]));

        const filesWithCategories: FileWithCategories[] = (filesData || []).map((file) => {
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
      } catch (error) {
        console.error('获取最近文件失败', error);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    fetchRecentFiles();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: zhCN });
    } catch {
      return dateString;
    }
  };

  return (
    <MainLayout>
      <div className="min-h-full px-4 py-5 lg:px-8 lg:py-7">
        <section className="relative flex flex-col justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-black px-5 py-16 shadow-[0_14px_36px_rgb(15_23_42/0.18)] md:px-10 md:py-20">
          <div className="absolute inset-0 opacity-100">
            <Lightfall
              className="h-full w-full"
              colors={['#ff2e71', '#00d9ff', '#6366f1']}
              backgroundColor="#000000"
              speed={0.3}
              streakCount={3}
              streakWidth={0.15}
              streakLength={0.4}
              glow={1.2}
              density={0.5}
              twinkle={0.8}
              zoom={1.4}
              backgroundGlow={0}
              mouseInteraction
              mouseStrength={0.3}
              mouseRadius={0.08}
            />
          </div>

          <div className="relative z-10">
            <div>
              <h1 className="mx-auto max-w-3xl text-center text-3xl font-bold leading-tight text-white sm:text-4xl md:text-6xl">
                中泰技术组数据库              </h1>
            </div>

          </div>
        </section>

        <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          <section>
            <div className="mb-7 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.path} to={action.path} className="float-soft block transition-all duration-200 hover:-translate-y-0.5">
                    <Card className="h-full overflow-hidden border-slate-200/70 shadow-[0_2px_8px_rgb(0_0_0/0.04)] transition-shadow duration-200 hover:shadow-[0_4px_16px_rgb(0_0_0/0.10)]">
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${action.surface}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900">{action.title}</p>
                          <p className="mt-1 text-sm leading-snug text-slate-500">{action.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-colors duration-200 group-hover:text-slate-500" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">最近上传</h2>
                <p className="mt-1 text-sm text-slate-500">最新进入资料库的图纸与文件</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/categories">
                  查看全部
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index} className="overflow-hidden">
                    <div className="h-36 animate-pulse bg-cyan-50" />
                    <CardHeader className="pb-3">
                      <div className="mb-2 h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
                      <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
                    </CardHeader>
                  </Card>
                ))
              ) : recentFiles.length > 0 ? (
                recentFiles.map((file) => (
                  <Card key={file.id} className="float-soft overflow-hidden">
                    <div className="relative h-36 bg-white/75 p-3">
                      <img src={file.image_url} alt={file.name} className="h-full w-full object-contain" loading="lazy" />
                    </div>
                    <CardHeader className="pb-4">
                      <CardTitle className="line-clamp-1 text-sm font-bold text-slate-900">{file.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {file.categoryPath?.[0] || '未分类'} · {formatDate(file.created_at)}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="py-10 text-center text-slate-500">
                    <FileText className="mx-auto mb-3 h-12 w-12 text-cyan-300" />
                    <p>暂无文件记录</p>
                    <Button asChild className="mt-4">
                      <Link to="/upload">上传第一个文件</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          <Card className="h-full">
            <CardHeader className="pb-0">
              <CardTitle className="text-2xl font-bold text-slate-950">常用分类</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2">
                <div className="space-y-2">
                  {popularCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <Link
                        key={category.name}
                        to="/categories"
                        className="float-soft flex items-center gap-3 rounded-[1.25rem] p-3 hover:bg-white/80"
                      >
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${category.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <p className="flex-1 font-semibold text-slate-900">{category.name}</p>
                        <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-colors duration-200 group-hover:text-slate-500" />
                      </Link>
                    );
                  })}
                  <Button asChild variant="outline" className="mt-2 w-full">
                    <Link to="/categories">浏览全部分类</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;
