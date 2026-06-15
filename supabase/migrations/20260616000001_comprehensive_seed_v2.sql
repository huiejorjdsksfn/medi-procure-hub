-- ===========================================================================
-- EL5 MediProcure — Comprehensive Seed Data v2.0
-- Rich realistic data for all core modules
-- Embu Level 5 Hospital · ProcurBosse v11
-- Run safely (INSERT … ON CONFLICT DO NOTHING)
-- ===========================================================================

-- ── 1. DEPARTMENTS ──────────────────────────────────────────────────────────
INSERT INTO departments (id, name, code, description, budget_code, head_name, head_email, is_active, created_at)
VALUES
  ('dep-001', 'Pharmacy',              'PHRM', 'Hospital pharmacy and dispensary',               'BUD-PHRM-2025', 'Dr. Grace Wanjiku',   'grace.wanjiku@embu.health.go.ke',   true, NOW() - INTERVAL '180 days'),
  ('dep-002', 'Surgery',               'SURG', 'Surgical procedures and operating theatres',     'BUD-SURG-2025', 'Dr. Peter Kamau',     'peter.kamau@embu.health.go.ke',     true, NOW() - INTERVAL '180 days'),
  ('dep-003', 'Paediatrics',           'PEDS', 'Children ward and neonatal care',               'BUD-PEDS-2025', 'Dr. Mary Muthoni',    'mary.muthoni@embu.health.go.ke',    true, NOW() - INTERVAL '180 days'),
  ('dep-004', 'Laboratory',            'LAB',  'Clinical laboratory and pathology',              'BUD-LAB-2025',  'Dr. James Njeru',     'james.njeru@embu.health.go.ke',     true, NOW() - INTERVAL '180 days'),
  ('dep-005', 'Radiology',             'RAD',  'X-Ray, CT scan, and imaging',                   'BUD-RAD-2025',  'Dr. Susan Kariuki',   'susan.kariuki@embu.health.go.ke',   true, NOW() - INTERVAL '180 days'),
  ('dep-006', 'Emergency',             'EMRG', 'Accident and emergency unit',                   'BUD-EMRG-2025', 'Dr. David Mugo',      'david.mugo@embu.health.go.ke',      true, NOW() - INTERVAL '180 days'),
  ('dep-007', 'Maternity',             'MAT',  'Labour ward and postnatal care',                'BUD-MAT-2025',  'Sr. Jane Njue',       'jane.njue@embu.health.go.ke',       true, NOW() - INTERVAL '180 days'),
  ('dep-008', 'Procurement',           'PROC', 'Procurement and supply chain management',       'BUD-PROC-2025', 'Mr. Samuel Kiama',    'samuel.kiama@embu.health.go.ke',    true, NOW() - INTERVAL '180 days'),
  ('dep-009', 'Finance',               'FIN',  'Finance, accounts, and budget management',      'BUD-FIN-2025',  'Mr. Paul Mwenda',     'paul.mwenda@embu.health.go.ke',     true, NOW() - INTERVAL '180 days'),
  ('dep-010', 'IT',                    'IT',   'Information technology and systems',            'BUD-IT-2025',   'Mr. Kevin Gitari',    'kevin.gitari@embu.health.go.ke',    true, NOW() - INTERVAL '180 days'),
  ('dep-011', 'Nutrition',             'NUTR', 'Dietetics and nutritional services',            'BUD-NUTR-2025', 'Ms. Alice Mwangi',    'alice.mwangi@embu.health.go.ke',    true, NOW() - INTERVAL '180 days'),
  ('dep-012', 'Physiotherapy',         'PHYS', 'Physical therapy and rehabilitation',           'BUD-PHYS-2025', 'Mr. Tom Njiru',       'tom.njiru@embu.health.go.ke',       true, NOW() - INTERVAL '180 days'),
  ('dep-013', 'Dentistry',             'DENT', 'Dental and oral health unit',                  'BUD-DENT-2025', 'Dr. Faith Karimi',    'faith.karimi@embu.health.go.ke',    true, NOW() - INTERVAL '180 days'),
  ('dep-014', 'Ophthalmology',         'OPTH', 'Eye clinic and vision services',               'BUD-OPTH-2025', 'Dr. Chris Kimani',    'chris.kimani@embu.health.go.ke',    true, NOW() - INTERVAL '180 days'),
  ('dep-015', 'Medical Wards',         'MED',  'General medical wards and internal medicine',  'BUD-MED-2025',  'Dr. Rose Gacheru',    'rose.gacheru@embu.health.go.ke',    true, NOW() - INTERVAL '180 days')
ON CONFLICT (id) DO NOTHING;

