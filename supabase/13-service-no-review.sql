-- 13-service-no-review.sql：本地服务、优惠信息都不用审核，发布后马上显示
-- 其他板块照旧：普通用户发布、修改后要管理员审核。
-- 以后想让别的板块也免审核，把板块代码加进下面的 no_review 列表即可。
-- 可以重复执行（已包含 12-deal-no-review.sql 的内容）。

create or replace function public.posts_guard_approval()
returns trigger language plpgsql as $$
declare
  no_review text[] := array['deal', 'service'];   -- 不用审核的板块
begin
  if not public.is_end_user() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_approved := public.is_admin() or new.category = any(no_review);
    return new;
  end if;

  if not public.is_admin() then
    if (new.title, new.body, new.body_html, new.price, new.extra, new.images, new.category, new.subcategory)
       is distinct from
       (old.title, old.body, old.body_html, old.price, old.extra, old.images, old.category, old.subcategory) then
      new.is_approved := new.category = any(no_review);
    else
      new.is_approved := old.is_approved;
    end if;
  end if;
  return new;
end $$;

-- 已经在等审核的优惠信息、本地服务直接通过
update public.posts set is_approved = true
where category in ('deal', 'service') and not is_approved and not is_hidden;
