import {
  Point,
  BodicePatternResult,
  BodiceControlPoints,
  BodiceCalculatedMeasurements,
  BodyMeasurements,
} from '../types';

export type StylePatternKind = 'bodice' | 'shirt' | 'trouser' | 'skirt' | 'kaftan';

export interface ExtendedMeasurements extends Partial<BodyMeasurements> {
  chest?: number;
  hip?: number;
  sleeve?: number;
  thigh?: number;
  knee?: number;
  ankle?: number;
  trouserLength?: number;
  skirtLength?: number;
}

export interface PatternGuideLine {
  start: Point;
  end: Point;
  label: string;
}

export interface PatternMarker {
  point: Point;
  label: string;
}

export interface PatternPieceNote {
  name: string;
  quantity: number;
  note?: string;
}

export interface GenericPatternDraft {
  kind: Exclude<StylePatternKind, 'bodice'>;
  points: Point[];
  outline: Point[];
  measurements: Record<string, number>;
  guides: PatternGuideLine[];
  notes: string[];
  pieceNotes: PatternPieceNote[];
  notchPoints: PatternMarker[];
  seamAllowanceCm: number;
}

export type StylePatternResult = BodicePatternResult | GenericPatternDraft;

const MEASUREMENT_RANGES: Record<
  string,
  { min: number; max: number; default: number }
> = {
  bust: { min: 70, max: 150, default: 90 },
  chest: { min: 75, max: 160, default: 96 },
  waist: { min: 55, max: 140, default: 72 },
  hip: { min: 75, max: 170, default: 98 },
  neck: { min: 30, max: 50, default: 36 },
  shoulder: { min: 8, max: 22, default: 12 },
  backLength: { min: 30, max: 60, default: 40 },
  sleeve: { min: 15, max: 75, default: 24 },
  bustSpan: { min: 10, max: 30, default: 11 },
  armholeDepth: { min: 15, max: 32, default: 22 },
  thigh: { min: 35, max: 90, default: 58 },
  knee: { min: 25, max: 65, default: 42 },
  ankle: { min: 18, max: 45, default: 28 },
  trouserLength: { min: 75, max: 130, default: 108 },
  skirtLength: { min: 35, max: 130, default: 75 },
};

export class PatternValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'PatternValidationError';
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function asMeasurementMap(
  measurements: Partial<ExtendedMeasurements>
): Record<string, number | undefined> {
  const chest = measurements.chest ?? measurements.bust;
  const bust = measurements.bust ?? measurements.chest;

  return {
    ...measurements,
    chest,
    bust,
  };
}

function validateAndRead(
  measurements: Record<string, number | undefined>,
  key: string,
  fallbackFormula?: (m: Record<string, number | undefined>) => number
): number {
  const range = MEASUREMENT_RANGES[key];
  let value = measurements[key];

  if (value === undefined || value === null || Number.isNaN(value)) {
    if (fallbackFormula) {
      value = fallbackFormula(measurements);
    } else if (range) {
      value = range.default;
    } else {
      throw new PatternValidationError(key, `Missing required measurement: ${key}`);
    }
  }

  if (range && (value < range.min || value > range.max)) {
    throw new PatternValidationError(
      key,
      `${key} (${value}cm) out of safe range [${range.min}-${range.max}cm]`
    );
  }

  return round1(value);
}

function scalePoint(
  point: Point,
  scale: number,
  offset: { x: number; y: number }
): Point {
  return {
    x: point.x * scale + offset.x,
    y: point.y * scale + offset.y,
  };
}

function createNotch(point: Point, label: string): PatternMarker {
  return { point, label };
}

