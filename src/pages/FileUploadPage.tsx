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
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';

interface FileUploadFormData {
  name: string;
  category_level1_id: string;
  category_level2_id: string;
  image: File | null;
  sourceFile: File | null;
}

// 图片压缩函数
const compressImage = async (file: File, maxSizeMB = 1): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 限制最大分辨率为1080p
        const maxDimension = 1920;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // 尝试不同质量直到文件小于1MB
        let quality = 0.8;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('压缩失败'));
                return;
              }

              const sizeMB = blob.size / 1024 / 1024;
              if (sizeMB <= maxSizeMB || quality <= 0.1) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/webp',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                quality -= 0.1;
                tryCompress();
              }
            },
            'image/webp',
            quality
          );
        };

        tryCompress();
      };
      img.onerror = () => reject(new Error('图片加载失败'));
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
  });
};

// 上传文件到Supabase Storage
const uploadToStorage = async (
  file: File,
  bucketName: string,
  folder: string
): Promise<string | null> => {
  try {
    // 生成安全的文件名(只包含英文字母和数字)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'file';
    const safeFileName = `${timestamp}_${randomStr}.${ext}`;
    const filePath = `${folder}/${safeFileName}`;

    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error('上传失败:', err);
    return null;
  }
};

const FileUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryLevel1[]>([]);
  const [subCategories, setSubCategories] = useState<CategoryLevel2[]>([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState<CategoryLevel2[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FileUploadFormData>({
    defaultValues: {
      name: '',
      category_level1_id: '',
      category_level2_id: '',
      image: null,
      sourceFile: null,
    },
  });

  const selectedLevel1 = form.watch('category_level1_id');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedLevel1) {
      const filtered = subCategories.filter((sub) => sub.parent_id === selectedLevel1);
      setFilteredSubCategories(filtered);
      form.setValue('category_level2_id', '');
    } else {
      setFilteredSubCategories([]);
    }
  }, [selectedLevel1, subCategories]);

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

  const onSubmit = async (data: FileUploadFormData) => {
    if (!data.name.trim()) {
      toast.error('请输入文件名称');
      return;
    }

    if (!data.category_level1_id || !data.category_level2_id) {
      toast.error('请选择分类');
      return;
    }

    if (!data.image) {
      toast.error('请上传图片');
      return;
    }

    if (!data.sourceFile) {
      toast.error('请上传源文件');
      return;
    }

    try {
      setSubmitting(true);

      // 检查并压缩图片
      let imageToUpload = data.image;
      const imageSizeMB = data.image.size / 1024 / 1024;
      if (imageSizeMB > 1) {
        toast.info('图片超过1MB,正在自动压缩...');
        imageToUpload = await compressImage(data.image);
        const compressedSizeMB = imageToUpload.size / 1024 / 1024;
        toast.success(`压缩完成,文件大小: ${compressedSizeMB.toFixed(2)}MB`);
      }

      // 上传图片
      const imageUrl = await uploadToStorage(imageToUpload, 'images', 'uploads');
      if (!imageUrl) {
        toast.error('图片上传失败');
        return;
      }

      // 上传源文件
      const sourceUrl = await uploadToStorage(data.sourceFile, 'source_files', 'uploads');
      if (!sourceUrl) {
        toast.error('源文件上传失败');
        return;
      }

      // 保存文件记录
      const { error: insertError } = await supabase.from('files').insert({
        name: data.name.trim(),
        image_url: imageUrl,
        source_file_url: sourceUrl,
        category_level1_id: data.category_level1_id,
        category_level2_id: data.category_level2_id,
      });

      if (insertError) throw insertError;

      toast.success('文件上传成功');
      navigate('/');
    } catch (err) {
      console.error('上传失败:', err);
      toast.error('上传失败,请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h2 className="text-3xl font-bold text-foreground mb-8">上传文件</h2>

        <Card>
          <CardHeader>
            <CardTitle>文件信息</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* 文件名称 */}
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: '请输入文件名称' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>文件名称</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入文件名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 一级分类 */}
                <FormField
                  control={form.control}
                  name="category_level1_id"
                  rules={{ required: '请选择一级分类' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>一级分类</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择一级分类" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 二级分类 */}
                <FormField
                  control={form.control}
                  name="category_level2_id"
                  rules={{ required: '请选择二级分类' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>二级分类</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedLevel1}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请先选择一级分类" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredSubCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 图片上传 */}
                <FormField
                  control={form.control}
                  name="image"
                  rules={{ required: '请上传图片' }}
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel>图片</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            onChange(file);
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 源文件上传 */}
                <FormField
                  control={form.control}
                  name="sourceFile"
                  rules={{ required: '请上传源文件' }}
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel>源文件</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            onChange(file);
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 提交按钮 */}
                <div className="flex gap-4">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        上传中...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        提交上传
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/')}
                    disabled={submitting}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default FileUploadPage;
