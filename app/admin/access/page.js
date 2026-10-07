create or replace function public.admin_get_student_test_access(
  p_user_id uuid
)
returns table (
  access_id uuid,
  test_id uuid,
  test_title text,
  start_at timestamptz,
  end_at timestamptz,
  is_active boolean
)
language plpgsql
security definer
set search_path = public
as $function$
begin

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Admin access required';
  end if;

  return query
  select
    a.id,
    a.test_id,
    t.title,
    a.start_at,
    a.end_at,
    a.is_active
  from public.test_access a
  join public.tests t
    on t.id = a.test_id
  where a.user_id = p_user_id
  order by t.title;

end;
$function$;

revoke all on function public.admin_get_student_test_access(uuid)
from public;

revoke all on function public.admin_get_student_test_access(uuid)
from anon;

grant execute on function public.admin_get_student_test_access(uuid)
to authenticated;
