'use server';

import { BiomarkerInput } from '@/lib/bloodBiomarkerEngine';

export async function parseBloodTestDocumentAction(
  base64Data: string,
  mimeType: string
): Promise<{ success: boolean; data?: BiomarkerInput[]; error?: string }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: 'Δεν βρέθηκε GEMINI_API_KEY στο .env.local.',
      };
    }

    const prompt = `
Analyze the attached laboratory blood test report image/document.
Extract all nutritional, electrolyte, mineral, amino acid, inflammatory, and vitamin biomarkers.

Strictly distinguish the compartment:
- If labeled 'Serum' or serum context, compartment MUST be 'serum'.
- If labeled 'WBC' or 'White Blood Cells' or unit mentions WBC, compartment MUST be 'wbc_intracellular'.
- If labeled 'RBC' or 'Red Blood Cells' or unit mentions RBC, compartment MUST be 'rbc_intracellular'.

Respond ONLY with a valid JSON array matching this schema:
[
  {
    "markerName": "string",
    "compartment": "serum" | "wbc_intracellular" | "rbc_intracellular",
    "value": number,
    "unit": "string",
    "refLow": number,
    "refHigh": number
  }
]

No markdown formatting, output raw JSON only.
`;

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `API Error: ${errText}` };
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return { success: false, error: 'Δεν εντοπίστηκαν δεδομένα στο έγγραφο.' };
    }

    const parsed: BiomarkerInput[] = JSON.parse(rawText);
    return { success: true, data: parsed };
  } catch (err: any) {
    console.error('Blood OCR Action Exception:', err);
    return { success: false, error: err.message || 'Αποτυχία επεξεργασίας του εγγράφου' };
  }
}