export type FaceShape = 'ovalado' | 'redondo' | 'cuadrado' | 'rectangular' | 'diamante' | 'triangular';

export interface Recommendation {
  descripcion: string;
  recomendadas: string[];
  evitar: string[];
  razon: string;
  emoji: string;
}

export const RECOMENDACIONES: Record<FaceShape, Recommendation> = {
  ovalado: {
    descripcion: "Forma equilibrada. La mayoría de monturas le quedan bien.",
    recomendadas: ["Aviador", "Cuadradas", "Cat-eye", "Redondas"],
    evitar: ["Monturas demasiado grandes que cubran los pómulos"],
    razon: "El rostro ovalado tiene proporciones armónicas que permiten casi cualquier estilo.",
    emoji: "🥚",
  },
  redondo: {
    descripcion: "Cara ancha con mejillas llenas y mentón suave.",
    recomendadas: ["Rectangulares", "Cuadradas", "Cat-eye angulosas", "Alargadas horizontalmente"],
    evitar: ["Redondas", "Pequeñas", "Sin armazón"],
    razon: "Las monturas angulosas alargan visualmente el rostro y definen la mandíbula.",
    emoji: "⭕",
  },
  cuadrado: {
    descripcion: "Frente, pómulos y mandíbula de ancho similar con ángulos marcados.",
    recomendadas: ["Redondas", "Ovaladas", "Aviador", "Cat-eye"],
    evitar: ["Cuadradas", "Rectangulares", "Geométricas angulosas"],
    razon: "Las monturas curvas suavizan los ángulos naturales del rostro.",
    emoji: "⬛",
  },
  rectangular: {
    descripcion: "Cara alargada con frente y mandíbula de ancho similar.",
    recomendadas: ["Grandes", "Oversized", "Cuadradas anchas", "Con decoración superior"],
    evitar: ["Pequeñas", "Estrechas", "Rectangulares alargadas"],
    razon: "Monturas anchas y grandes balancean la longitud del rostro.",
    emoji: "📱",
  },
  diamante: {
    descripcion: "Pómulos anchos con frente y mandíbula más estrechas.",
    recomendadas: ["Cat-eye", "Sin armazón superior", "Ovaladas", "Rectangulares suaves"],
    evitar: ["Angostas", "Geométricas que acentúen los pómulos"],
    razon: "Cat-eye y sin armazón amplían visualmente la frente para balancear los pómulos.",
    emoji: "💎",
  },
  triangular: {
    descripcion: "Mandíbula ancha que se estrecha hacia la frente.",
    recomendadas: ["Cat-eye", "Aviador", "Con detalle superior", "Semi-sin-armazón superior"],
    evitar: ["Pesadas en la parte inferior", "Cuadradas anchas abajo"],
    razon: "El énfasis en la parte superior equilibra la mandíbula prominente.",
    emoji: "🔺",
  },
};

export interface Store {
  id: string;
  nombre: string;
  tipo: 'nacional' | 'internacional';
  presupuesto: 'económico' | 'medio' | 'premium';
  url: string;
  descripcion: string;
  color: string;
}

export const TIENDAS: Store[] = [
  {
    id: '1',
    nombre: 'Zenni Optical',
    tipo: 'internacional',
    presupuesto: 'económico',
    url: 'https://www.zennioptical.com',
    descripcion: 'Gafas de alta calidad a precios increíblemente bajos.',
    color: 'from-blue-500 to-cyan-400'
  },
  {
    id: '2',
    nombre: 'Warby Parker',
    tipo: 'internacional',
    presupuesto: 'medio',
    url: 'https://www.warbyparker.com',
    descripcion: 'Estilo moderno y programa de prueba en casa.',
    color: 'from-indigo-600 to-blue-500'
  },
  {
    id: '3',
    nombre: 'Ray-Ban',
    tipo: 'internacional',
    presupuesto: 'premium',
    url: 'https://www.ray-ban.com',
    descripcion: 'Icono global de estilo y calidad superior.',
    color: 'from-slate-900 to-slate-700'
  },
  {
    id: '4',
    nombre: 'Óptica Local Express',
    tipo: 'nacional',
    presupuesto: 'económico',
    url: 'https://www.google.com/search?q=opticas+locales',
    descripcion: 'Servicio rápido y precios accesibles en tu ciudad.',
    color: 'from-emerald-500 to-teal-400'
  },
  {
    id: '5',
    nombre: 'Lafam',
    tipo: 'nacional',
    presupuesto: 'medio',
    url: 'https://www.lafam.com.co',
    descripcion: 'Cadena nacional con amplia variedad de marcas.',
    color: 'from-red-600 to-orange-500'
  },
  {
    id: '6',
    nombre: 'Óptica de Lujo',
    tipo: 'nacional',
    presupuesto: 'premium',
    url: 'https://www.google.com/search?q=opticas+de+lujo',
    descripcion: 'Exclusividad y atención personalizada con marcas de diseñador.',
    color: 'from-amber-500 to-yellow-400'
  }
];
