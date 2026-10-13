-- =====================================================================
-- 第 4 步：管理后台可以点开用户，查看他的邮箱、登录方式和发过的所有帖子
-- 在 Supabase → SQL Editor 执行一次（可以重复执行）
-- 邮箱只有管理员能看到，普通用户和访客都查不到
-- =====================================================================

-- 用户列表：增加邮箱和发帖数
drop function if exists public.admin_users(text);
create function public.admin_users(q text default '')
returns table (
  id uuid, name text, email text, is_admin boolean, is_banned boolean,
  created_at timestamptz, post_count bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception '只有管理员可以查看';
  end if;
  return query
    select p.id, p.name, u.email::text, p.is_admin, p.is_banned, p.created_at,
           (select count(*) from public.posts x where x.author_id = p.id)
    from public.profiles p
    join auth.users u on u.id = p.id
    where coalesce(q, '') = ''
       or p.name ilike '%' || q || '%'
       or u.email ilike '%' || q || '%'
    order by p.created_at desc
    limit 200;
end;
$$;
revoke execute on function public.admin_users(text) from public, anon;
grant execute on function public.admin_users(text) to authenticated;

-- 单个用户详情
drop function if exists public.admin_user(uuid);
create function public.admin_user(uid uuid)
returns table (
  id uuid, name text, avatar_url text, email text, provider text,
  is_admin boolean, is_banned boolean, created_at timestamptz, last_sign_in_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception '只有管理员可以查看';
  end if;
  return query
    select p.id, p.name, p.avatar_url, u.email::text,
           coalesce(u.raw_app_meta_data->>'provider', 'email'),
           p.is_admin, p.is_banned, p.created_at, u.last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = uid;
end;
$$;
revoke execute on function public.admin_user(uuid) from public, anon;
grant execute on function public.admin_user(uuid) to authenticated;