export function generateBodicePattern(
  measurements: BodyMeasurements
): BodicePatternResult {
  const m = asMeasurementMap(measurements);

  const bust = validateAndRead(m, 'bust');
  const waist = validateAndRead(m, 'waist');
  const neck = validateAndRead(m, 'neck');
  const shoulder = validateAndRead(m, 'shoulder');
  const backLength = validateAndRead(m, 'backLength');
  const bustSpan = validateAndRead(m, 'bustSpan', (ms) =>
    round1((ms.bust || 90) / 10 + 2)
  );
  const armholeDepth = validateAndRead(m, 'armholeDepth', (ms) =>
    round1((ms.bust || 90) / 6 + 7)
  );

  const bustEase = clamp(bust * 0.018, 1.4, 2.4);
  const waistEase = clamp(waist * 0.012, 0.8, 1.6);

  const quarterBust = round1(bust / 4 + bustEase);
  const quarterWaist = round1(waist / 4 + waistEase);
  const neckWidth = round1(clamp(neck / 5.2, 5.2, 10));
  const neckDepth = round1(clamp(neck / 4.8, 6.2, 10.8));
  const shoulderDrop = round1(clamp(shoulder * 0.22, 2.2, 4.2));

  const sideSuppression = Math.max(0, quarterBust - quarterWaist);
  const dartIntake = round1(clamp(sideSuppression * 0.7, 1.2, 4.2));
  const sideSeamX = round1(
    clamp(quarterWaist + dartIntake, quarterWaist, quarterBust - 0.5)
  );

  const armholeInset = round1(clamp(quarterBust * 0.1, 2.2, 4.6));
  const armholeDrop = round1(clamp(quarterBust * 0.08, 1.8, 3.2));
  const dartTipRise = round1(clamp(backLength * 0.24, 8.5, 13));
  const halfBustSpan = round1(bustSpan / 2);

  const controlPoints: BodiceControlPoints = {
    A: { x: 0, y: 0 },
    B: { x: quarterBust, y: 0 },
    C: { x: quarterBust, y: backLength },
    D: { x: 0, y: backLength },

    E: { x: neckWidth, y: 0 },
    F: { x: 0, y: neckDepth },
    G: {
      x: round1(clamp(shoulder, neckWidth + 1.2, quarterBust - 2)),
      y: shoulderDrop,
    },

    H: { x: 0, y: armholeDepth },
    I: { x: quarterBust, y: armholeDepth },
    J: {
      x: round1(quarterBust - armholeInset),
      y: round1(armholeDepth + armholeDrop),
    },

    K: { x: sideSeamX, y: backLength },
    dartLeft: {
      x: round1(halfBustSpan - dartIntake / 2),
      y: backLength,
    },
    dartRight: {
      x: round1(halfBustSpan + dartIntake / 2),
      y: backLength,
    },
    dartTip: {
      x: halfBustSpan,
      y: round1(backLength - dartTipRise),
    },
  };

  const points: Point[] = [
    controlPoints.A,
    controlPoints.E,
    controlPoints.G,
    controlPoints.J,
    controlPoints.K,
    controlPoints.D,
    controlPoints.dartLeft,
    controlPoints.dartTip,
    controlPoints.dartRight,
    controlPoints.D,
    controlPoints.A,
    controlPoints.F,
    controlPoints.H,
    controlPoints.I,
    controlPoints.C,
    controlPoints.B,
  ];

  const calculatedMeasurements: BodiceCalculatedMeasurements = {
    quarterBust,
    quarterWaist,
    neckWidth,
    neckDepth,
    armholeDepth,
    dartIntake,
  };

  return {
    points,
    controlPoints,
    measurements: calculatedMeasurements,
  };
}

