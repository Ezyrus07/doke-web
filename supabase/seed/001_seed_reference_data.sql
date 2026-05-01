-- Doke Stage 21 reference seed data.
insert into public.service_categories (name, slug, description, sort_order) values
  ('Pintura', 'pintura', 'Serviços de pintura residencial e comercial.', 10),
  ('Encanador', 'encanador', 'Instalação, reparo e manutenção hidráulica.', 20),
  ('Eletricista', 'eletricista', 'Serviços elétricos residenciais e comerciais.', 30),
  ('Limpeza', 'limpeza', 'Limpeza doméstica, pós-obra e recorrente.', 40),
  ('Reformas', 'reformas', 'Pequenas reformas e manutenção geral.', 50)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;
