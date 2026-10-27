import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });

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
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return response({ error: 'Supabase function is not configured.' }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return response({ error: 'Sign in as a school administrator first.' }, 401);

  const { data: adminProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('school_id, role')
    .eq('id', authData.user.id)
    .single();
  if (profileError || adminProfile?.role !== 'admin') return response({ error: 'Only school administrators can add members.' }, 403);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return response({ error: 'Invalid request body.' }, 400); }
  const role = String(body.role || '');
  const name = String(body.name || '').trim();
  const password = String(body.password || '');
  const admissionNumber = String(body.admissionNumber || '').trim().toUpperCase();
  const email = String(body.email || '').trim().toLowerCase();
  if (!['teacher', 'parent', 'student'].includes(role)) return response({ error: 'Unsupported school member role.' }, 400);
  if (!name || password.length < 8) return response({ error: 'A full name and password of at least 8 characters are required.' }, 400);
  if (role === 'student' && !admissionNumber) return response({ error: 'Admission number is required.' }, 400);
  if (role !== 'student' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response({ error: 'Enter a valid email address.' }, 400);

  const { data: school } = await adminClient.from('schools').select('name').eq('id', adminProfile.school_id).single();
  const authEmail = role === 'student'
    ? await studentEmail(adminProfile.school_id, admissionNumber)
    : email;
  const staffId = role === 'teacher' ? String(body.staffId || '') : null;
  const classIds = Array.isArray(body.classIds) ? body.classIds.map(String) : [];
  const workspaceRecord = body.workspaceRecord && typeof body.workspaceRecord === 'object'
    ? body.workspaceRecord as Record<string, unknown>
    : null;
  if (!workspaceRecord || typeof workspaceRecord.id !== 'string' || workspaceRecord.name !== name) {
    return response({ error: 'Member workspace record is invalid.' }, 400);
  }
  if (role === 'teacher' && classIds.length === 0) return response({ error: 'Assign the teacher to at least one class.' }, 400);
  if (role === 'parent' && body.linkedStudentAdmissionNumber) {
    const { data: linkedStudent } = await adminClient.from('profiles')
      .select('id')
      .eq('school_id', adminProfile.school_id)
      .eq('role', 'student')
      .eq('admission_number', String(body.linkedStudentAdmissionNumber).trim().toUpperCase())
      .maybeSingle();
    if (!linkedStudent) return response({ error: 'No student with this admission number was found in the school register.' }, 400);
  }

  const { data: createdAuth, error: createError } = await adminClient.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { role, school_id: adminProfile.school_id },
  });
  if (createError || !createdAuth.user) return response({ error: createError?.message || 'Could not create the member account.' }, 400);

  const profile = {
    id: createdAuth.user.id,
    school_id: adminProfile.school_id,
    role,
    full_name: name,
    email: authEmail,
    phone: String(body.phone || ''),
    staff_id: staffId,
    admission_number: role === 'student' ? admissionNumber : null,
    class_name: String(body.className || ''),
    class_ids: classIds,
    linked_student_admission_number: role === 'parent' ? String(body.linkedStudentAdmissionNumber || '').trim().toUpperCase() : '',
  };
  const { error: insertError } = await adminClient.from('profiles').insert(profile);
  if (insertError) {
    await adminClient.auth.admin.deleteUser(createdAuth.user.id);
    return response({ error: insertError.message }, 400);
  }

  const collection = role === 'student' ? 'students' : 'staff';
  const { data: savedWorkspace, error: workspaceReadError } = await adminClient
    .from('school_workspaces')
    .select('data')
    .eq('school_id', adminProfile.school_id)
    .maybeSingle();
  if (workspaceReadError) {
    await adminClient.auth.admin.deleteUser(createdAuth.user.id);
    return response({ error: workspaceReadError.message }, 500);
  }

  const nextWorkspace = savedWorkspace?.data || {
    profile: { schoolName: school?.name || 'Your school', session: '2026/2027', term: 'First term', currency: 'NGN' },
    students: [], staff: [], classes: [], attendance: [], classTimetable: [], scheduledAssessments: [],
    announcements: [], events: [], payments: [], feeCharges: [],
  };
  const record = {
    ...workspaceRecord,
    id: workspaceRecord.id,
    authUid: createdAuth.user.id,
    email: role === 'student' ? '' : email,
    staffId,
    status: 'Active',
  };
  const records = Array.isArray(nextWorkspace[collection]) ? nextWorkspace[collection] as Record<string, unknown>[] : [];
  nextWorkspace[collection] = [...records.filter((item) => item.id !== record.id), record];
  const { error: workspaceWriteError } = await adminClient.from('school_workspaces').upsert({
    school_id: adminProfile.school_id,
    data: nextWorkspace,
    updated_by: authData.user.id,
    updated_at: new Date().toISOString(),
  });
  if (workspaceWriteError) {
    await adminClient.auth.admin.deleteUser(createdAuth.user.id);
    return response({ error: workspaceWriteError.message }, 500);
  }

  return response({
    authUserId: createdAuth.user.id,
    email: authEmail,
    role,
    schoolName: school?.name || 'Your school',
    staffId,
  });
});
