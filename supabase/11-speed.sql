-- 11-speed.sql：数据库提速（不改变任何权限规则，只是让检查更快）
-- 1. 权限检查里的"当前用户是谁 / 是不是管理员"改成每次查询只算一次，
--    原来是每一行都要算一次（Supabase 官方推荐的写法）。
-- 2. 给首页、分类页常用的查询加专用索引。
-- 可以重复执行。

-- ---------- 帖子 ----------
drop policy if exists "posts 公开可读" on public.posts;
create policy "posts 公开可读" on public.posts for select
  using ((not is_hidden and is_approved) or author_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "posts 本人或管理员可改" on public.posts;
create policy "posts 本人或管理员可改" on public.posts for update
  using (author_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "posts 本人或管理员可删" on public.posts;
create policy "posts 本人或管理员可删" on public.posts for delete
  using (author_id = (select auth.uid()) or (select public.is_admin()));

-- ---------- 联系方式 ----------
drop policy if exists "contacts 公开可读" on public.post_contacts;
create policy "contacts 公开可读" on public.post_contacts for select
  using (exists (
    select 1 from public.posts p
    where p.id = post_id
      and ((not p.is_hidden and p.is_approved) or p.author_id = (select auth.uid()) or (select public.is_admin()))
  ));

-- ---------- 评论 ----------
drop policy if exists "comments 公开可读" on public.comments;
create policy "comments 公开可读" on public.comments for select
  using (not is_hidden or (select public.is_admin()));

-- ---------- 广告 ----------
drop policy if exists "banners 公开可读" on public.banners;
create policy "banners 公开可读" on public.banners for select
  using ((is_active and (ends_at is null or ends_at > now())) or (select public.is_admin()));

-- ---------- 索引：首页各板块、分类页"最新" ----------
create index if not exists posts_public_cat_idx
  on public.posts (category, city, bumped_at desc)
  where not is_hidden and is_approved;

create index if not exists posts_public_feed_idx
  on public.posts (city, bumped_at desc)
  where not is_hidden and is_approved;

create index if not exists posts_pinned_idx
  on public.posts (category, pinned_until desc)
  where pinned_until is not null;

analyze public.posts;

notify pgrst, 'reload schema';
