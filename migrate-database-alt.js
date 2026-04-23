import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://backend.appmiaoda.com/projects/supabase304867759404134400';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDkyMTEzMzM4LCJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwic3ViIjoiYW5vbiJ9.IeOVv2Bs9tduswGKjCV12x6tLtfhBysbzgMxxgZ2DVI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateDatabase() {
  try {
    console.log('Starting database migration...');
    
    // Step 1: Get existing data from old tables
    console.log('Step 1: Getting existing data...');
    
    // Get level1 categories
    const { data: level1Categories, error: getLevel1Error } = await supabase
      .from('categories_level1')
      .select('*');
    
    if (getLevel1Error) {
      console.error('Error getting level1 categories:', getLevel1Error);
      return;
    }
    
    console.log('Level1 categories found:', level1Categories.length);
    
    // Get level2 categories
    const { data: level2Categories, error: getLevel2Error } = await supabase
      .from('categories_level2')
      .select('*');
    
    if (getLevel2Error) {
      console.error('Error getting level2 categories:', getLevel2Error);
      return;
    }
    
    console.log('Level2 categories found:', level2Categories.length);
    
    // Get files
    const { data: files, error: getFilesError } = await supabase
      .from('files')
      .select('*');
    
    if (getFilesError) {
      console.error('Error getting files:', getFilesError);
      return;
    }
    
    console.log('Files found:', files.length);
    
    // Step 2: Create new categories table by inserting data
    console.log('Step 2: Creating new categories...');
    
    // Insert top-level categories
    for (const category of level1Categories) {
      const { error: insertError } = await supabase
        .from('categories')
        .insert({
          name: category.name,
          parent_id: null
        });
      
      if (insertError) {
        console.error('Error inserting category:', insertError);
      } else {
        console.log(`Inserted category: ${category.name}`);
      }
    }
    
    // Get the newly created top-level categories
    const { data: newLevel1Categories, error: getNewLevel1Error } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', null);
    
    if (getNewLevel1Error) {
      console.error('Error getting new level1 categories:', getNewLevel1Error);
      return;
    }
    
    // Create a map of old level1 IDs to new level1 IDs
    const level1IdMap = new Map();
    newLevel1Categories.forEach(newCat => {
      const oldCat = level1Categories.find(cat => cat.name === newCat.name);
      if (oldCat) {
        level1IdMap.set(oldCat.id, newCat.id);
      }
    });
    
    // Insert subcategories
    for (const category of level2Categories) {
      const newParentId = level1IdMap.get(category.parent_id);
      if (newParentId) {
        const { error: insertError } = await supabase
          .from('categories')
          .insert({
            name: category.name,
            parent_id: newParentId
          });
        
        if (insertError) {
          console.error('Error inserting subcategory:', insertError);
        } else {
          console.log(`Inserted subcategory: ${category.name}`);
        }
      }
    }
    
    console.log('Categories migration completed');
    
  } catch (error) {
    console.error('Migration error:', error);
  }
}

migrateDatabase();