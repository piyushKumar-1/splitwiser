export interface BillItem {
  id: string;
  description: string;
  amount: number; // in cents
  quantity: number;
  assignedTo: AssignedMember[]; // members this item is split among
}

export interface AssignedMember {
  id: string; // memberId or a temp nanoid for non-group contacts
  name: string;
  email: string;
}

export interface ParsedBill {
  items: BillItem[]; // items with taxes distributed proportionally
  subtotal: number; // cents (items before tax)
  tax: number; // cents (total tax/charges)
  total: number; // cents (final bill amount)
  rawText: string;
}
