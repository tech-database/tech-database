import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://backend.appmiaoda.com/projects/supabase304867759404134400';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDkyMTEzMzM4LCJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwic3ViIjoiYW5vbiJ9.IeOVv2Bs9tduswGKjCV12x6tLtfhBysbzgMxxgZ2DVI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRPC() {
  try {
    console.log('Checking if execute_sql RPC exists...');
    
    // Try to call the RPC function with a simple SQL query
    const { data, error } = await supabase
      .rpc('execute_sql', {
        sql: 'SELECT 1'
      });
    
    if (error) {
      console.error('RPC error:', error);
      console.log('execute_sql RPC does not exist. Creating it...');
      
      // Try to create the RPC function
      const { error: createError } = await supabase
        .rpc('execute_sql', {
          sql: `
            CREATE OR REPLACE FUNCTION execute_sql(sql text)
            RETURNS void AS $$
            BEGIN
              EXECUTE sql;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
          `
        });
      
      if (createError) {
        console.error('Error creating RPC function:', createError);
      } else {
        console.log('execute_sql RPC function created successfully');
      }
    } else {
      console.log('execute_sql RPC exists:', data);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkRPC();