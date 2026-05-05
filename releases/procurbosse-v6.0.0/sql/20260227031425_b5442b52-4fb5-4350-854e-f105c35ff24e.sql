
-- Fix departments table - drop and recreate with proper columns
DROP TABLE IF EXISTS public.departments CASCADE;

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  head_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add procurement roles to enum (if not already there)
DO $$
BEGIN
  -- Check if roles exist, add if not
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'requisitioner' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'requisitioner';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'procurement_officer' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'procurement_officer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'procurement_manager' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'procurement_manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'warehouse_officer' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'warehouse_officer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'inventory_manager' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'inventory_manager';
  END IF;
END$$;

-- Fix profiles RLS so admin can see ALL profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Fix handle_new_user to assign requisitioner by default instead of student
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
  
  IF NEW.email = 'samwise@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'requisitioner');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Seed departments from the uploaded xlsx
INSERT INTO public.departments (name) VALUES
('Accident & Emergency'),('Outpatient Department'),('Inpatient Department'),('General Surgery'),('Orthopedic Surgery'),
('Neuro Surgery'),('Cardiothoracic Surgery'),('Plastic Surgery'),('Pediatric Surgery'),('Internal Medicine'),
('Cardiology'),('Neurology'),('Gastroenterology'),('Nephrology'),('Pulmonology'),
('Endocrinology'),('Rheumatology'),('Dermatology'),('Pediatrics'),('Neonatology'),
('Obstetrics & Gynecology'),('Antenatal Clinic'),('Postnatal Clinic'),('Family Planning Clinic'),('Radiology Department'),
('X-Ray'),('Ultrasound'),('CT Scan'),('MRI'),('Mammography'),
('Interventional Radiology'),('Laboratory Services'),('Hematology'),('Clinical Chemistry'),('Microbiology'),
('Parasitology'),('Histopathology'),('Cytology'),('Blood Bank'),('Pharmacy'),
('Retail Pharmacy'),('Inpatient Pharmacy'),('Theatre Pharmacy'),('Theatre Complex'),('Main Operating Theatres'),
('Minor Operating Theatres'),('Recovery Room'),('CSSD (Sterilization)'),('Intensive Care Unit'),('High Dependency Unit'),
('Neonatal ICU'),('Pediatric ICU'),('Cardiac Care Unit'),('Physiotherapy'),('Occupational Therapy'),
('Speech Therapy'),('Nutrition & Dietetics'),('Social Work'),('Counseling Services'),('Medical Records'),
('Health Information'),('Coding & Billing'),('Admissions'),('Discharge Lounge'),('Patient Relations'),
('Hospital Administration'),('Chief Executive Office'),('Medical Superintendent'),('Nursing Services'),('Human Resources'),
('Finance Department'),('Procurement'),('Stores & Supplies'),('ICT Department'),('Biomedical Engineering'),
('Maintenance'),('Housekeeping'),('Laundry'),('Catering Services'),('Transport Services'),
('Security'),('Mortuary'),('Chaplaincy'),('Volunteer Services'),('Research & Training'),
('Medical Library'),('Medical Education'),('Nursing School'),('Dental Department'),('Optometry/Eye Clinic'),
('ENT Clinic'),('Oncology'),('Chemotherapy Suite'),('Radiotherapy'),('Palliative Care'),
('Renal Unit'),('Dialysis Unit'),('Infectious Diseases Unit'),('TB Clinic'),('HIV Clinic/HCC'),
('Wellness Clinic'),('Executive Health Checkup'),('Immunization Clinic'),('Child Welfare Clinic'),('Anticoagulation Clinic'),
('Wound Care Clinic'),('Stoma Clinic'),('Diabetes Clinic'),('Hypertension Clinic'),('Asthma Clinic'),
('Private Wing/Executive Wing'),('International Patient Services'),('Patient Experience Office'),('Quality Assurance'),('Risk Management'),
('Infection Control'),('Health & Safety'),('Corporate Communications'),('Marketing & PR'),('Fundraising/Foundation');

-- Seed item categories for hospital procurement
INSERT INTO public.item_categories (name, description) VALUES
('Pharmaceuticals', 'Drugs, medicines, and pharmaceutical supplies'),
('Medical Consumables', 'Syringes, gloves, bandages, gauze, and disposable medical supplies'),
('Surgical Instruments', 'Scalpels, forceps, clamps, and reusable surgical tools'),
('Laboratory Reagents', 'Chemical reagents and testing kits for lab use'),
('Medical Equipment', 'Monitors, ventilators, defibrillators, and diagnostic machines'),
('Office Supplies', 'Paper, pens, toner, and administrative materials'),
('Cleaning Supplies', 'Detergents, disinfectants, mops, and janitorial items'),
('Linen & Textiles', 'Bed sheets, towels, gowns, and theatre drapes'),
('Catering Supplies', 'Kitchen equipment, utensils, and food supplies'),
('ICT Equipment', 'Computers, printers, networking equipment, and software'),
('Furniture & Fittings', 'Desks, chairs, shelving, and hospital beds'),
('Personal Protective Equipment', 'Masks, face shields, goggles, and protective clothing'),
('Dental Supplies', 'Dental instruments, materials, and consumables'),
('Radiology Supplies', 'X-ray films, contrast media, and imaging consumables'),
('Engineering & Maintenance', 'Spare parts, tools, and building maintenance materials'),
('Electrical Supplies', 'Cables, bulbs, switches, and electrical components'),
('Plumbing Supplies', 'Pipes, fittings, taps, and plumbing materials'),
('Stationery & Printing', 'Forms, letterheads, registers, and printed materials'),
('Security Equipment', 'CCTV cameras, access cards, and security systems'),
('Transport & Vehicle', 'Fuel, spare parts, tires, and vehicle maintenance')
ON CONFLICT DO NOTHING;
