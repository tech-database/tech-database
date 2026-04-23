-- 添加规格字段到文件表
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS specification TEXT;

-- 验证更新结果
SELECT id, name, specification, created_at 
FROM files 
LIMIT 5;