import { supabase } from './supabase.js';

const emptyWorkspace = {
  profile: { schoolName: '', name: '', email: '', phone: '', address: '', session: '2026/2027', term: 'First term', currency: 'NGN' },
  students: [], staff: [], classes: [], attendance: [], classTimetable: [], scheduledAssessments: [],
  announcements: [], events: [], payments: [], feeCharges: [],
};

export function normalizeWorkspace(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return structuredClone(emptyWorkspace);
  return Object.fromEntries(Object.entries(emptyWorkspace).map(([key, fallback]) => [
    key,
    key === 'profile'
      ? { ...fallback, ...(value.profile && typeof value.profile === 'object' ? value.profile : {}) }
      : Array.isArray(value[key]) ? value[key] : [],
  ]));
}

export async function loadSchoolContext(authUser) {
  if (!supabase) throw new Error('Supabase is not configured. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY settings.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();
  if (profileError) throw profileError;

  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('name')
    .eq('id', profile.school_id)
    .single();
  if (schoolError) throw schoolError;

  const { data: workspaceData, error: workspaceError } = await supabase.rpc('get_my_school_workspace');
  if (workspaceError) throw workspaceError;
  const workspace = normalizeWorkspace(workspaceData);
  workspace.profile = {
    ...workspace.profile,
    schoolName: school.name,
    name: profile.full_name,
    email: authUser.email || profile.email,
  };

  const studentRecord = profile.role === 'student'
    ? workspace.students.find((student) => student.admissionNumber?.toUpperCase() === profile.admission_number?.toUpperCase())
    : null;
  const user = {
    uid: authUser.id,
    id: studentRecord?.id || authUser.id,
    name: profile.full_name,
    email: authUser.email || profile.email,
    schoolId: profile.school_id,
    schoolName: school.name,
    role: profile.role,
    status: profile.status,
    phone: profile.phone,
    admissionNumber: profile.admission_number,
    className: profile.class_name,
    teacherProfile: profile.role === 'teacher' ? {
      id: authUser.id,
      authUid: authUser.id,
      teacherType: 'class',
      classIds: profile.class_ids,
      studentIds: studentRecord ? [studentRecord.id] : [],
    } : undefined,
  };

  return { user, workspace };
}

export async function saveSchoolWorkspace(workspace) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.rpc('save_my_school_workspace', { workspace_data: workspace });
  if (error) throw error;
}

export async function provisionSchoolMember(member) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.functions.invoke('provision-school-member', { body: member });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
