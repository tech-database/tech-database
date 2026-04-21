-- 创建一级分类表
CREATE TABLE categories_level1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 创建二级分类表
CREATE TABLE categories_level2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid NOT NULL REFERENCES categories_level1(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, name)
);

-- 创建文件表
CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  source_file_url text NOT NULL,
  category_level1_id uuid NOT NULL REFERENCES categories_level1(id) ON DELETE CASCADE,
  category_level2_id uuid NOT NULL REFERENCES categories_level2(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 创建索引以优化查询
CREATE INDEX idx_files_name ON files(name);
CREATE INDEX idx_files_category_level2 ON files(category_level2_id);
CREATE INDEX idx_files_created_at ON files(created_at DESC);
CREATE INDEX idx_categories_level2_parent ON categories_level2(parent_id);

-- 插入初始分类数据
INSERT INTO categories_level1 (name) VALUES 
  ('文件柜'),
  ('办公桌'),
  ('办公椅');

INSERT INTO categories_level2 (name, parent_id) VALUES 
  ('两门文件柜', (SELECT id FROM categories_level1 WHERE name = '文件柜')),
  ('三门文件柜', (SELECT id FROM categories_level1 WHERE name = '文件柜')),
  ('四门文件柜', (SELECT id FROM categories_level1 WHERE name = '文件柜')),
  ('单人办公桌', (SELECT id FROM categories_level1 WHERE name = '办公桌')),
  ('双人办公桌', (SELECT id FROM categories_level1 WHERE name = '办公桌')),
  ('老板椅', (SELECT id FROM categories_level1 WHERE name = '办公椅')),
  ('职员椅', (SELECT id FROM categories_level1 WHERE name = '办公椅'));

-- 启用RLS
ALTER TABLE categories_level1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories_level2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- 创建公开读取策略(所有人可查看)
CREATE POLICY "公开读取一级分类" ON categories_level1 FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "公开读取二级分类" ON categories_level2 FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "公开读取文件" ON files FOR SELECT TO anon, authenticated USING (true);

-- 创建公开写入策略(所有人可上传文件和管理分类)
CREATE POLICY "公开插入一级分类" ON categories_level1 FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "公开删除一级分类" ON categories_level1 FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "公开插入二级分类" ON categories_level2 FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "公开删除二级分类" ON categories_level2 FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "公开插入文件" ON files FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "公开更新文件" ON files FOR UPDATE TO anon, authenticated USING (true);