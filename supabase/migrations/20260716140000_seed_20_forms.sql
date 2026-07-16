-- ============================================================
--  EL5 MediProcure — Seed 20 internal forms
--  Timestamp : 20260716140000
--  These are answered via the new FormsGatewayPage (/forms):
--  staff choose a form, sign in with their MediProcure account,
--  then answer at /forms/:formId. Published + active immediately.
--  Idempotent: ON CONFLICT (form_id) DO NOTHING so re-running is safe.
-- ============================================================

INSERT INTO public.google_forms (form_id, title, description, method, sender_email, status, is_active, response_count, published_at, field_definitions, fields)
VALUES
('EL5-FORM-HR-LEAVE-001','Leave Request Form','Request annual, sick, or compassionate leave.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"HR","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"select","opts":"Pharmacy,Theatre,Laboratory,Finance,HR,Procurement,Nursing,Records,IT,Other","req":true},
   {"q":"Leave Type","t":"select","opts":"Annual,Sick,Compassionate,Maternity/Paternity,Study,Unpaid","req":true},
   {"q":"Start Date","t":"date","req":true},
   {"q":"End Date","t":"date","req":true},
   {"q":"Reason","t":"textarea","req":false},
   {"q":"Handover To (Name)","t":"text","req":false}
 ]}', 'Full Name, Department, Leave Type, Start Date, End Date, Reason, Handover To (Name)'),

('EL5-FORM-IT-SUPPORT-001','IT Support Ticket','Report a system, hardware, or network issue.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"IT","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"select","opts":"Pharmacy,Theatre,Laboratory,Finance,HR,Procurement,Nursing,Records,IT,Other","req":true},
   {"q":"Issue Type","t":"select","opts":"Hardware,Software,Network/Wi-Fi,Printer,MediProcure System,Account/Password,Other","req":true},
   {"q":"Priority","t":"radio","opts":"Low,Medium,High,Critical","req":true},
   {"q":"Description of Issue","t":"textarea","req":true},
   {"q":"Device/Asset Tag (if known)","t":"text","req":false}
 ]}', 'Full Name, Department, Issue Type, Priority, Description of Issue, Device/Asset Tag'),

('EL5-FORM-PROC-ASSET-001','Asset / Equipment Request','Request new or replacement equipment for your department.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Procurement","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Item(s) Requested","t":"textarea","req":true},
   {"q":"Quantity","t":"text","req":true},
   {"q":"Justification","t":"textarea","req":true},
   {"q":"Urgency","t":"radio","opts":"Routine,Urgent,Critical","req":true}
 ]}', 'Full Name, Department, Item(s) Requested, Quantity, Justification, Urgency'),

('EL5-FORM-INV-STOCK-001','Stock Requisition Request','Request stock/supplies from the central store.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Inventory","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Item Name","t":"text","req":true},
   {"q":"Quantity","t":"text","req":true},
   {"q":"Unit of Measure","t":"select","opts":"Pieces,Boxes,Cartons,Litres,Kilograms,Packs","req":true},
   {"q":"Needed By Date","t":"date","req":false},
   {"q":"Notes","t":"textarea","req":false}
 ]}', 'Full Name, Department, Item Name, Quantity, Unit of Measure, Needed By Date, Notes'),

('EL5-FORM-PROC-SUPPLIER-001','Supplier Registration','Register your company as a supplier to Embu Level 5 Hospital.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Procurement","questions":[
   {"q":"Company Name","t":"text","req":true},
   {"q":"Contact Person","t":"text","req":true},
   {"q":"Contact Email","t":"email","req":true},
   {"q":"Contact Phone","t":"tel","req":true},
   {"q":"KRA PIN","t":"text","req":true},
   {"q":"Business Registration Number","t":"text","req":true},
   {"q":"Categories Supplied","t":"textarea","req":true},
   {"q":"Physical Address","t":"textarea","req":false}
 ]}', 'Company Name, Contact Person, Contact Email, Contact Phone, KRA PIN, Business Registration Number, Categories Supplied, Physical Address'),

