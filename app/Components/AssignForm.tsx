"use client";

import { useState } from "react";

interface Volunteer {
  id: string;
  name: string;
  teamIds: string[];
  roleIds: string[];
  labels: string[];
}
interface Role {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
}

const field = "mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm";

// Pick the role first, and the volunteer list sorts itself: people trained for
// the role, then people in that ministry, then (optionally) everyone else.
export default function AssignForm({
  action,
  eventId,
  volunteers,
  roles,
}: {
  action: (formData: FormData) => void | Promise<void>;
  eventId: string;
  volunteers: Volunteer[];
  roles: Role[];
}) {
  const [roleId, setRoleId] = useState("");
  const [showAll, setShowAll] = useState(false);

  const role = roles.find((r) => r.id === roleId);
  const label = (v: Volunteer) => (v.labels.length ? `${v.name} (${v.labels.join(", ")})` : v.name);

  const trained = role ? volunteers.filter((v) => v.roleIds.includes(role.id)) : [];
  const inMinistry = role ? volunteers.filter((v) => !v.roleIds.includes(role.id) && v.teamIds.includes(role.teamId)) : [];
  const others = role ? volunteers.filter((v) => !v.roleIds.includes(role.id) && !v.teamIds.includes(role.teamId)) : [];
  const nothingSuggested = role && trained.length === 0 && inMinistry.length === 0;
  const showOthers = showAll || nothingSuggested;

  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <label className="block text-sm font-medium text-gray-700">Role</label>
        <select name="roleId" required value={roleId} onChange={(e) => setRoleId(e.target.value)} className={field}>
          <option value="">Select role...</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.teamName}: {r.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Volunteer</label>
        <select name="userId" required key={`${roleId}-${showOthers}`} className={field}>
          <option value="">{role ? "Select volunteer..." : "Pick a role first for suggestions..."}</option>
          {!role &&
            volunteers.map((v) => (
              <option key={v.id} value={v.id}>{label(v)}</option>
            ))}
          {role && trained.length > 0 && (
            <optgroup label={`Trained for ${role.name}`}>
              {trained.map((v) => <option key={v.id} value={v.id}>{label(v)}</option>)}
            </optgroup>
          )}
          {role && inMinistry.length > 0 && (
            <optgroup label={`In ${role.teamName}`}>
              {inMinistry.map((v) => <option key={v.id} value={v.id}>{label(v)}</option>)}
            </optgroup>
          )}
          {role && showOthers && others.length > 0 && (
            <optgroup label="Everyone else">
              {others.map((v) => <option key={v.id} value={v.id}>{label(v)}</option>)}
            </optgroup>
          )}
        </select>
      </div>
      <button type="submit" className="bg-brand-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-brand-700 cursor-pointer">
        Assign
      </button>
      {role && !nothingSuggested && (
        <label className="sm:col-span-3 flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
          Also show volunteers outside this ministry
        </label>
      )}
    </form>
  );
}
