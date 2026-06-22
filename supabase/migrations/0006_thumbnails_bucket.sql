-- Bucket public pour stocker durablement les miniatures de réels
-- (les URLs CDN d'Instagram expirent : on télécharge et on rehéberge).
insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', true)
on conflict (id) do nothing;

-- Lecture publique des miniatures.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'thumbnails_public_read'
  ) then
    create policy thumbnails_public_read
      on storage.objects for select
      using (bucket_id = 'thumbnails');
  end if;
end $$;