export function generateShirtPattern(
  measurements: Partial<ExtendedMeasurements>
): GenericPatternDraft {
  const m = asMeasurementMap(measurements);

  const chest = validateAndRead(m, 'chest', (ms) => ms.bust || 96);
  const neck = validateAndRead(m, 'neck');
  const shoulder = validateAndRead(m, 'shoulder');
  const sleeve = validateAndRead(m, 'sleeve', () => 24);
  const backLength = validateAndRead(m, 'backLength');

  const chestEase = clamp(chest * 0.03, 3, 5.5);
  const width = round1(chest / 4 + chestEase);
  const fullLength = round1(backLength + clamp(backLength * 0.48, 18, 30));
  const neckWidth = round1(clamp(neck / 6, 5.2, 9));
  const neckDepth = round1(clamp(neck / 6 + 1.2, 6, 10));
  const shoulderDrop = round1(clamp(shoulder * 0.18, 1.8, 3.6));
  const armholeDepth = round1(clamp(chest / 6 + 8, 18, 32));
  const hemEaseIn = round1(clamp(width * 0.05, 1.2, 3.2));

  const outline: Point[] = [
    { x: 0, y: 0 },
    { x: neckWidth, y: 0 },
    { x: shoulder, y: shoulderDrop },
    { x: width - 3, y: armholeDepth + 2 },
    { x: width - hemEaseIn, y: fullLength },
    { x: hemEaseIn, y: fullLength },
    { x: 0, y: neckDepth },
  ];

  return {
    kind: 'shirt',
    points: [...outline],
    outline,
    measurements: {
      chest,
      neck,
      shoulder,
      sleeve,
      backLength,
      width,
      fullLength,
      armholeDepth,
    },
    guides: [
      {
        start: { x: 0, y: 0 },
        end: { x: width, y: 0 },
        label: `${round1(chest / 4)}cm chest quarter + ease`,
      },
      {
        start: { x: 0, y: 0 },
        end: { x: 0, y: fullLength },
        label: `${fullLength}cm shirt length`,
      },
      {
        start: { x: 0, y: armholeDepth },
        end: { x: width, y: armholeDepth },
        label: `${armholeDepth}cm armhole depth`,
      },
      {
        start: { x: width + 2, y: 0 },
        end: { x: width + 2, y: sleeve },
        label: `${sleeve}cm sleeve guide`,
      },
    ],
    notes: [
      'Use for shirt front/back foundation.',
      'Add placket, collar stand, cuff, and seam allowance during cutting.',
    ],
    pieceNotes: [
      { name: 'Front panel', quantity: 2, note: 'Add placket allowance' },
      { name: 'Back panel', quantity: 1, note: 'Cut on fold if plain back' },
      { name: 'Sleeve', quantity: 2 },
      { name: 'Collar', quantity: 2, note: 'With interfacing' },
      { name: 'Collar stand', quantity: 2, note: 'With interfacing' },
    ],
    notchPoints: [
      createNotch({ x: shoulder, y: shoulderDrop }, 'Shoulder notch'),
      createNotch({ x: width - 3, y: armholeDepth + 2 }, 'Armhole notch'),
    ],
    seamAllowanceCm: 1.5,
  };
}

export function generateTrouserPattern(
  measurements: Partial<ExtendedMeasurements>
): GenericPatternDraft {
  const m = asMeasurementMap(measurements);

  const waist = validateAndRead(m, 'waist');
  const hip = validateAndRead(m, 'hip', (ms) =>
    round1(Math.max((ms.waist || 72) + 20, 94))
  );
  const trouserLength = validateAndRead(m, 'trouserLength', () => 108);
  const thigh = validateAndRead(m, 'thigh', (ms) =>
    round1((ms.hip || 98) * 0.58)
  );
  const knee = validateAndRead(m, 'knee', () => 42);
  const ankle = validateAndRead(m, 'ankle', () => 28);

  const waistQuarter = round1(waist / 4 + 1.5);
  const hipQuarter = round1(hip / 4 + 2.5);
  const crotchExtension = round1(clamp(hip / 16 + 1.5, 6.5, 10.5));
  const upperWidth = round1(hipQuarter + crotchExtension);
  const kneeWidth = round1(knee / 2);
  const ankleWidth = round1(ankle / 2);
  const crotchDepth = round1(clamp(hip / 4 + 2, 22, 32));
  const kneeLine = round1(trouserLength * 0.55);

  const outline: Point[] = [
    { x: 0, y: 0 },
    { x: waistQuarter, y: 0 },
    { x: upperWidth, y: crotchDepth },
    { x: kneeWidth, y: kneeLine },
    { x: ankleWidth, y: trouserLength },
    { x: -ankleWidth / 2, y: trouserLength },
    { x: -kneeWidth / 2, y: kneeLine },
    { x: -crotchExtension * 0.3, y: crotchDepth },
  ];

  return {
    kind: 'trouser',
    points: [...outline],
    outline,
    measurements: {
      waist,
      hip,
      trouserLength,
      thigh,
      knee,
      ankle,
      waistQuarter,
      hipQuarter,
      crotchDepth,
      crotchExtension,
    },
    guides: [
      {
        start: { x: 0, y: 0 },
        end: { x: 0, y: trouserLength },
        label: `${trouserLength}cm full length`,
      },
      {
        start: { x: 0, y: crotchDepth },
        end: { x: upperWidth, y: crotchDepth },
        label: `${crotchDepth}cm crotch depth`,
      },
      {
        start: { x: -kneeWidth / 2, y: kneeLine },
        end: { x: kneeWidth, y: kneeLine },
        label: `${knee}cm knee circumference guide`,
      },
      {
        start: { x: -ankleWidth / 2, y: trouserLength },
        end: { x: ankleWidth, y: trouserLength },
        label: `${ankle}cm ankle circumference guide`,
      },
    ],
    notes: [
      'Use as front-draft trouser guide.',
      'Back rise, fly, pockets, and waistband are added during detailed drafting.',
    ],
    pieceNotes: [
      { name: 'Front leg', quantity: 2 },
      { name: 'Back leg', quantity: 2, note: 'Add seat extension in detailed draft' },
      { name: 'Waistband', quantity: 1 },
      { name: 'Fly shield', quantity: 1 },
      { name: 'Pocket bags', quantity: 2 },
    ],
    notchPoints: [
      createNotch({ x: upperWidth, y: crotchDepth }, 'Crotch point'),
      createNotch({ x: kneeWidth, y: kneeLine }, 'Knee line'),
    ],
    seamAllowanceCm: 1.5,
  };
}

