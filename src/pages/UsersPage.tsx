import { useEffect, useState } from "react";
import { supabase, db } from "@/integrations/supabase/client";
import { useAuth, ProcurementRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Shield, UserCog, KeyRound } from "lucide-react";

const PROCUREMENT_ROLES: { value: ProcurementRole; label: string }[] = [
  { value: "admin", label: "Administrator" },
  { value: "requisitioner", label: "Requisitioner" },
  { value: "procurement_officer", label: "Procurement Officer" },
  { value: "procurement_manager", label: "Procurement Manager" },
  { value: "warehouse_officer", label: "Warehouse Officer" },
  { value: "inventory_manager", label: "Inventory Manager" },
];

const UsersPage = () => {
  const { roles: myRoles } = useAuth();
  const isAdmin = myRoles.includes("admin");
  const [users, setUsers] = useState<any[]>([]);
  const [roleDialog, setRoleDialog] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState("");

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await db.from("user_roles").select("*");

    const usersWithRoles = (profiles || []).map((p: any) => ({
      ...p,
      roles: ((roles as any[]) || []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
    }));
    setUsers(usersWithRoles);
  };

  const assignRole = async () => {
    if (!roleDialog || !selectedRole) return;
    const { error } = await (db as any).from("user_roles").insert([{
      user_id: roleDialog.id,
      role: selectedRole,
    }] as any);
    if (error) {
      if (error.message?.includes("duplicate")) {
        toast({ title: "Role already assigned", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      return;
    }
    toast({ title: "Role assigned" });
    setRoleDialog(null);
    setSelectedRole("");
    fetchUsers();
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await db.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Role removed" });
    fetchUsers();
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <UserCog className="w-6 h-6" /> User Management
      </h1>

      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="data-table-row">
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r: string) => (
                      <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize inline-flex items-center gap-1">
                        <Shield className="w-3 h-3" /> {r.replace(/_/g, " ")}
                        <button onClick={() => removeRole(u.id, r)} className="ml-1 hover:text-destructive">×</button>
                      </span>
                    ))}
                    {u.roles.length === 0 && <span className="text-xs text-muted-foreground">No roles</span>}
                  </div>
                </TableCell>
                <TableCell>{u.department || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => { setRoleDialog(u); setSelectedRole(""); }}>
                    <KeyRound className="w-3 h-3 mr-1" /> Assign Role
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Role to {roleDialog?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue placeholder="Choose role" /></SelectTrigger>
                <SelectContent>
                  {PROCUREMENT_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRoleDialog(null)}>Cancel</Button>
              <Button onClick={assignRole} disabled={!selectedRole}>Assign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
