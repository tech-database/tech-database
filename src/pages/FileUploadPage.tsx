import React, { useEffect, useState, useMemo, useRef } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { supabase } from '@/db/supabase';
import type { Category } from '@/types';
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
import FileUpload from '@/components/dropzone';
import { buildCategoryTree, buildFlatCategoryList } from '@/lib/categoryUtils';
import { safeStorage } from '@/utils/safeStorage';

interface FileUploadFormData {
  name: string;
  category_id: string;
  specification?: string;
  image: File | null;
  sourceFile: File | null;
}

// 从 Storage 中删除文件的辅助函数
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

// 图片压缩函数 - 添加完整内存清理和取消机制
interface CompressOptions {
  maxSizeMB?: number;
  signal?: AbortSignal;
}

const compressImage = async (file: File, options: CompressOptions = {}): Promise<File> => {
  const { maxSizeMB = 1, signal } = options;
  
  // 清理函数 - 释放所有资源
  let cleanup: (() => void) | null = null;
  
  return new Promise((resolve, reject) => {
    // 检查是否已中止
    if (signal?.aborted) {
      reject(new Error('压缩已取消'));
      return;
    }

    // 安全检查：文件大小不能超过100MB（防止内存爆炸）
    const MAX_INPUT_SIZE_MB = 100;
    if (file.size > MAX_INPUT_SIZE_MB * 1024 * 1024) {
      reject(new Error(`文件太大，最大支持 ${MAX_INPUT_SIZE_MB}MB`));
      return;
    }

    // 如果文件已经小于等于最大大小，直接返回
    const originalSizeMB = file.size / 1024 / 1024;
    if (originalSizeMB <= maxSizeMB) {
      resolve(file);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let reader: FileReader | null = null;
    let img: HTMLImageElement | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;

    // 资源清理函数
    cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (reader) {
        reader.onload = null;
        reader.onerror = null;
        reader.abort();
        reader = null;
      }
      if (img) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        img = null;
      }
      if (canvas) {
        // 清除 canvas 内容，释放内存
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
      }
      ctx = null;
    };

    // 监听取消信号
    const abortHandler = () => {
      cleanup?.();
      reject(new Error('压缩已取消'));
    };
    signal?.addEventListener('abort', abortHandler);

    timeoutId = setTimeout(() => {
      cleanup?.();
      reject(new Error('压缩超时'));
    }, 15000); // 15秒超时，更短更友好

    reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      if (signal?.aborted) {
        cleanup?.();
        return;
      }
      
      img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        if (signal?.aborted) {
          cleanup?.();
          return;
        }
        
        canvas = document.createElement('canvas');
        let width = img!.width;
        let height = img!.height;

        // 严格限制分辨率，防止内存爆炸
        const MAX_DIMENSION = 1920;
        const MAX_PIXELS = 2073600; // 1920x1080
        const totalPixels = width * height;
        
        if (totalPixels > MAX_PIXELS || width > MAX_DIMENSION || height > MAX_DIMENSION) {
          let scale = Math.min(
            MAX_DIMENSION / width,
            MAX_DIMENSION / height,
            Math.sqrt(MAX_PIXELS / totalPixels)
          );
          width = Math.floor(width * scale);
          height = Math.floor(height * scale);
        }

        canvas.width = width;
        canvas.height = height;
        
        try {
          ctx = canvas.getContext('2d');
          if (!ctx) {
            cleanup?.();
            reject(new Error('无法获取canvas上下文'));
            return;
          }
          
          ctx.drawImage(img!, 0, 0, width, height);

          // 简化压缩：直接使用0.7质量，不尝试多次
          const fileType = file.type.startsWith('image/') ? file.type : 'image/jpeg';
          canvas!.toBlob(
            (blob) => {
              // 清理信号监听
              signal?.removeEventListener('abort', abortHandler);
              
              if (!blob) {
                cleanup?.();
                reject(new Error('压缩失败'));
                return;
              }

              const compressedFile = new File([blob], file.name, {
                type: fileType,
                lastModified: Date.now(),
              });
              cleanup?.(); // 压缩成功，释放资源
              resolve(compressedFile);
            },
            fileType,
            0.7
          );
        } catch (error) {
          cleanup?.();
          reject(error instanceof Error ? error : new Error('压缩过程出错'));
        }
      };
      
      img.onerror = () => {
        cleanup?.();
        reject(new Error('图片加载失败'));
      };
    };
    
    reader.onerror = () => {
      cleanup?.();
      reject(new Error('文件读取失败'));
    };
  });
};

