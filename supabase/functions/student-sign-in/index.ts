import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

async function studentEmail(schoolId: string, admissionNumber: string) {
  const input = new TextEncoder().encode(`${schoolId}:${admissionNumber}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
  const suffix = Array.from(digest.slice(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `student-${suffix}@students.edu-meet.local`;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return response({ error: 'Supabase function is not configured.' }, 500);

  let admissionNumber: string;
  let password: string;
  try {
    const body = await request.json();
    admissionNumber = String(body.admissionNumber || '').trim().toUpperCase();
    password = String(body.password || '');
  } catch {
    return response({ error: 'Invalid request body.' }, 400);
  }
  if (!admissionNumber || password.length < 8) return response({ error: 'Enter your admission number and password.' }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profiles, error: profileError } = await adminClient
    .from('profiles')
    .select('school_id, email, status')
    .eq('role', 'student')
    .eq('admission_number', admissionNumber);

  if (profileError) return response({ error: 'Could not verify student sign-in.' }, 500);
  if (!profiles?.length) return response({ error: 'No student with this admission number was found. Ask your school administrator for access.' }, 401);
  if (profiles.length > 1) return response({ error: 'This admission number is not unique. Contact your school administrator.' }, 409);
  if (profiles[0].status !== 'Active') return response({ error: 'This student account is inactive. Please contact your school administrator.' }, 403);

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.signInWithPassword({ email: profiles[0].email, password });
  if (error || !data.session) return response({ error: 'The admission number or password is incorrect.' }, 401);

  return response({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
  });
});
