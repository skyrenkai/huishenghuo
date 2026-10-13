-- =====================================================================
-- 第 2 步：执行完 1-schema.sql 后再执行这个
-- 1. 联系方式改为所有人可见（不用登录也能打电话）
-- 2. 管理员身份、封号状态改为保密：外人只能看到昵称和头像
-- 可以重复执行，不会出错
-- =====================================================================

-- ---------- 1. 联系方式公开 ----------
drop policy if exists "contacts 登录可读" on public.post_contacts;
drop policy if exists "contacts 公开可读" on public.post_contacts;
create policy "contacts 公开可读" on public.post_contacts for select
  using (exists (
    select 1 from public.posts p
    where p.id = post_id
      and (not p.is_hidden or p.author_id = auth.uid() or public.is_admin())
  ));

-- ---------- 2. 资料表只公开昵称和头像 ----------
revoke select, insert, update, delete on public.profiles from anon, authenticated;
grant select (id, name, avatar_url, created_at) on public.profiles to anon, authenticated;
grant update (name, avatar_url) on public.profiles to authenticated;

-- 自己的完整资料（含是否管理员、是否封号）
drop function if exists public.my_profile();
create function public.my_profile()
returns table (id uuid, name text, avatar_url text, is_admin boolean, is_banned boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.avatar_url, p.is_admin, p.is_banned, p.created_at
  from public.profiles p where p.id = auth.uid();
$$;
revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- 管理后台：用户列表（只有管理员能调用）
drop function if exists public.admin_users(text);
create function public.admin_users(q text default '')
returns table (id uuid, name text, is_admin boolean, is_banned boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception '只有管理员可以查看';
  end if;
  return query
    select p.id, p.name, p.is_admin, p.is_banned, p.created_at
    from public.profiles p
    where coalesce(q, '') = '' or p.name ilike '%' || q || '%'
    order by p.created_at desc
    limit 100;
end;
$$;
revoke execute on function public.admin_users(text) from public, anon;
grant execute on function public.admin_users(text) to authenticated;

-- 管理后台：封号 / 解封（只有管理员能调用，不能封管理员）
drop function if exists public.admin_set_banned(uuid, boolean);
create function public.admin_set_banned(uid uuid, banned boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception '只有管理员可以操作';
  end if;
  perform set_config('app.bypass', 'on', true);
  update public.profiles set is_banned = banned where id = uid and not is_admin;
end;
$$;
revoke execute on function public.admin_set_banned(uuid, boolean) from public, anon;
grant execute on function public.admin_set_banned(uuid, boolean) to authenticated;
