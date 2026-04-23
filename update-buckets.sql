-- ===============================================
-- 更新存储桶配置 - 移除 MIME 类型限制
-- ===============================================

-- 更新 images 存储桶 - 移除 MIME 类型限制
UPDATE storage.buckets 
SET allowed_mime_types = NULL
WHERE id = 'images';

-- 更新 source_files 存储桶 - 移除 MIME 类型限制
UPDATE storage.buckets 
SET allowed_mime_types = NULL
WHERE id = 'source_files';

-- 验证更新结果
SELECT id, name, allowed_mime_types, file_size_limit 
FROM storage.buckets 
WHERE id IN ('images', 'source_files');