// 上传文件到Supabase Storage - 支持大文件和进度显示
interface UploadProgress {
  (progress: number): void;
}

const uploadToStorage = async (
  file: File,
  bucketName: string,
  folder: string,
  onProgress?: UploadProgress
): Promise<string | null> => {
  try {
    // 生成安全的文件名(只包含英文字母和数字)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'file';
    const safeFileName = `${timestamp}_${randomStr}.${ext}`;
    const filePath = `${folder}/${safeFileName}`;

    // 根据文件大小选择上传策略
    const fileSizeMB = file.size / 1024 / 1024;
    
    // 大文件使用分块上传策略
    const uploadOptions: any = {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    };
    
    // 添加进度监听器（如果支持）
    if (onProgress && fileSizeMB > 5) {
      console.log(`开始上传 ${fileSizeMB.toFixed(2)}MB 的文件...`);
    }

    // 执行上传
    const { error, data } = await supabase.storage.from(bucketName).upload(filePath, file, uploadOptions);

    if (error) {
      console.error('上传错误详情:', error);
      throw new Error(`上传失败: ${error.message || '未知错误'}`);
    }

    // 获取公开URL
    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    console.log('上传成功:', publicUrl);
    return publicUrl;
  } catch (err) {
    console.error('上传失败:', err);
    throw err; // 重新抛出错误，让调用者处理
  }
};

const FileUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState(''); // 新增：显示当前步骤
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const form = useForm<FileUploadFormData>({
    defaultValues: {
      name: '',
      category_id: '',
      specification: '',
      image: null,
      sourceFile: null,
    },
  });

  useEffect(() => {
    isMounted.current = true;
    
    // 加载上次保存的分类
    const savedCategoryId = safeStorage.getItem('last_upload_category');
    if (savedCategoryId) {
      form.setValue('category_id', savedCategoryId);
    }
    
    fetchCategories();
    
    return () => {
      isMounted.current = false;
      // 组件卸载时取消正在进行的压缩
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const fetchCategories = async () => {
    try {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (isMounted.current) {
        setCategories(categoriesData || []);
      }
    } catch (err) {
      console.error('获取分类失败:', err);
      if (isMounted.current) {
        toast.error('加载分类失败');
      }
    }
  };

  // 构建带层级关系的分类列表
  const flatCategoryList = useMemo(() => {
    const categoryTree = buildCategoryTree(categories);
    return buildFlatCategoryList(categoryTree);
  }, [categories]);

  // 文件大小限制 (MB)
  const MAX_IMAGE_SIZE = 10;
  const MAX_SOURCE_FILE_SIZE = 100;

  const onSubmit = async (data: FileUploadFormData) => {
    if (!data.name.trim()) {
      toast.error('请输入文件名称');
      return;
    }
    if (!data.category_id) {
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
    
    // 检查文件大小
    if (data.image.size > MAX_IMAGE_SIZE * 1024 * 1024) {
      toast.error(`图片大小不能超过${MAX_IMAGE_SIZE}MB`);
      return;
    }
    if (data.sourceFile.size > MAX_SOURCE_FILE_SIZE * 1024 * 1024) {
      toast.error(`源文件大小不能超过${MAX_SOURCE_FILE_SIZE}MB`);
      return;
    }

    let imageUrl: string | null = null;
    let sourceUrl: string | null = null;

    try {
      setSubmitting(true);
      
      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();

      // 检查并压缩图片
      let imageToUpload = data.image;
      const imageSizeMB = data.image.size / 1024 / 1024;
      if (imageSizeMB > 1) {
        setUploadStep('正在压缩图片...');
        toast.info('图片超过1MB，正在自动压缩...');
        try {
          imageToUpload = await compressImage(data.image, {
            signal: abortControllerRef.current.signal
          });
          const compressedSizeMB = imageToUpload.size / 1024 / 1024;
          toast.success(`压缩完成，文件大小：${compressedSizeMB.toFixed(2)}MB`);
        } catch (compressError) {
          if (compressError instanceof Error && compressError.message === '压缩已取消') {
            console.log('压缩被用户取消');
            return;
          }
          console.warn('图片压缩失败，使用原图上传');
          toast.warning('图片压缩失败，使用原图上传');
          imageToUpload = data.image;
        }
      }

      // 上传图片
      setUploadStep('正在上传图片...');
      try {
        imageUrl = await uploadToStorage(imageToUpload, 'images', 'uploads');
      } catch (uploadErr) {
        const errorMsg = uploadErr instanceof Error ? uploadErr.message : '图片上传失败';
        toast.error(`图片上传失败: ${errorMsg}`);
        return;
      }

      if (!imageUrl) {
        toast.error('图片上传失败');
        return;
      }

      // 上传源文件 - 显示文件大小
      const sourceSizeMB = data.sourceFile.size / 1024 / 1024;
      setUploadStep(`正在上传源文件 (${sourceSizeMB.toFixed(1)}MB)...`);
      try {
        sourceUrl = await uploadToStorage(data.sourceFile, 'source_files', 'uploads');
      } catch (uploadErr) {
        const errorMsg = uploadErr instanceof Error ? uploadErr.message : '源文件上传失败';
        toast.error(`源文件上传失败: ${errorMsg}`);
        // 清理已上传的图片
        await deleteFileFromStorage(imageUrl, 'images');
        return;
      }

      if (!sourceUrl) {
        toast.error('源文件上传失败');
        // 清理已上传的图片
        await deleteFileFromStorage(imageUrl, 'images');
        return;
      }

      // 保存文件记录
      setUploadStep('正在保存记录...');
      const { error: insertError } = await supabase.from('files').insert({
        name: data.name.trim(),
        image_url: imageUrl,
        source_file_url: sourceUrl,
        category_id: data.category_id,
        specification: data.specification?.trim() || null,
      });

      if (insertError) throw insertError;

      setUploadStep('');
      toast.success('文件上传成功');
      
      // 保存当前选择的分类到本地存储
      safeStorage.setItem('last_upload_category', data.category_id);
      
      // 重置表单（保留分类），方便继续上传
      if (isMounted.current) {
        form.reset({
          name: '',
          category_id: data.category_id, // 保留分类
          specification: '',
          image: null,
          sourceFile: null,
        });
      }
    } catch (err) {
      console.error('上传失败:', err);
      
      // 如果有已上传的文件，清理它们
      if (imageUrl) {
        try {
          await deleteFileFromStorage(imageUrl, 'images');
        } catch (cleanErr) {
          console.error('清理图片失败:', cleanErr);
        }
      }
      if (sourceUrl) {
        try {
          await deleteFileFromStorage(sourceUrl, 'source_files');
        } catch (cleanErr) {
          console.error('清理源文件失败:', cleanErr);
        }
      }
      
      if (isMounted.current) {
        setUploadStep('');
        toast.error('上传失败，请重试');
      }
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
        setUploadStep('');
        // 重置 AbortController
        abortControllerRef.current = null;
      }
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

                {/* 分类选择 */}
                <FormField
                  control={form.control}
                  name="category_id"
                  rules={{ required: '请选择分类' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>分类</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择分类" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {flatCategoryList.map((cat) => (
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

                {/* 规格输入 */}
                <FormField
                  control={form.control}
                  name="specification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>规格（可选）</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入规格信息，如：尺寸、型号等" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 图片上传 */}
                <FormField
                  control={form.control}
                  name="image"
                  rules={{ required: '请上传图片' }}
                  render={({ field: { onChange, value } }) => (
                    <FileUpload
                      label="图片"
                      accept="image/*"
                      value={value}
                      onChange={onChange}
                    />
                  )}
                />

                {/* 源文件上传 */}
                <FormField
                  control={form.control}
                  name="sourceFile"
                  rules={{ required: '请上传源文件' }}
                  render={({ field: { onChange, value } }) => (
                    <FileUpload
                      label="源文件"
                      value={value}
                      onChange={onChange}
                    />
                  )}
                />

                {/* 提交按钮 */}
                <div className="flex gap-4">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {uploadStep || '上传中...'}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        提交上传
                      </div>
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
