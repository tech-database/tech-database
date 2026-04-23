-- 添加规格字段到文件表
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS specification TEXT;
