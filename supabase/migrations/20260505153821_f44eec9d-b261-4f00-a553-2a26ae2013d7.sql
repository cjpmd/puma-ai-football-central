INSERT INTO public.user_academies (user_id, academy_id, role)
VALUES ('bdc91e32-bf4c-4e86-bd99-252ba43e3cc2', '2ff65b09-8291-46cd-af96-1c796307475e', 'academy_admin')
ON CONFLICT (user_id, academy_id, role) DO NOTHING;