export function generateSkirtPattern(
  measurements: Partial<ExtendedMeasurements>
): GenericPatternDraft {
  const m = asMeasurementMap(measurements);

  const waist = validateAndRead(m, 'waist');
  const hip = validateAndRead(m, 'hip', (ms) =>
    round1(Math.max((ms.waist || 72) + 22, 96))
  );
  const skirtLength = validateAndRead(m, 'skirtLength', () => 75);

  const waistQuarter = round1(waist / 4 + 1.2);
  const hipQuarter = round1(hip / 4 + 1.8);
  const hipDrop = round1(clamp(hip / 10, 18, 24));
  const hemWidth = round1(hipQuarter + clamp(hipQuarter * 0.08, 1.5, 4));

  const outline: Point[] = [
    { x: 0, y: 0 },
    { x: waistQuarter, y: 0 },
    { x: hipQuarter, y: hipDrop },
    { x: hemWidth, y: skirtLength },
    { x: 0, y: skirtLength },
  ];

  return {
    kind: 'skirt',
    points: [...outline],
    outline,
    measurements: {
      waist,
      hip,
      skirtLength,
      waistQuarter,
      hipQuarter,
      hipDrop,
      hemWidth,
    },
    guides: [
      {
        start: { x: 0, y: 0 },
        end: { x: waistQuarter, y: 0 },
        label: `${waistQuarter}cm waist quarter`,
      },
      {
        start: { x: 0, y: hipDrop },
        end: { x: hipQuarter, y: hipDrop },
        label: `${hipQuarter}cm hip quarter`,
      },
      {
        start: { x: 0, y: 0 },
        end: { x: 0, y: skirtLength },
        label: `${skirtLength}cm skirt length`,
      },
    ],
    notes: [
      'Suitable for straight or lightly shaped skirt foundation.',
      'Pleats, flare, peplum, vent, or slit can be added afterward.',
    ],
    pieceNotes: [
      { name: 'Front skirt', quantity: 1, note: 'Usually cut on fold' },
      { name: 'Back skirt', quantity: 2 },
      { name: 'Waistband', quantity: 1 },
      { name: 'Facing or lining', quantity: 1, note: 'Optional by finish' },
    ],
    notchPoints: [
      createNotch({ x: hipQuarter, y: hipDrop }, 'Hip line'),
    ],
    seamAllowanceCm: 1.5,
  };
}

export function generateKaftanPattern(
  measurements: Partial<ExtendedMeasurements>
): GenericPatternDraft {
  const m = asMeasurementMap(measurements);

  const chest = validateAndRead(m, 'chest', (ms) => ms.bust || 96);
  const shoulder = validateAndRead(m, 'shoulder');
  const backLength = validateAndRead(m, 'backLength');
  const neck = validateAndRead(m, 'neck');

  const width = round1(chest / 4 + clamp(chest * 0.06, 6, 10));
  const fullLength = round1(backLength + clamp(backLength * 1.2, 45, 70));
  const shoulderDrop = round1(clamp(shoulder * 0.15, 1.5, 3));
  const sleeveFall = round1(clamp(width * 0.28, 7, 16));
  const neckWidth = round1(clamp(neck / 6, 5.5, 9));

  const outline: Point[] = [
    { x: 0, y: 0 },
    { x: neckWidth, y: 0 },
    { x: shoulder + sleeveFall, y: shoulderDrop },
    { x: width, y: round1(fullLength * 0.45) },
    { x: width - 1.5, y: fullLength },
    { x: 0, y: fullLength },
  ];

  return {
    kind: 'kaftan',
    points: [...outline],
    outline,
    measurements: {
      chest,
      shoulder,
      backLength,
      fullLength,
      width,
      neckWidth,
    },
    guides: [
      {
        start: { x: 0, y: 0 },
        end: { x: 0, y: fullLength },
        label: `${fullLength}cm full kaftan length`,
      },
      {
        start: { x: 0, y: 0 },
        end: { x: width, y: 0 },
        label: `${width}cm half width with ease`,
      },
    ],
    notes: [
      'Kaftan draft emphasizes loose ease and silhouette flow.',
      'Neckline, pockets, slit, embroidery, and facing are layered later.',
    ],
    pieceNotes: [
      { name: 'Front body', quantity: 1, note: 'Cut on fold' },
      { name: 'Back body', quantity: 1, note: 'Cut on fold' },
      { name: 'Facing / placket', quantity: 1 },
      { name: 'Pocket pieces', quantity: 2, note: 'Optional by style' },
    ],
    notchPoints: [
      createNotch({ x: shoulder + sleeveFall, y: shoulderDrop }, 'Shoulder / sleeve break'),
    ],
    seamAllowanceCm: 1.5,
  };
}

