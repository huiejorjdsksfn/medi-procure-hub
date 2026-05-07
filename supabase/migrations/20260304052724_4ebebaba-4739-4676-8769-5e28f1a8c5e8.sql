
-- Seed 55 more medical items across all 20 categories
INSERT INTO items (name, sku, item_type, category_id, supplier_id, unit_price, quantity_in_stock, reorder_level, unit_of_measure, location, status) VALUES
-- Pharmaceuticals (6)
('Metformin 500mg Tablets', 'PH-MET500', 'pharmaceutical', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '1022e0cb-8079-43f2-9d64-33d70593020a', 850, 200, 50, 'box', 'Pharmacy Store A', 'active'),
('Ciprofloxacin 500mg Tabs', 'PH-CIP500', 'pharmaceutical', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '74796192-6464-4069-aad7-4b300b752fff', 420, 150, 30, 'box', 'Pharmacy Store A', 'active'),
('Diclofenac 50mg Tablets', 'PH-DIC050', 'pharmaceutical', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '3bae6515-54cb-4df2-a954-a232fa4314a1', 280, 300, 60, 'box', 'Pharmacy Store A', 'active'),
('Omeprazole 20mg Capsules', 'PH-OME020', 'pharmaceutical', '2d4c2258-013d-4ab8-9018-8b12bea1359a', 'ed146ec2-a26b-4367-a628-2fffd5ac566f', 650, 180, 40, 'box', 'Pharmacy Store B', 'active'),
('Ceftriaxone 1g Injection', 'PH-CEF001', 'pharmaceutical', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '9bd3e40d-ee80-49f3-89d0-16a09b066828', 1200, 100, 25, 'vial', 'Pharmacy Store B', 'active'),
('Insulin Glargine 100IU/ml', 'PH-INS100', 'pharmaceutical', '2d4c2258-013d-4ab8-9018-8b12bea1359a', 'ed146ec2-a26b-4367-a628-2fffd5ac566f', 3500, 50, 15, 'vial', 'Cold Chain Store', 'active'),
-- Medical Consumables (6)
('IV Cannula 18G', 'MC-IVC018', 'consumable', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '41dd84a9-2b9e-4220-bc54-e68cd939fec6', 45, 500, 100, 'piece', 'Consumables Store', 'active'),
('Surgical Gloves Sterile 7.5', 'MC-GLV075', 'consumable', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '4ba35219-72e1-4310-83ab-3dd8c0171556', 85, 400, 100, 'pair', 'Consumables Store', 'active'),
('Gauze Swabs 10x10cm', 'MC-GAU100', 'consumable', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '6916a0c4-dfd3-4b77-9cf8-eed40cd81583', 320, 250, 50, 'pack', 'Consumables Store', 'active'),
('Cotton Wool 500g', 'MC-COT500', 'consumable', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '1022e0cb-8079-43f2-9d64-33d70593020a', 450, 120, 30, 'roll', 'Consumables Store', 'active'),
('Adhesive Plaster 2.5cm', 'MC-ADP025', 'consumable', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '4ba35219-72e1-4310-83ab-3dd8c0171556', 180, 200, 40, 'roll', 'Consumables Store', 'active'),
('Urinary Catheter 16Fr', 'MC-UCT016', 'consumable', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '41dd84a9-2b9e-4220-bc54-e68cd939fec6', 350, 80, 20, 'piece', 'Consumables Store', 'active'),
-- Laboratory (5)
('Blood Collection Tubes EDTA', 'LB-BCT-ED', 'laboratory', '0b2146e8-e746-44d1-8d49-05641ce8d34c', '41dd84a9-2b9e-4220-bc54-e68cd939fec6', 25, 1000, 200, 'piece', 'Lab Store', 'active'),
('Microscope Slides Frosted', 'LB-MSF001', 'laboratory', '0b2146e8-e746-44d1-8d49-05641ce8d34c', 'e7f648d4-2ba1-4235-8288-18593d29603b', 15, 2000, 500, 'piece', 'Lab Store', 'active'),
('Rapid Malaria Test Kits', 'LB-RMT001', 'laboratory', '0b2146e8-e746-44d1-8d49-05641ce8d34c', '0ac49ce1-3812-407a-b3ef-8914a320d6b1', 120, 500, 100, 'piece', 'Lab Store', 'active'),
('HIV Test Kits Determine', 'LB-HIV001', 'laboratory', '0b2146e8-e746-44d1-8d49-05641ce8d34c', '0ac49ce1-3812-407a-b3ef-8914a320d6b1', 180, 300, 80, 'piece', 'Lab Store', 'active'),
('Urine Dipstick 10-Parameter', 'LB-UDP010', 'laboratory', '0b2146e8-e746-44d1-8d49-05641ce8d34c', '61050436-d5f6-42c8-89a1-2392ac857330', 45, 600, 150, 'piece', 'Lab Store', 'active'),
-- Surgical (5)
('Suture Vicryl 2-0', 'SG-SVR020', 'surgical', 'fa06434f-fc1f-4999-94ff-c8871474de4f', '6916a0c4-dfd3-4b77-9cf8-eed40cd81583', 650, 100, 25, 'piece', 'Theatre Store', 'active'),
('Scalpel Blade No. 11', 'SG-SB011', 'surgical', 'fa06434f-fc1f-4999-94ff-c8871474de4f', '4ba35219-72e1-4310-83ab-3dd8c0171556', 35, 300, 50, 'piece', 'Theatre Store', 'active'),
('Surgical Drapes Sterile', 'SG-SDS001', 'surgical', 'fa06434f-fc1f-4999-94ff-c8871474de4f', '884d69ae-4000-4963-9ce8-99a5b48db5a3', 480, 150, 30, 'piece', 'Theatre Store', 'active'),
('Bone Wax 2.5g', 'SG-BWX025', 'surgical', 'fa06434f-fc1f-4999-94ff-c8871474de4f', '6916a0c4-dfd3-4b77-9cf8-eed40cd81583', 890, 40, 10, 'piece', 'Theatre Store', 'active'),
('Electrosurgical Pencil', 'SG-ESP001', 'surgical', 'fa06434f-fc1f-4999-94ff-c8871474de4f', '884d69ae-4000-4963-9ce8-99a5b48db5a3', 1200, 60, 15, 'piece', 'Theatre Store', 'active'),
-- Equipment (4)
('Pulse Oximeter Fingertip', 'EQ-POX001', 'equipment', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '7b6151a7-5cea-47de-9653-14e4495eab6f', 8500, 20, 5, 'piece', 'Equipment Store', 'active'),
('Digital Thermometer Clinical', 'EQ-DTC001', 'equipment', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '271f7a31-e155-4bdb-9708-f2e1b40c1afb', 2500, 30, 10, 'piece', 'Equipment Store', 'active'),
('Nebulizer Machine', 'EQ-NBZ001', 'equipment', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '271f7a31-e155-4bdb-9708-f2e1b40c1afb', 15000, 8, 3, 'piece', 'Equipment Store', 'active'),
('Wheelchair Standard', 'EQ-WCS001', 'equipment', '53278e2d-4180-4f1c-9f7c-ba1907fbe038', '7b4bab15-c606-437f-aa27-7b83ab79270a', 35000, 10, 3, 'piece', 'Equipment Store', 'active'),
-- PPE (3)
('N95 Respirator Mask', 'PP-N95001', 'consumable', 'a7b82f53-4e68-4272-81e0-6f01aaa7b903', '4ba35219-72e1-4310-83ab-3dd8c0171556', 120, 500, 100, 'piece', 'PPE Store', 'active'),
('Disposable Gown Isolation', 'PP-DGI001', 'consumable', 'a7b82f53-4e68-4272-81e0-6f01aaa7b903', '1022e0cb-8079-43f2-9d64-33d70593020a', 250, 300, 50, 'piece', 'PPE Store', 'active'),
('Face Shield Full Cover', 'PP-FSC001', 'consumable', 'a7b82f53-4e68-4272-81e0-6f01aaa7b903', '4ba35219-72e1-4310-83ab-3dd8c0171556', 180, 200, 40, 'piece', 'PPE Store', 'active'),
-- Radiology (3)
('X-Ray Film 14x17 Green', 'RD-XRF014', 'equipment', 'b99f6245-fda7-4fae-8616-380806c8aecd', '7b6151a7-5cea-47de-9653-14e4495eab6f', 850, 100, 20, 'piece', 'Radiology Store', 'active'),
('Ultrasound Gel 5L', 'RD-USG005', 'consumable', 'b99f6245-fda7-4fae-8616-380806c8aecd', '271f7a31-e155-4bdb-9708-f2e1b40c1afb', 2800, 15, 5, 'bottle', 'Radiology Store', 'active'),
('CT Contrast Media 100ml', 'RD-CTM100', 'pharmaceutical', 'b99f6245-fda7-4fae-8616-380806c8aecd', '61050436-d5f6-42c8-89a1-2392ac857330', 4500, 30, 10, 'bottle', 'Radiology Store', 'active'),
-- Dental (3)
('Dental Composite Resin A2', 'DN-DCR-A2', 'consumable', '5e19e695-997e-47d9-ba6a-9a367f72b1be', '4ba35219-72e1-4310-83ab-3dd8c0171556', 3200, 20, 5, 'piece', 'Dental Store', 'active'),
('Dental Extraction Forceps', 'DN-DEF001', 'surgical', '5e19e695-997e-47d9-ba6a-9a367f72b1be', '884d69ae-4000-4963-9ce8-99a5b48db5a3', 8500, 10, 3, 'piece', 'Dental Store', 'active'),
('Dental Anaesthetic Cartridge', 'DN-DAC001', 'pharmaceutical', '5e19e695-997e-47d9-ba6a-9a367f72b1be', '74796192-6464-4069-aad7-4b300b752fff', 95, 200, 50, 'piece', 'Dental Store', 'active'),
-- Office Supplies (3)
('A4 Paper Ream 80gsm', 'OF-A4P080', 'general', '61dcb6ff-23cb-44da-adc6-7880ce59f12a', 'a5872e72-3499-4ea1-974c-6bc9f73e0e7f', 550, 100, 20, 'ream', 'Admin Store', 'active'),
('Toner Cartridge HP 85A', 'OF-TCH085', 'general', '61dcb6ff-23cb-44da-adc6-7880ce59f12a', 'a5872e72-3499-4ea1-974c-6bc9f73e0e7f', 4500, 15, 5, 'piece', 'Admin Store', 'active'),
('Ballpoint Pens Blue Box 50', 'OF-BPB050', 'general', '61dcb6ff-23cb-44da-adc6-7880ce59f12a', 'a5872e72-3499-4ea1-974c-6bc9f73e0e7f', 650, 30, 10, 'box', 'Admin Store', 'active'),
-- Cleaning Supplies (3)
('Liquid Bleach 5L', 'CL-LBL005', 'general', '90e4da72-a61b-4a62-90f4-3a1fd796ab6e', 'ca181063-1b6b-4686-99a2-48d43e30e323', 350, 50, 10, 'bottle', 'Stores', 'active'),
('Hand Sanitizer 500ml', 'CL-HSA500', 'consumable', '90e4da72-a61b-4a62-90f4-3a1fd796ab6e', '4ba35219-72e1-4310-83ab-3dd8c0171556', 450, 200, 40, 'bottle', 'Stores', 'active'),
('Disinfectant Surface Wipes', 'CL-DSW001', 'consumable', '90e4da72-a61b-4a62-90f4-3a1fd796ab6e', '4ba35219-72e1-4310-83ab-3dd8c0171556', 680, 100, 20, 'pack', 'Stores', 'active'),
-- ICT Equipment (2)
('UPS 1500VA Line Interactive', 'IT-UPS150', 'equipment', '76bb4003-6d95-4f05-a936-1738b09e9251', '266493ac-5c58-49a5-bbb5-caec0a26d740', 25000, 5, 2, 'piece', 'ICT Store', 'active'),
('Network Cable Cat6 305m', 'IT-NC6305', 'general', '76bb4003-6d95-4f05-a936-1738b09e9251', '266493ac-5c58-49a5-bbb5-caec0a26d740', 8500, 8, 3, 'roll', 'ICT Store', 'active'),
-- Linen (2)
('Bed Sheet White Hospital', 'LN-BSW001', 'general', 'c18c6454-449a-4a5c-924f-db830a4f2d36', 'ca181063-1b6b-4686-99a2-48d43e30e323', 1200, 100, 20, 'piece', 'Linen Store', 'active'),
('Patient Gown Reusable', 'LN-PGR001', 'general', 'c18c6454-449a-4a5c-924f-db830a4f2d36', 'ca181063-1b6b-4686-99a2-48d43e30e323', 800, 150, 30, 'piece', 'Linen Store', 'active'),
-- Catering (2)
('Disposable Meal Tray', 'CT-DMT001', 'general', 'a8e8fbf7-f001-4420-8b9e-609b98200c83', 'a5872e72-3499-4ea1-974c-6bc9f73e0e7f', 35, 500, 100, 'piece', 'Kitchen Store', 'active'),
('Surgical Spirit 500ml', 'MC-SSP500', 'consumable', '54b0e0b1-1f3c-4c23-8fee-28219826244a', '74796192-6464-4069-aad7-4b300b752fff', 380, 80, 20, 'bottle', 'Consumables Store', 'active'),
-- Engineering (2)
('Plumbing Fitting Set', 'EN-PFS001', 'general', 'e3ab2f87-20db-4a14-abd1-551c5c3af2f3', 'a5872e72-3499-4ea1-974c-6bc9f73e0e7f', 2500, 15, 5, 'set', 'Workshop Store', 'active'),
('Electrical Circuit Breaker 32A', 'EN-ECB032', 'general', '1bb7e8ed-5295-47f3-b838-eae22f4dd363', 'a5872e72-3499-4ea1-974c-6bc9f73e0e7f', 1800, 20, 5, 'piece', 'Workshop Store', 'active'),
-- Security (1)
('CCTV Camera IP Outdoor', 'SE-CCI001', 'equipment', '5bd29139-4fdf-4e1e-a5aa-f3121b801ffd', '266493ac-5c58-49a5-bbb5-caec0a26d740', 18000, 6, 2, 'piece', 'Security Store', 'active'),
-- Transport (1)
('Engine Oil SAE 20W50 5L', 'TR-EO2050', 'general', 'b2bfdabc-b664-40bd-a781-980a7373a570', 'a5872e72-3499-4ea1-974c-6bc9f73e0e7f', 2200, 12, 4, 'bottle', 'Transport Store', 'active'),
-- Stationery (2)
('Receipt Book Triplicate', 'ST-RBT001', 'general', '752cf307-d1fd-43b3-b4c3-170945431ff7', 'a5872e72-3499-4ea1-974c-6bc9f73e0e7f', 280, 50, 10, 'piece', 'Admin Store', 'active'),
('Stamp Pad Blue', 'ST-SPB001', 'general', '752cf307-d1fd-43b3-b4c3-170945431ff7', 'a5872e72-3499-4ea1-974c-6bc9f73e0e7f', 150, 30, 10, 'piece', 'Admin Store', 'active'),
-- Furniture (1)
('Hospital Bed Manual Crank', 'FN-HBM001', 'equipment', 'd44c588b-0c60-4ef7-9719-dd14b35f8304', '7b4bab15-c606-437f-aa27-7b83ab79270a', 85000, 5, 2, 'piece', 'Equipment Store', 'active'),
-- More Pharmaceuticals (3)
('Azithromycin 500mg Tabs', 'PH-AZI500', 'pharmaceutical', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '9bd3e40d-ee80-49f3-89d0-16a09b066828', 380, 200, 40, 'box', 'Pharmacy Store A', 'active'),
('Paracetamol 500mg Tabs', 'PH-PAR500', 'pharmaceutical', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '1022e0cb-8079-43f2-9d64-33d70593020a', 120, 500, 100, 'box', 'Pharmacy Store A', 'active'),
('ORS Sachets', 'PH-ORS001', 'pharmaceutical', '2d4c2258-013d-4ab8-9018-8b12bea1359a', '1022e0cb-8079-43f2-9d64-33d70593020a', 25, 800, 200, 'piece', 'Pharmacy Store B', 'active');
