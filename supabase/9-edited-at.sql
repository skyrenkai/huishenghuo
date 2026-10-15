-- 9-edited-at.sql：记录帖子内容最后一次修改的时间（帖子页显示"更新于"）
-- 只有标题、正文、价格、图片、分类、详细信息改了才算；
-- 标记已完成、刷新到最前、置顶、隐藏、浏览数变化都不算。
-- 可以重复执行。

alter table public.posts add column if not exists edited_at timestamptz;

create or replace function public.posts_set_edited_at()
returns trigger language plpgsql as $$
begin
  if (new.title, new.body, new.body_html, new.price, new.extra, new.images, new.category, new.subcategory)
     is distinct from
     (old.title, old.body, old.body_html, old.price, old.extra, old.images, old.category, old.subcategory) then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;  -- 不允许前端自己改这个时间
  end if;
  return new;
end $$;

drop trigger if exists posts_edited_at on public.posts;
create trigger posts_edited_at before update on public.posts
  for each row execute function public.posts_set_edited_at();

-- 新建帖子时不能自带"更新时间"
create or replace function public.posts_clear_edited_at()
returns trigger language plpgsql as $$
begin
  new.edited_at := null;
  return new;
end $$;

drop trigger if exists posts_edited_at_insert on public.posts;
create trigger posts_edited_at_insert before insert on public.posts
  for each row execute function public.posts_clear_edited_at();

notify pgrst, 'reload schema';
