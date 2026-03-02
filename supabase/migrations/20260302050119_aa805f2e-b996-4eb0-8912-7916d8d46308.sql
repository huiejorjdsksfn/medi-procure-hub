
-- Seed comprehensive medical items across all categories with supplier assignments
-- First, let's insert any missing suppliers from the user's comprehensive list
INSERT INTO public.suppliers (name, contact_person, email, phone, address, tax_id, status, rating) VALUES
  ('Wondfo Biotech', 'Li Wei', 'info@wondfo.com', '+86-20-3222-0932', 'Guangzhou, China', 'CN-WDF-2024', 'active', 4),
  ('Shandong Ande Healthcare', 'Zhang Min', 'export@andemed.com', '+86-539-8888-000', 'Shandong, China', 'CN-AND-2024', 'active', 3),
  ('Abbott Laboratories', 'Sarah Johnson', 'kenya@abbott.com', '+254-20-271-6000', 'Nairobi, Kenya', 'KRA-ABT-2024', 'active', 5),
  ('Tiankang Medical', 'Wang Hui', 'sales@tiankang.com', '+86-550-7309-888', 'Anhui, China', 'CN-TKM-2024', 'active', 3),
  ('Shanghai Dahua Medical', 'Chen Yu', 'info@dahuamed.com', '+86-21-5555-1234', 'Shanghai, China', 'CN-DHM-2024', 'active', 3),
  ('3M Kenya', 'Peter Mwangi', 'kenya@3m.com', '+254-20-360-0000', 'Nairobi, Kenya', 'KRA-3MK-2024', 'active', 5),
  ('Ottobock Kenya', 'David Otieno', 'info@ottobock.co.ke', '+254-20-271-8000', 'Nairobi, Kenya', 'KRA-OTB-2024', 'active', 4),
  ('Johnson & Johnson', 'Mary Wanjiku', 'jnj-ea@jnj.com', '+254-20-427-3000', 'Nairobi, Kenya', 'KRA-JNJ-2024', 'active', 5),
  ('Pfizer Kenya', 'James Kiprotich', 'kenya@pfizer.com', '+254-20-427-4000', 'Nairobi, Kenya', 'KRA-PFZ-2024', 'active', 5),
  ('Novartis EA', 'Grace Muthoni', 'eastafrica@novartis.com', '+254-20-427-5000', 'Nairobi, Kenya', 'KRA-NVT-2024', 'active', 5),
  ('GlaxoSmithKline Kenya', 'Tom Odhiambo', 'kenya@gsk.com', '+254-20-693-2000', 'Nairobi, Kenya', 'KRA-GSK-2024', 'active', 5),
  ('Roche Kenya', 'Ann Njeri', 'nairobi@roche.com', '+254-20-271-9000', 'Nairobi, Kenya', 'KRA-RCH-2024', 'active', 5),
  ('Bayer EA', 'Patrick Kamau', 'eastafrica@bayer.com', '+254-20-421-8000', 'Nairobi, Kenya', 'KRA-BYR-2024', 'active', 4),
  ('Medtronic EA', 'Lucy Akinyi', 'eastafrica@medtronic.com', '+254-20-363-0000', 'Nairobi, Kenya', 'KRA-MDT-2024', 'active', 5),
  ('GE Healthcare EA', 'Samuel Kiprop', 'eastafrica@ge.com', '+254-20-362-0000', 'Nairobi, Kenya', 'KRA-GEH-2024', 'active', 5),
  ('Siemens Healthineers', 'Faith Chebet', 'kenya@siemens-healthineers.com', '+254-20-690-0000', 'Nairobi, Kenya', 'KRA-SIE-2024', 'active', 5),
  ('Philips Healthcare EA', 'Joseph Mutua', 'eastafrica@philips.com', '+254-20-427-6000', 'Nairobi, Kenya', 'KRA-PHL-2024', 'active', 5),
  ('Becton Dickinson (BD)', 'Alice Wambui', 'kenya@bd.com', '+254-20-427-7000', 'Nairobi, Kenya', 'KRA-BDK-2024', 'active', 5)
ON CONFLICT DO NOTHING;
