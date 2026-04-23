-- 1. Create the new categories table (self-referencing for infinite levels)
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create index for better performance when querying by parent_id
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- 3. Modify the files table to use category_id instead of category_level1_id and category_level2_id
ALTER TABLE files
  ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  DROP COLUMN IF EXISTS category_level1_id,
  DROP COLUMN IF EXISTS category_level2_id;

-- 4. Optional: Insert some sample data for testing
INSERT INTO categories (name, parent_id) VALUES
('胶板', NULL),
('油漆', NULL),
('文件柜', (SELECT id FROM categories WHERE name = '胶板')),
('茶几', (SELECT id FROM categories WHERE name = '胶板')),
('两门文件柜', (SELECT id FROM categories WHERE name = '文件柜')),
('三门文件柜', (SELECT id FROM categories WHERE name = '文件柜')),
('大茶几', (SELECT id FROM categories WHERE name = '茶几')),
('小茶几', (SELECT id FROM categories WHERE name = '茶几'));