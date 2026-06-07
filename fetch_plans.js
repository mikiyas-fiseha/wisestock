const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function getPlans() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    let supabaseUrl = '';
    let supabaseKey = '';
    envContent.split('\n').forEach(line => {
        if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
        if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
    });

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('subscription_plans').select('*');
    console.log(JSON.stringify(data, null, 2));
}

getPlans();