('EL5-FORM-PROC-PURCHASE-001','Purchase Request','Request approval to purchase goods or services.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Procurement","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Item/Service Description","t":"textarea","req":true},
   {"q":"Estimated Cost (KES)","t":"text","req":true},
   {"q":"Preferred Supplier (if any)","t":"text","req":false},
   {"q":"Budget Line","t":"text","req":false},
   {"q":"Justification","t":"textarea","req":true}
 ]}', 'Full Name, Department, Item/Service Description, Estimated Cost, Preferred Supplier, Budget Line, Justification'),

('EL5-FORM-FAC-VEHICLE-001','Vehicle Request','Request use of a hospital vehicle.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Facilities","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Purpose of Trip","t":"textarea","req":true},
   {"q":"Destination","t":"text","req":true},
   {"q":"Date Needed","t":"date","req":true},
   {"q":"Number of Passengers","t":"text","req":false}
 ]}', 'Full Name, Department, Purpose of Trip, Destination, Date Needed, Number of Passengers'),

('EL5-FORM-FAC-ROOMBOOK-001','Meeting Room Booking','Reserve a meeting or boardroom.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Facilities","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Meeting Purpose","t":"text","req":true},
   {"q":"Date","t":"date","req":true},
   {"q":"Start Time","t":"text","req":true},
   {"q":"End Time","t":"text","req":true},
   {"q":"Number of Attendees","t":"text","req":false}
 ]}', 'Full Name, Department, Meeting Purpose, Date, Start Time, End Time, Number of Attendees'),

('EL5-FORM-FAC-REPAIR-001','Maintenance / Repair Request','Report a facility, plumbing, electrical, or equipment repair need.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Facilities","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department/Location","t":"text","req":true},
   {"q":"Issue Type","t":"select","opts":"Electrical,Plumbing,HVAC,Structural,Equipment,Other","req":true},
   {"q":"Description","t":"textarea","req":true},
   {"q":"Urgency","t":"radio","opts":"Low,Medium,High,Critical","req":true}
 ]}', 'Full Name, Department/Location, Issue Type, Description, Urgency'),

('EL5-FORM-SAFE-INCIDENT-001','Incident Report','Report a workplace safety incident or injury.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Safety","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Date of Incident","t":"date","req":true},
   {"q":"Location","t":"text","req":true},
   {"q":"Description of Incident","t":"textarea","req":true},
   {"q":"Was anyone injured? (Yes/No)","t":"radio","opts":"Yes,No","req":true},
   {"q":"Witnesses (if any)","t":"text","req":false}
 ]}', 'Full Name, Department, Date of Incident, Location, Description of Incident, Injury, Witnesses'),

('EL5-FORM-SAFE-NEARMISS-001','Near-Miss Safety Report','Report a near-miss before it becomes an incident.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Safety","questions":[
   {"q":"Full Name","t":"text","req":false},
   {"q":"Department","t":"text","req":true},
   {"q":"Date Observed","t":"date","req":true},
   {"q":"What happened?","t":"textarea","req":true},
   {"q":"What could have gone wrong?","t":"textarea","req":true},
   {"q":"Suggested Fix","t":"textarea","req":false}
 ]}', 'Full Name, Department, Date Observed, What happened, What could have gone wrong, Suggested Fix'),

('EL5-FORM-HR-GRIEVANCE-001','Grievance / Complaint Form','Raise a formal workplace grievance or complaint.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"HR","questions":[
   {"q":"Full Name","t":"text","req":false},
   {"q":"Department","t":"text","req":true},
   {"q":"Nature of Complaint","t":"select","opts":"Workplace Conduct,Harassment,Discrimination,Working Conditions,Other","req":true},
   {"q":"Details","t":"textarea","req":true},
   {"q":"Date of Occurrence","t":"date","req":false},
   {"q":"Would you like a follow-up meeting? (Yes/No)","t":"radio","opts":"Yes,No","req":false}
 ]}', 'Full Name, Department, Nature of Complaint, Details, Date of Occurrence, Follow-up'),

('EL5-FORM-HR-TRAINING-001','Training Request','Request professional development or training.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"HR","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Training/Course Title","t":"text","req":true},
   {"q":"Provider/Institution","t":"text","req":false},
   {"q":"Justification","t":"textarea","req":true},
   {"q":"Estimated Cost (KES)","t":"text","req":false},
   {"q":"Preferred Dates","t":"text","req":false}
 ]}', 'Full Name, Department, Training/Course Title, Provider/Institution, Justification, Estimated Cost, Preferred Dates'),

