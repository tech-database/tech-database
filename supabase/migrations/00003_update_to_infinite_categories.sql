-- Step 1: Create the new categories table (self-referencing for infinite levels)
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 2: Create index for better performance when querying by parent_id
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Step 3: Insert existing categories from categories_level1 and categories_level2
-- Insert top-level categories
INSERT INTO categories (name, parent_id) 
SELECT name, NULL 
FROM categories_level1;

-- Insert subcategories
INSERT INTO categories (name, parent_id) 
SELECT cl2.name, (SELECT id FROM categories WHERE name = (SELECT name FROM categories_level1 WHERE id = cl2.parent_id))
FROM categories_level2 cl2;

-- Step 4: Modify the files table to use category_id instead of category_level1_id and category_level2_id
-- First add the new column
ALTER TABLE files
  ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

-- Update existing files to use the new category_id (map to the category_level2_id)
UPDATE files f
SET category_id = (SELECT id FROM categories WHERE name = (SELECT name FROM categories_level2 WHERE id = f.category_level2_id));

-- Step 5: Drop the old columns
ALTER TABLE files
  DROP COLUMN category_level1_id,
  DROP COLUMN category_level2_id;

-- Step 6: Enable RLS and create policies for the new categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create public read policy (everyone can view)
CREATE POLICY "公开读取分类" ON categories FOR SELECT TO anon, authenticated USING (true);

-- Create public write policy (everyone can manage categories)
CREATE POLICY "公开插入分类" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "公开删除分类" ON categories FOR DELETE TO anon, authenticated USING (true);

-- Step 7: Optional: Drop the old category tables (uncomment when ready)
-- DROP TABLE categories_level2;
-- DROP TABLE categories_level1;