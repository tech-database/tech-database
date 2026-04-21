-- 创建图片存储桶
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

-- 创建源文件存储桶
INSERT INTO storage.buckets (id, name, public) VALUES ('source_files', 'source_files', true);

-- 图片存储桶策略
CREATE POLICY "公开读取图片" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'images');
CREATE POLICY "公开上传图片" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = 'uploads');

-- 源文件存储桶策略
CREATE POLICY "公开读取源文件" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'source_files');
CREATE POLICY "公开上传源文件" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'source_files' AND (storage.foldername(name))[1] = 'uploads');