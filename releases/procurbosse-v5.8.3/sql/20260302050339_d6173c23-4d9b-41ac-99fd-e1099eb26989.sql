
-- Seed 60+ medical items across all 20 categories
INSERT INTO public.items (name, description, sku, barcode, category_id, supplier_id, unit_of_measure, unit_price, quantity_in_stock, reorder_level, item_type, status, location, batch_number) VALUES
-- Pharmaceuticals (2d4c2258)
('Amoxicillin 500mg Capsules', 'Broad-spectrum antibiotic, box of 100', 'PH-AMX-500', '4901234560001', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '9a2fb3cb-f394-4b8b-b65f-146fb86f9468', 'box', 850, 200, 50, 'pharmaceutical', 'active', 'Pharmacy Store A', 'BN-PH-001'),
('Paracetamol 500mg Tablets', 'Analgesic/antipyretic, box of 1000', 'PH-PCM-500', '4901234560002', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '1022e0cb-8079-43f2-9d64-33d70593020a', 'box', 450, 500, 100, 'pharmaceutical', 'active', 'Pharmacy Store A', 'BN-PH-002'),
('Metformin 500mg Tablets', 'Antidiabetic medication, box of 100', 'PH-MET-500', '4901234560003', '2d4c2258-013d-4ab8-9018-8b12bea1359a', 'f05c94a1-249e-47e0-9d1a-f76ea06f2f04', 'box', 320, 300, 80, 'pharmaceutical', 'active', 'Pharmacy Store A', 'BN-PH-003'),
('Ciprofloxacin 500mg', 'Fluoroquinolone antibiotic, box of 100', 'PH-CPR-500', '4901234560004', '2d4c2258-013d-4ab8-9018-8b12bea1359a', 'e030e246-7267-43a3-b578-4916cf1c89e7', 'box', 1200, 150, 40, 'pharmaceutical', 'active', 'Pharmacy Store B', 'BN-PH-004'),
('Omeprazole 20mg Capsules', 'Proton pump inhibitor, box of 100', 'PH-OMP-020', '4901234560005', '2d4c2258-013d-4ab8-9018-8b12bea1359a', 'd763637d-435a-4a2e-ad72-f1e079718584', 'box', 680, 250, 60, 'pharmaceutical', 'active', 'Pharmacy Store A', 'BN-PH-005'),

-- Medical Consumables (54b0e0b1)
('Disposable Syringes 5ml', 'Luer lock, sterile, box of 100', 'MC-SYR-005', '4901234560010', '54b0e0b1-1f3c-4c23-8fee-28219826244a', 'f0ec8436-0c73-4cd6-86c1-e7c4dc55b055', 'box', 750, 400, 100, 'consumable', 'active', 'Main Store', 'BN-MC-001'),
('IV Cannula 20G', 'Intravenous catheter, box of 50', 'MC-IVC-020', '4901234560011', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '41dd84a9-2b9e-4220-bc54-e68cd939fec6', 'box', 2500, 200, 50, 'consumable', 'active', 'Main Store', 'BN-MC-002'),
('Cotton Wool 500g', 'Absorbent cotton wool roll', 'MC-CTW-500', '4901234560012', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '1022e0cb-8079-43f2-9d64-33d70593020a', 'roll', 350, 300, 80, 'consumable', 'active', 'Main Store', 'BN-MC-003'),
('Examination Gloves (L)', 'Nitrile, powder-free, box of 100', 'MC-GLV-LRG', '4901234560013', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '4ba35219-72e1-4310-83ab-3dd8c0171556', 'box', 1200, 600, 150, 'consumable', 'active', 'Main Store', 'BN-MC-004'),

