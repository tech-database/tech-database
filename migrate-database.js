import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://backend.appmiaoda.com/projects/supabase304867759404134400';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDkyMTEzMzM4LCJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwic3ViIjoiYW5vbiJ9.IeOVv2Bs9tduswGKjCV12x6tLtfhBysbzgMxxgZ2DVI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateDatabase() {
  try {
    console.log('Starting database migration...');
    
    // Step 1: Create the new categories table
    console.log('Step 1: Creating categories table...');
    const { error: createTableError } = await supabase
      .rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS categories (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name text NOT NULL,
            parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
            created_at timestamptz NOT NULL DEFAULT now()
          );
          
          CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
        `
      });
    
    if (createTableError) {
      console.error('Error creating categories table:', createTableError);
      return;
    }
    console.log('Categories table created successfully');
    
    // Step 2: Insert top-level categories from categories_level1
    console.log('Step 2: Migrating top-level categories...');
    const { data: level1Categories, error: getLevel1Error } = await supabase
      .from('categories_level1')
      .select('*');
    
    if (getLevel1Error) {
      console.error('Error getting level1 categories:', getLevel1Error);
      return;
    }
    
    for (const category of level1Categories) {
      const { error: insertError } = await supabase
        .from('categories')
        .insert({
          id: category.id,
          name: category.name,
          parent_id: null
        });
      
      if (insertError) {
        console.error('Error inserting category:', insertError);
      }
    }
    console.log('Top-level categories migrated successfully');
    
    // Step 3: Insert subcategories from categories_level2
    console.log('Step 3: Migrating subcategories...');
    const { data: level2Categories, error: getLevel2Error } = await supabase
      .from('categories_level2')
      .select('*');
    
    if (getLevel2Error) {
      console.error('Error getting level2 categories:', getLevel2Error);
      return;
    }
    
    for (const category of level2Categories) {
      const { error: insertError } = await supabase
        .from('categories')
        .insert({
          id: category.id,
          name: category.name,
          parent_id: category.parent_id
        });
      
      if (insertError) {
        console.error('Error inserting subcategory:', insertError);
      }
    }
    console.log('Subcategories migrated successfully');
    
    // Step 4: Add category_id column to files table
    console.log('Step 4: Adding category_id column to files table...');
    const { error: addColumnError } = await supabase
      .rpc('execute_sql', {
        sql: `
          ALTER TABLE files
            ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
        `
      });
    
    if (addColumnError) {
      console.error('Error adding category_id column:', addColumnError);
      return;
    }
    console.log('category_id column added successfully');
    
    // Step 5: Update files to use category_id (map to category_level2_id)
    console.log('Step 5: Updating files with category_id...');
    const { error: updateFilesError } = await supabase
      .rpc('execute_sql', {
        sql: `
          UPDATE files
          SET category_id = category_level2_id;
        `
      });
    
    if (updateFilesError) {
      console.error('Error updating files:', updateFilesError);
      return;
    }
    console.log('Files updated successfully');
    
    // Step 6: Drop old category columns from files table
    console.log('Step 6: Dropping old category columns...');
    const { error: dropColumnsError } = await supabase
      .rpc('execute_sql', {
        sql: `
          ALTER TABLE files
            DROP COLUMN category_level1_id,
            DROP COLUMN category_level2_id;
        `
      });
    
    if (dropColumnsError) {
      console.error('Error dropping old columns:', dropColumnsError);
      return;
    }
    console.log('Old category columns dropped successfully');
    
    // Step 7: Enable RLS and create policies for categories table
    console.log('Step 7: Configuring RLS for categories table...');
    const { error: rlsError } = await supabase
      .rpc('execute_sql', {
        sql: `
          ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY "公开读取分类" ON categories FOR SELECT TO anon, authenticated USING (true);
          CREATE POLICY "公开插入分类" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
          CREATE POLICY "公开删除分类" ON categories FOR DELETE TO anon, authenticated USING (true);
        `
      });
    
    if (rlsError) {
      console.error('Error configuring RLS:', rlsError);
      return;
    }
    console.log('RLS configured successfully');
    
    console.log('Database migration completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
  }
}

migrateDatabase();