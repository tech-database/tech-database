-- 更新存储桶配置以支持大文件

-- 更新源文件存储桶 - 增加文件大小限制
UPDATE storage.buckets 
SET 
  file_size_limit = 104857600 -- 100MB (100 * 1024 * 1024)
WHERE id = 'source_files';

-- 更新图片存储桶 - 保持合理的限制
UPDATE storage.buckets 
SET 
  file_size_limit = 10485760 -- 10MB (10 * 1024 * 1024)
WHERE id = 'images';

-- 如果需要，可以取消文件大小限制（设为NULL表示无限制）
-- UPDATE storage.buckets SET file_size_limit = NULL WHERE id = 'source_files';
