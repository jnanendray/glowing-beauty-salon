-- Seed data matching the services/stylists already on the landing page.
-- Safe to re-run: uses a unique name check before inserting.

insert into public.services (name, description, duration_minutes, price, home_service_available, home_service_charge, photo_url)
select * from (values
  ('Haircut & Styling', 'Precision cuts, blow-dry and styling for every hair type and occasion.', 45, 599.00, false, 0.00, '/services/hair.jpg'),
  ('Facial & Skincare', 'Deep-cleansing facials, brightening treatments and skin consultations.', 60, 1299.00, true, 499.00, '/services/facial.jpg'),
  ('Bridal & Party Makeup', 'HD and airbrush makeup for weddings, engagements and parties.', 120, 4999.00, true, 999.00, '/services/bridal.jpg'),
  ('Spa & Body Massage', 'Relaxing full-body massage, aromatherapy and spa rituals.', 75, 1799.00, true, 499.00, '/services/spa.jpg'),
  ('Waxing & Threading', 'Full-body waxing, threading and clean, gentle grooming.', 45, 799.00, false, 0.00, '/services/waxing.jpg'),
  ('Manicure & Pedicure', 'Nail care, gel polish and hand & foot spa treatments.', 60, 899.00, false, 0.00, '/services/nails.jpg')
) as v(name, description, duration_minutes, price, home_service_available, home_service_charge, photo_url)
where not exists (select 1 from public.services s where s.name = v.name);

insert into public.stylists (name, role, photo_url)
select * from (values
  ('Ananya Rao', 'Senior Hair Stylist', '/stylists/stylist-1.jpg'),
  ('Meera Iyer', 'Bridal & Beauty Specialist', '/stylists/stylist-2.jpg')
) as v(name, role, photo_url)
where not exists (select 1 from public.stylists s where s.name = v.name);

-- Default working hours for both stylists: Mon–Sat 9am–8pm, closed Sunday.
insert into public.stylist_working_hours (stylist_id, day_of_week, start_time, end_time)
select s.id, d.dow, '09:00', '20:00'
from public.stylists s
cross join (select generate_series(1, 6) as dow) d -- 1=Mon ... 6=Sat
where not exists (
  select 1 from public.stylist_working_hours w
  where w.stylist_id = s.id and w.day_of_week = d.dow
);

-- Every stylist can perform every service for now — adjust in the
-- admin panel or SQL editor once you want finer-grained assignment.
insert into public.stylist_services (stylist_id, service_id)
select s.id, sv.id
from public.stylists s
cross join public.services sv
where not exists (
  select 1 from public.stylist_services ss
  where ss.stylist_id = s.id and ss.service_id = sv.id
);
