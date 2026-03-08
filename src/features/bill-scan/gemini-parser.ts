import { GoogleGenerativeAI } from '@google/generative-ai';
import { nanoid } from 'nanoid';
import type { BillItem, ParsedBill } from './types';

// Gemini Flash — free tier: 15 RPM
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const PROMPT = `You are a receipt/bill parser. Analyze this image of a restaurant bill and extract:

1. Each line item with:
   - description (item name, clean and readable)
   - quantity
   - amount (total for that line, NOT unit price)

2. All taxes and charges (GST, SGST, CGST, service charge, SERC, VAT, etc.)
   - label and amount for each

3. The subtotal (before tax) and final total (after tax)

IMPORTANT RULES:
- Skip items with 0.00 amount (these are sub-items/flavors/variants)
- Skip header/footer text (restaurant name, address, GSTIN, bill number, date, etc.)
- For the amount field, use the TOTAL amount column (qty × rate), not the unit rate
- Include ALL taxes/charges as separate entries

Return ONLY valid JSON in this exact format, no markdown:
{
  "items": [
    { "description": "Item Name", "quantity": 1, "amount": 123.45 }
  ],
  "taxes": [
    { "label": "SGST @ 2.5%", "amount": 12.34 }
  ],
  "subtotal": 1234.56,
  "total": 1400.00
}`;

export async function parseWithGemini(imageFile: File | Blob): Promise<ParsedBill> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env');
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Convert image to base64
  const buffer = await imageFile.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
  );

  const mimeType = imageFile.type || 'image/jpeg';

  const result = await model.generateContent([
    PROMPT,
    {
      inlineData: {
        data: base64,
        mimeType,
      },
    },
  ]);

  const text = result.response.text();

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse bill — no valid JSON in response');
  }

  let parsed: {
    items: { description: string; quantity: number; amount: number }[];
    taxes: { label: string; amount: number }[];
    subtotal: number;
    total: number;
  };

  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse bill — invalid JSON from AI');
  }

  // Convert to BillItem format
  const items: BillItem[] = (parsed.items || [])
    .filter((item) => item.amount > 0)
    .map((item) => ({
      id: nanoid(),
      description: item.description,
      amount: Math.round(item.amount * 100), // to cents
      quantity: item.quantity || 1,
      assignedTo: [],
    }));

  const subtotal = Math.round((parsed.subtotal || 0) * 100);
  const totalTax = (parsed.taxes || [])
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + Math.round(t.amount * 100), 0);
  const roundOff = (parsed.taxes || [])
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.round(t.amount * 100), 0);
  const total = Math.round((parsed.total || 0) * 100);

  // Distribute taxes proportionally across items
  const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);

  if (totalTax > 0 && itemsTotal > 0) {
    let distributedTax = 0;
    items.forEach((item, i) => {
      if (i === items.length - 1) {
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
    rawText: text,
  };
}