('EL5-FORM-HR-ONBOARD-001','New Staff Onboarding Checklist','Confirm onboarding steps for a new staff member.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"HR","questions":[
   {"q":"New Staff Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Start Date","t":"date","req":true},
   {"q":"ID/Access Card Issued? (Yes/No)","t":"radio","opts":"Yes,No","req":true},
   {"q":"System Accounts Created? (Yes/No)","t":"radio","opts":"Yes,No","req":true},
   {"q":"Department Induction Completed? (Yes/No)","t":"radio","opts":"Yes,No","req":true},
   {"q":"Notes","t":"textarea","req":false}
 ]}', 'New Staff Full Name, Department, Start Date, ID Issued, Accounts Created, Induction Completed, Notes'),

('EL5-FORM-HR-EXIT-001','Exit Interview','Feedback form for staff leaving the hospital.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"HR","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Last Working Day","t":"date","req":true},
   {"q":"Reason for Leaving","t":"select","opts":"New Opportunity,Relocation,Retirement,Personal,Other","req":true},
   {"q":"What did you like most about working here?","t":"textarea","req":false},
   {"q":"What could be improved?","t":"textarea","req":false}
 ]}', 'Full Name, Department, Last Working Day, Reason for Leaving, Positives, Improvements'),

('EL5-FORM-FAC-VISITOR-001','Visitor Registration','Register an official visitor to the hospital.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Facilities","questions":[
   {"q":"Visitor Full Name","t":"text","req":true},
   {"q":"Organization","t":"text","req":false},
   {"q":"Host/Department Visiting","t":"text","req":true},
   {"q":"Purpose of Visit","t":"textarea","req":true},
   {"q":"ID Number","t":"text","req":true},
   {"q":"Vehicle Registration (if driving)","t":"text","req":false}
 ]}', 'Visitor Full Name, Organization, Host/Department, Purpose of Visit, ID Number, Vehicle Registration'),

('EL5-FORM-FIN-PETTYCASH-001','Petty Cash Request','Request petty cash disbursement.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Finance","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Amount Requested (KES)","t":"text","req":true},
   {"q":"Purpose","t":"textarea","req":true},
   {"q":"Receipts to Follow? (Yes/No)","t":"radio","opts":"Yes,No","req":true}
 ]}', 'Full Name, Department, Amount Requested, Purpose, Receipts to Follow'),

('EL5-FORM-FIN-BUDGET-001','Budget Variance / Reallocation Request','Request a budget line reallocation or variance approval.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Finance","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Budget Line (From)","t":"text","req":true},
   {"q":"Budget Line (To)","t":"text","req":true},
   {"q":"Amount (KES)","t":"text","req":true},
   {"q":"Justification","t":"textarea","req":true}
 ]}', 'Full Name, Department, Budget Line From, Budget Line To, Amount, Justification'),

('EL5-FORM-QA-SUPPLIER-001','Supplier Feedback / Evaluation','Evaluate a supplier''s recent delivery or service.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Quality","questions":[
   {"q":"Your Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Supplier Name","t":"text","req":true},
   {"q":"PO/Delivery Reference","t":"text","req":false},
   {"q":"Quality Rating (1-5)","t":"select","opts":"1,2,3,4,5","req":true},
   {"q":"Delivery Timeliness (1-5)","t":"select","opts":"1,2,3,4,5","req":true},
   {"q":"Comments","t":"textarea","req":false}
 ]}', 'Your Name, Department, Supplier Name, PO/Delivery Reference, Quality Rating, Delivery Timeliness, Comments'),

('EL5-FORM-QA-DAMAGE-001','Equipment Damage / Defect Report','Report damaged or defective equipment or supplies received.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Quality","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Item Description","t":"text","req":true},
   {"q":"Condition (Good/Damaged/Partial)","t":"radio","opts":"Good,Damaged,Partial","req":true},
   {"q":"PO/GRN Reference (if known)","t":"text","req":false},
   {"q":"Description of Damage/Defect","t":"textarea","req":true}
 ]}', 'Full Name, Department, Item Description, Condition, PO/GRN Reference, Description of Damage')

ON CONFLICT (form_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
