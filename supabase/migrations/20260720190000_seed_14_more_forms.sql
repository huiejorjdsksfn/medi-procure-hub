-- ============================================================
--  EL5 MediProcure — Seed 14 more internal forms
--  Timestamp : 20260720190000
--  Adds the clinical-side forms the first 20-form batch was
--  missing (patient feedback, handover, medication errors,
--  infection control, bed occupancy), plus procurement/HR/admin
--  gaps: emergency purchase, contract renewal, tender scorecard,
--  performance review, disciplinary action, overtime, visitor
--  pass extension, meeting minutes, IT change request.
--  Same shape as 20260716140000_seed_20_forms.sql — answered via
--  FormsGatewayPage (/forms). Idempotent: ON CONFLICT DO NOTHING.
-- ============================================================

INSERT INTO public.google_forms (form_id, title, description, method, sender_email, status, is_active, response_count, published_at, field_definitions, fields)
VALUES

('EL5-FORM-CLIN-PATFEED-001','Patient Feedback / Satisfaction Survey','Share feedback on your visit or a family member''s care.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Clinical","questions":[
   {"q":"Ward/Department Visited","t":"text","req":true},
   {"q":"Date of Visit","t":"date","req":true},
   {"q":"Overall Satisfaction (1-5)","t":"select","opts":"1,2,3,4,5","req":true},
   {"q":"Staff Courtesy (1-5)","t":"select","opts":"1,2,3,4,5","req":true},
   {"q":"Cleanliness (1-5)","t":"select","opts":"1,2,3,4,5","req":true},
   {"q":"Would you recommend this hospital?","t":"radio","opts":"Yes,No","req":true},
   {"q":"Comments / Suggestions","t":"textarea","req":false}
 ]}', 'Ward/Department Visited, Date of Visit, Overall Satisfaction, Staff Courtesy, Cleanliness, Recommend, Comments'),

('EL5-FORM-CLIN-HANDOVER-001','Ward Handover / Shift Report','End-of-shift handover between nursing/clinical officers.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Clinical","questions":[
   {"q":"Ward/Unit","t":"text","req":true},
   {"q":"Outgoing Shift","t":"radio","opts":"Day,Night","req":true},
   {"q":"Date","t":"date","req":true},
   {"q":"Handover Officer (Outgoing)","t":"text","req":true},
   {"q":"Incoming Officer","t":"text","req":true},
   {"q":"Patient Census","t":"text","req":false},
   {"q":"Critical Patients / Alerts","t":"textarea","req":false},
   {"q":"Pending Tasks for Next Shift","t":"textarea","req":true}
 ]}', 'Ward/Unit, Outgoing Shift, Date, Handover Officer, Incoming Officer, Patient Census, Critical Patients, Pending Tasks'),

('EL5-FORM-CLIN-MEDERROR-001','Medication Error / Adverse Event Report','Report a medication error or adverse drug event.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Clinical","questions":[
   {"q":"Reporter Name","t":"text","req":true},
   {"q":"Department/Ward","t":"text","req":true},
   {"q":"Date of Event","t":"date","req":true},
   {"q":"Patient Identifier (bed no. / ID — not full name)","t":"text","req":false},
   {"q":"Type of Event","t":"select","opts":"Medication Error,Adverse Drug Reaction,Wrong Dose,Wrong Patient,Wrong Route,Other","req":true},
   {"q":"Severity","t":"radio","opts":"No Harm,Minor,Moderate,Severe,Fatal","req":true},
   {"q":"Description of Event","t":"textarea","req":true},
   {"q":"Immediate Action Taken","t":"textarea","req":true}
 ]}', 'Reporter Name, Department/Ward, Date of Event, Patient Identifier, Type of Event, Severity, Description, Immediate Action'),