-- ── 2. CATEGORIES ───────────────────────────────────────────────────────────
INSERT INTO categories (id, name, code, description, parent_id, is_active, created_at)
VALUES
  ('cat-001', 'Pharmaceuticals',          'PHARMA',    'All drugs and medicines',                  NULL,      true, NOW() - INTERVAL '180 days'),
  ('cat-002', 'Medical Supplies',         'MEDSUP',    'Disposable and reusable medical supplies', NULL,      true, NOW() - INTERVAL '180 days'),
  ('cat-003', 'Laboratory Reagents',      'LABREAG',   'Lab chemicals and test kits',              NULL,      true, NOW() - INTERVAL '180 days'),
  ('cat-004', 'Medical Equipment',        'EQUIP',     'Durable medical equipment',                NULL,      true, NOW() - INTERVAL '180 days'),
  ('cat-005', 'Office Supplies',          'OFFICE',    'Stationery and office consumables',        NULL,      true, NOW() - INTERVAL '180 days'),
  ('cat-006', 'Cleaning & Hygiene',       'CLEAN',     'Housekeeping and sanitation supplies',     NULL,      true, NOW() - INTERVAL '180 days'),
  ('cat-007', 'IT & Electronics',         'IT',        'Computers, printers, and accessories',     NULL,      true, NOW() - INTERVAL '180 days'),
  ('cat-008', 'Antibiotics',              'ANTIBIO',   'Antibiotic drugs',                         'cat-001', true, NOW() - INTERVAL '180 days'),
  ('cat-009', 'Analgesics',              'ANALG',     'Pain relief medications',                   'cat-001', true, NOW() - INTERVAL '180 days'),
  ('cat-010', 'IV Fluids',               'IVF',       'Intravenous fluids and solutions',         'cat-001', true, NOW() - INTERVAL '180 days'),
  ('cat-011', 'Surgical Supplies',        'SURGSUP',   'Theatre and surgical consumables',         'cat-002', true, NOW() - INTERVAL '180 days'),
  ('cat-012', 'Diagnostic Kits',          'DIAGKIT',   'Rapid test kits and diagnostics',          'cat-003', true, NOW() - INTERVAL '180 days'),
  ('cat-013', 'PPE',                      'PPE',       'Personal protective equipment',            'cat-002', true, NOW() - INTERVAL '180 days'),
  ('cat-014', 'Radiology Supplies',       'RADSUP',    'X-ray film, contrast media, etc.',         'cat-002', true, NOW() - INTERVAL '180 days'),
  ('cat-015', 'Nutritional Supplements',  'NUTR',      'Therapeutic foods and supplements',        'cat-001', true, NOW() - INTERVAL '180 days')
ON CONFLICT (id) DO NOTHING;

