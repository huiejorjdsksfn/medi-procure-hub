import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Mail, Phone, MapPin, FileText, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VendorRegistrationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: "", kraPin: "", regNumber: "", category: "", email: "", phone: "",
    address: "", county: "", contactPerson: "", contactPhone: "", bankName: "", accountNo: "",
  });

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Vendor Registration</h1>
            <p className="text-sm text-slate-500">Register as a supplier for Embu Level 5 Hospital</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Company Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />Company Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Company Name *</Label>
                <Input className="mt-1" value={form.companyName} onChange={e => update("companyName", e.target.value)} placeholder="Legal company name" />
              </div>
              <div>
                <Label>KRA PIN *</Label>
                <Input className="mt-1" value={form.kraPin} onChange={e => update("kraPin", e.target.value)} placeholder="A001234567P" />
              </div>
              <div>
                <Label>Company Reg. No. *</Label>
                <Input className="mt-1" value={form.regNumber} onChange={e => update("regNumber", e.target.value)} placeholder="PVT-123456" />
              </div>
              <div className="col-span-2">
                <Label>Supply Category *</Label>
                <select className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.category} onChange={e => update("category", e.target.value)}>
                  <option value="">Select category...</option>
                  <option>Pharmaceuticals</option>
                  <option>Medical Supplies</option>
                  <option>Medical Equipment</option>
                  <option>Laboratory Reagents</option>
                  <option>General Supplies</option>
                  <option>Services</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-green-500" />Contact Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email *</Label>
                <Input className="mt-1" type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="info@company.co.ke" />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input className="mt-1" value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+254 700 000 000" />
              </div>
              <div className="col-span-2">
                <Label>Physical Address *</Label>
                <Input className="mt-1" value={form.address} onChange={e => update("address", e.target.value)} placeholder="Street, Town" />
              </div>
              <div>
                <Label>County</Label>
                <Input className="mt-1" value={form.county} onChange={e => update("county", e.target.value)} placeholder="e.g. Nairobi" />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input className="mt-1" value={form.contactPerson} onChange={e => update("contactPerson", e.target.value)} placeholder="Full name" />
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />Banking Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bank Name</Label>
                <Input className="mt-1" value={form.bankName} onChange={e => update("bankName", e.target.value)} placeholder="e.g. KCB Bank" />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input className="mt-1" value={form.accountNo} onChange={e => update("accountNo", e.target.value)} placeholder="1234567890" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="w-4 h-4 mr-2" />Submit Registration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
