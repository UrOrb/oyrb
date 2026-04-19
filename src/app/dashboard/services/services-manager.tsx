"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Save, Edit3, X } from "lucide-react";
import { createService, updateService, deleteService } from "./actions";
import { formatCents, formatDuration, type Service } from "@/lib/types";

const inputCls =
  "w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm placeholder:text-[#A3A3A3] focus:border-[#B8896B] focus:outline-none";

export function ServicesManager({ services }: { services: Service[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submitCreate = (fd: FormData) => {
    start(async () => {
      const r = await createService(fd);
      if (!r?.error) setCreating(false);
    });
  };

  const submitUpdate = (id: string, fd: FormData) => {
    start(async () => {
      const r = await updateService(id, fd);
      if (!r?.error) setEditing(null);
    });
  };

  const submitDelete = (id: string) => {
    if (!confirm("Delete this service?")) return;
    start(async () => {
      await deleteService(id);
    });
  };

  return (
    <div className="space-y-3">
      {services.length === 0 && !creating && (
        <div className="rounded-lg border border-dashed border-[#E7E5E4] p-10 text-center">
          <p className="text-sm text-[#737373]">No services yet.</p>
          <p className="mt-1 text-xs text-[#A3A3A3]">Add your first service to start accepting bookings.</p>
        </div>
      )}

      {services.map((s) =>
        editing === s.id ? (
          <form
            key={s.id}
            action={(fd) => submitUpdate(s.id, fd)}
            className="rounded-lg border border-[#B8896B] bg-white p-5"
          >
            <ServiceFields defaults={s} />
            <div className="mt-4 flex gap-2">
              <button disabled={pending} className="inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white">
                <Save size={13} /> Save
              </button>
              <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-[#E7E5E4] px-4 py-2 text-sm">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-[#E7E5E4] bg-white p-5">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{s.name}</p>
                {!s.active && <span className="rounded-full bg-[#F5F5F4] px-2 py-0.5 text-[10px] text-[#737373]">Inactive</span>}
              </div>
              {s.description && <p className="mt-0.5 text-xs text-[#737373]">{s.description}</p>}
              <div className="mt-1 flex gap-3 text-xs text-[#525252]">
                <span>{formatDuration(s.duration_minutes)}</span>
                <span>·</span>
                <span className="font-medium">{formatCents(s.price_cents)}</span>
                {s.deposit_cents > 0 && (
                  <>
                    <span>·</span>
                    <span>{formatCents(s.deposit_cents)} deposit</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(s.id)} className="rounded-md border border-[#E7E5E4] p-2 hover:bg-[#F5F5F4]" aria-label="Edit">
                <Edit3 size={14} />
              </button>
              <button onClick={() => submitDelete(s.id)} className="rounded-md border border-[#E7E5E4] p-2 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )
      )}

      {creating ? (
        <form action={submitCreate} className="rounded-lg border border-[#B8896B] bg-white p-5">
          <ServiceFields />
          <div className="mt-4 flex gap-2">
            <button disabled={pending} className="inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white">
              <Plus size={13} /> Create
            </button>
            <button type="button" onClick={() => setCreating(false)} className="inline-flex items-center gap-1 rounded-md border border-[#E7E5E4] px-4 py-2 text-sm">
              <X size={13} /> Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#E7E5E4] py-4 text-sm font-medium text-[#525252] hover:border-[#B8896B] hover:bg-[#FAFAF9]"
        >
          <Plus size={14} /> Add a service
        </button>
      )}
    </div>
  );
}

function ServiceFields({ defaults }: { defaults?: Service }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-medium">Name</label>
        <input required name="name" defaultValue={defaults?.name} placeholder="e.g. Signature Cut & Style" className={inputCls} />
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-medium">Description</label>
        <textarea name="description" defaultValue={defaults?.description ?? ""} rows={2} className={inputCls} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Duration (minutes)</label>
        <input required type="number" min="5" step="5" name="duration_minutes" defaultValue={defaults?.duration_minutes ?? 60} className={inputCls} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Price ($)</label>
        <input required type="number" min="0" step="1" name="price_dollars" defaultValue={defaults ? defaults.price_cents / 100 : 0} className={inputCls} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Deposit ($)</label>
        <input type="number" min="0" step="1" name="deposit_dollars" defaultValue={defaults ? defaults.deposit_cents / 100 : 0} className={inputCls} />
      </div>
      {defaults && (
        <label className="flex items-end gap-2 pb-2">
          <input type="checkbox" name="active" defaultChecked={defaults.active} />
          <span className="text-xs font-medium">Active</span>
        </label>
      )}
    </div>
  );
}
