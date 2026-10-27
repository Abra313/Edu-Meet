create extension if not exists pgcrypto;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Your school',
  created_by uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  role text not null check (role in ('admin', 'teacher', 'parent', 'student')),
  full_name text not null,
  email text not null,
  phone text not null default '',
  staff_id text,
  admission_number text,
  class_name text not null default '',
  class_ids text[] not null default array[]::text[],
  linked_student_admission_number text not null default '',
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now(),
  unique (school_id, email)
);

create unique index if not exists profiles_school_admission_number_unique
  on public.profiles (school_id, upper(admission_number))
  where role = 'student' and admission_number is not null;

create unique index if not exists profiles_school_staff_id_unique
  on public.profiles (school_id, staff_id)
  where role = 'teacher' and staff_id is not null;

create index if not exists profiles_school_role_index
  on public.profiles (school_id, role);

create table if not exists public.school_workspaces (
  school_id uuid primary key references public.schools(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create or replace function public.create_school_for_owner()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_school_id uuid;
  owner_name text;
  school_name text;
begin
  if coalesce(new.raw_user_meta_data->>'signup_type', '') <> 'school_owner' then
    return new;
  end if;

  owner_name := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'School owner');
  school_name := coalesce(nullif(trim(new.raw_user_meta_data->>'school_name'), ''), 'Your school');

  insert into public.schools (name, created_by)
  values (school_name, new.id)
  returning id into new_school_id;

  insert into public.profiles (id, school_id, role, full_name, email)
  values (new.id, new_school_id, 'admin', owner_name, lower(new.email));

  return new;
end;
$$;

drop trigger if exists auth_user_create_school on auth.users;
create trigger auth_user_create_school
after insert on auth.users
for each row execute procedure public.create_school_for_owner();

create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select school_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_school_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.school_class_label(class_data jsonb)
returns text
language sql
immutable
as $$
  select trim(concat_ws(' ', class_data->>'name', nullif(class_data->>'track', ''), nullif(class_data->>'arm', '')))
$$;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.school_workspaces enable row level security;

drop policy if exists "School members can read their school" on public.schools;
create policy "School members can read their school"
  on public.schools for select to authenticated
  using (id = public.current_school_id());

drop policy if exists "School admins can update their school" on public.schools;
create policy "School admins can update their school"
  on public.schools for update to authenticated
  using (id = public.current_school_id() and public.current_school_role() = 'admin')
  with check (id = public.current_school_id() and public.current_school_role() = 'admin');

drop policy if exists "Users can read permitted profiles" on public.profiles;
create policy "Users can read permitted profiles"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or (school_id = public.current_school_id() and public.current_school_role() = 'admin')
  );

revoke all on public.school_workspaces from anon, authenticated;
revoke insert, delete on public.schools from anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;

grant select on public.schools, public.profiles to authenticated;
grant update (name, updated_at) on public.schools to authenticated;
grant execute on function public.current_school_id() to authenticated;
grant execute on function public.current_school_role() to authenticated;

create or replace function public.get_my_school_workspace()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  user_profile public.profiles%rowtype;
  workspace_data jsonb;
  result_data jsonb;
  visible_classes jsonb := '[]'::jsonb;
  visible_students jsonb := '[]'::jsonb;
  visible_staff jsonb := '[]'::jsonb;
  visible_attendance jsonb := '[]'::jsonb;
  visible_timetable jsonb := '[]'::jsonb;
  visible_assessments jsonb := '[]'::jsonb;
  class_names text[] := array[]::text[];
  class_ids text[] := array[]::text[];
  student_ids text[] := array[]::text[];
  target_admission text;
