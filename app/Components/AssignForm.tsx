"use client";

import { useState } from "react";

export type Availability = "free" | "check" | "blocked";

interface Volunteer {
  id: string;
  name: string;
  teamIds: string[];
  roleIds: string[];
  labels: string[];
  availability: Availability;
  // Plain-English reasons shown beside the name, e.g. "unavailable (out of town)".
  reasons: string[];
  recent: number;
}
interface Role {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
}

const field = "mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm";

// Pick the role first. Then every volunteer is sorted by availability for THIS
// service, so you never have to guess who is free:
//   ✅ Available   (trained for the role, then in the ministry, then everyone)
//   ⚠ Check first  (already serving here, or serving nearby)
//   🚫 Unavailable (they marked this day off)
export default function AssignForm({
  action,
  eventId,
  volunteers,
  roles,
  initialRoleId = "",
}: {
  action: (formData: FormData) => void | Promise<void>;
  eventId: string;
  volunteers: Volunteer[];
  roles: Role[];
  initialRoleId?: string;
}) {
  const [roleId, setRoleId] = useState(roles.some((r) => r.id === initialRoleId) ? initialRoleId : "");
  const [showAll, setShowAll] = useState(false);

  const role = roles.find((r) => r.id === roleId);

  const text = (v: Volunteer) => {
    const bits: string[] = [];
    if (v.reasons.length) bits.push(v.reasons.join(", "));
    else if (v.recent > 0) bits.push(`${v.recent}× in last 4 wks`);
    return bits.length ? `${v.name} — ${bits.join(" · ")}` : v.name;
  };

  const free = volunteers.filter((v) => v.availability === "free");
  const check = volunteers.filter((v) => v.availability === "check");
  const blocked = volunteers.filter((v) => v.availability === "blocked");

  const trained = role ? free.filter((v) => v.roleIds.includes(role.id)) : [];
  const inMinistry = role ? free.filter((v) => !v.roleIds.includes(role.id) && v.teamIds.includes(role.teamId)) : [];
  const others = role ? free.filter((v) => !v.roleIds.includes(role.id) && !v.teamIds.includes(role.teamId)) : [];
  const nothingSuggested = !!role && trained.length === 0 && inMinistry.length === 0;
  const showOthers = showAll || nothingSuggested;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">1. Pick the role</label>
          <select name="roleId" required value={roleId} onChange={(e) => setRoleId(e.target.value)} className={field}>
            <option value="">Select role...</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.teamName}: {r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">2. Pick the volunteer</label>
          <select name="userId" required key={`${roleId}-${showOthers}`} className={field}>
            <option value="">{role ? "Select volunteer..." : "Pick a role first for suggestions..."}</option>

            {!role && free.length > 0 && (
              <optgroup label="✅ Available">
                {free.map((v) => <option key={v.id} value={v.id}>{text(v)}</option>)}
              </optgroup>
            )}
            {role && trained.length > 0 && (
              <optgroup label={`✅ Available — trained for ${role.name}`}>
                {trained.map((v) => <option key={v.id} value={v.id}>{text(v)}</option>)}
              </optgroup>
            )}
            {role && inMinistry.length > 0 && (
              <optgroup label={`✅ Available — in ${role.teamName}`}>
                {inMinistry.map((v) => <option key={v.id} value={v.id}>{text(v)}</option>)}
              </optgroup>
            )}
            {role && showOthers && others.length > 0 && (
              <optgroup label="✅ Available — everyone else">
                {others.map((v) => <option key={v.id} value={v.id}>{text(v)}</option>)}
              </optgroup>
            )}
            {check.length > 0 && (
              <optgroup label="⚠ Check first — already serving">
                {check.map((v) => <option key={v.id} value={v.id}>{text(v)}</option>)}
              </optgroup>
            )}
            {blocked.length > 0 && (
              <optgroup label="🚫 Marked this day unavailable">
                {blocked.map((v) => <option key={v.id} value={v.id}>{text(v)}</option>)}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      <p className="text-xs text-gray-600">
        <span className="font-semibold text-green-700">{free.length} available</span>
        {check.length > 0 && <> · <span className="font-semibold text-yellow-700">{check.length} already serving</span></>}
        {blocked.length > 0 && <> · <span className="font-semibold text-red-700">{blocked.length} unavailable</span></>}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="bg-brand-600 text-white py-2 px-5 rounded-md text-sm font-medium hover:bg-brand-700 cursor-pointer">
          Assign
        </button>
        {role && !nothingSuggested && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            Also show available volunteers outside this ministry
          </label>
        )}
      </div>
    </form>
  );
}
