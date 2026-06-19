-- ReelVault — fonctions & triggers

-- ─────────── À l'inscription : profil + code d'activation + 8 catégories ───────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));

  insert into public.instagram_connections (user_id, activation_code, status)
  values (new.id, 'RV-' || upper(substr(md5(random()::text), 1, 6)), 'pending');

  insert into public.categories (user_id, name, slug, color, icon, is_default, sort_order)
  values
    (new.id, 'Sport & Fitness',          'sport-fitness',           '#22C55E', 'dumbbell',     true, 1),
    (new.id, 'Cuisine & Recettes',       'cuisine-recettes',        '#F97316', 'utensils',     true, 2),
    (new.id, 'Mode & Style',             'mode-style',              '#EC4899', 'shirt',        true, 3),
    (new.id, 'Humour & Divertissement',  'humour-divertissement',   '#FACC15', 'laugh',        true, 4),
    (new.id, 'Business & Motivation',    'business-motivation',     '#3B82F6', 'trending-up',  true, 5),
    (new.id, 'Voyage & Découverte',      'voyage-decouverte',       '#06B6D4', 'plane',        true, 6),
    (new.id, 'Tech & Gaming',            'tech-gaming',             '#8B5CF6', 'gamepad-2',    true, 7),
    (new.id, 'Art & Créativité',         'art-creativite',          '#F43F5E', 'palette',      true, 8);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────── Incrémente le compteur de vues + journalise ───────────
create or replace function public.increment_reel_view(p_reel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  update public.reels
     set view_count = view_count + 1
   where id = p_reel_id and user_id = v_user;

  if found then
    insert into public.reel_views (reel_id, user_id) values (p_reel_id, v_user);
  end if;
end;
$$;

-- ─────────── Fusion de catégories (dashboard web) ───────────
-- Déplace tous les réels de src vers dst, puis supprime src. Vérifie l'appartenance.
create or replace function public.merge_categories(p_src uuid, p_dst uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if not exists (select 1 from public.categories where id = p_src and user_id = v_user)
     or not exists (select 1 from public.categories where id = p_dst and user_id = v_user) then
    raise exception 'Catégorie introuvable ou non autorisée';
  end if;

  update public.reels set category_id = p_dst
   where category_id = p_src and user_id = v_user;

  delete from public.categories where id = p_src and user_id = v_user;
end;
$$;

-- ─────────── Statistiques agrégées (dashboard) ───────────
create or replace function public.library_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  select jsonb_build_object(
    'totalReels', (select count(*) from public.reels where user_id = v_user),
    'byCategory', coalesce((
      select jsonb_agg(jsonb_build_object(
        'categoryId', c.id, 'name', c.name, 'color', c.color, 'count', t.cnt))
      from public.categories c
      join (
        select category_id, count(*) cnt from public.reels
        where user_id = v_user group by category_id
      ) t on t.category_id = c.id
      where c.user_id = v_user
    ), '[]'::jsonb),
    'topAuthors', coalesce((
      select jsonb_agg(a) from (
        select author_username, max(author_name) as author_name, count(*) as count
        from public.reels
        where user_id = v_user and author_username is not null
        group by author_username order by count(*) desc limit 8
      ) a
    ), '[]'::jsonb),
    'overTime', coalesce((
      select jsonb_agg(d) from (
        select to_char(date_trunc('day', added_at), 'YYYY-MM-DD') as date, count(*) as count
        from public.reels where user_id = v_user
        group by 1 order by 1
      ) d
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.increment_reel_view(uuid) to authenticated;
grant execute on function public.merge_categories(uuid, uuid) to authenticated;
grant execute on function public.library_stats() to authenticated;
