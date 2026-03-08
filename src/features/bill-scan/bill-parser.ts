import { nanoid } from 'nanoid';
import type { BillItem, ParsedBill } from './types';

/**
 * Parse OCR text from a restaurant bill into structured items.
 *
 * Handles common Indian restaurant bill formats:
 *   - Columnar: "SNc  Description  Qty  Rate  Amount"
 *   - Simple:   "Item Name    ₹123.45"
 *   - With qty: "2 x Item Name  ₹246.90"
 *
 * Also extracts taxes/charges and distributes them proportionally.
 */
export function parseBillText(rawText: string): ParsedBill {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const items: BillItem[] = [];
  const taxes: { label: string; amount: number }[] = [];
  let subtotal = 0;
  let total = 0;

  // Skip patterns — header/footer/metadata lines
  const skipPatterns = [
    /^(bill\s*no|invoice|receipt|date|time|table|order|token|fssai|gstin|tin|pan|stw|covers|snc|kot\s*no|total\s*items|user\s*id)/i,
    /^(tel|ph|phone|mob|address|www|http)/i,
    /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/, // dates
    /^\d{1,2}:\d{2}/, // times
    /^(description|qty|rate|amount|sr\.?\s*no)/i, // column headers
    /^[-=_]{3,}/, // separator lines
    /^[A-Z0-9]{5,}$/, // GSTIN-like codes
  ];

  // Tax/charge patterns
  const taxPatterns = [
    /^(s?gst|cgst|sgst|igst|state\s*gst|central\s*gst|vat|service\s*(charge|tax)|serc|cess)/i,
    /^(round\s*off)/i,
    /^(discount)/i,
  ];

  // Summary/total patterns
  const totalPatterns = [
    /^(sub\s*total|subtotal|total\s*amount)/i,
    /^(grand\s*total|net\s*amount|amount\s*due|bill\s*amount|total$)/i,
  ];

  // Extract all numbers from a line (used for columnar parsing)
  const extractNumbers = (line: string): number[] => {
    const matches = line.match(/\d+[,]?\d*\.\d{2}/g) || [];
    return matches.map((m) => parseFloat(m.replace(/,/g, '')));
  };

  // Extract the rightmost amount from a line
  const extractRightmostAmount = (line: string): number | null => {
    const nums = extractNumbers(line);
    return nums.length > 0 ? nums[nums.length - 1] : null;
  };

  // Extract description from the text portion (strip numbers and leading serial numbers)
  const extractDescription = (line: string): string => {
    return (
      line
        // Remove leading serial number (e.g., "1 ", "12 ")
        .replace(/^\d{1,3}\s+/, '')
        // Remove all number groups that look like qty/rate/amount
        .replace(/\s+\d+[,]?\d*\.\d{2}/g, '')
        // Remove standalone integers that look like quantity
        .replace(/\s+\d{1,3}(?=\s|$)/g, '')
        // Remove currency symbols
        .replace(/[₹$]/g, '')
        // Remove trailing asterisks
        .replace(/\*+$/, '')
        // Clean up
        .replace(/\s{2,}/g, ' ')
        .trim()
    );
  };

  for (const line of lines) {
    // Skip header/footer lines
    if (skipPatterns.some((p) => p.test(line))) continue;
    if (line.length < 3) continue;

    // Check if it's a tax/charge line
    const isTax = taxPatterns.some((p) => p.test(line));
    if (isTax) {
      const amount = extractRightmostAmount(line);
      if (amount !== null) {
        taxes.push({ label: line.replace(/[\d.,₹$\s]+$/, '').trim(), amount: Math.round(amount * 100) });
      }
      continue;
    }

    // Check if it's a total/subtotal line
    const isTotal = totalPatterns.some((p) => p.test(line));
    if (isTotal) {
      const amount = extractRightmostAmount(line);
      if (amount !== null) {
        const cents = Math.round(amount * 100);
        if (/^(sub\s*total|subtotal|total\s*amount)/i.test(line)) {
          subtotal = cents;
        } else {
          total = cents;
        }
      }
      continue;
    }

    // Try to parse as an item line
    const numbers = extractNumbers(line);
    if (numbers.length === 0) continue; // no numbers = not an item

    // The rightmost number is the line total (Amount column)
    const lineAmount = numbers[numbers.length - 1];
    const amountCents = Math.round(lineAmount * 100);

    // Skip zero-amount lines (sub-items like flavors/variants)
    if (amountCents <= 0) continue;

    // Extract description
    const description = extractDescription(line);
    if (!description || description.length < 2) continue;

    // Try to determine quantity
    let quantity = 1;
    if (numbers.length >= 3) {
      // Columnar format: numbers are [qty, rate, amount] or [sno, qty, rate, amount]
      // Find qty: it's usually a small integer
      for (let i = 0; i < numbers.length - 1; i++) {
        const n = numbers[i];
        if (n >= 1 && n <= 100 && Number.isInteger(n)) {
          // Check if this could be qty by verifying qty * next_number ≈ amount
          const nextNum = numbers[i + 1];
          if (nextNum && Math.abs(n * nextNum - lineAmount) < 1) {
            quantity = n;
            break;
          }
        }
      }
    }

    items.push({
      id: nanoid(),
      description,
      amount: amountCents,
      quantity,
      assignedTo: [],
    });
  }

  // Calculate subtotal from items if not found
  const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);
  if (subtotal === 0) subtotal = itemsTotal;
  if (total === 0) total = subtotal + taxes.reduce((sum, t) => sum + t.amount, 0);

  // Distribute taxes proportionally across items
  const totalTax = taxes
    .filter((t) => t.amount > 0) // exclude round-off (can be negative)
    .reduce((sum, t) => sum + t.amount, 0);
  const roundOff = taxes
    .filter((t) => t.amount <= 0)
    .reduce((sum, t) => sum + t.amount, 0);

  if (totalTax > 0 && itemsTotal > 0) {
    let distributedTax = 0;
    items.forEach((item, i) => {
      if (i === items.length - 1) {
        // Last item gets remainder to avoid rounding issues
        item.amount += totalTax - distributedTax + roundOff;
      } else {
        const proportion = item.amount / itemsTotal;
        const itemTax = Math.round(totalTax * proportion);
        item.amount += itemTax;
        distributedTax += itemTax;
      }
    });
  }

  return {
    items,
    subtotal,
    tax: totalTax,
    total,
    rawText,
  };
}
