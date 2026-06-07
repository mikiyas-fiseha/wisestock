const supabaseUrl = 'https://brovmhwffsjfwvfzfgjg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb3ZtaHdmZnNqZnd2ZnpmZ2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTA5NzcsImV4cCI6MjA4NTc4Njk3N30.QrntOkuCAAE1o8KUs_xMDPgZQADXD_IuYRulqwWeYC0';

async function keepAlive() {
  console.log('Sending ping request to Supabase to keep the project active...');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (response.ok) {
      console.log('Success: Pinned Supabase database. Project is kept active.');
    } else {
      const errorText = await response.text();
      console.error(`Error: Received response status ${response.status}. Details:`, errorText);
    }
  } catch (error) {
    console.error('Connection Error: Failed to ping Supabase:', error);
  }
}

keepAlive();
