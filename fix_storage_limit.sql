-- 完全移除存储桶大小限制 - 支持超大文件上传

-- 方法1: 完全取消文件大小限制（推荐）
UPDATE storage.buckets 
SET file_size_limit = NULL
WHERE id IN ('images', 'source_files');

-- 方法2: 设置超大限制（500MB）
-- UPDATE storage.buckets 
-- SET file_size_limit = 524288000 -- 500MB
-- WHERE id = 'source_files';

-- 验证修改结果
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id IN ('images', 'source_files');
