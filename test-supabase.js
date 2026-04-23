import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://backend.appmiaoda.com/projects/supabase304867759404134400';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDkyMTEzMzM4LCJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwic3ViIjoiYW5vbiJ9.IeOVv2Bs9tduswGKjCV12x6tLtfhBysbzgMxxgZ2DVI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test 1: Get tables in the database
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('Error getting tables:', tablesError);
    } else {
      console.log('Tables in database:', tables.map(t => t.table_name));
    }
    
    // Test 2: Try to get categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*');
    
    if (categoriesError) {
      console.error('Error getting categories:', categoriesError);
    } else {
      console.log('Categories found:', categories);
    }
    
    // Test 3: Try to get old category tables
    const { data: level1, error: level1Error } = await supabase
      .from('categories_level1')
      .select('*');
    
    if (level1Error) {
      console.error('Error getting categories_level1:', level1Error);
    } else {
      console.log('Categories_level1 found:', level1);
    }
    
  } catch (error) {
    console.error('General error:', error);
  }
}

testConnection();