('EL5-FORM-CLIN-INFCTRL-001','Infection Control Checklist','Ward infection-prevention compliance check.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Clinical","questions":[
   {"q":"Ward/Unit","t":"text","req":true},
   {"q":"Date","t":"date","req":true},
   {"q":"Inspector Name","t":"text","req":true},
   {"q":"Hand Hygiene Compliance","t":"radio","opts":"Yes,No,Partial","req":true},
   {"q":"PPE Availability","t":"radio","opts":"Yes,No,Partial","req":true},
   {"q":"Waste Segregation Correct","t":"radio","opts":"Yes,No,Partial","req":true},
   {"q":"Isolation Protocols Followed","t":"radio","opts":"Yes,No,N/A","req":true},
   {"q":"Notes / Corrective Actions","t":"textarea","req":false}
 ]}', 'Ward/Unit, Date, Inspector Name, Hand Hygiene, PPE Availability, Waste Segregation, Isolation Protocols, Notes'),

('EL5-FORM-CLIN-BEDOCC-001','Bed Occupancy / Discharge Notification','Notify records/admin of a bed status change.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Clinical","questions":[
   {"q":"Ward","t":"text","req":true},
   {"q":"Bed Number","t":"text","req":true},
   {"q":"Patient Status","t":"select","opts":"Admitted,Discharged,Transferred,Deceased","req":true},
   {"q":"Date/Time","t":"date","req":true},
   {"q":"Notifying Officer","t":"text","req":true},
   {"q":"Notes","t":"textarea","req":false}
 ]}', 'Ward, Bed Number, Patient Status, Date/Time, Notifying Officer, Notes'),

('EL5-FORM-PROC-EMERGENCY-001','Emergency / Urgent Purchase Request','Request an urgent purchase outside the normal procurement cycle.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Procurement","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Item/Service Description","t":"textarea","req":true},
   {"q":"Estimated Cost (KES)","t":"text","req":true},
   {"q":"Why This Cannot Wait for the Normal Cycle","t":"textarea","req":true},
   {"q":"Needed By","t":"date","req":true},
   {"q":"Approving Authority Notified","t":"text","req":false}
 ]}', 'Full Name, Department, Item/Service Description, Estimated Cost, Justification, Needed By, Approving Authority'),

('EL5-FORM-PROC-CONTRACT-001','Contract Renewal Request','Request renewal or review of an expiring supplier contract.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Procurement","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Contract/Supplier Name","t":"text","req":true},
   {"q":"Current Contract Expiry Date","t":"date","req":true},
   {"q":"Reason for Renewal","t":"textarea","req":true},
   {"q":"Changes to Terms Requested (if any)","t":"textarea","req":false},
   {"q":"Estimated Annual Value (KES)","t":"text","req":false}
 ]}', 'Full Name, Department, Contract/Supplier Name, Expiry Date, Reason for Renewal, Changes to Terms, Estimated Annual Value'),

('EL5-FORM-PROC-TENDER-001','Tender / RFQ Evaluation Scorecard','Score a bidder as part of a tender or RFQ evaluation.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Procurement","questions":[
   {"q":"Evaluator Name","t":"text","req":true},
   {"q":"Tender/RFQ Reference","t":"text","req":true},
   {"q":"Bidder/Supplier Name","t":"text","req":true},
   {"q":"Technical Compliance Score (1-5)","t":"select","opts":"1,2,3,4,5","req":true},
   {"q":"Price Competitiveness Score (1-5)","t":"select","opts":"1,2,3,4,5","req":true},
   {"q":"Delivery Timeline Score (1-5)","t":"select","opts":"1,2,3,4,5","req":true},
   {"q":"Overall Recommendation","t":"radio","opts":"Recommend,Do Not Recommend,Needs Clarification","req":true},
   {"q":"Comments","t":"textarea","req":false}
 ]}', 'Evaluator Name, Tender/RFQ Reference, Bidder/Supplier Name, Technical Score, Price Score, Delivery Score, Recommendation, Comments'),

