
-- Insert items linked to suppliers and categories
INSERT INTO public.items (name, description, barcode, sku, category_id, supplier_id, unit_of_measure, unit_price, quantity_in_stock, reorder_level, item_type, status) VALUES
-- KEMSA items (Pharmaceuticals & Medical Consumables)
('Paracetamol 500mg Tablets', 'Box of 1000 tablets', '6001234567890', 'KEMSA-PARA-500', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '1022e0cb-8079-43f2-9d64-33d70593020a', 'box', 250.00, 500, 100, 'pharmaceutical', 'active'),
('Amoxicillin 250mg Capsules', 'Box of 100 capsules', '6001234567891', 'KEMSA-AMOX-250', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '1022e0cb-8079-43f2-9d64-33d70593020a', 'box', 180.00, 300, 50, 'pharmaceutical', 'active'),
('Surgical Gloves (Latex) Medium', 'Box of 100 pairs', '6001234567892', 'KEMSA-GLV-M', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '1022e0cb-8079-43f2-9d64-33d70593020a', 'box', 850.00, 200, 50, 'consumable', 'active'),
('IV Cannula 20G', 'Box of 50', '6001234567893', 'KEMSA-IVC-20G', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '1022e0cb-8079-43f2-9d64-33d70593020a', 'box', 1200.00, 150, 30, 'consumable', 'active'),
('Normal Saline 500ml', 'Bag, sterile', '6001234567894', 'KEMSA-NS-500', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '1022e0cb-8079-43f2-9d64-33d70593020a', 'piece', 120.00, 1000, 200, 'pharmaceutical', 'active'),
('Gauze Swabs 10x10cm', 'Pack of 100, sterile', '6001234567895', 'KEMSA-GS-10', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '1022e0cb-8079-43f2-9d64-33d70593020a', 'pack', 350.00, 400, 80, 'consumable', 'active'),
('Metformin 500mg Tablets', 'Box of 1000', '6001234567896', 'KEMSA-MET-500', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '1022e0cb-8079-43f2-9d64-33d70593020a', 'box', 300.00, 250, 50, 'pharmaceutical', 'active'),
('Amlodipine 5mg Tablets', 'Box of 1000', '6001234567897', 'KEMSA-AML-5', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '1022e0cb-8079-43f2-9d64-33d70593020a', 'box', 280.00, 200, 40, 'pharmaceutical', 'active'),
-- MEDS items
('Diazepam 5mg Tablets', 'Box of 100', '6002234567890', 'MEDS-DZP-5', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '74796192-6464-4069-aad7-4b300b752fff', 'box', 150.00, 100, 20, 'pharmaceutical', 'active'),
('Morphine Sulfate 10mg Injection', 'Ampoule, 1ml', '6002234567891', 'MEDS-MOR-10', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '74796192-6464-4069-aad7-4b300b752fff', 'ampoule', 450.00, 50, 10, 'pharmaceutical', 'active'),
('Ciprofloxacin 500mg Tablets', 'Box of 100', '6002234567892', 'MEDS-CIP-500', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '74796192-6464-4069-aad7-4b300b752fff', 'box', 220.00, 180, 30, 'pharmaceutical', 'active'),
-- Phillips Pharma
('Omeprazole 20mg Capsules', 'Box of 100', '6003234567890', 'PPG-OMP-20', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '9a2fb3cb-f394-4b8b-b65f-146fb86f9468', 'box', 320.00, 150, 30, 'pharmaceutical', 'active'),
('Losartan 50mg Tablets', 'Box of 100', '6003234567891', 'PPG-LOS-50', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '9a2fb3cb-f394-4b8b-b65f-146fb86f9468', 'box', 280.00, 120, 25, 'pharmaceutical', 'active'),
-- Sai Pharma
('Ibuprofen 400mg Tablets', 'Box of 1000', '6004234567890', 'SAI-IBU-400', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '45bf0f97-35e4-450e-9dcf-5f36b81c0420', 'box', 200.00, 350, 70, 'pharmaceutical', 'active'),
('Ceftriaxone 1g Injection', 'Vial, powder for reconstitution', '6004234567891', 'SAI-CEF-1G', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '45bf0f97-35e4-450e-9dcf-5f36b81c0420', 'vial', 180.00, 200, 40, 'pharmaceutical', 'active'),
-- Transwide Pharma (Surgical & Pharma)
('Suture Silk 2-0 (75cm)', 'Box of 12', '6005234567890', 'TWP-SUT-20', 'fa06434f-fc1f-4999-94ff-c8871474de4f', '5508c2c2-37a2-4f45-955c-62573a6d30dd', 'box', 1500.00, 80, 20, 'surgical', 'active'),
('Povidone Iodine 10% Solution', '500ml bottle', '6005234567891', 'TWP-PVI-500', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '5508c2c2-37a2-4f45-955c-62573a6d30dd', 'bottle', 450.00, 100, 20, 'consumable', 'active'),
-- Biocare Health Systems (Equipment & Diagnostics)
('Patient Monitor (5-Parameter)', 'ECG, SpO2, NIBP, Temp, Resp', '6006234567890', 'BHS-PM-5P', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '266493ac-5c58-49a5-bbb5-caec0a26d740', 'piece', 185000.00, 5, 2, 'equipment', 'active'),
('Examination Couch (Hydraulic)', 'Adjustable, steel frame', '6006234567891', 'BHS-EC-HYD', 'd44c588b-0c60-4ef7-9719-dd14b35f8304', '266493ac-5c58-49a5-bbb5-caec0a26d740', 'piece', 45000.00, 8, 2, 'equipment', 'active'),
('Digital Blood Pressure Monitor', 'Automatic, arm type', '6006234567892', 'BHS-BP-DIG', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '266493ac-5c58-49a5-bbb5-caec0a26d740', 'piece', 8500.00, 15, 5, 'equipment', 'active'),
-- Crown Healthcare (Radiology & Theatre)
('C-Arm Fluoroscopy Unit', 'Mobile, digital imaging', '6007234567890', 'CHC-CARM-01', 'b99f6245-fda7-4fae-8616-380806c8aecd', 'ca181063-1b6b-4686-99a2-48d43e30e323', 'piece', 8500000.00, 1, 1, 'equipment', 'active'),
('Operating Table (Electric)', 'Multi-position, radiolucent', '6007234567891', 'CHC-OT-ELC', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', 'ca181063-1b6b-4686-99a2-48d43e30e323', 'piece', 2200000.00, 2, 1, 'equipment', 'active'),
-- Acon Medical (Lab Reagents)
('HIV Rapid Test Kit', 'Pack of 25 tests', '6008234567890', 'AMS-HIV-RTK', '0b2146e8-e746-44d1-8d49-05641ce8d34c', 'a276eb89-efe6-41cb-818d-773344be9456', 'pack', 3500.00, 100, 20, 'laboratory', 'active'),
('Malaria RDT (pf/pan)', 'Pack of 25', '6008234567891', 'AMS-MAL-RDT', '0b2146e8-e746-44d1-8d49-05641ce8d34c', 'a276eb89-efe6-41cb-818d-773344be9456', 'pack', 2800.00, 120, 25, 'laboratory', 'active'),
('Urinalysis Strips (10-parameter)', 'Bottle of 100', '6008234567892', 'AMS-URI-10P', '0b2146e8-e746-44d1-8d49-05641ce8d34c', 'a276eb89-efe6-41cb-818d-773344be9456', 'bottle', 1800.00, 80, 15, 'laboratory', 'active'),
-- Wondfo Biotech (Diagnostics)
('Pregnancy Test (HCG Strip)', 'Pack of 50', '6009234567890', 'WDF-HCG-50', '0b2146e8-e746-44d1-8d49-05641ce8d34c', 'd4442e7f-816a-4f80-b0dd-631ce55dcc03', 'pack', 1200.00, 200, 40, 'laboratory', 'active'),
('COVID-19 Antigen Rapid Test', 'Box of 25', '6009234567891', 'WDF-COV-AG', '0b2146e8-e746-44d1-8d49-05641ce8d34c', 'd4442e7f-816a-4f80-b0dd-631ce55dcc03', 'box', 4500.00, 50, 10, 'laboratory', 'active'),
-- Shandong Ande (Consumables)
('Disposable Syringes 5ml', 'Box of 100', '6010234567890', 'SAH-SYR-5ML', '54b0e0b1-1f3c-4c23-8fee-28219826244a', 'f0ec8436-0c73-4cd6-86c1-e7c4dc55b055', 'box', 650.00, 500, 100, 'consumable', 'active'),
('Hypodermic Needles 21G', 'Box of 100', '6010234567891', 'SAH-NDL-21G', '54b0e0b1-1f3c-4c23-8fee-28219826244a', 'f0ec8436-0c73-4cd6-86c1-e7c4dc55b055', 'box', 350.00, 400, 80, 'consumable', 'active'),
('Infusion Set (Adult)', 'Sterile, single use', '6010234567892', 'SAH-INF-ADL', '54b0e0b1-1f3c-4c23-8fee-28219826244a', 'f0ec8436-0c73-4cd6-86c1-e7c4dc55b055', 'piece', 85.00, 1000, 200, 'consumable', 'active'),
-- Abbott (Diagnostics)
('HbA1c Test Kit', 'Afinion, 15 tests/box', '6011234567890', 'ABT-HBA1C-15', '0b2146e8-e746-44d1-8d49-05641ce8d34c', 'e7f648d4-2ba1-4235-8288-18593d29603b', 'box', 12000.00, 20, 5, 'laboratory', 'active'),
('i-STAT CG4+ Cartridge', 'Box of 25', '6011234567891', 'ABT-IST-CG4', '0b2146e8-e746-44d1-8d49-05641ce8d34c', 'e7f648d4-2ba1-4235-8288-18593d29603b', 'box', 28000.00, 10, 3, 'laboratory', 'active'),
-- Tiankang Medical (IV Sets & Syringes)
('Blood Transfusion Set', 'Sterile, with filter', '6012234567890', 'TKM-BTS-01', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '8d83c1da-0e95-4dda-acc0-e25571cf685a', 'piece', 120.00, 300, 60, 'consumable', 'active'),
('Scalp Vein Set 23G (Butterfly)', 'Box of 100', '6012234567891', 'TKM-SVS-23G', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '8d83c1da-0e95-4dda-acc0-e25571cf685a', 'box', 450.00, 200, 40, 'consumable', 'active'),
-- 3M Kenya (Medical & Surgical)
('Micropore Surgical Tape 1 inch', 'Roll, hypoallergenic', '6013234567890', '3MK-MPT-1IN', 'fa06434f-fc1f-4999-94ff-c8871474de4f', '5be0bc9c-ea5e-48cf-a536-8e537cfe5376', 'roll', 280.00, 300, 60, 'surgical', 'active'),
('Tegaderm Transparent Dressing', 'Box of 50', '6013234567891', '3MK-TGD-50', 'fa06434f-fc1f-4999-94ff-c8871474de4f', '5be0bc9c-ea5e-48cf-a536-8e537cfe5376', 'box', 3200.00, 40, 10, 'surgical', 'active'),
('Steri-Strip Wound Closures', 'Pack of 50', '6013234567892', '3MK-STR-50', 'fa06434f-fc1f-4999-94ff-c8871474de4f', '5be0bc9c-ea5e-48cf-a536-8e537cfe5376', 'pack', 1800.00, 60, 15, 'surgical', 'active'),
-- Ottobock (Prosthetics & Orthotics)
('Below-Knee Prosthesis Kit', 'Modular, adjustable', '6014234567890', 'OBK-BKP-01', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '5633a5f9-dcbd-4d5b-af71-bed9982e7cc6', 'set', 85000.00, 3, 1, 'equipment', 'active'),
('Wheelchair (Standard, Folding)', 'Steel frame, 18 inch seat', '6014234567891', 'OBK-WCH-STD', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '5633a5f9-dcbd-4d5b-af71-bed9982e7cc6', 'piece', 18000.00, 10, 3, 'equipment', 'active'),
-- Johnson & Johnson (Pharma & Surgical)
('Ethicon Vicryl Suture 3-0', 'Box of 12, absorbable', '6015234567890', 'JNJ-VIC-30', 'fa06434f-fc1f-4999-94ff-c8871474de4f', '6916a0c4-dfd3-4b77-9cf8-eed40cd81583', 'box', 4500.00, 50, 10, 'surgical', 'active'),
('Band-Aid Advanced Healing', 'Box of 10, hydrocolloid', '6015234567891', 'JNJ-BAH-10', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '6916a0c4-dfd3-4b77-9cf8-eed40cd81583', 'box', 650.00, 100, 20, 'consumable', 'active'),
-- Pfizer (Pharmaceuticals)
('Azithromycin 500mg Tablets', 'Box of 30', '6016234567890', 'PFE-AZI-500', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '9bd3e40d-ee80-49f3-89d0-16a09b066828', 'box', 950.00, 100, 20, 'pharmaceutical', 'active'),
('Atorvastatin 20mg Tablets', 'Box of 30', '6016234567891', 'PFE-ATV-20', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '9bd3e40d-ee80-49f3-89d0-16a09b066828', 'box', 450.00, 150, 30, 'pharmaceutical', 'active'),
-- Novartis
('Diclofenac Sodium 50mg', 'Box of 100', '6017234567890', 'NVS-DIC-50', '2d4c2258-013d-4ab8-9018-8b12bea1359a', 'ed146ec2-a26b-4367-a628-2fffd5ac566f', 'box', 180.00, 200, 40, 'pharmaceutical', 'active'),
('Valsartan 80mg Tablets', 'Box of 28', '6017234567891', 'NVS-VAL-80', '2d4c2258-013d-4ab8-9018-8b12bea1359a', 'ed146ec2-a26b-4367-a628-2fffd5ac566f', 'box', 520.00, 80, 15, 'pharmaceutical', 'active'),
-- GSK
('Augmentin 625mg Tablets', 'Box of 14', '6018234567890', 'GSK-AUG-625', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '3bae6515-54cb-4df2-a954-a232fa4314a1', 'box', 850.00, 120, 25, 'pharmaceutical', 'active'),
('Ventolin Inhaler 100mcg', 'MDI, 200 doses', '6018234567891', 'GSK-VEN-100', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '3bae6515-54cb-4df2-a954-a232fa4314a1', 'piece', 650.00, 60, 15, 'pharmaceutical', 'active'),
-- Roche (Diagnostics & Pharma)
('Cobas HBsAg II Test', 'Box of 100 tests', '6019234567890', 'ROC-HBS-100', '0b2146e8-e746-44d1-8d49-05641ce8d34c', '871265f4-283c-4519-9b0f-ca8c036b4082', 'box', 15000.00, 15, 5, 'laboratory', 'active'),
('Accu-Chek Active Strips', 'Box of 50', '6019234567891', 'ROC-ACH-50', '0b2146e8-e746-44d1-8d49-05641ce8d34c', '871265f4-283c-4519-9b0f-ca8c036b4082', 'box', 2800.00, 80, 20, 'laboratory', 'active'),
-- Bayer
('Aspirin Cardio 100mg', 'Box of 28', '6020234567890', 'BAY-ASP-100', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '61050436-d5f6-42c8-89a1-2392ac857330', 'box', 180.00, 300, 60, 'pharmaceutical', 'active'),
('Ciproxin 500mg Tablets', 'Box of 10', '6020234567891', 'BAY-CIP-500', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '61050436-d5f6-42c8-89a1-2392ac857330', 'box', 650.00, 80, 15, 'pharmaceutical', 'active'),
-- Medtronic (Medical Devices)
('Cardiac Pacemaker (Dual-Chamber)', 'Implantable, MRI compatible', '6021234567890', 'MDT-CPM-DC', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '884d69ae-4000-4963-9ce8-99a5b48db5a3', 'piece', 450000.00, 2, 1, 'equipment', 'active'),
('Pulse Oximeter (Fingertip)', 'Digital, portable', '6021234567891', 'MDT-POX-FT', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '884d69ae-4000-4963-9ce8-99a5b48db5a3', 'piece', 4500.00, 25, 5, 'equipment', 'active'),
('Insulin Pump System', 'MiniMed, with supplies', '6021234567892', 'MDT-INP-MM', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '884d69ae-4000-4963-9ce8-99a5b48db5a3', 'set', 280000.00, 3, 1, 'equipment', 'active'),
-- GE Healthcare (Imaging)
('Portable Ultrasound System', 'LOGIQ e, with probes', '6022234567890', 'GEH-USG-LGE', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '7b6151a7-5cea-47de-9653-14e4495eab6f', 'piece', 3500000.00, 2, 1, 'equipment', 'active'),
('ECG Machine (12-Lead)', 'MAC 2000, portable', '6022234567891', 'GEH-ECG-12L', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '7b6151a7-5cea-47de-9653-14e4495eab6f', 'piece', 450000.00, 3, 1, 'equipment', 'active'),
-- Siemens Healthineers
('CT Scanner (16-Slice)', 'SOMATOM go.Now', '6023234567890', 'SHN-CTS-16', 'b99f6245-fda7-4fae-8616-380806c8aecd', '1abeeadb-4858-4a26-ad77-7e5b3290f5bf', 'piece', 45000000.00, 1, 1, 'equipment', 'active'),
('Hematology Analyzer', 'ADVIA 360, automated', '6023234567891', 'SHN-HEM-360', '0b2146e8-e746-44d1-8d49-05641ce8d34c', '1abeeadb-4858-4a26-ad77-7e5b3290f5bf', 'piece', 2800000.00, 1, 1, 'equipment', 'active'),
-- Philips Healthcare
('Defibrillator (AED)', 'HeartStart FRx, portable', '6024234567890', 'PHC-AED-FRX', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '271f7a31-e155-4bdb-9708-f2e1b40c1afb', 'piece', 180000.00, 4, 2, 'equipment', 'active'),
('Ventilator (ICU Grade)', 'Trilogy EVO, multi-mode', '6024234567891', 'PHC-VNT-EVO', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '271f7a31-e155-4bdb-9708-f2e1b40c1afb', 'piece', 2500000.00, 3, 1, 'equipment', 'active'),
('Patient Monitor (7-Parameter)', 'IntelliVue MX40', '6024234567892', 'PHC-PMN-7P', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '271f7a31-e155-4bdb-9708-f2e1b40c1afb', 'piece', 350000.00, 5, 2, 'equipment', 'active'),
-- Becton Dickinson (BD)
('BD Vacutainer Blood Collection Tubes (EDTA)', 'Box of 100', '6025234567890', 'BDX-VCT-EDTA', '0b2146e8-e746-44d1-8d49-05641ce8d34c', '41dd84a9-2b9e-4220-bc54-e68cd939fec6', 'box', 2200.00, 150, 30, 'laboratory', 'active'),
('BD Catheter (Foley, 16Fr)', 'Sterile, 2-way, silicone', '6025234567891', 'BDX-FCT-16F', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '41dd84a9-2b9e-4220-bc54-e68cd939fec6', 'piece', 350.00, 200, 40, 'consumable', 'active'),
('BD Sharps Container (5L)', 'Puncture resistant', '6025234567892', 'BDX-SHC-5L', 'a7b82f53-4e68-4272-81e0-6f01aaa7b903', '41dd84a9-2b9e-4220-bc54-e68cd939fec6', 'piece', 450.00, 100, 20, 'consumable', 'active'),
-- Shanghai Dahua Medical
('Nebulizer Machine (Compressor)', 'Portable, with mask set', '6026234567890', 'SDM-NBZ-CMP', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '1ec67e3c-8170-4ee6-a61b-6a8e4d8bae19', 'piece', 5500.00, 15, 3, 'equipment', 'active'),
('Suction Machine (Portable)', 'Electric, with canister', '6026234567891', 'SDM-SCT-PRT', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '1ec67e3c-8170-4ee6-a61b-6a8e4d8bae19', 'piece', 25000.00, 5, 2, 'equipment', 'active'),
-- Midken Supplies
('Disposable Face Masks (3-Ply)', 'Box of 50', '6027234567890', 'MKS-FM-3PLY', 'a7b82f53-4e68-4272-81e0-6f01aaa7b903', 'a5872e72-3499-4ea1-974c-6bc9f73e0e7f', 'box', 250.00, 500, 100, 'consumable', 'active'),
('N95 Respirator Masks', 'Box of 20', '6027234567891', 'MKS-N95-20', 'a7b82f53-4e68-4272-81e0-6f01aaa7b903', 'a5872e72-3499-4ea1-974c-6bc9f73e0e7f', 'box', 1200.00, 100, 20, 'consumable', 'active'),
('Surgical Gowns (Disposable)', 'Pack of 10, sterile', '6027234567892', 'MKS-SGN-10', 'a7b82f53-4e68-4272-81e0-6f01aaa7b903', 'a5872e72-3499-4ea1-974c-6bc9f73e0e7f', 'pack', 1800.00, 80, 15, 'consumable', 'active')
ON CONFLICT DO NOTHING;