begin
  select * into user_profile
  from public.profiles
  where id = auth.uid();

  if not found then
    raise exception 'Your account is not assigned to a school.';
  end if;

  select data into workspace_data
  from public.school_workspaces
  where school_id = user_profile.school_id;

  if workspace_data is null then
    workspace_data := jsonb_build_object(
      'profile', jsonb_build_object('schoolName', (select name from public.schools where id = user_profile.school_id), 'session', '2026/2027', 'term', 'First term', 'currency', 'NGN'),
      'students', '[]'::jsonb, 'staff', '[]'::jsonb, 'classes', '[]'::jsonb,
      'attendance', '[]'::jsonb, 'classTimetable', '[]'::jsonb, 'scheduledAssessments', '[]'::jsonb,
      'announcements', '[]'::jsonb, 'events', '[]'::jsonb, 'payments', '[]'::jsonb, 'feeCharges', '[]'::jsonb
    );
  end if;

  if user_profile.role = 'admin' then
    return workspace_data;
  end if;

  if user_profile.role = 'teacher' then
    class_ids := user_profile.class_ids;
    select coalesce(array_agg(public.school_class_label(item)), array[]::text[])
      into class_names
      from jsonb_array_elements(coalesce(workspace_data->'classes', '[]'::jsonb)) as classes(item)
      where item->>'id' = any(class_ids);

    select coalesce(jsonb_agg(item), '[]'::jsonb)
      into visible_classes
      from jsonb_array_elements(coalesce(workspace_data->'classes', '[]'::jsonb)) as classes(item)
      where item->>'id' = any(class_ids);

    select coalesce(jsonb_agg(item), '[]'::jsonb)
      into visible_students
      from jsonb_array_elements(coalesce(workspace_data->'students', '[]'::jsonb)) as students(item)
      where lower(coalesce(item->>'className', '')) = any(select lower(value) from unnest(class_names) as value);

    visible_staff := jsonb_build_array(jsonb_build_object(
      'id', user_profile.id::text,
      'authUid', user_profile.id::text,
      'name', user_profile.full_name,
      'email', user_profile.email,
      'role', user_profile.role,
      'teacherType', 'class',
      'classIds', to_jsonb(user_profile.class_ids),
      'status', user_profile.status
    ));
  else
    target_admission := case
      when user_profile.role = 'student' then user_profile.admission_number
      else user_profile.linked_student_admission_number
    end;

    select coalesce(jsonb_agg(item), '[]'::jsonb)
      into visible_students
      from jsonb_array_elements(coalesce(workspace_data->'students', '[]'::jsonb)) as students(item)
      where upper(coalesce(item->>'admissionNumber', '')) = upper(coalesce(target_admission, ''));

    select coalesce(array_agg(item->>'id'), array[]::text[]),
           coalesce(array_agg(lower(public.school_class_label(classes.item))), array[]::text[])
      into class_ids, class_names
      from jsonb_array_elements(coalesce(workspace_data->'classes', '[]'::jsonb)) as classes(item)
      where exists (
        select 1 from jsonb_array_elements(visible_students) as students(student)
        where lower(coalesce(students.student->>'className', '')) = lower(public.school_class_label(classes.item))
      );

    select coalesce(jsonb_agg(item), '[]'::jsonb)
      into visible_classes
      from jsonb_array_elements(coalesce(workspace_data->'classes', '[]'::jsonb)) as classes(item)
      where item->>'id' = any(class_ids);

    if user_profile.role = 'parent' then
      visible_staff := jsonb_build_array(jsonb_build_object(
        'id', user_profile.id::text,
        'authUid', user_profile.id::text,
        'name', user_profile.full_name,
        'email', user_profile.email,
        'role', user_profile.role,
        'studentAdmissionNumber', user_profile.linked_student_admission_number
      ));
    end if;
  end if;

  select coalesce(array_agg(item->>'id'), array[]::text[])
    into student_ids
    from jsonb_array_elements(visible_students) as students(item);

  select coalesce(jsonb_agg(item), '[]'::jsonb)
    into visible_attendance
    from jsonb_array_elements(coalesce(workspace_data->'attendance', '[]'::jsonb)) as attendance(item)
    where item->>'studentId' = any(student_ids);

  select coalesce(jsonb_agg(item), '[]'::jsonb)
    into visible_timetable
    from jsonb_array_elements(coalesce(workspace_data->'classTimetable', '[]'::jsonb)) as timetable(item)
    where item->>'classId' = any(class_ids);

  select coalesce(jsonb_agg(item), '[]'::jsonb)
    into visible_assessments
    from jsonb_array_elements(coalesce(workspace_data->'scheduledAssessments', '[]'::jsonb)) as assessments(item)
    where item->>'classId' = any(class_ids);

  result_data := workspace_data || jsonb_build_object(
    'students', visible_students,
    'classes', visible_classes,
    'staff', visible_staff,
    'attendance', visible_attendance,
    'classTimetable', visible_timetable,
    'scheduledAssessments', visible_assessments,
    'payments', '[]'::jsonb,
    'feeCharges', '[]'::jsonb
  );

  return result_data;