('EL5-FORM-HR-APPRAISAL-001','Performance Review / Appraisal','Employee performance review and development plan.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"HR","questions":[
   {"q":"Employee Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Review Period","t":"text","req":true},
   {"q":"Reviewer Name","t":"text","req":true},
   {"q":"Key Achievements","t":"textarea","req":true},
   {"q":"Areas for Improvement","t":"textarea","req":false},
   {"q":"Overall Rating (1-5)","t":"select","opts":"1,2,3,4,5","req":true},
   {"q":"Development Plan / Next Steps","t":"textarea","req":false}
 ]}', 'Employee Name, Department, Review Period, Reviewer Name, Key Achievements, Areas for Improvement, Overall Rating, Development Plan'),

('EL5-FORM-HR-DISCIPLINE-001','Disciplinary Action Report','Record a disciplinary issue and the action taken.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"HR","questions":[
   {"q":"Employee Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Date of Incident","t":"date","req":true},
   {"q":"Nature of Issue","t":"select","opts":"Attendance,Conduct,Performance,Policy Violation,Other","req":true},
   {"q":"Description","t":"textarea","req":true},
   {"q":"Action Taken","t":"select","opts":"Verbal Warning,Written Warning,Suspension,Termination,Other","req":true},
   {"q":"Reported By","t":"text","req":true}
 ]}', 'Employee Name, Department, Date of Incident, Nature of Issue, Description, Action Taken, Reported By'),

('EL5-FORM-HR-OVERTIME-001','Overtime Request','Request approval for overtime hours worked or planned.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"HR","questions":[
   {"q":"Full Name","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"Date(s) of Overtime","t":"text","req":true},
   {"q":"Hours Requested","t":"text","req":true},
   {"q":"Reason","t":"textarea","req":true},
   {"q":"Approving Supervisor","t":"text","req":true}
 ]}', 'Full Name, Department, Date(s) of Overtime, Hours Requested, Reason, Approving Supervisor'),

('EL5-FORM-FAC-VISITOREXT-001','Visitor Pass Extension','Request an extension to a visitor''s pass validity.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Facilities","questions":[
   {"q":"Visitor Name","t":"text","req":true},
   {"q":"Host / Department","t":"text","req":true},
   {"q":"Original Pass Number","t":"text","req":false},
   {"q":"Reason for Extension","t":"textarea","req":true},
   {"q":"New Expiry Date Requested","t":"date","req":true},
   {"q":"Approved By","t":"text","req":false}
 ]}', 'Visitor Name, Host/Department, Original Pass Number, Reason for Extension, New Expiry Date, Approved By'),

('EL5-FORM-ADMIN-MINUTES-001','Meeting Minutes Submission','Submit minutes for a departmental or committee meeting.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"Admin","questions":[
   {"q":"Meeting Title","t":"text","req":true},
   {"q":"Date","t":"date","req":true},
   {"q":"Chairperson","t":"text","req":true},
   {"q":"Attendees","t":"textarea","req":true},
   {"q":"Key Decisions","t":"textarea","req":true},
   {"q":"Action Items","t":"textarea","req":false},
   {"q":"Next Meeting Date","t":"date","req":false}
 ]}', 'Meeting Title, Date, Chairperson, Attendees, Key Decisions, Action Items, Next Meeting Date'),

('EL5-FORM-IT-CHANGEREQ-001','Change Request (IT Systems)','Request a change to an IT system, module, or workflow.','internal','hpdeskg9@gmail.com','published',true,0,now(),
 '{"category":"IT","questions":[
   {"q":"Requested By","t":"text","req":true},
   {"q":"Department","t":"text","req":true},
   {"q":"System/Module Affected","t":"text","req":true},
   {"q":"Description of Change","t":"textarea","req":true},
   {"q":"Business Justification","t":"textarea","req":true},
   {"q":"Urgency","t":"radio","opts":"Low,Medium,High,Critical","req":true},
   {"q":"Preferred Implementation Date","t":"date","req":false}
 ]}', 'Requested By, Department, System/Module Affected, Description of Change, Business Justification, Urgency, Preferred Date')

ON CONFLICT (form_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
