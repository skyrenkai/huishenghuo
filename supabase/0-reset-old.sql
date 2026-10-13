-- =====================================================================
-- 第 0 步（只在继续用原来的 Supabase 项目时执行）
-- 作用：删除旧版的帖子、评论、点赞、举报、资料表和旧的权限规则。
-- 注意：旧的测试帖子和评论会被清空；已注册的账号（auth.users）会保留。
-- 执行完这个，再执行 1-schema.sql。
-- =====================================================================

-- 旧的自动建资料触发器
drop trigger if exists on_auth_user_created on auth.users;

-- 旧表（cascade 会顺带删除依赖它们的规则和触发器）
drop table if exists public.likes cascade;
drop table if exists public.reports cascade;
drop table if exists public.comments cascade;
drop table if exists public.post_contacts cascade;
drop table if exists public.posts cascade;
drop table if exists public.wechat_identities cascade;
drop table if exists public.profiles cascade;

-- 旧函数
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_admin() cascade;

-- 旧的图片上传规则（只删和 post-images 桶有关的）
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%post-images%' or coalesce(with_check, '') ilike '%post-images%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;
