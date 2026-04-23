-- ===============================================
-- 完整的数据库设置脚本
-- 适用于新的 Supabase 项目
-- ===============================================

-- 1. 创建分类表（支持无限层级）
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 创建索引以优化性能
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- 2. 创建文件表
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  source_file_url text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);

-- 3. 启用 RLS 并创建策略
-- 分类表权限
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "公开读取分类" ON categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "公开插入分类" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "公开更新分类" ON categories FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "公开删除分类" ON categories FOR DELETE TO anon, authenticated USING (true);

-- 文件表权限
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "公开读取文件" ON files FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "公开插入文件" ON files FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "公开更新文件" ON files FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "公开删除文件" ON files FOR DELETE TO anon, authenticated USING (true);

-- 4. 创建存储桶（在 Supabase 控制台执行或使用 Supabase CLI）
-- 注意：存储桶创建需要在 Supabase 控制台手动执行，或使用以下 SQL 语句

-- 创建 images 存储桶（不限制 MIME 类型）
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('images', 'images', true, 5242880)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public, 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = NULL;

-- 创建 source_files 存储桶（不限制 MIME 类型）
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('source_files', 'source_files', true, 10485760)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public, 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = NULL;

-- 5. 为存储桶创建权限策略
-- images 存储桶权限
CREATE POLICY "公开访问 images 存储桶" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'images');
CREATE POLICY "允许上传到 images 存储桶" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'images');

-- source_files 存储桶权限
CREATE POLICY "公开访问 source_files 存储桶" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'source_files');
CREATE POLICY "允许上传到 source_files 存储桶" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'source_files');

-- 6. 插入初始分类数据
INSERT INTO categories (name, parent_id) VALUES
('胶板', NULL),
('油漆', NULL),
('文件柜', (SELECT id FROM categories WHERE name = '胶板')),
('茶几', (SELECT id FROM categories WHERE name = '胶板')),
('两门文件柜', (SELECT id FROM categories WHERE name = '文件柜')),
('三门文件柜', (SELECT id FROM categories WHERE name = '文件柜')),
('大茶几', (SELECT id FROM categories WHERE name = '茶几')),
('小茶几', (SELECT id FROM categories WHERE name = '茶几'))
ON CONFLICT DO NOTHING;

-- 7. 可选：插入示例文件数据
-- 注意：需要先上传文件到存储桶获取URL
-- INSERT INTO files (name, image_url, source_file_url, category_id) VALUES
-- ('示例文件1', 'https://your-storage-url/images/example1.jpg', 'https://your-storage-url/source_files/example1.pdf', (SELECT id FROM categories WHERE name = '两门文件柜'))
-- ON CONFLICT DO NOTHING;

-- ===============================================
-- 执行完成后，数据库将完全配置好
-- 可以开始使用无限层级分类系统
-- ===============================================

-- 验证表结构
SELECT 'categories' as table_name, count(*) as row_count FROM categories UNION ALL
SELECT 'files' as table_name, count(*) as row_count FROM files;