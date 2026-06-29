-- EL5 MediProcure v12.0.0 — Hospital Inventory Catalog Seed
-- Uses WHERE NOT EXISTS to avoid constraint issues

-- ── Categories ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  INSERT INTO item_categories (name, description)
  SELECT t.name, t.description FROM (VALUES
    ('IT Equipment',          'Computers, laptops, servers, tablets, phones'),
    ('Printers & Copiers',    'Laser printers, inkjet printers, MFPs, label printers'),
    ('IT Accessories',        'Toners, ink cartridges, cables, USB drives, keyboards, mice'),
    ('Networking Equipment',  'Routers, switches, patch panels, access points, UPS'),
    ('Biomedical Equipment',  'ECG, BP monitors, glucometers, oximeters, infusion pumps'),
    ('Surgical Supplies',     'Sutures, drapes, surgical instruments, implants'),
    ('Medical Supplies',      'Syringes, IV sets, catheters, gloves, bandages'),
    ('Pharmaceuticals',       'Drugs, vaccines, IV fluids, antibiotics, analgesics'),
    ('Laboratory Supplies',   'Reagents, test kits, culture media, slides, specimen containers'),
    ('Radiology Supplies',    'X-ray films, contrast media, developer solutions'),
    ('Dental Supplies',       'Dental instruments, materials, impressions, X-ray films'),
    ('PPE',                   'Masks, gowns, gloves, goggles, face shields, aprons'),
    ('Linen & Bedding',       'Bed sheets, blankets, pillowcases, patient gowns, towels'),
    ('Furniture & Fittings',  'Hospital beds, chairs, tables, lockers, cupboards'),
    ('Housekeeping Supplies', 'Detergents, disinfectants, mops, brooms, bins, bags'),
    ('Stationery & Office',   'Paper, pens, files, folders, notebooks, registers'),
    ('Kitchen & Dietary',     'Cooking equipment, utensils, dietary supplements, food items'),
    ('Mortuary Supplies',     'Body bags, embalming fluids, PPE for mortuary'),
    ('Waste Management',      'Sharps containers, biohazard bags, waste bins, autoclaves'),
    ('Oxygen & Gases',        'Oxygen cylinders, nitrous oxide, medical gas accessories')
  ) AS t(name, description)
  WHERE NOT EXISTS (SELECT 1 FROM item_categories c WHERE c.name = t.name);
END $$;