end;
$$;

create or replace function public.save_my_school_workspace(workspace_data jsonb)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  user_profile public.profiles%rowtype;
  existing_data jsonb;
  other_attendance jsonb;
  own_attendance jsonb;
  entry jsonb;
  student_in_scope boolean;
begin
  select * into user_profile
  from public.profiles
  where id = auth.uid();

  if not found then
    raise exception 'Your account is not assigned to a school.';
  end if;

  if user_profile.role = 'admin' then
    insert into public.school_workspaces (school_id, data, updated_by, updated_at)
    values (user_profile.school_id, workspace_data, auth.uid(), now())
    on conflict (school_id) do update
      set data = excluded.data, updated_by = excluded.updated_by, updated_at = excluded.updated_at;

    update public.schools
      set name = coalesce(nullif(trim(workspace_data #>> '{profile,schoolName}'), ''), name), updated_at = now()
      where id = user_profile.school_id;
    return;
  end if;

  if user_profile.role <> 'teacher' then
    raise exception 'Only school administrators and teachers can save workspace data.';
  end if;

  select data into existing_data from public.school_workspaces where school_id = user_profile.school_id;
  if existing_data is null then
    raise exception 'School workspace has not been initialized by an administrator.';
  end if;

  if jsonb_typeof(workspace_data->'attendance') <> 'array' then
    raise exception 'Attendance data is invalid.';
  end if;

  for entry in select value from jsonb_array_elements(workspace_data->'attendance')
  loop
    if entry->>'teacherId' <> auth.uid()::text then
      raise exception 'Teachers can only submit attendance under their own account.';
    end if;

    select exists (
      select 1
      from jsonb_array_elements(coalesce(existing_data->'students', '[]'::jsonb)) as students(student)
      join jsonb_array_elements(coalesce(existing_data->'classes', '[]'::jsonb)) as classes(class)
        on lower(coalesce(students.student->>'className', '')) = lower(public.school_class_label(classes.class))
      where students.student->>'id' = entry->>'studentId'
        and classes.class->>'id' = any(user_profile.class_ids)
    ) into student_in_scope;

    if not student_in_scope then
      raise exception 'You can only mark attendance for students in your assigned classes.';
    end if;
  end loop;

  select coalesce(jsonb_agg(item), '[]'::jsonb)
    into other_attendance
    from jsonb_array_elements(coalesce(existing_data->'attendance', '[]'::jsonb)) as attendance(item)
    where item->>'teacherId' is distinct from auth.uid()::text;

  select coalesce(jsonb_agg(item), '[]'::jsonb)
    into own_attendance
    from jsonb_array_elements(workspace_data->'attendance') as attendance(item)
    where item->>'teacherId' = auth.uid()::text;

  update public.school_workspaces
    set data = existing_data || jsonb_build_object('attendance', other_attendance || own_attendance),
        updated_by = auth.uid(), updated_at = now()
    where school_id = user_profile.school_id;
end;
$$;

revoke all on function public.get_my_school_workspace() from public;
revoke all on function public.save_my_school_workspace(jsonb) from public;
grant execute on function public.get_my_school_workspace() to authenticated;
grant execute on function public.save_my_school_workspace(jsonb) to authenticated;
