import { GoogleGenAI } from "@google/genai";

// Configuración de la API de Gemini
const GEMINI_API_KEY = "AIzaSyBuEZ9ozLwb5vodc46cmxBnijbT42b1uis";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function generateVirtualTryOn(base64Image: string, faceShape: string, glassesStyle: string) {
  const prompt = `
Edit this exact uploaded photo to create a highly realistic optical try-on.

Keep exactly the same:
- same person
- same identity
- same face
- same skin tone
- same hair
- same beard or facial hair if present
- same background
- same framing
- same camera angle
- same clothing
- same expression

Only add realistic eyeglasses.

Detected face shape: ${faceShape}
Recommended glasses style: ${glassesStyle}

Requirements:
- very realistic eyewear try-on
- correct alignment with eyes, nose bridge, and ears
- correct optical store proportions
- natural frame size for the face
- preserve the eyes visibly behind the lenses when appropriate
- do not beautify the face
- do not alter facial structure
- do not replace the person
- do not change hairstyle
- do not crop the image
- do not change clothes
- product-photography realism
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image.split(',')[1],
            mimeType: 'image/png',
          },
        },
        {
          text: prompt,
        },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image generated");
}

export async function getFrameRecommendations(faceShape: string) {
  const prompt = `
  Como experto estilista de gafas, proporciona 4 recomendaciones específicas de monturas de gafas para una persona con forma de rostro ${faceShape}.
  Para cada recomendación, incluye:
  1. Forma de la montura (ej. Aviador, Wayfarer, Cat-eye, Redonda, Rectangular)
  2. Material recomendado (ej. Acetato, Metal, Titanio)
  3. Estilo (ej. Clásico, Moderno, Atrevido, Minimalista)
  4. Una breve explicación (1-2 frases) de por qué esta elección complementa la forma de rostro ${faceShape}.

  Responde estrictamente en formato JSON con la siguiente estructura y TODO EL CONTENIDO EN ESPAÑOL:
  [
    {
      "shape": "string",
      "material": "string",
      "style": "string",
      "explanation": "string"
    },
    ...
  ]
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json'
    }
  });

  const text = response.text;
  if (!text) throw new Error("No recommendations generated");
  return JSON.parse(text);
}
