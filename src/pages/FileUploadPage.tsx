import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import FileUpload from '@/components/dropzone';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/db/supabase';
import { buildCategoryTree, buildFlatCategoryList } from '@/lib/categoryUtils';
import type { Category } from '@/types';
import { safeStorage } from '@/utils/safeStorage';

interface FileUploadFormData {
  name: string;
  category_id: string;
  specification?: string;
  image: File | null;
  sourceFile: File | null;
}

const uploadToStorage = async (file: File, bucketName: string, folder: string): Promise<string> => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).slice(2, 8);
  const ext = file.name.split('.').pop() || 'file';
  const filePath = `${folder}/${timestamp}_${randomStr}.${ext}`;

  const { error } = await supabase.storage.from(bucketName).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucketName).getPublicUrl(filePath);

  return publicUrl;
};

const deleteFileFromStorage = async (fileUrl: string, bucketName: string) => {
  const urlParts = fileUrl.split('/');
  const uploadsIndex = urlParts.indexOf('uploads');
  if (uploadsIndex === -1 || uploadsIndex >= urlParts.length - 1) return;
  await supabase.storage.from(bucketName).remove([urlParts.slice(uploadsIndex).join('/')]);
};

const FileUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const isMounted = useRef(true);

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
    const savedCategoryId = safeStorage.getItem('last_upload_category');
    if (savedCategoryId) form.setValue('category_id', savedCategoryId);

    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
      if (isMounted.current) setCategories(data || []);
    };

    fetchCategories();
    return () => {
      isMounted.current = false;
    };
  }, [form]);

  const flatCategoryList = useMemo(() => buildFlatCategoryList(buildCategoryTree(categories)), [categories]);

  const onSubmit = async (data: FileUploadFormData) => {
    if (!data.name.trim()) return toast.error('请输入文件名称');
    if (!data.category_id) return toast.error('请选择分类');
    if (!data.image) return toast.error('请上传图片');
    if (!data.sourceFile) return toast.error('请上传源文件');

    let imageUrl = '';
    let sourceUrl = '';

    try {
      setSubmitting(true);
      setUploadStep('正在上传图片');
      imageUrl = await uploadToStorage(data.image, 'images', 'uploads');

      setUploadStep('正在上传源文件');
      sourceUrl = await uploadToStorage(data.sourceFile, 'source_files', 'uploads');

      setUploadStep('正在保存记录');
      const { error } = await supabase.from('files').insert({
        name: data.name.trim(),
        image_url: imageUrl,
        source_file_url: sourceUrl,
        category_id: data.category_id,
        specification: data.specification?.trim() || null,
      });

      if (error) throw error;

      safeStorage.setItem('last_upload_category', data.category_id);
      toast.success('文件上传成功');
      form.reset({
        name: '',
        category_id: data.category_id,
        specification: '',
        image: null,
        sourceFile: null,
      });
    } catch (error) {
      if (imageUrl) await deleteFileFromStorage(imageUrl, 'images');
      if (sourceUrl) await deleteFileFromStorage(sourceUrl, 'source_files');
      console.error('上传失败:', error);
      toast.error('上传失败，请稍后重试');
    } finally {
      setSubmitting(false);
      setUploadStep('');
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl px-4 py-5 lg:px-8 lg:py-7">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-sm font-semibold text-primary">
            <Upload className="h-4 w-4" />
            上传工作流
          </div>
          <h2 className="text-3xl font-bold text-slate-950">上传文件</h2>
          <p className="mt-2 text-sm text-slate-500">补充图纸图片、源文件和分类信息，资料会进入统一检索库。</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>文件信息</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          {flatCategoryList.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>规格信息</FormLabel>
                      <FormControl>
                        <Input placeholder="例如尺寸、型号、材质等，可选" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="image"
                    rules={{ required: '请上传图片' }}
                    render={({ field: { onChange, value } }) => (
                      <FileUpload label="图片" accept="image/*" value={value} onChange={onChange} />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sourceFile"
                    rules={{ required: '请上传源文件' }}
                    render={({ field: { onChange, value } }) => (
                      <FileUpload label="源文件" value={value} onChange={onChange} />
                    )}
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {uploadStep || '上传中'}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        提交上传
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate('/')} disabled={submitting}>
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