-- ── Items helper function ────────────────────────────────────────────────────
-- Insert items using category name lookup, skip if code already exists
DO $$ DECLARE cat_id UUID; BEGIN

  -- IT Equipment
  SELECT id INTO cat_id FROM item_categories WHERE name='IT Equipment' LIMIT 1;
  IF cat_id IS NOT NULL THEN
    INSERT INTO items (name,code,description,category_id,unit_of_measure,unit_price,quantity_in_stock,reorder_level,item_type,status)
    SELECT t.* FROM (VALUES
      ('Dell OptiPlex 3080 Desktop Computer','ICT-PC-001','Intel Core i5, 8GB RAM, 256GB SSD, Windows 11 Pro',cat_id,'piece',85000,2,1,'it_equipment','active'),
      ('HP 250 G8 Laptop 15.6"','ICT-LT-001','Intel Core i5-1135G7, 8GB RAM, 512GB SSD, Win11',cat_id,'piece',72000,3,1,'it_equipment','active'),
      ('HP EliteDesk 800 G6 Desktop','ICT-PC-002','Intel Core i7, 16GB RAM, 512GB SSD, Win11 Pro',cat_id,'piece',120000,1,1,'it_equipment','active'),
      ('Samsung Galaxy Tab A8 10.5"','ICT-TB-001','64GB, WiFi, Android 11, for ward rounds',cat_id,'piece',28000,4,2,'it_equipment','active'),
      ('HP E233 23-inch Monitor','ICT-MN-001','Full HD 1920x1080, IPS, VGA+HDMI',cat_id,'piece',18500,5,2,'it_equipment','active'),
      ('Dell 24" Monitor P2422H','ICT-MN-002','Full HD IPS, USB-C, Anti-glare',cat_id,'piece',22000,3,1,'it_equipment','active'),
      ('Samsung Galaxy A34 5G Staff Phone','ICT-PH-001','128GB, staff mobile device',cat_id,'piece',38000,3,1,'it_equipment','active'),
      ('APC UPS 650VA BR650MI','ICT-UP-001','650VA/375W, 4 outlets, USB monitoring',cat_id,'piece',12000,6,2,'it_equipment','active'),
      ('APC UPS 1000VA BX1000M','ICT-UP-002','1000VA/600W, 8 outlets, for servers',cat_id,'piece',22000,2,1,'it_equipment','active'),
      ('APC Smart-UPS 1500VA SMT1500I','ICT-UP-003','Server UPS 1500VA/980W, LCD, USB, AVR',cat_id,'piece',45000,2,1,'it_equipment','active')
    ) AS t(name,code,description,category_id,uom,price,qty,reorder,itype,status)
    WHERE NOT EXISTS (SELECT 1 FROM items x WHERE x.code=t.code);
  END IF;

  -- Printers & Copiers
  SELECT id INTO cat_id FROM item_categories WHERE name='Printers & Copiers' LIMIT 1;
  IF cat_id IS NOT NULL THEN
    INSERT INTO items (name,code,description,category_id,unit_of_measure,unit_price,quantity_in_stock,reorder_level,item_type,status)
    SELECT t.* FROM (VALUES
      ('HP LaserJet Pro M404dn','PRN-HP-001','45ppm, Duplex, LAN, USB, A4 Mono Laser',cat_id,'piece',28500,3,1,'printer','active'),
      ('HP LaserJet Pro M428dw MFP','PRN-HP-002','Print/Scan/Copy, 38ppm, WiFi, Duplex, A4',cat_id,'piece',42000,2,1,'printer','active'),
      ('HP LaserJet Enterprise M507dn','PRN-HP-003','45ppm, Duplex, LAN, high-volume printing',cat_id,'piece',65000,1,1,'printer','active'),
      ('HP Color LaserJet Pro M479dw MFP','PRN-HP-004','Color MFP, Print/Scan/Copy/Fax, WiFi',cat_id,'piece',75000,1,1,'printer','active'),
      ('HP DeskJet 2720 All-in-One','PRN-HP-005','Print/Scan/Copy, WiFi, Inkjet, low volume',cat_id,'piece',7500,5,2,'printer','active'),
      ('Epson L3250 Ink Tank MFP','PRN-EP-001','Print/Scan/Copy, WiFi, 10ppm, EcoTank',cat_id,'piece',16500,4,2,'printer','active'),
      ('Epson L6290 A4 MFP','PRN-EP-002','Print/Scan/Copy/Fax, WiFi, Duplex, EcoTank',cat_id,'piece',28000,2,1,'printer','active'),
      ('Canon PIXMA G3010 MFP','PRN-CN-001','Print/Scan/Copy, WiFi, Refillable ink tank',cat_id,'piece',15000,3,1,'printer','active'),
      ('Canon imageRUNNER 2206N Copier','PRN-CN-002','22ppm, LAN, Duplex, A3/A4 mono copier',cat_id,'piece',95000,1,1,'printer','active'),
      ('Brother HL-L2350DW Laser','PRN-BR-001','32ppm, WiFi, Duplex, compact mono laser',cat_id,'piece',19000,2,1,'printer','active'),
      ('Brother MFC-L2750DW MFP','PRN-BR-002','Print/Scan/Copy/Fax, WiFi, Duplex, ADF',cat_id,'piece',32000,1,1,'printer','active'),
      ('Zebra ZD421 Label Printer','PRN-ZB-001','203dpi, USB/BT/LAN, 4" wide label printer',cat_id,'piece',38000,2,1,'printer','active'),
      ('Zebra GK420d Barcode Printer','PRN-ZB-002','4 in/s, 203dpi, USB, wristband/labels',cat_id,'piece',29000,1,1,'printer','active'),
      ('Ricoh SP 3710DN Laser','PRN-RC-001','37ppm, Duplex, LAN, mono laser',cat_id,'piece',22000,2,1,'printer','active')
    ) AS t(name,code,description,category_id,uom,price,qty,reorder,itype,status)
    WHERE NOT EXISTS (SELECT 1 FROM items x WHERE x.code=t.code);
  END IF;

  -- IT Accessories
  SELECT id INTO cat_id FROM item_categories WHERE name='IT Accessories' LIMIT 1;
  IF cat_id IS NOT NULL THEN
    INSERT INTO items (name,code,description,category_id,unit_of_measure,unit_price,quantity_in_stock,reorder_level,item_type,status)
    SELECT t.* FROM (VALUES
      ('HP 85A Black Toner CF285A','TON-HP-085','For HP LaserJet M1212/P1102, 1600 pages',cat_id,'piece',2800,10,4,'ict_accessory','active'),
      ('HP 12A Black Toner Q2612A','TON-HP-012','For HP 1010/1015/1018/1020, 2000 pages',cat_id,'piece',2600,10,4,'ict_accessory','active'),
      ('HP 26A Black Toner CF226A','TON-HP-026','For HP M402/M426, 3100 pages',cat_id,'piece',5500,8,4,'ict_accessory','active'),
      ('HP 58A Black Toner CF258A','TON-HP-058','For HP M404/M428, 3000 pages',cat_id,'piece',5200,8,4,'ict_accessory','active'),
      ('HP 26X High Yield Toner CF226X','TON-HP-26X','For HP M402/M426, 9000 pages',cat_id,'piece',8500,5,2,'ict_accessory','active'),
      ('HP 83A Black Toner CF283A','TON-HP-083','For HP M125/M127/M201, 1500 pages',cat_id,'piece',2400,10,4,'ict_accessory','active'),
      ('HP 78A Black Toner CE278A','TON-HP-078','For HP P1566/P1606, 2100 pages',cat_id,'piece',2600,8,4,'ict_accessory','active'),
      ('HP 203A Black Toner CF540A','TON-HP-203','For HP M254/M281 Color LaserJet',cat_id,'piece',4500,6,2,'ict_accessory','active'),
      ('Epson 003 Black Ink Bottle','INK-EP-003B','For Epson L3110/L3150/L5190, 65ml',cat_id,'piece',650,20,8,'ict_accessory','active'),
      ('Epson 003 Cyan Ink Bottle','INK-EP-003C','For Epson L3110/L3150/L5190, 65ml',cat_id,'piece',650,15,6,'ict_accessory','active'),
      ('Epson 003 Magenta Ink Bottle','INK-EP-003M','For Epson L3110/L3150/L5190, 65ml',cat_id,'piece',650,15,6,'ict_accessory','active'),
      ('Epson 003 Yellow Ink Bottle','INK-EP-003Y','For Epson L3110/L3150/L5190, 65ml',cat_id,'piece',650,15,6,'ict_accessory','active'),
      ('Canon GI-790 Black Ink','INK-CN-790B','For Canon G1010/G2010/G3010, 90ml',cat_id,'piece',850,12,6,'ict_accessory','active'),
      ('HP 678 Black Ink Cartridge','INK-HP-678B','For HP Ink Advantage 1015/1515/2515',cat_id,'piece',1200,10,4,'ict_accessory','active'),
      ('HP 678 Color Ink Cartridge','INK-HP-678C','For HP Ink Advantage 1015/1515/2515',cat_id,'piece',1400,8,4,'ict_accessory','active'),
      ('Dell Keyboard KB216 USB','ACC-DL-KB1','Slim USB wired keyboard QWERTY Kenya layout',cat_id,'piece',850,15,5,'ict_accessory','active'),
      ('Logitech MK345 Wireless KB+Mouse','ACC-LG-001','2.4GHz wireless combo, long battery',cat_id,'piece',3200,8,3,'ict_accessory','active'),
      ('Logitech B100 USB Optical Mouse','ACC-LG-002','USB optical mouse, ambidextrous, 800dpi',cat_id,'piece',450,20,8,'ict_accessory','active'),
      ('HP USB Optical Mouse','ACC-HP-MS1','3-button USB optical mouse, 1000dpi',cat_id,'piece',550,15,6,'ict_accessory','active'),
      ('USB 3.0 Flash Drive 32GB','ACC-USB-32','SanDisk/Kingston 32GB USB 3.0 drive',cat_id,'piece',900,20,8,'ict_accessory','active'),
      ('USB 3.0 Flash Drive 64GB','ACC-USB-64','64GB USB 3.0, for data transfer/backup',cat_id,'piece',1400,15,6,'ict_accessory','active'),
      ('CAT6 Patch Cable 1m','CBL-CAT6-1','RJ45 CAT6 ethernet patch cable 1 metre',cat_id,'piece',150,30,10,'ict_accessory','active'),
      ('CAT6 Patch Cable 3m','CBL-CAT6-3','RJ45 CAT6 ethernet patch cable 3 metres',cat_id,'piece',250,25,10,'ict_accessory','active'),
      ('HDMI Cable 2m','CBL-HDMI-2','HDMI 2.0 A-to-A cable, 4K capable',cat_id,'piece',400,20,6,'ict_accessory','active'),
      ('USB Type-C Cable 1m','CBL-USBC-1','USB-C to USB-A 3.0, fast charge 60W',cat_id,'piece',350,20,8,'ict_accessory','active'),
      ('Power Strip 6-Socket Surge','ACC-PWR-001','6-outlet surge protector, 3m cable, 10A',cat_id,'piece',1200,15,5,'ict_accessory','active'),
      ('CAT6 UTP Cable Box 305m','CBL-CAT6-BOX','305m CAT6 solid copper cable spool, grey',cat_id,'box',14000,3,1,'ict_accessory','active'),
      ('Thermal Paper Roll 80x80mm (10pk)','ACC-TPR-001','For receipt/label printers, 10 rolls/pack',cat_id,'pack',800,20,8,'ict_accessory','active'),
      ('A4 Paper Ream 80gsm','STA-A4-001','500 sheets A4 80gsm, for printers/copiers',cat_id,'ream',550,50,20,'ict_accessory','active'),
      ('Screen Cleaning Kit','ACC-CLN-001','Microfiber cloth + spray for screens',cat_id,'piece',350,20,8,'ict_accessory','active')
    ) AS t(name,code,description,category_id,uom,price,qty,reorder,itype,status)
    WHERE NOT EXISTS (SELECT 1 FROM items x WHERE x.code=t.code);
  END IF;

  -- Networking Equipment
  SELECT id INTO cat_id FROM item_categories WHERE name='Networking Equipment' LIMIT 1;
  IF cat_id IS NOT NULL THEN
    INSERT INTO items (name,code,description,category_id,unit_of_measure,unit_price,quantity_in_stock,reorder_level,item_type,status)
    SELECT t.* FROM (VALUES
      ('D-Link DGS-1008P 8-Port PoE Switch','NET-DL-001','8-port Gigabit PoE unmanaged switch 65W',cat_id,'piece',8500,4,2,'network_equipment','active'),
      ('D-Link DGS-1016D 16-Port Switch','NET-DL-002','16-port Gigabit unmanaged desktop switch',cat_id,'piece',12000,3,1,'network_equipment','active'),
      ('TP-Link TL-SG1024D 24-Port Switch','NET-TP-001','24-port Gigabit unmanaged rackmount switch',cat_id,'piece',18000,2,1,'network_equipment','active'),
      ('TP-Link Archer C6 AC1200 Router','NET-TP-002','Dual-band WiFi router, 4 LAN ports',cat_id,'piece',4500,5,2,'network_equipment','active'),
      ('TP-Link EAP245 WiFi Access Point','NET-TP-003','AC1750 Dual-band ceiling-mount AP, PoE',cat_id,'piece',12500,4,2,'network_equipment','active'),
      ('Ubiquiti UniFi AP AC Lite','NET-UB-001','802.11ac AP, 1167Mbps, PoE, indoor',cat_id,'piece',15000,3,1,'network_equipment','active'),
      ('Mikrotik RB750Gr3 hEX Router','NET-MK-001','5-port Gigabit RouterBoard',cat_id,'piece',8000,2,1,'network_equipment','active'),
      ('CAT6 24-Port Patch Panel','NET-PP-001','24-port CAT6 keystone patch panel, 1U',cat_id,'piece',5500,3,1,'network_equipment','active'),
      ('Fiber Patch Cable LC-LC OM3 3m','NET-FBR-001','Multi-mode fiber optic patch cable 3m',cat_id,'piece',1200,10,4,'network_equipment','active')
    ) AS t(name,code,description,category_id,uom,price,qty,reorder,itype,status)
    WHERE NOT EXISTS (SELECT 1 FROM items x WHERE x.code=t.code);
  END IF;

  -- PPE
  SELECT id INTO cat_id FROM item_categories WHERE name='PPE' LIMIT 1;
  IF cat_id IS NOT NULL THEN
    INSERT INTO items (name,code,description,category_id,unit_of_measure,unit_price,quantity_in_stock,reorder_level,item_type,status)
    SELECT t.* FROM (VALUES
      ('Surgical Mask Type IIR 50pk','PPE-MSK-001','3-ply fluid-resistant surgical mask CE marked',cat_id,'box',350,100,30,'ppe','active'),
      ('N95 Respirator FFP2 20pk','PPE-N95-001','NIOSH approved N95/FFP2 respirator',cat_id,'box',1200,50,20,'ppe','active'),
      ('Latex Gloves Size S 100pk','PPE-GLV-001','Powdered latex exam gloves Small',cat_id,'box',550,80,30,'ppe','active'),
      ('Latex Gloves Size M 100pk','PPE-GLV-002','Powdered latex exam gloves Medium',cat_id,'box',550,80,30,'ppe','active'),
      ('Latex Gloves Size L 100pk','PPE-GLV-003','Powdered latex exam gloves Large',cat_id,'box',550,60,20,'ppe','active'),
      ('Nitrile Gloves M Powder-free 100pk','PPE-NIT-001','Nitrile exam gloves medium powder-free',cat_id,'box',700,60,25,'ppe','active'),
      ('Disposable Surgical Gown 10pk','PPE-GWN-001','Level 2 non-woven disposable gown',cat_id,'pack',1500,40,15,'ppe','active'),
      ('Reusable Isolation Gown','PPE-GWN-002','Washable cotton-poly isolation gown blue',cat_id,'piece',800,30,10,'ppe','active'),
      ('Face Shield Full Length','PPE-FSH-001','Anti-fog polycarbonate face shield adjustable',cat_id,'piece',350,50,20,'ppe','active'),
      ('Safety Goggles Anti-fog','PPE-GOG-001','Splash-proof goggles indirect vent',cat_id,'piece',450,40,15,'ppe','active'),
      ('Shoe Cover Disposable 100pk','PPE-SHC-001','Non-woven PP shoe covers elastic edge',cat_id,'pack',250,40,15,'ppe','active'),
      ('Surgical Cap Disposable 100pk','PPE-CAP-001','Non-woven bouffant cap blue',cat_id,'pack',180,50,20,'ppe','active'),
      ('Apron Plastic Disposable 100pk','PPE-APR-001','PE disposable aprons clear',cat_id,'pack',350,30,12,'ppe','active'),
      ('Tyvek Coverall Suit Size L','PPE-CVR-001','Full body coverall with hood elastic wrists',cat_id,'piece',1200,20,8,'ppe','active')
    ) AS t(name,code,description,category_id,uom,price,qty,reorder,itype,status)
    WHERE NOT EXISTS (SELECT 1 FROM items x WHERE x.code=t.code);
  END IF;

  -- Medical Supplies
  SELECT id INTO cat_id FROM item_categories WHERE name='Medical Supplies' LIMIT 1;
  IF cat_id IS NOT NULL THEN
    INSERT INTO items (name,code,description,category_id,unit_of_measure,unit_price,quantity_in_stock,reorder_level,item_type,status)
    SELECT t.* FROM (VALUES
      ('Syringe 2ml with Needle 23G','MED-SYR-002','Luer slip 2ml syringe with 23Gx1 needle',cat_id,'piece',12,500,100,'medical_supply','active'),
      ('Syringe 5ml with Needle 21G','MED-SYR-005','Luer slip 5ml syringe with 21Gx1.5 needle',cat_id,'piece',14,500,100,'medical_supply','active'),
      ('Syringe 10ml with Needle 21G','MED-SYR-010','Luer lock 10ml 21Gx1.5 needle',cat_id,'piece',18,400,80,'medical_supply','active'),
      ('Syringe 20ml Luer Lock','MED-SYR-020','20ml syringe no needle luer lock',cat_id,'piece',22,300,80,'medical_supply','active'),
      ('IV Giving Set Infusion Set','MED-IVS-001','Standard IV administration set 150cm',cat_id,'piece',45,200,60,'medical_supply','active'),
      ('IV Cannula 18G 50pk','MED-CAN-018','18G IV cannula needle-free',cat_id,'pack',2200,30,10,'medical_supply','active'),
      ('IV Cannula 20G 50pk','MED-CAN-020','20G IV cannula needle-free',cat_id,'pack',2200,30,10,'medical_supply','active'),
      ('IV Cannula 22G 50pk','MED-CAN-022','22G IV cannula pediatric use',cat_id,'pack',2200,20,8,'medical_supply','active'),
      ('Foley Catheter 14Fr 10pk','MED-CTH-014','2-way silicone foley catheter 14Fr',cat_id,'pack',1800,20,8,'medical_supply','active'),
      ('Foley Catheter 16Fr 10pk','MED-CTH-016','2-way silicone foley catheter 16Fr',cat_id,'pack',1800,20,8,'medical_supply','active'),
      ('Urinary Drainage Bag 2L','MED-UDB-001','Sterile urine drainage bag with tube',cat_id,'piece',95,100,30,'medical_supply','active'),
      ('Oxygen Mask Adult High-Concentration','MED-OXM-001','High-concentration oxygen mask with bag',cat_id,'piece',180,30,10,'medical_supply','active'),
      ('Nasal Cannula Oxygen Adult','MED-OXN-001','Dual-prong nasal cannula adult 2m tube',cat_id,'piece',95,60,20,'medical_supply','active'),
      ('Wound Dressing 10x10cm','MED-DRS-001','Non-adherent sterile wound dressing',cat_id,'piece',25,200,60,'medical_supply','active'),
      ('Elastic Bandage 10cmx4.5m','MED-BND-001','Crepe bandage 10cm width',cat_id,'piece',45,200,60,'medical_supply','active'),
      ('Gauze Swabs 10x10cm Sterile 5pk','MED-GZS-001','Sterile gauze swabs 8-ply 10x10cm',cat_id,'pack',30,300,100,'medical_supply','active'),
      ('Micropore Surgical Tape 1 inch','MED-TPE-001','Surgical paper tape 1 inch x 9.1m roll',cat_id,'piece',45,100,30,'medical_supply','active'),
      ('Stethoscope Dual Head','MED-STC-001','Stainless steel dual-head stethoscope',cat_id,'piece',1800,15,5,'medical_supply','active'),
      ('Blood Pressure Cuff Adult','MED-BPC-001','Manual BP cuff adult 22-36cm',cat_id,'piece',850,10,3,'medical_supply','active'),
      ('Digital Thermometer','MED-THM-001','Digital oral/axillary thermometer CE marked',cat_id,'piece',350,20,8,'medical_supply','active'),
      ('Pulse Oximeter SpO2 Fingertip','MED-OXI-001','Fingertip pulse oximeter adult/pediatric',cat_id,'piece',1200,15,5,'medical_supply','active'),
      ('Glucometer Accu-Check Active','MED-GLM-001','Blood glucose monitor with test strips',cat_id,'piece',3500,8,3,'medical_supply','active'),
      ('Test Strips Accu-Check 50pk','MED-GLS-001','50 glucometer test strips for Accu-Check Active',cat_id,'pack',1200,20,8,'medical_supply','active')
    ) AS t(name,code,description,category_id,uom,price,qty,reorder,itype,status)
    WHERE NOT EXISTS (SELECT 1 FROM items x WHERE x.code=t.code);
  END IF;

  -- Housekeeping Supplies
  SELECT id INTO cat_id FROM item_categories WHERE name='Housekeeping Supplies' LIMIT 1;
  IF cat_id IS NOT NULL THEN
    INSERT INTO items (name,code,description,category_id,unit_of_measure,unit_price,quantity_in_stock,reorder_level,item_type,status)
    SELECT t.* FROM (VALUES
      ('Jik Bleach 5L','HSK-BLH-001','Sodium hypochlorite bleach 5L for disinfection',cat_id,'piece',350,30,10,'consumable','active'),
      ('Dettol Hospital Grade Disinfectant 5L','HSK-DTL-001','Chloroxylenol disinfectant 5L for surfaces',cat_id,'piece',750,20,8,'consumable','active'),
      ('Hand Sanitiser 70pct Ethanol 5L','HSK-SAN-001','WHO formula hand sanitiser 5L refill',cat_id,'piece',900,30,10,'consumable','active'),
      ('Hand Sanitiser 500ml Pump','HSK-SAN-002','70% ethanol pump dispenser 500ml',cat_id,'piece',250,50,20,'consumable','active'),
      ('Mop Kentucky 400g Blue','HSK-MOP-001','Cotton Kentucky mop head 400g blue',cat_id,'piece',250,20,8,'consumable','active'),
      ('Mop Handle Aluminium 150cm','HSK-MOP-002','Telescopic aluminium mop handle 150cm',cat_id,'piece',350,10,4,'consumable','active'),
      ('Waste Bin 60L with Lid','HSK-BIN-001','60L pedal waste bin yellow/red lid',cat_id,'piece',850,20,8,'consumable','active'),
      ('Biohazard Waste Bags Red 50pk','HSK-BWB-001','50L biohazard autoclavable bags red 50pk',cat_id,'pack',550,30,12,'consumable','active'),
      ('Yellow Cytotoxic Waste Bags 50pk','HSK-CWB-001','Cytotoxic waste bags yellow 60x90cm 50pk',cat_id,'pack',600,20,8,'consumable','active'),
      ('Black Bin Liners 50L 100pk','HSK-BLK-001','Heavy duty black bin liners 50L 100pk',cat_id,'pack',350,30,12,'consumable','active'),
      ('Sharps Container 1L','HSK-SHC-001','Single-use sharps safety container 1L',cat_id,'piece',45,100,40,'consumable','active'),
      ('Sharps Container 5L','HSK-SHC-005','Single-use sharps safety container 5L',cat_id,'piece',120,50,20,'consumable','active'),
      ('Toilet Paper 2-ply 48 rolls','HSK-TPR-001','2-ply 48 roll pack 200 sheets per roll',cat_id,'pack',1200,20,8,'consumable','active'),
      ('Paper Hand Towels Z-fold 200pk','HSK-PTW-001','Z-fold paper hand towels 200 sheets pack',cat_id,'pack',280,30,12,'consumable','active'),
      ('Liquid Hand Wash Antibacterial 5L','HSK-HWS-001','Antibacterial liquid hand wash 5L refill',cat_id,'piece',450,25,10,'consumable','active')
    ) AS t(name,code,description,category_id,uom,price,qty,reorder,itype,status)
    WHERE NOT EXISTS (SELECT 1 FROM items x WHERE x.code=t.code);
  END IF;

  -- Stationery & Office
  SELECT id INTO cat_id FROM item_categories WHERE name='Stationery & Office' LIMIT 1;
  IF cat_id IS NOT NULL THEN
    INSERT INTO items (name,code,description,category_id,unit_of_measure,unit_price,quantity_in_stock,reorder_level,item_type,status)
    SELECT t.* FROM (VALUES
      ('Biro Pens Blue 50pk','STA-PEN-001','Blue ballpoint pens 0.7mm box of 50',cat_id,'box',280,30,12,'stationery','active'),
      ('Biro Pens Red 50pk','STA-PEN-002','Red ballpoint pens 0.7mm box of 50',cat_id,'box',280,20,8,'stationery','active'),
      ('Permanent Marker Pens Black 12pk','STA-MRK-001','Black permanent markers chisel tip 12pk',cat_id,'pack',380,20,8,'stationery','active'),
      ('A4 Notebook 200pg Hardcover','STA-NTB-001','200-page A4 lined hardcover notebook',cat_id,'piece',180,50,20,'stationery','active'),
      ('Lever Arch File A4','STA-FAR-001','A4 lever arch file 7cm spine PVC',cat_id,'piece',280,30,12,'stationery','active'),
      ('Manila Files A4 50pk','STA-MNL-001','A4 manila folder 50 pack buff',cat_id,'pack',550,20,8,'stationery','active'),
      ('Stapler Heavy Duty 40-sheet','STA-STP-001','40-sheet capacity stapler with staples',cat_id,'piece',850,8,3,'stationery','active'),
      ('Scotch Tape 18mm x 33m 12pk','STA-SCT-001','Clear adhesive tape 18mmx33m 12 roll pack',cat_id,'pack',550,15,6,'stationery','active'),
      ('Patient Record File A4','STA-PRF-001','Hospital patient record folder clinical',cat_id,'piece',45,200,80,'stationery','active'),
      ('Prescription Pad 100-leaf','STA-PRX-001','A5 prescription pad 100 leaves NCR',cat_id,'pad',120,50,20,'stationery','active'),
      ('Laboratory Request Form 100pk','STA-LAB-001','Lab test request form pad 100 leaves',cat_id,'pad',150,40,15,'stationery','active'),
      ('Nurses Report Form 100pk','STA-NRS-001','Nursing report/observation chart 100pk',cat_id,'pad',180,40,15,'stationery','active'),
      ('Attendance Register A4 200pg','STA-ATN-001','Staff attendance register hardcover 200pg',cat_id,'piece',250,10,4,'stationery','active'),
      ('A4 Paper Ream 80gsm','STA-A4-RME','500 sheets A4 80gsm for printers copiers',cat_id,'ream',550,50,20,'stationery','active'),
      ('A3 Paper Ream 80gsm','STA-A3-RME','500 sheets A3 80gsm for A3 copiers',cat_id,'ream',1100,20,8,'stationery','active')
    ) AS t(name,code,description,category_id,uom,price,qty,reorder,itype,status)
    WHERE NOT EXISTS (SELECT 1 FROM items x WHERE x.code=t.code);
  END IF;

END $$;
