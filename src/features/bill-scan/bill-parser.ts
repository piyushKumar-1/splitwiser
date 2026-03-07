import { nanoid } from 'nanoid';
import type { BillItem, ParsedBill } from './types';

/**
 * Parse OCR text output into structured bill items.
 * Handles common receipt formats:
 *   - "Item Name    ₹123.45"
 *   - "Item Name    123.45"
 *   - "2 x Item Name  ₹246.90"
 *   - "Item Name  2  123.45"
 */
export function parseBillText(rawText: string): ParsedBill {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: BillItem[] = [];
  let subtotal = 0;
  let tax = 0;
  let total = 0;

  // Patterns to detect summary lines (not individual items)
  const summaryPatterns = [
    /^(sub\s*total|subtotal)/i,
    /^(grand\s*total|total)/i,
    /^(tax|gst|cgst|sgst|vat|service\s*(charge|tax))/i,
    /^(discount|tip|gratuity)/i,
    /^(net\s*amount|amount\s*due|bill\s*amount|round\s*off)/i,
    /^(cash|card|upi|paid|change|balance)/i,
    /^(thank|visit|invoice|receipt|bill\s*no|date|time|table|order|token|fssai|gstin|tin|pan)/i,
    /^(tel|ph|phone|mob|address|www|http)/i,
    /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/, // dates
    /^\d{1,2}:\d{2}/, // times
  ];

  // Pattern to extract amount from end of a line
  const amountPattern = /[₹$]?\s*(\d+[,.]?\d*\.?\d{0,2})\s*$/;
  // Pattern for quantity prefix: "2 x Item" or "2x Item" or "2 * Item"
  const qtyPrefixPattern = /^(\d+)\s*[x×\*]\s*/i;
  // Pattern for quantity in middle: "Item  2  123.45"
  const qtyMiddlePattern = /^(.+?)\s+(\d+)\s+[₹$]?\s*(\d+[,.]?\d*\.?\d{0,2})\s*$/;

  for (const line of lines) {
    // Skip summary lines
    if (summaryPatterns.some((p) => p.test(line))) {
      // But capture subtotal/tax/total values
      const amountMatch = line.match(amountPattern);
      if (amountMatch) {
        const val = parseAmount(amountMatch[1]);
        if (/^(sub\s*total|subtotal)/i.test(line)) subtotal = val;
        else if (/^(tax|gst|cgst|sgst|vat|service)/i.test(line)) tax += val;
        else if (/^(grand\s*total|total|net\s*amount|amount\s*due|bill\s*amount)/i.test(line)) total = val;
      }
      continue;
    }

    // Skip lines that are just numbers or too short
    if (/^\d+$/.test(line) || line.length < 3) continue;

    // Try to extract item
    let description = '';
    let amount = 0;
    let quantity = 1;

    // Check for qty x item pattern
    const qtyMatch = line.match(qtyPrefixPattern);
    const lineWithoutQty = qtyMatch ? line.slice(qtyMatch[0].length) : line;
    if (qtyMatch) quantity = parseInt(qtyMatch[1], 10);

    // Check for "desc  qty  amount" pattern
    const qtyMiddle = lineWithoutQty.match(qtyMiddlePattern);
    if (qtyMiddle) {
      description = qtyMiddle[1].trim();
      if (!qtyMatch) quantity = parseInt(qtyMiddle[2], 10);
      amount = parseAmount(qtyMiddle[3]);
    } else {
      // Standard "desc  amount" pattern
      const amountMatch = lineWithoutQty.match(amountPattern);
      if (!amountMatch) continue; // no amount found, skip line

      amount = parseAmount(amountMatch[1]);
      if (amount <= 0) continue;

      description = lineWithoutQty.slice(0, amountMatch.index).trim();
    }

    // Clean up description
    description = description
      .replace(/[.…]+$/, '') // trailing dots
      .replace(/\s{2,}/g, ' ') // multiple spaces
      .trim();

    if (!description || description.length < 2) continue;
    if (amount < 100) continue; // skip items less than ₹1 (likely noise)

    items.push({
      id: nanoid(),
      description,
      amount,
      quantity,
      assignedTo: [],
    });
  }

  // If no total found, sum items
  if (total === 0) {
    total = items.reduce((sum, item) => sum + item.amount, 0);
  }
  if (subtotal === 0) {
    subtotal = total - tax;
  }

  return { items, subtotal, tax, total, rawText };
}

function parseAmount(str: string): number {
  const cleaned = str.replace(/,/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * 100); // convert to cents
}
