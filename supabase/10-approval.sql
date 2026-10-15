-- 10-approval.sql：发布审核
-- 普通用户新发布的帖子要管理员审核通过后，别人才能看到；作者自己和管理员一直能看到。
-- 普通用户修改了内容（标题、正文、价格、图片、分类、详细信息）后，要重新审核。
-- 标记已完成、刷新到最前不需要重新审核。管理员自己发的帖子直接通过。
-- 以前已经发布的帖子全部算"已通过"，不受影响。可以重复执行。

alter table public.posts add column if not exists is_approved boolean not null default true;

create index if not exists posts_pending_idx on public.posts (created_at desc) where not is_approved;

-- ---------- 审核状态只能由管理员改 ----------
create or replace function public.posts_guard_approval()
returns trigger language plpgsql as $$
begin
  if not public.is_end_user() then
    return new;   -- 系统内部操作（浏览数、评论数等）不处理
  end if;

  if tg_op = 'INSERT' then
    new.is_approved := public.is_admin();   -- 管理员发的直接通过，其他人等审核
    return new;
  end if;

  if not public.is_admin() then
    if (new.title, new.body, new.body_html, new.price, new.extra, new.images, new.category, new.subcategory)
       is distinct from
       (old.title, old.body, old.body_html, old.price, old.extra, old.images, old.category, old.subcategory) then
      new.is_approved := false;              -- 改了内容，重新审核
    else
      new.is_approved := old.is_approved;    -- 不允许自己改审核状态
    end if;
  end if;
  return new;
end $$;

drop trigger if exists posts_approval on public.posts;
create trigger posts_approval before insert or update on public.posts
  for each row execute function public.posts_guard_approval();

-- ---------- 没通过审核的帖子：只有作者和管理员能看到 ----------
drop policy if exists "posts 公开可读" on public.posts;
create policy "posts 公开可读" on public.posts for select
  using ((not is_hidden and is_approved) or author_id = auth.uid() or public.is_admin());

-- 联系方式跟着帖子走
drop policy if exists "contacts 公开可读" on public.post_contacts;
create policy "contacts 公开可读" on public.post_contacts for select
  using (exists (
    select 1 from public.posts p
    where p.id = post_id
      and ((not p.is_hidden and p.is_approved) or p.author_id = auth.uid() or public.is_admin())
  ));

notify pgrst, 'reload schema';
