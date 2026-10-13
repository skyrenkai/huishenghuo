-- =====================================================================
-- 第 3 步：置顶可以设置时长（1 周 / 1 个月 / 2 个月 / 3 个月），到期自动取消
-- 在 Supabase → SQL Editor 执行一次（可以重复执行）
-- =====================================================================

-- 置顶到期时间：为空或已过期 = 不置顶
alter table public.posts add column if not exists pinned_until timestamptz;

-- 以前用开关置顶的帖子，统一给 1 个月
update public.posts
   set pinned_until = now() + interval '1 month'
 where is_pinned and pinned_until is null;

create index if not exists posts_pinned_idx on public.posts (pinned_until desc)
  where pinned_until is not null;

-- 普通用户不能给自己置顶（只有管理员能设置 pinned_until）
create or replace function public.guard_posts()
returns trigger language plpgsql as $$
declare
  today_count int;
begin
  if not public.is_end_user() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.category = 'news' and not public.is_admin() then
      raise exception '本地新闻只能由管理员发布';
    end if;
    select count(*) into today_count from public.posts
      where author_id = auth.uid() and created_at > now() - interval '1 day';
    if today_count >= 10 and not public.is_admin() then
      raise exception '今天发布太多了，明天再来吧';
    end if;
    new.author_id := auth.uid();
    new.view_count := 0;
    new.comment_count := 0;
    new.bumped_at := now();
    new.created_at := now();
    if not public.is_admin() then
      new.is_pinned := false;
      new.pinned_until := null;
      new.is_hidden := false;
    end if;
    return new;
  end if;

  new.author_id := old.author_id;
  new.created_at := old.created_at;
  new.view_count := old.view_count;
  new.comment_count := old.comment_count;
  new.updated_at := now();
  if not public.is_admin() then
    new.is_pinned := old.is_pinned;
    new.pinned_until := old.pinned_until;
    new.is_hidden := old.is_hidden;
    if new.category = 'news' and old.category <> 'news' then
      raise exception '本地新闻只能由管理员发布';
    end if;
    if new.bumped_at is distinct from old.bumped_at then
      if old.bumped_at > now() - interval '24 hours' then
        raise exception '24 小时内只能刷新一次';
      end if;
      new.bumped_at := now();
    end if;
  end if;
  return new;
end;
$$;
