import { FaceLandmarker, FilesetResolver, Landmark } from '@mediapipe/tasks-vision';
import { FaceShape } from '../constants';

let faceLandmarker: FaceLandmarker | null = null;

export async function initFaceLandmarker() {
  if (faceLandmarker) return faceLandmarker;

  console.log("Initializing MediaPipe FaceLandmarker...");
  try {
    // Use a specific version to ensure compatibility
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task`,
      },
      outputFaceBlendshapes: false,
      runningMode: "IMAGE",
      numFaces: 1
    });
    console.log("FaceLandmarker initialized successfully");
  } catch (error) {
    console.error("Error initializing FaceLandmarker:", error);
    throw error;
  }

  return faceLandmarker;
}

function distance(p1: Landmark, p2: Landmark, w: number, h: number) {
  const dx = (p1.x - p2.x) * w;
  const dy = (p1.y - p2.y) * h;
  return Math.sqrt(dx * dx + dy * dy);
}

export function classifyFaceShape(landmarks: Landmark[], w: number, h: number): { shape: FaceShape; ratios: any } {
  console.log("Classifying face shape with dimensions:", w, "x", h);
  
  // Indices based on the Python script
  const INDICES = {
    frente: 10,
    barbilla: 152,
    lado_izq: 234,
    lado_der: 454,
    pomulo_izq: 93,
    pomulo_der: 323,
    mandibula_izq: 172,
    mandibula_der: 397,
    frente_izq: 54,
    frente_der: 284,
  };

  const p = {
    frente: landmarks[INDICES.frente],
    barbilla: landmarks[INDICES.barbilla],
    lado_izq: landmarks[INDICES.lado_izq],
    lado_der: landmarks[INDICES.lado_der],
    pomulo_izq: landmarks[INDICES.pomulo_izq],
    pomulo_der: landmarks[INDICES.pomulo_der],
    mandibula_izq: landmarks[INDICES.mandibula_izq],
    mandibula_der: landmarks[INDICES.mandibula_der],
    frente_izq: landmarks[INDICES.frente_izq],
    frente_der: landmarks[INDICES.frente_der],
  };

  const alto_rostro = distance(p.frente, p.barbilla, w, h);
  const ancho_rostro = distance(p.lado_izq, p.lado_der, w, h);
  const ancho_pomulos = distance(p.pomulo_izq, p.pomulo_der, w, h);
  const ancho_mandibula = distance(p.mandibula_izq, p.mandibula_der, w, h);
  const ancho_frente = distance(p.frente_izq, p.frente_der, w, h);

  const ratio_alto_ancho = alto_rostro / ancho_rostro;
  const ratio_mandibula_pomulos = ancho_mandibula / ancho_pomulos;
  const ratio_frente_mandibula = ancho_frente / ancho_mandibula;
  const ratio_frente_pomulos = ancho_frente / ancho_pomulos;
  const ratio_mandibula_ancho = ancho_mandibula / ancho_rostro;

  const ratios = {
    alto_rostro,
    ancho_rostro,
    ratio_alto_ancho,
    ratio_mandibula_pomulos,
    ratio_frente_mandibula,
    ratio_frente_pomulos,
    ratio_mandibula_ancho,
  };

  console.log("Calculated ratios:", ratios);

  if (ratio_alto_ancho >= 1.36 && ratio_mandibula_pomulos >= 0.75) {
    return { shape: "rectangular", ratios };
  }

  if (ratio_alto_ancho < 1.30 && ratio_mandibula_pomulos >= 0.82) {
    return { shape: "cuadrado", ratios };
  }

  if (ratio_frente_mandibula <= 0.90) {
    return { shape: "triangular", ratios };
  }

  if (ratio_frente_pomulos <= 0.85 && ratio_mandibula_pomulos < 0.75) {
    return { shape: "diamante", ratios };
  }

  if (ratio_alto_ancho >= 1.25 && ratio_alto_ancho < 1.36) {
    return { shape: "ovalado", ratios };
  }

  return { shape: "redondo", ratios };
}