export function generateStylePattern(
  kind: StylePatternKind,
  measurements: Partial<ExtendedMeasurements>
): StylePatternResult {
  switch (kind) {
    case 'shirt':
      return generateShirtPattern(measurements);
    case 'trouser':
      return generateTrouserPattern(measurements);
    case 'skirt':
      return generateSkirtPattern(measurements);
    case 'kaftan':
      return generateKaftanPattern(measurements);
    case 'bodice':
    default:
      return generateBodicePattern(measurements as BodyMeasurements);
  }
}

export function scalePatternPoints(
  points: Point[],
  scale: number = 8,
  offset: { x: number; y: number } = { x: 50, y: 30 }
): Point[] {
  return points.map((point) => scalePoint(point, scale, offset));
}

export function generateBodiceSvgPath(
  pattern: BodicePatternResult,
  scale: number = 8
): string {
  const { controlPoints: cp } = pattern;
  const s = (p: Point) => scalePoint(p, scale, { x: 50, y: 30 });

  const A = s(cp.A);
  const E = s(cp.E);
  const G = s(cp.G);
  const J = s(cp.J);
  const I = s(cp.I);
  const K = s(cp.K);
  const D = s(cp.D);
  const F = s(cp.F);

  let path = `M ${F.x} ${F.y}`;
  path += ` Q ${A.x} ${A.y} ${E.x} ${E.y}`;
  path += ` L ${G.x} ${G.y}`;
  path += ` Q ${J.x} ${J.y - 12} ${I.x} ${I.y}`;
  path += ` Q ${I.x} ${K.y - 14} ${K.x} ${K.y}`;
  path += ` L ${D.x} ${D.y}`;
  path += ` L ${F.x} ${F.y}`;
  path += ' Z';

  return path;
}

export function generateDartPath(
  pattern: BodicePatternResult,
  scale: number = 8
): string {
  const { controlPoints: cp } = pattern;
  const s = (p: Point) => scalePoint(p, scale, { x: 50, y: 30 });

  const dartLeft = s(cp.dartLeft);
  const dartTip = s(cp.dartTip);
  const dartRight = s(cp.dartRight);

  return `M ${dartLeft.x} ${dartLeft.y} L ${dartTip.x} ${dartTip.y} L ${dartRight.x} ${dartRight.y}`;
}

export function generateGuideLines(
  pattern: BodicePatternResult,
  scale: number = 8
): {
  lines: { start: Point; end: Point; label: string }[];
} {
  const { controlPoints: cp, measurements: m } = pattern;
  const s = (p: Point) => scalePoint(p, scale, { x: 50, y: 30 });

  return {
    lines: [
      {
        start: s(cp.A),
        end: s(cp.B),
        label: `${m.quarterBust.toFixed(1)}cm (1/4 Bust + ease)`,
      },
      {
        start: s(cp.A),
        end: s(cp.D),
        label: `${cp.D.y.toFixed(1)}cm Back Length`,
      },
      {
        start: s(cp.A),
        end: s(cp.E),
        label: `${m.neckWidth.toFixed(1)}cm Neck Width`,
      },
      {
        start: s(cp.F),
        end: s(cp.H),
        label: `Armhole: ${m.armholeDepth.toFixed(1)}cm`,
      },
      {
        start: s(cp.dartLeft),
        end: s(cp.dartRight),
        label: `Dart Intake: ${m.dartIntake.toFixed(1)}cm`,
      },
    ],
  };
}
