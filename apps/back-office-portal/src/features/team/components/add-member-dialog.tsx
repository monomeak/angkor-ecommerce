"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { assignableRoles } from "../lib/permissions";
import { AppRole } from "../../auth/types/auth";
import { useInviteMember } from "../hooks/use-invite-member";
import { getRoleStyle } from "../../auth/lib/role-style";
interface AddMemberDialogProps {
  readonly actorRole: AppRole;
}
export function AddMemberDialog({ actorRole }: AddMemberDialogProps) {
  const roles = assignableRoles(actorRole);

  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole | "">("");

  const { mutateAsync: addMember, isPending, error } = useInviteMember();

  // staff can't do that
  if (roles.length === 0) return null;

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setRole("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!role) return;
    await addMember({
      fullName,
      email,
      role,
    });
    resetForm();
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <UserPlus className="size-3.5" />
        Add member
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a team member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="member-full-name" className="text-sm font-medium">
              Full name
            </label>

            <Input
              id="member-full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            ></Input>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="member-email" className="text-sm font-medium">
              Email
            </label>

            <Input
              id="member-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            ></Input>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-meduim">Role</label>
            <Select
              items={roles.map((r) => ({ value: r, label: getRoleStyle(r).label }))}
              value={role}
              onValueChange={(value) => setRole(value as AppRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role"></SelectValue>
              </SelectTrigger>

              <SelectContent>
                {roles.map((assignableRoles) => (
                  <SelectItem key={assignableRoles} value={assignableRoles}>
                    {getRoleStyle(assignableRoles).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {(error as Error).message}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending || !role}
            className="w-full"
          >
            {isPending ? "Adding member..." : "Add member"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