-- Medical Equipment (53278e2d)
('Patient Monitor 5-Para', 'Multi-parameter bedside monitor', 'ME-PMN-005', '4901234560020', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '768f3956-1ff9-432f-b63c-e3f9a9e6fc04', 'piece', 450000, 8, 2, 'equipment', 'active', 'Biomedical Dept', 'BN-ME-001'),
('Infusion Pump IV', 'Volumetric infusion pump', 'ME-INP-001', '4901234560021', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', 'af1d8672-c871-45f4-9766-08f1b6c35849', 'piece', 280000, 12, 3, 'equipment', 'active', 'Biomedical Dept', 'BN-ME-002'),
('Pulse Oximeter Fingertip', 'Portable SpO2 sensor', 'ME-POX-001', '4901234560022', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '76d9b8c6-7287-431e-b0e1-ef4e0d0181e4', 'piece', 8500, 30, 10, 'equipment', 'active', 'Main Store', 'BN-ME-003'),

-- Laboratory Reagents (0b2146e8)
('Complete Blood Count Reagent', 'Hematology analyzer reagent, 500ml', 'LR-CBC-500', '4901234560030', '0b2146e8-e746-44d1-8d49-05641ce8d34c', '0ac49ce1-3812-407a-b3ef-8914a320d6b1', 'bottle', 18500, 25, 5, 'laboratory', 'active', 'Lab Store', 'BN-LR-001'),
('Rapid Malaria Test Kit', 'RDT HRP2/pLDH combo, box of 25', 'LR-MAL-025', '4901234560031', '0b2146e8-e746-44d1-8d49-05641ce8d34c', '5058c619-e75f-4ef7-8afc-9275035d083f', 'box', 4500, 100, 30, 'laboratory', 'active', 'Lab Store', 'BN-LR-002'),
('HIV Rapid Test Kit', 'Determine HIV-1/2 Ag/Ab, box of 100', 'LR-HIV-100', '4901234560032', '0b2146e8-e746-44d1-8d49-05641ce8d34c', '0ac49ce1-3812-407a-b3ef-8914a320d6b1', 'box', 12000, 50, 15, 'laboratory', 'active', 'Lab Store', 'BN-LR-003'),
('Urine Dipstick 10-Para', 'Urinalysis test strips, bottle of 100', 'LR-URN-100', '4901234560033', '0b2146e8-e746-44d1-8d49-05641ce8d34c', 'b2f3c376-7c75-43ef-8195-e8cc775805a9', 'bottle', 3200, 80, 20, 'laboratory', 'active', 'Lab Store', 'BN-LR-004'),

-- Surgical Instruments (fa06434f)
('Surgical Blade No. 11', 'Sterile carbon steel, box of 100', 'SI-BLD-011', '4901234560040', 'fa06434f-fc1f-4999-94ff-c8871474de4f', '377210c8-b327-4b5d-a067-4f77a4e4f0c4', 'box', 1800, 100, 25, 'surgical', 'active', 'Theatre Store', 'BN-SI-001'),
('Suture Silk 2-0', 'Non-absorbable braided silk, box of 12', 'SI-SUT-020', '4901234560041', 'fa06434f-fc1f-4999-94ff-c8871474de4f', '377210c8-b327-4b5d-a067-4f77a4e4f0c4', 'box', 3500, 60, 15, 'surgical', 'active', 'Theatre Store', 'BN-SI-002'),
('Surgical Gown Sterile', 'Disposable reinforced, pack of 10', 'SI-GWN-010', '4901234560042', 'fa06434f-fc1f-4999-94ff-c8871474de4f', '4ba35219-72e1-4310-83ab-3dd8c0171556', 'pack', 4200, 80, 20, 'surgical', 'active', 'Theatre Store', 'BN-SI-003'),

-- PPE (a7b82f53)
('N95 Respirator Masks', 'NIOSH approved, box of 20', 'PP-N95-020', '4901234560050', 'a7b82f53-4e68-4272-81e0-6f01aaa7b903', '4ba35219-72e1-4310-83ab-3dd8c0171556', 'box', 2800, 150, 40, 'consumable', 'active', 'PPE Store', 'BN-PP-001'),
('Face Shield Full', 'Anti-fog full-face shield', 'PP-FSH-001', '4901234560051', 'a7b82f53-4e68-4272-81e0-6f01aaa7b903', '4ba35219-72e1-4310-83ab-3dd8c0171556', 'piece', 450, 200, 50, 'consumable', 'active', 'PPE Store', 'BN-PP-002'),
('Coveralls Disposable', 'Full body protective, pack of 5', 'PP-COV-005', '4901234560052', 'a7b82f53-4e68-4272-81e0-6f01aaa7b903', '1022e0cb-8079-43f2-9d64-33d70593020a', 'pack', 3500, 100, 30, 'consumable', 'active', 'PPE Store', 'BN-PP-003'),

-- Radiology Supplies (b99f6245)
('X-Ray Film 14x17', 'Green-sensitive, box of 100', 'RD-XRF-014', '4901234560060', 'b99f6245-fda7-4fae-8616-380806c8aecd', 'a56aae0a-8c36-4e4b-9fb6-c83d43939801', 'box', 28000, 15, 5, 'consumable', 'active', 'Radiology Store', 'BN-RD-001'),
('Ultrasound Gel 5L', 'Hypoallergenic coupling gel', 'RD-USG-005', '4901234560061', 'b99f6245-fda7-4fae-8616-380806c8aecd', '76d9b8c6-7287-431e-b0e1-ef4e0d0181e4', 'bottle', 2200, 40, 10, 'consumable', 'active', 'Radiology Store', 'BN-RD-002'),
('CT Contrast Media 100ml', 'Iohexol injection 350mg/ml', 'RD-CTM-100', '4901234560062', 'b99f6245-fda7-4fae-8616-380806c8aecd', '768f3956-1ff9-432f-b63c-e3f9a9e6fc04', 'bottle', 8500, 20, 5, 'pharmaceutical', 'active', 'Radiology Store', 'BN-RD-003'),

-- ICT Equipment (76bb4003)
('Desktop Computer i5', 'Intel i5 8GB RAM 256GB SSD', 'IT-DPC-I05', '4901234560070', '76bb4003-6d95-4f05-a936-1738b09e9251', '768f3956-1ff9-432f-b63c-e3f9a9e6fc04', 'piece', 85000, 10, 3, 'equipment', 'active', 'ICT Store', 'BN-IT-001'),
('Network Switch 24-Port', 'Managed Gigabit PoE switch', 'IT-NSW-024', '4901234560071', '76bb4003-6d95-4f05-a936-1738b09e9251', '768f3956-1ff9-432f-b63c-e3f9a9e6fc04', 'piece', 45000, 5, 2, 'equipment', 'active', 'ICT Store', 'BN-IT-002'),
('UPS 1500VA', 'Line interactive UPS', 'IT-UPS-150', '4901234560072', '76bb4003-6d95-4f05-a936-1738b09e9251', '768f3956-1ff9-432f-b63c-e3f9a9e6fc04', 'piece', 18000, 8, 3, 'equipment', 'active', 'ICT Store', 'BN-IT-003'),

-- Office Supplies (61dcb6ff)
('A4 Printing Paper', 'White 80gsm, ream of 500', 'OF-A4P-500', '4901234560080', '61dcb6ff-23cb-44da-adc6-7880ce59f12a', '1022e0cb-8079-43f2-9d64-33d70593020a', 'ream', 550, 200, 50, 'consumable', 'active', 'Admin Store', 'BN-OF-001'),
('Toner Cartridge HP 05A', 'Black laser toner', 'OF-TNR-05A', '4901234560081', '61dcb6ff-23cb-44da-adc6-7880ce59f12a', '768f3956-1ff9-432f-b63c-e3f9a9e6fc04', 'piece', 4500, 15, 5, 'consumable', 'active', 'Admin Store', 'BN-OF-002'),

-- Cleaning Supplies (90e4da72)
('Chlorine Bleach 5L', 'Sodium hypochlorite 3.5%', 'CL-CLR-005', '4901234560090', '90e4da72-a61b-4a62-90f4-3a1fd796ab6e', '1022e0cb-8079-43f2-9d64-33d70593020a', 'bottle', 350, 100, 30, 'consumable', 'active', 'Housekeeping Store', 'BN-CL-001'),
('Hand Sanitizer 500ml', '70% ethanol-based', 'CL-HSN-500', '4901234560091', '90e4da72-a61b-4a62-90f4-3a1fd796ab6e', '1022e0cb-8079-43f2-9d64-33d70593020a', 'bottle', 280, 300, 80, 'consumable', 'active', 'Housekeeping Store', 'BN-CL-002'),
('Biohazard Waste Bags', 'Red, 60L, pack of 50', 'CL-BWB-060', '4901234560092', '90e4da72-a61b-4a62-90f4-3a1fd796ab6e', '1022e0cb-8079-43f2-9d64-33d70593020a', 'pack', 1200, 80, 20, 'consumable', 'active', 'Housekeeping Store', 'BN-CL-003'),

-- Dental Supplies (5e19e695)
('Dental Composite Resin', 'Light-cure A2 shade, 4g syringe', 'DN-DCR-A02', '4901234560100', '5e19e695-997e-47d9-ba6a-9a367f72b1be', '377210c8-b327-4b5d-a067-4f77a4e4f0c4', 'piece', 4200, 20, 5, 'consumable', 'active', 'Dental Store', 'BN-DN-001'),
('Dental Extraction Forceps', 'Upper molar forceps No. 18', 'DN-DEF-018', '4901234560101', '5e19e695-997e-47d9-ba6a-9a367f72b1be', '377210c8-b327-4b5d-a067-4f77a4e4f0c4', 'piece', 6500, 10, 3, 'surgical', 'active', 'Dental Store', 'BN-DN-002'),

-- Electrical Supplies (1bb7e8ed)
('LED Panel Light 60x60cm', '48W daylight ceiling panel', 'EL-LED-060', '4901234560110', '1bb7e8ed-5295-47f3-b838-eae22f4dd363', '768f3956-1ff9-432f-b63c-e3f9a9e6fc04', 'piece', 3500, 30, 10, 'equipment', 'active', 'Maintenance Store', 'BN-EL-001'),
('Circuit Breaker 32A', 'Single pole MCB', 'EL-MCB-032', '4901234560111', '1bb7e8ed-5295-47f3-b838-eae22f4dd363', '768f3956-1ff9-432f-b63c-e3f9a9e6fc04', 'piece', 850, 20, 5, 'consumable', 'active', 'Maintenance Store', 'BN-EL-002'),

-- Engineering & Maintenance (fcf2fd68)
('Oxygen Regulator', 'Medical oxygen flow regulator 0-15 LPM', 'EM-OXR-015', '4901234560120', 'fcf2fd68-eb29-4ee0-a90c-cdf78bc6ac78', 'af1d8672-c871-45f4-9766-08f1b6c35849', 'piece', 12000, 15, 5, 'equipment', 'active', 'Biomedical Dept', 'BN-EM-001'),
('Suction Machine Portable', 'Electric surgical suction', 'EM-SUC-001', '4901234560121', 'fcf2fd68-eb29-4ee0-a90c-cdf78bc6ac78', 'af1d8672-c871-45f4-9766-08f1b6c35849', 'piece', 65000, 5, 2, 'equipment', 'active', 'Biomedical Dept', 'BN-EM-002'),

-- Furniture & Fittings (d44c588b)
('Hospital Bed Manual 2-Crank', 'Steel frame with mattress', 'FF-HBM-002', '4901234560130', 'd44c588b-0c60-4ef7-9719-dd14b35f8304', '266493ac-5c58-49a5-bbb5-caec0a26d740', 'piece', 45000, 20, 5, 'equipment', 'active', 'Furniture Store', 'BN-FF-001'),
('Bedside Locker', 'Steel with drawer and cupboard', 'FF-BSL-001', '4901234560131', 'd44c588b-0c60-4ef7-9719-dd14b35f8304', '266493ac-5c58-49a5-bbb5-caec0a26d740', 'piece', 8500, 30, 10, 'equipment', 'active', 'Furniture Store', 'BN-FF-002'),
('Patient Wheelchair Standard', 'Foldable chrome-plated', 'FF-WCH-001', '4901234560132', 'd44c588b-0c60-4ef7-9719-dd14b35f8304', '5633a5f9-dcbd-4d5b-af71-bed9982e7cc6', 'piece', 22000, 10, 3, 'equipment', 'active', 'Furniture Store', 'BN-FF-003'),

-- Linen & Textiles (c18c6454)
('Bed Sheets White', 'Cotton 200TC, standard hospital', 'LT-BSW-001', '4901234560140', 'c18c6454-449a-4a5c-924f-db830a4f2d36', '1022e0cb-8079-43f2-9d64-33d70593020a', 'piece', 1200, 100, 30, 'consumable', 'active', 'Linen Store', 'BN-LT-001'),
('Patient Gown Cotton', 'Standard hospital gown', 'LT-PGN-001', '4901234560141', 'c18c6454-449a-4a5c-924f-db830a4f2d36', '1022e0cb-8079-43f2-9d64-33d70593020a', 'piece', 800, 150, 40, 'consumable', 'active', 'Linen Store', 'BN-LT-002'),
('Surgical Drape Sterile', 'Disposable, pack of 10', 'LT-SDR-010', '4901234560142', 'c18c6454-449a-4a5c-924f-db830a4f2d36', '4ba35219-72e1-4310-83ab-3dd8c0171556', 'pack', 3800, 60, 15, 'surgical', 'active', 'Theatre Store', 'BN-LT-003'),

-- Catering Supplies (a8e8fbf7)
('Disposable Food Containers', 'Biodegradable 3-compartment, pack of 100', 'CS-DFC-100', '4901234560150', 'a8e8fbf7-f001-4420-8b9e-609b98200c83', '1022e0cb-8079-43f2-9d64-33d70593020a', 'pack', 2500, 50, 15, 'consumable', 'active', 'Kitchen Store', 'BN-CS-001'),
('Kitchen Sanitizer 5L', 'Food-grade surface sanitizer', 'CS-KSN-005', '4901234560151', 'a8e8fbf7-f001-4420-8b9e-609b98200c83', '1022e0cb-8079-43f2-9d64-33d70593020a', 'bottle', 850, 30, 10, 'consumable', 'active', 'Kitchen Store', 'BN-CS-002'),

-- Plumbing Supplies (e3ab2f87)
('PVC Pipe 3inch 6M', 'Pressure class, 6-meter length', 'PL-PVC-036', '4901234560160', 'e3ab2f87-20db-4a14-abd1-551c5c3af2f3', '768f3956-1ff9-432f-b63c-e3f9a9e6fc04', 'piece', 1800, 20, 5, 'consumable', 'active', 'Maintenance Store', 'BN-PL-001'),
('Ball Valve 1inch Brass', 'Heavy-duty quarter turn', 'PL-BVL-001', '4901234560161', 'e3ab2f87-20db-4a14-abd1-551c5c3af2f3', '768f3956-1ff9-432f-b63c-e3f9a9e6fc04', 'piece', 650, 15, 5, 'consumable', 'active', 'Maintenance Store', 'BN-PL-002'),

-- Security Equipment (5bd29139)
('CCTV Camera IP 2MP', 'PoE dome camera, night vision', 'SE-CTV-002', '4901234560170', '5bd29139-4fdf-4e1e-a5aa-f3121b801ffd', '768f3956-1ff9-432f-b63c-e3f9a9e6fc04', 'piece', 15000, 10, 3, 'equipment', 'active', 'ICT Store', 'BN-SE-001'),
('Fire Extinguisher 6kg', 'ABC powder type', 'SE-FEX-006', '4901234560171', '5bd29139-4fdf-4e1e-a5aa-f3121b801ffd', '768f3956-1ff9-432f-b63c-e3f9a9e6fc04', 'piece', 4500, 20, 5, 'equipment', 'active', 'Security Store', 'BN-SE-002'),

-- Stationery & Printing (752cf307)
('Stamp Pad Ink 30ml', 'Blue stamp pad refill', 'SP-SPI-030', '4901234560180', '752cf307-d1fd-43b3-b4c3-170945431ff7', '1022e0cb-8079-43f2-9d64-33d70593020a', 'bottle', 180, 50, 15, 'consumable', 'active', 'Admin Store', 'BN-SP-001'),
('Lever Arch File A4', 'Board cover, box of 10', 'SP-LAF-A04', '4901234560181', '752cf307-d1fd-43b3-b4c3-170945431ff7', '1022e0cb-8079-43f2-9d64-33d70593020a', 'box', 2200, 30, 10, 'consumable', 'active', 'Admin Store', 'BN-SP-002'),
('Printer Paper Roll 80mm', 'Thermal receipt paper, box of 50', 'SP-TPR-080', '4901234560182', '752cf307-d1fd-43b3-b4c3-170945431ff7', '768f3956-1ff9-432f-b63c-e3f9a9e6fc04', 'box', 3500, 20, 5, 'consumable', 'active', 'Admin Store', 'BN-SP-003'),

-- Transport & Vehicle (b2bfdabc)
('Engine Oil 5W-30 5L', 'Synthetic motor oil', 'TV-EOL-005', '4901234560190', 'b2bfdabc-b664-40bd-a781-980a7373a570', '768f3956-1ff9-432f-b63c-e3f9a9e6fc04', 'bottle', 3200, 20, 5, 'consumable', 'active', 'Transport Yard', 'BN-TV-001'),
('First Aid Kit Vehicle', 'Complete vehicle emergency kit', 'TV-FAK-001', '4901234560191', 'b2bfdabc-b664-40bd-a781-980a7373a570', '1022e0cb-8079-43f2-9d64-33d70593020a', 'piece', 4500, 10, 3, 'consumable', 'active', 'Transport Yard', 'BN-TV-002'),

-- More Pharmaceuticals
('Diazepam 5mg Injection', 'Benzodiazepine, box of 100 ampoules', 'PH-DZP-005', '4901234560200', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '9a2fb3cb-f394-4b8b-b65f-146fb86f9468', 'box', 5500, 40, 10, 'pharmaceutical', 'active', 'Pharmacy Store B', 'BN-PH-006'),
('Normal Saline 500ml', '0.9% NaCl IV solution', 'PH-NSL-500', '4901234560201', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '74796192-6464-4069-aad7-4b300b752fff', 'bottle', 120, 1000, 200, 'pharmaceutical', 'active', 'Pharmacy Store A', 'BN-PH-007'),
('Adrenaline 1mg Injection', 'Epinephrine, box of 10 ampoules', 'PH-ADR-001', '4901234560202', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '9a2fb3cb-f394-4b8b-b65f-146fb86f9468', 'box', 2800, 60, 15, 'pharmaceutical', 'active', 'Emergency Store', 'BN-PH-008'),

-- More Lab items
('Blood Grouping Reagent Anti-A', '10ml vial', 'LR-BGA-010', '4901234560210', '0b2146e8-e746-44d1-8d49-05641ce8d34c', 'b2f3c376-7c75-43ef-8195-e8cc775805a9', 'vial', 3500, 30, 10, 'laboratory', 'active', 'Lab Store', 'BN-LR-005'),
('Pregnancy Test Kit', 'HCG urine strip, box of 50', 'LR-PTK-050', '4901234560211', '0b2146e8-e746-44d1-8d49-05641ce8d34c', '5058c619-e75f-4ef7-8afc-9275035d083f', 'box', 2800, 60, 15, 'laboratory', 'active', 'Lab Store', 'BN-LR-006'),

-- More Medical Equipment
('Nebulizer Compressor', 'Air compressor nebulizer machine', 'ME-NBZ-001', '4901234560220', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '76d9b8c6-7287-431e-b0e1-ef4e0d0181e4', 'piece', 15000, 12, 3, 'equipment', 'active', 'Main Store', 'BN-ME-004'),
('Defibrillator AED', 'Automated external defibrillator', 'ME-AED-001', '4901234560221', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', 'af1d8672-c871-45f4-9766-08f1b6c35849', 'piece', 350000, 4, 1, 'equipment', 'active', 'Emergency Dept', 'BN-ME-005'),
('Autoclave 50L', 'Vertical steam sterilizer', 'ME-ACL-050', '4901234560222', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', 'a56aae0a-8c36-4e4b-9fb6-c83d43939801', 'piece', 180000, 3, 1, 'equipment', 'active', 'CSSD', 'BN-ME-006')

ON CONFLICT DO NOTHING;