-- ── 3. SUPPLIERS ────────────────────────────────────────────────────────────
INSERT INTO suppliers (id, name, code, contact_person, email, phone, address, county, kra_pin, registration_no, category, rating, payment_terms, is_active, created_at)
VALUES
  ('sup-001', 'Kenya Medical Supplies Authority',  'KEMSA',    'John Mwangi',    'procurement@kemsa.go.ke',        '+254722000001', 'P.O. Box 47715-00100 Nairobi',        'Nairobi',  'A001234567X', 'GOV-KE-001',  'Pharmaceuticals',     5.0, 30,  true,  NOW() - INTERVAL '365 days'),
  ('sup-002', 'Medisel Kenya Ltd',                 'MEDISEL',  'Agnes Wahu',     'agnes@medisel.co.ke',            '+254733100001', 'Industrial Area, Nairobi',            'Nairobi',  'A002345678B', 'REG-KE-1234', 'Medical Supplies',    4.5, 45,  true,  NOW() - INTERVAL '300 days'),
  ('sup-003', 'Regal Pharmaceuticals Ltd',         'REGAL',    'Peter Odhiambo', 'peter.o@regalpharm.co.ke',       '+254711200001', 'Westlands, Nairobi',                  'Nairobi',  'A003456789C', 'REG-KE-2345', 'Pharmaceuticals',     4.8, 30,  true,  NOW() - INTERVAL '280 days'),
  ('sup-004', 'PharmSource Africa',                'PHARMSRC', 'Ruth Njeri',     'ruth@pharmsourceafrica.com',     '+254720300001', 'Upper Hill, Nairobi',                 'Nairobi',  'A004567890D', 'REG-KE-3456', 'Pharmaceuticals',     4.2, 60,  true,  NOW() - INTERVAL '250 days'),
  ('sup-005', 'Surgipharm Ltd',                    'SURGI',    'Moses Kariuki',  'moses.k@surgipharm.com',         '+254722400001', 'Mombasa Road, Nairobi',              'Nairobi',  'A005678901E', 'REG-KE-4567', 'Surgical Supplies',   4.7, 30,  true,  NOW() - INTERVAL '220 days'),
  ('sup-006', 'BioTest Diagnostics EA',            'BIOTEST',  'Irene Wangui',   'irene@biotestea.com',            '+254733500001', 'Gigiri, Nairobi',                    'Nairobi',  'A006789012F', 'REG-KE-5678', 'Laboratory',          4.4, 45,  true,  NOW() - INTERVAL '200 days'),
  ('sup-007', 'Embu Stationery & Office Supplies', 'EMBUSTAT', 'Alex Murungi',   'alex@embustationers.co.ke',      '+254714600001', 'Embu Town, Embu',                    'Embu',     'A007890123G', 'REG-KE-6789', 'Office Supplies',     3.9, 30,  true,  NOW() - INTERVAL '180 days'),
  ('sup-008', 'CleanWorld Kenya Ltd',              'CLWORLD',  'Diana Gakii',    'diana@cleanworld.co.ke',         '+254720700001', 'Thika Road, Nairobi',                'Nairobi',  'A008901234H', 'REG-KE-7890', 'Cleaning & Hygiene',  4.1, 30,  true,  NOW() - INTERVAL '160 days'),
  ('sup-009', 'TechPoint East Africa Ltd',         'TECHPT',   'Kevin Kariuki',  'kevin@techpointea.com',          '+254722800001', 'Kilimani, Nairobi',                  'Nairobi',  'A009012345I', 'REG-KE-8901', 'IT & Electronics',    4.6, 30,  true,  NOW() - INTERVAL '140 days'),
  ('sup-010', 'Cosmos Pharmaceuticals',            'COSMOS',   'Nancy Njiru',    'nancy.n@cosmospharm.co.ke',      '+254733900001', 'Industrial Area, Nairobi',           'Nairobi',  'A010123456J', 'REG-KE-9012', 'Pharmaceuticals',     4.3, 45,  true,  NOW() - INTERVAL '120 days'),
  ('sup-011', 'Lifecare Medical Supplies',         'LIFECARE', 'Samuel Maina',   'samuel@lifecaremed.co.ke',       '+254711000002', 'Karen, Nairobi',                     'Nairobi',  'A011234567K', 'REG-KE-0123', 'Medical Supplies',    4.0, 60,  true,  NOW() - INTERVAL '100 days'),
  ('sup-012', 'Global Health Supplies Kenya',      'GHSK',     'Esther Mutua',   'esther@ghsk.co.ke',              '+254722100002', 'Ruaraka, Nairobi',                   'Nairobi',  'A012345678L', 'REG-KE-1024', 'Medical Supplies',    3.8, 30,  true,  NOW() - INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

-- ── 4. ITEMS (inventory) ─────────────────────────────────────────────────────
INSERT INTO items (id, name, code, description, category_id, unit_of_measure, unit_cost, reorder_level, quantity_on_hand, is_active, created_at)
VALUES
  -- Pharmaceuticals
  ('item-001', 'Amoxicillin 500mg Capsules',      'AMOX500',   'Broad-spectrum antibiotic',                   'cat-008', 'Strip(10)',   45.00,  500, 2400, true, NOW() - INTERVAL '300 days'),
  ('item-002', 'Paracetamol 500mg Tablets',        'PARA500',   'Antipyretic and analgesic',                   'cat-009', 'Strip(24)',   18.00, 1000, 8500, true, NOW() - INTERVAL '300 days'),
  ('item-003', 'Metronidazole 400mg Tablets',      'METRO400',  'Antiprotozoal antibiotic',                    'cat-008', 'Strip(24)',   22.00,  400, 1800, true, NOW() - INTERVAL '295 days'),
  ('item-004', 'Normal Saline 0.9% 500ml',         'NS500',     'Intravenous infusion fluid',                  'cat-010', 'Bottle',      95.00,  300, 1200, true, NOW() - INTERVAL '290 days'),
  ('item-005', 'Dextrose 5% 500ml',                'DEXT5',     'Dextrose IV infusion',                        'cat-010', 'Bottle',      98.00,  300,  900, true, NOW() - INTERVAL '285 days'),
  ('item-006', 'Diclofenac 75mg Injection',        'DICLO75',   'Anti-inflammatory injection',                  'cat-009', 'Vial',        55.00,  200,  650, true, NOW() - INTERVAL '280 days'),
  ('item-007', 'Ciprofloxacin 500mg Tablets',      'CIPRO500',  'Fluoroquinolone antibiotic',                  'cat-008', 'Strip(10)',   85.00,  300, 1500, true, NOW() - INTERVAL '275 days'),
  ('item-008', 'Omeprazole 20mg Capsules',         'OMEP20',    'Proton pump inhibitor',                       'cat-001', 'Strip(14)',   65.00,  200, 1100, true, NOW() - INTERVAL '270 days'),
  ('item-009', 'Amlodipine 10mg Tablets',          'AMLO10',    'Calcium channel blocker antihypertensive',    'cat-001', 'Strip(30)',   45.00,  150,  800, true, NOW() - INTERVAL '265 days'),
  ('item-010', 'Metformin 500mg Tablets',          'METF500',   'Oral antidiabetic drug',                      'cat-001', 'Strip(30)',   38.00,  200, 1200, true, NOW() - INTERVAL '260 days'),
  ('item-011', 'Salbutamol Inhaler 100mcg',        'SALB100',   'Bronchodilator inhaler',                      'cat-001', 'Piece',      145.00,  100,  350, true, NOW() - INTERVAL '255 days'),
  ('item-012', 'Doxycycline 100mg Capsules',       'DOXY100',   'Tetracycline antibiotic',                     'cat-008', 'Strip(8)',    48.00,  200,  900, true, NOW() - INTERVAL '250 days'),
  ('item-013', 'Artesunate + Amodiaquine (ASAQ)', 'ASAQ',      'Artemisinin combination therapy',             'cat-001', 'Pack',       185.00,  500, 2200, true, NOW() - INTERVAL '245 days'),
  ('item-014', 'Morphine 10mg/ml Injection',       'MORPH10',   'Opioid analgesic (controlled)',               'cat-009', 'Vial',       220.00,   50,  180, true, NOW() - INTERVAL '240 days'),
  ('item-015', 'ORS Sachets (1L)',                 'ORS1L',     'Oral rehydration salts',                      'cat-001', 'Box(25)',     55.00,  200,  700, true, NOW() - INTERVAL '235 days'),
  -- Medical Supplies
  ('item-016', 'Latex Gloves Medium (Box 100)',    'GLOVEM',    'Disposable latex examination gloves',         'cat-013', 'Box',        450.00,  100,  480, true, NOW() - INTERVAL '230 days'),
  ('item-017', 'Surgical Face Mask (Box 50)',      'FMASK50',   '3-ply surgical face masks',                   'cat-013', 'Box',        350.00,  100,  600, true, NOW() - INTERVAL '225 days'),
  ('item-018', 'Syringe 5ml with Needle',         'SYR5',      'Sterile disposable syringe',                  'cat-002', 'Box(100)',   480.00,  200, 1800, true, NOW() - INTERVAL '220 days'),
  ('item-019', 'Syringe 10ml with Needle',        'SYR10',     'Sterile disposable syringe',                  'cat-002', 'Box(100)',   520.00,  150, 1400, true, NOW() - INTERVAL '215 days'),
  ('item-020', 'IV Cannula 18G',                  'IVC18',     'Intravenous cannula 18 gauge',                'cat-002', 'Piece',       48.00,  300,  980, true, NOW() - INTERVAL '210 days'),
  ('item-021', 'Suture Vicryl 2-0',               'SUVICRYL2', 'Absorbable braided polyglycolic acid suture', 'cat-011', 'Box(12)',   1200.00,   50,  180, true, NOW() - INTERVAL '205 days'),
  ('item-022', 'Wound Dressing 10x10cm',          'WDRESS10',  'Non-adherent sterile dressing',               'cat-002', 'Box(10)',    180.00,  100,  450, true, NOW() - INTERVAL '200 days'),
  ('item-023', 'Urinary Catheter 16Fr',           'UCATH16',   'Foley catheter with balloon',                 'cat-002', 'Piece',      185.00,   80,  320, true, NOW() - INTERVAL '195 days'),
  ('item-024', 'Nasogastric Tube 14Fr',           'NGTUBE14',  'PVC nasogastric tube',                        'cat-002', 'Piece',      120.00,   60,  240, true, NOW() - INTERVAL '190 days'),
  ('item-025', 'Blood Collection Tube EDTA 4ml',  'BCT_EDTA',  'Vacutainer with EDTA anticoagulant',          'cat-003', 'Box(100)',   380.00,  200,  950, true, NOW() - INTERVAL '185 days'),
  -- Laboratory
  ('item-026', 'Malaria RDT Kit',                 'MALRDT',    'Rapid diagnostic test for P. falciparum',    'cat-012', 'Box(25)',    750.00,  100,  420, true, NOW() - INTERVAL '180 days'),
  ('item-027', 'HIV Test Kit (Determine)',         'HIVDET',    'HIV 1&2 rapid test',                         'cat-012', 'Box(100)',  3200.00,   50,  180, true, NOW() - INTERVAL '175 days'),
  ('item-028', 'Blood Glucose Strips',            'BGSTRIP',   'Compatible with Accu-Chek glucometer',       'cat-003', 'Box(50)',    950.00,   80,  360, true, NOW() - INTERVAL '170 days'),
  -- Office Supplies
  ('item-029', 'A4 Copy Paper (Ream 500)',         'PAPER_A4',  '80gsm white copy paper',                     'cat-005', 'Ream',       420.00,   50,  280, true, NOW() - INTERVAL '165 days'),
  ('item-030', 'Black Ballpoint Pens (Box 50)',    'BPEN_BK',   'Retractable ballpoint pens',                 'cat-005', 'Box',        350.00,   20,  120, true, NOW() - INTERVAL '160 days'),
  -- Cleaning
  ('item-031', 'Jik Bleach 5L',                   'JIK5L',     'Sodium hypochlorite disinfectant',           'cat-006', 'Container',  380.00,   40,  200, true, NOW() - INTERVAL '155 days'),
  ('item-032', 'Hand Sanitiser 500ml',             'HANSAN500', '70% isopropyl alcohol based gel',           'cat-006', 'Bottle',     180.00,  100,  480, true, NOW() - INTERVAL '150 days')
ON CONFLICT (id) DO NOTHING;

-- ── 5. PURCHASE ORDERS ───────────────────────────────────────────────────────
INSERT INTO purchase_orders (id, po_number, supplier_id, department_id, status, total_amount, tax_amount, net_amount, delivery_date, payment_terms, notes, created_at, updated_at)
VALUES
  ('po-001', 'EL5-PO-2025-001', 'sup-001', 'dep-001', 'approved',   842500.00, 134800.00, 707700.00, NOW() + INTERVAL '14 days',  'N30',  'KEMSA framework order Q1',              NOW() - INTERVAL '90 days',  NOW() - INTERVAL '88 days'),
  ('po-002', 'EL5-PO-2025-002', 'sup-002', 'dep-002', 'delivered',  225800.00,  36128.00, 189672.00, NOW() - INTERVAL '45 days',  'N45',  'Surgical supplies restock',             NOW() - INTERVAL '75 days',  NOW() - INTERVAL '40 days'),
  ('po-003', 'EL5-PO-2025-003', 'sup-003', 'dep-001', 'approved',   318400.00,  50944.00, 267456.00, NOW() + INTERVAL '7 days',   'N30',  'Antibiotics emergency top-up',          NOW() - INTERVAL '20 days',  NOW() - INTERVAL '18 days'),
  ('po-004', 'EL5-PO-2025-004', 'sup-005', 'dep-002', 'pending',    156000.00,  24960.00, 131040.00, NOW() + INTERVAL '21 days',  'N30',  'Theatre consumables Q2',                NOW() - INTERVAL '10 days',  NOW() - INTERVAL '10 days'),
  ('po-005', 'EL5-PO-2025-005', 'sup-006', 'dep-004', 'approved',   485200.00,  77632.00, 407568.00, NOW() + INTERVAL '30 days',  'N45',  'Lab reagents and test kits',            NOW() - INTERVAL '15 days',  NOW() - INTERVAL '13 days'),
  ('po-006', 'EL5-PO-2025-006', 'sup-007', 'dep-008', 'closed',      48600.00,   7776.00,  40824.00, NOW() - INTERVAL '60 days',  'N30',  'Office stationery annual',              NOW() - INTERVAL '100 days', NOW() - INTERVAL '55 days'),
  ('po-007', 'EL5-PO-2025-007', 'sup-008', 'dep-001', 'delivered',   92400.00,  14784.00,  77616.00, NOW() - INTERVAL '20 days',  'N30',  'Cleaning and hygiene supplies',         NOW() - INTERVAL '50 days',  NOW() - INTERVAL '18 days'),
  ('po-008', 'EL5-PO-2025-008', 'sup-009', 'dep-010', 'approved',   345000.00,  55200.00, 289800.00, NOW() + INTERVAL '10 days',  'N30',  'IT equipment Q2 procurement',           NOW() - INTERVAL '5 days',   NOW() - INTERVAL '3 days'),
  ('po-009', 'EL5-PO-2025-009', 'sup-010', 'dep-003', 'pending',    128400.00,  20544.00, 107856.00, NOW() + INTERVAL '14 days',  'N45',  'Paediatric drugs and supplements',     NOW() - INTERVAL '8 days',   NOW() - INTERVAL '8 days'),
  ('po-010', 'EL5-PO-2025-010', 'sup-001', 'dep-006', 'approved',   674000.00, 107840.00, 566160.00, NOW() + INTERVAL '5 days',   'N30',  'Emergency dept pharmaceuticals',        NOW() - INTERVAL '12 days',  NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- ── 6. SUPPLIERS (additional quick seed) ─────────────────────────────────────

-- ── 7. CONTRACTS ────────────────────────────────────────────────────────────
INSERT INTO contracts (id, contract_number, supplier_id, department_id, title, description, contract_type, status, start_date, end_date, total_value, payment_terms, notes, created_at)
VALUES
  ('con-001', 'EL5-CON-2025-001', 'sup-001', 'dep-001', 'Annual Pharmaceuticals Framework',         'KEMSA annual drugs framework agreement for FY 2025/26',             'framework', 'active',   '2025-07-01', '2026-06-30', 12500000.00, 'N30', 'Quarterly call-off orders against this framework', NOW() - INTERVAL '90 days'),
  ('con-002', 'EL5-CON-2025-002', 'sup-002', 'dep-002', 'Medical Supplies Annual Contract',        'Medisel Kenya annual supply of medical consumables',                'annual',    'active',   '2025-07-01', '2026-06-30',  4800000.00, 'N45', '5% discount on orders above KES 500,000',        NOW() - INTERVAL '85 days'),
  ('con-003', 'EL5-CON-2025-003', 'sup-005', 'dep-002', 'Surgical Consumables Contract',           'Surgipharm theatre and surgical supplies contract',                 'annual',    'active',   '2025-04-01', '2026-03-31',  3200000.00, 'N30', 'Monthly delivery schedule agreed',               NOW() - INTERVAL '80 days'),
  ('con-004', 'EL5-CON-2024-004', 'sup-006', 'dep-004', 'Laboratory Reagents Contract FY2024/25', 'BioTest annual laboratory supplies',                                'annual',    'expired',  '2024-07-01', '2025-06-30',  2800000.00, 'N45', 'Contract expired — renewal in progress',          NOW() - INTERVAL '365 days'),
  ('con-005', 'EL5-CON-2025-005', 'sup-009', 'dep-010', 'ICT Equipment Supply Contract',          'TechPoint multi-year ICT equipment and maintenance contract',        'multi-year','active',   '2025-01-01', '2027-12-31',  8500000.00, 'N30', 'Includes 3-year warranty on all hardware',        NOW() - INTERVAL '70 days')
ON CONFLICT (id) DO NOTHING;

-- ── 8. BUDGETS ──────────────────────────────────────────────────────────────
INSERT INTO budgets (id, budget_code, department_id, fiscal_year, description, total_amount, spent_amount, committed_amount, status, created_at)
VALUES
  ('bud-001', 'BUD-PHRM-2025', 'dep-001', '2025/26', 'Pharmacy Department Annual Budget',      15000000.00, 4250000.00, 2800000.00, 'active', NOW() - INTERVAL '90 days'),
  ('bud-002', 'BUD-SURG-2025', 'dep-002', '2025/26', 'Surgery Department Annual Budget',        8500000.00, 1850000.00, 1200000.00, 'active', NOW() - INTERVAL '90 days'),
  ('bud-003', 'BUD-LAB-2025',  'dep-004', '2025/26', 'Laboratory Annual Budget',                5200000.00, 1480000.00,  850000.00, 'active', NOW() - INTERVAL '90 days'),
  ('bud-004', 'BUD-EMRG-2025', 'dep-006', '2025/26', 'Emergency Unit Annual Budget',            6800000.00, 2100000.00, 1500000.00, 'active', NOW() - INTERVAL '90 days'),
  ('bud-005', 'BUD-IT-2025',   'dep-010', '2025/26', 'IT Department Annual Budget',             3500000.00,  780000.00,  600000.00, 'active', NOW() - INTERVAL '90 days'),
  ('bud-006', 'BUD-MAT-2025',  'dep-007', '2025/26', 'Maternity Department Annual Budget',      4200000.00, 1250000.00,  780000.00, 'active', NOW() - INTERVAL '90 days'),
  ('bud-007', 'BUD-PEDS-2025', 'dep-003', '2025/26', 'Paediatrics Annual Budget',               3800000.00,  920000.00,  650000.00, 'active', NOW() - INTERVAL '90 days'),
  ('bud-008', 'BUD-PROC-2025', 'dep-008', '2025/26', 'Procurement Department Annual Budget',    1200000.00,  320000.00,  180000.00, 'active', NOW() - INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

-- ── 9. PROCUREMENT PLANS ──────────────────────────────────────────────────────
INSERT INTO procurement_plans (id, plan_number, department_id, fiscal_year, title, description, status, total_estimated, created_at)
VALUES
  ('pp-001', 'EL5-PP-2025-001', 'dep-001', '2025/26', 'Q1 Pharmaceuticals Procurement Plan',    'First quarter drug procurement for pharmacy',                      'approved',  8500000.00, NOW() - INTERVAL '85 days'),
  ('pp-002', 'EL5-PP-2025-002', 'dep-002', '2025/26', 'Surgical Supplies Annual Plan',          'Annual surgical consumables procurement plan',                     'approved',  4200000.00, NOW() - INTERVAL '80 days'),
  ('pp-003', 'EL5-PP-2025-003', 'dep-004', '2025/26', 'Laboratory Annual Procurement Plan',     'Lab reagents, equipment and quality control supplies',             'submitted', 2800000.00, NOW() - INTERVAL '75 days'),
  ('pp-004', 'EL5-PP-2025-004', 'dep-010', '2025/26', 'ICT Equipment Replacement Plan',         '3-year ICT infrastructure upgrade plan',                           'approved',  6500000.00, NOW() - INTERVAL '70 days'),
  ('pp-005', 'EL5-PP-2025-005', 'dep-006', '2025/26', 'Emergency Department Procurement Plan',  'Emergency unit drugs, equipment and consumables',                  'draft',     3800000.00, NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- ── 10. TENDERS ────────────────────────────────────────────────────────────
INSERT INTO tenders (id, tender_number, title, description, category_id, department_id, tender_type, status, estimated_value, submission_deadline, opening_date, award_date, created_at)
VALUES
  ('ten-001', 'EL5-TEN-2025-001', 'Supply of Pharmaceuticals FY 2025/26',          'Annual tender for pharmaceutical drugs and vaccines',            'cat-001', 'dep-001', 'open',      'closed',   12500000.00, NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '60 days'),
  ('ten-002', 'EL5-TEN-2025-002', 'Medical and Surgical Supplies Q2',               'Second quarter medical consumables tender',                     'cat-002', 'dep-002', 'open',      'awarded',   4800000.00, NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days',  NOW() - INTERVAL '55 days'),
  ('ten-003', 'EL5-TEN-2025-003', 'Laboratory Reagents and Diagnostics 2025/26',    'Annual laboratory supplies and diagnostics procurement',        'cat-003', 'dep-004', 'open',      'published', 2800000.00, NOW() + INTERVAL '21 days', NOW() + INTERVAL '24 days', NULL,                       NOW() - INTERVAL '10 days'),
  ('ten-004', 'EL5-TEN-2025-004', 'ICT Infrastructure Upgrade Phase 1',             'Computer hardware, networking, and server upgrade',             'cat-007', 'dep-010', 'restricted','evaluation',3500000.00, NOW() + INTERVAL '14 days', NOW() + INTERVAL '17 days', NULL,                       NOW() - INTERVAL '8 days'),
  ('ten-005', 'EL5-TEN-2025-005', 'Cleaning and Hygiene Supplies Annual Contract',  'Janitorial, disinfection, and hygiene product supply',          'cat-006', 'dep-001', 'open',      'draft',    1200000.00, NOW() + INTERVAL '30 days', NOW() + INTERVAL '33 days', NULL,                       NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- ── 11. CHART OF ACCOUNTS ─────────────────────────────────────────────────
INSERT INTO gl_accounts (id, account_code, account_name, account_type, parent_code, description, is_active, created_at)
VALUES
  ('gla-001', '1000',  'Current Assets',                    'asset',     NULL,   'All current assets',                   true, NOW() - INTERVAL '365 days'),
  ('gla-002', '1100',  'Cash and Bank',                     'asset',     '1000', 'Cash on hand and bank balances',       true, NOW() - INTERVAL '365 days'),
  ('gla-003', '1200',  'Accounts Receivable',               'asset',     '1000', 'Amounts owed to the hospital',         true, NOW() - INTERVAL '365 days'),
  ('gla-004', '1300',  'Inventories',                       'asset',     '1000', 'Medical and non-medical stock',        true, NOW() - INTERVAL '365 days'),
  ('gla-005', '2000',  'Current Liabilities',               'liability', NULL,   'All current liabilities',              true, NOW() - INTERVAL '365 days'),
  ('gla-006', '2100',  'Accounts Payable',                  'liability', '2000', 'Amounts owed to suppliers',            true, NOW() - INTERVAL '365 days'),
  ('gla-007', '2200',  'Accrued Expenses',                  'liability', '2000', 'Accrued but unpaid expenses',          true, NOW() - INTERVAL '365 days'),
  ('gla-008', '3000',  'Equity',                            'equity',    NULL,   'Government equity and reserves',       true, NOW() - INTERVAL '365 days'),
  ('gla-009', '4000',  'Revenue',                           'revenue',   NULL,   'All revenue streams',                  true, NOW() - INTERVAL '365 days'),
  ('gla-010', '4100',  'User Fee Revenue',                  'revenue',   '4000', 'Patient user fee collections',         true, NOW() - INTERVAL '365 days'),
  ('gla-011', '4200',  'Grant Revenue',                     'revenue',   '4000', 'Donor and government grants',          true, NOW() - INTERVAL '365 days'),
  ('gla-012', '5000',  'Expenses',                          'expense',   NULL,   'All expense categories',               true, NOW() - INTERVAL '365 days'),
  ('gla-013', '5100',  'Pharmaceutical Expenses',           'expense',   '5000', 'Drugs and medicine purchases',         true, NOW() - INTERVAL '365 days'),
  ('gla-014', '5200',  'Medical Supplies Expenses',         'expense',   '5000', 'Medical consumables',                  true, NOW() - INTERVAL '365 days'),
  ('gla-015', '5300',  'Laboratory Expenses',               'expense',   '5000', 'Lab reagents and diagnostics',         true, NOW() - INTERVAL '365 days'),
  ('gla-016', '5400',  'Administrative Expenses',           'expense',   '5000', 'Office and admin costs',               true, NOW() - INTERVAL '365 days'),
  ('gla-017', '5500',  'Utilities',                         'expense',   '5000', 'Electricity, water, communications',   true, NOW() - INTERVAL '365 days'),
  ('gla-018', '5600',  'Equipment Maintenance',             'expense',   '5000', 'Medical and office equipment repairs', true, NOW() - INTERVAL '365 days')
ON CONFLICT (id) DO NOTHING;

-- ── 12. FACILITIES ─────────────────────────────────────────────────────────
INSERT INTO facilities (id, name, code, type, address, county, sub_county, ward, phone, email, is_active, is_headquarters, created_at)
VALUES
  ('fac-001', 'Embu Level 5 Hospital',          'EL5',      'Level 5 Hospital', 'Hospital Road, Embu',          'Embu', 'Embu West',   'Township',      '+254722100100', 'info@embu.health.go.ke',          true, true,  NOW() - INTERVAL '365 days'),
  ('fac-002', 'Embu County Referral Dispensary', 'ECR-DIS',  'Dispensary',       'Embu Town, Embu',              'Embu', 'Embu West',   'Township',      '+254733200200', 'dispensary@embu.health.go.ke',    true, false, NOW() - INTERVAL '300 days'),
  ('fac-003', 'Mwea Sub-District Hospital',      'MWEA-SDH', 'Sub-District',     'Mwea, Kirinyaga County',       'Embu', 'Mwea West',   'Thiba',         '+254711300300', 'mwea@embu.health.go.ke',          true, false, NOW() - INTERVAL '250 days'),
  ('fac-004', 'Siakago Health Centre',           'SIA-HC',   'Health Centre',    'Siakago, Embu County',         'Embu', 'Siakago',     'Kagaari South', '+254722400400', 'siakago@embu.health.go.ke',       true, false, NOW() - INTERVAL '200 days'),
  ('fac-005', 'Runyenjes Health Centre',         'RUN-HC',   'Health Centre',    'Runyenjes, Embu County',       'Embu', 'Runyenjes',   'Kagaari North', '+254733500500', 'runyenjes@embu.health.go.ke',     true, false, NOW() - INTERVAL '150 days')
ON CONFLICT (id) DO NOTHING;

-- ── 13. INSPECTIONS (Quality) ───────────────────────────────────────────────
INSERT INTO inspections (id, inspection_number, title, item_id, supplier_id, po_number, inspection_type, status, result, scheduled_date, completed_date, inspector_notes, created_at)
VALUES
  ('ins-001', 'EL5-INS-2025-001', 'Amoxicillin Batch Inspection',        'item-001', 'sup-001', 'EL5-PO-2025-001', 'goods_receipt', 'completed', 'passed', NOW() - INTERVAL '80 days', NOW() - INTERVAL '78 days', 'All 240 strips inspected. No defects found. Expiry dates verified.',  NOW() - INTERVAL '85 days'),
  ('ins-002', 'EL5-INS-2025-002', 'Surgical Gloves Quality Check',       'item-016', 'sup-002', 'EL5-PO-2025-002', 'goods_receipt', 'completed', 'passed', NOW() - INTERVAL '50 days', NOW() - INTERVAL '48 days', 'Random sample of 10 boxes inspected. AQL 2.5 — passed.',           NOW() - INTERVAL '55 days'),
  ('ins-003', 'EL5-INS-2025-003', 'IV Normal Saline Batch Check',        'item-004', 'sup-003', 'EL5-PO-2025-003', 'scheduled',     'pending',   NULL,     NOW() + INTERVAL '5 days',  NULL,                       NULL,                                                               NOW() - INTERVAL '15 days'),
  ('ins-004', 'EL5-INS-2025-004', 'Lab Reagents Initial Inspection',     'item-026', 'sup-006', 'EL5-PO-2025-005', 'pre_delivery',  'in_progress',NULL,    NOW() - INTERVAL '2 days',  NULL,                       'Inspection in progress — temperature compliance check pending.',    NOW() - INTERVAL '10 days'),
  ('ins-005', 'EL5-INS-2025-005', 'Surgical Face Mask Compliance Check', 'item-017', 'sup-002', 'EL5-PO-2025-002', 'goods_receipt', 'completed', 'failed', NOW() - INTERVAL '42 days', NOW() - INTERVAL '40 days', 'Batch EXP-2025-08 found with torn packaging on 3 boxes. Returned.', NOW() - INTERVAL '48 days')
ON CONFLICT (id) DO NOTHING;

-- Done
COMMENT ON TABLE departments IS 'Seeded: 15 departments — EL5 MediProcure v2.0 seed';
COMMENT ON TABLE suppliers   IS 'Seeded: 12 suppliers   — EL5 MediProcure v2.0 seed';
COMMENT ON TABLE items       IS 'Seeded: 32 items        — EL5 MediProcure v2.0 seed';
