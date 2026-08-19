import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { ManualEntryRow } from '@/lib/importTypes';

interface ManualEntryFormProps {
  onSubmit: (row: ManualEntryRow) => void;
  isSubmitting: boolean;
}

const EMPTY: ManualEntryRow = {
  buyerName: '', buyerSsn: '', sellerName: '', sellerSsn: '',
  witnessName: '', witnessSsn: '', propertyAddress: '', propertySize: '',
  propertyType: '', date: '', amount: '',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

export function ManualEntryForm({ onSubmit, isSubmitting }: ManualEntryFormProps) {
  const [row, setRow] = useState<ManualEntryRow>(EMPTY);

  const set = (field: keyof ManualEntryRow) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setRow((prev) => ({ ...prev, [field]: e.target.value }));

  const requiredMissing = !row.buyerName || !row.sellerName || !row.propertyAddress || !row.date || !row.amount;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(row);
      }}
      className="space-y-6"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Buyer name *">
          <Input value={row.buyerName} onChange={set('buyerName')} placeholder="Full name" required />
        </Field>
        <Field label="Buyer SSN">
          <Input value={row.buyerSsn ?? ''} onChange={set('buyerSsn')} placeholder="123-45-6789" />
        </Field>
        <Field label="Seller name *">
          <Input value={row.sellerName} onChange={set('sellerName')} placeholder="Full name" required />
        </Field>
        <Field label="Seller SSN">
          <Input value={row.sellerSsn ?? ''} onChange={set('sellerSsn')} placeholder="123-45-6789" />
        </Field>
        <Field label="Witness name (optional)">
          <Input value={row.witnessName ?? ''} onChange={set('witnessName')} placeholder="Full name" />
        </Field>
        <Field label="Witness SSN">
          <Input value={row.witnessSsn ?? ''} onChange={set('witnessSsn')} placeholder="123-45-6789" />
        </Field>
      </div>

      <div className="h-px w-full bg-border" />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Property address *">
          <Input value={row.propertyAddress} onChange={set('propertyAddress')} placeholder="Street, city, state, ZIP" required />
        </Field>
        <Field label="Property size">
          <Input value={row.propertySize ?? ''} onChange={set('propertySize')} placeholder="e.g. 2,400 sq ft" />
        </Field>
        <Field label="Property type">
          <Input value={row.propertyType ?? ''} onChange={set('propertyType')} placeholder="e.g. Single-Family Home" />
        </Field>
        <Field label="Date *">
          <Input type="date" value={row.date} onChange={set('date')} required />
        </Field>
        <Field label="Amount *">
          <Input value={row.amount} onChange={set('amount')} placeholder="$650,000" required />
        </Field>
      </div>

      <Button type="submit" disabled={requiredMissing || isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? 'Adding transaction…' : 'Add transaction'}
      </Button>
    </form>
  );
}
