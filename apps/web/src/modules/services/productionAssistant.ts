import {
  CuttingPiece,
  DesignInspiration,
  FabricRecord,
  FabricRequirementEstimate,
  FabricType,
  GarmentMeasurements,
  GarmentType,
  InspirationAnalysis,
  InspirationComplexity,
  MaterialUnit,
  ProductionPlan,
  SewingOperation,
  FitRiskWarning,
} from '../../types';

export interface GenerateProductionPlanInput {
  garmentType?: GarmentType | null;
  measurements?: Partial<GarmentMeasurements> | null;
  inspiration?: DesignInspiration | null;
  analysis?: InspirationAnalysis | null;
  selectedFabric?: FabricRecord | null;
}

const DEFAULT_FABRIC_UNIT: MaterialUnit = 'yards';

const GARMENT_KEYWORDS: Array<{
  garmentType: GarmentType;
  keywords: string[];
}> = [
  { garmentType: 'agbada', keywords: ['agbada', 'grand boubou'] },
  { garmentType: 'senator', keywords: ['senator', 'native set', 'native wear'] },
  { garmentType: 'kaftan', keywords: ['kaftan', 'jalabiya'] },
  { garmentType: 'trouser', keywords: ['trouser', 'pant', 'pants'] },
  { garmentType: 'skirt', keywords: ['skirt', 'pencil skirt', 'flare skirt'] },
  { garmentType: 'shirt', keywords: ['shirt', 'top shirt'] },
  { garmentType: 'blouse', keywords: ['blouse', 'ladies top'] },
  { garmentType: 'gown', keywords: ['gown', 'bridal gown', 'evening gown'] },
  {
    garmentType: 'dress',
    keywords: ['dress', 'bridal', 'wedding dress', 'bridemaid', 'bridesmaid'],
  },
  { garmentType: 'bodice', keywords: ['bodice'] },
  { garmentType: 'custom', keywords: ['custom', 'bespoke'] },
];

const DEFAULT_FABRIC_BY_GARMENT: Record<GarmentType, FabricType[]> = {
  bodice: ['cotton', 'linen', 'lace'],
  shirt: ['cotton', 'linen', 'silk'],
  trouser: ['cotton', 'linen', 'wool', 'denim'],
  skirt: ['cotton', 'linen', 'silk', 'lace'],
  kaftan: ['linen', 'cotton', 'silk', 'adire', 'ankara'],
  dress: ['silk', 'cotton', 'lace', 'velvet'],
  gown: ['silk', 'lace', 'velvet', 'brocade'],
  senator: ['cotton', 'linen', 'ankara', 'adire', 'brocade'],
  agbada: ['brocade', 'cotton', 'ankara', 'adire'],
  blouse: ['cotton', 'silk', 'lace', 'linen'],
  custom: ['cotton', 'linen', 'silk'],
};

function normalizeText(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function titleCase(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function getMeasurement(
  measurements: Partial<GarmentMeasurements> | null | undefined,
  ...keys: Array<keyof GarmentMeasurements>
): number | undefined {
  if (!measurements) return undefined;

  for (const key of keys) {
    const value = measurements[key];
    if (typeof value === 'number' && !Number.isNaN(value) && value > 0) {
      return value;
    }
  }

  return undefined;
}

function resolveFabricUnit(selectedFabric?: FabricRecord | null): MaterialUnit {
  if (!selectedFabric) return DEFAULT_FABRIC_UNIT;
  return selectedFabric.unit === 'pieces' ? DEFAULT_FABRIC_UNIT : selectedFabric.unit;
}

function dedupeStrings(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function inferComplexityFromText(text: string): InspirationComplexity {
  const highSignals = [
    'bridal',
    'wedding',
    'corset',
    'layered',
    'beaded',
    'embroidery',
    'embroidered',
    'pleated',
    'structured',
    'tailored',
    'asymmetrical',
    'train',
  ];

  const mediumSignals = [
    'fitted',
    'ruffle',
    'flare',
    'panel',
    'lining',
    'collar',
    'cuff',
    'zip',
    'zipper',
    'dart',
  ];

  if (highSignals.some((signal) => text.includes(signal))) return 'high';
  if (mediumSignals.some((signal) => text.includes(signal))) return 'medium';
  return 'low';
}

function detectFitType(text: string): InspirationAnalysis['fitType'] {
  if (text.includes('oversized')) return 'oversized';
  if (text.includes('relaxed')) return 'relaxed';
  if (text.includes('slim')) return 'slim';
  if (text.includes('regular')) return 'regular';
  if (text.includes('tailored') || text.includes('fitted') || text.includes('structured')) {
    return 'tailored';
  }
  return undefined;
}

function detectNeckline(text: string): string | undefined {
  if (text.includes('v-neck') || text.includes('v neck')) return 'V-Neck';
  if (text.includes('round neck')) return 'Round Neck';
  if (text.includes('square neck')) return 'Square Neck';
  if (text.includes('boat neck')) return 'Boat Neck';
  if (text.includes('mandarin')) return 'Mandarin Collar';
  if (text.includes('turtle')) return 'Turtle Neck';
  if (text.includes('off shoulder') || text.includes('off-shoulder')) return 'Off Shoulder';
  return undefined;
}

function detectSleeveStyle(text: string): string | undefined {
  if (text.includes('long sleeve')) return 'Long Sleeve';
  if (text.includes('short sleeve')) return 'Short Sleeve';
  if (text.includes('sleeveless')) return 'Sleeveless';
  if (text.includes('puff')) return 'Puff Sleeve';
  if (text.includes('bishop')) return 'Bishop Sleeve';
  if (text.includes('three quarter') || text.includes('3/4')) return 'Three-Quarter Sleeve';
  return undefined;
}

function detectSilhouette(text: string): string | undefined {
  if (text.includes('mermaid')) return 'Mermaid';
  if (text.includes('a-line') || text.includes('a line')) return 'A-Line';
  if (text.includes('straight')) return 'Straight';
  if (text.includes('flowy')) return 'Flowing';
  if (text.includes('fitted')) return 'Fitted';
  if (text.includes('structured')) return 'Structured';
  if (text.includes('ball gown')) return 'Ball Gown';
  return undefined;
}

function detectLengthType(text: string): string | undefined {
  if (text.includes('mini')) return 'Mini';
  if (text.includes('midi')) return 'Midi';
  if (text.includes('maxi')) return 'Maxi';
  if (text.includes('floor length')) return 'Floor Length';
  if (text.includes('ankle length')) return 'Ankle Length';
  if (text.includes('knee length')) return 'Knee Length';
  return undefined;
}

/**
 * Important:
 * We only use fallback when inference from inspiration fails.
 * This fixes the "Use AI Suggestion" behavior in DesignStudio.
 */
export function inferGarmentTypeFromInspiration(
  inspiration?: DesignInspiration | null,
  fallback?: GarmentType | null
): GarmentType {
  const category = inspiration?.category;
  if (category) {
    if (category === 'trousers') return 'trouser';
    if (category === 'shirt') return 'shirt';
    if (category === 'blouse') return 'blouse';
    if (category === 'skirt') return 'skirt';
    if (category === 'kaftan') return 'kaftan';
    if (category === 'senator') return 'senator';
    if (category === 'agbada') return 'agbada';
    if (category === 'gown') return 'gown';
    if (category === 'dress' || category === 'bridal' || category === 'wedding') {
      return 'dress';
    }
  }

  const text = normalizeText(
    [
      inspiration?.title,
      inspiration?.description,
      inspiration?.occasion,
      inspiration?.collarStyle,
      inspiration?.sleeveStyle,
      inspiration?.pocketStyle,
      ...(inspiration?.tags || []),
    ].join(' ')
  );

  for (const entry of GARMENT_KEYWORDS) {
    if (entry.keywords.some((keyword) => text.includes(keyword))) {
      return entry.garmentType;
    }
  }

  return fallback || 'bodice';
}

export function analyzeDesignInspiration(
  inspiration?: DesignInspiration | null,
  garmentType?: GarmentType | null
): InspirationAnalysis {
  const inferredGarmentType = inferGarmentTypeFromInspiration(inspiration);
  const resolvedGarmentType = garmentType || inferredGarmentType;

  const text = normalizeText(
    [
      inspiration?.title,
      inspiration?.description,
      inspiration?.occasion,
      inspiration?.collarStyle,
      inspiration?.sleeveStyle,
      inspiration?.pocketStyle,
      inspiration?.embroideryNotes,
      ...(inspiration?.tags || []),
    ].join(' ')
  );

  const complexityLevel = inferComplexityFromText(text);
  const fitType = inspiration?.fitType || detectFitType(text);
  const neckline = inspiration?.collarStyle || detectNeckline(text);
  const sleeveStyle = inspiration?.sleeveStyle || detectSleeveStyle(text);
  const silhouette = detectSilhouette(text);
  const lengthType = detectLengthType(text);

  const recommendedFabricTypes = dedupeStrings([
    inspiration?.fabricType || '',
    ...DEFAULT_FABRIC_BY_GARMENT[resolvedGarmentType],
  ]) as FabricType[];

  const styleNotes = dedupeStrings([
    silhouette ? `Silhouette reads as ${silhouette.toLowerCase()}.` : '',
    neckline ? `Preferred neckline/collar: ${neckline}.` : '',
    sleeveStyle ? `Sleeve direction: ${sleeveStyle}.` : '',
    inspiration?.primaryColor ? `Primary color direction: ${inspiration.primaryColor}.` : '',
    inspiration?.secondaryColor ? `Secondary accent: ${inspiration.secondaryColor}.` : '',
  ]);

  const constructionNotes = dedupeStrings([
    complexityLevel === 'high'
      ? 'Schedule at least one fitting before final finishing.'
      : '',
    text.includes('embroidery') || text.includes('bead')
      ? 'Complete embellishment placement before final joining where possible.'
      : '',
    text.includes('lining') || resolvedGarmentType === 'gown' || resolvedGarmentType === 'dress'
      ? 'Check whether lining or facing is needed for shape control and clean finish.'
      : '',
    resolvedGarmentType === 'shirt' || resolvedGarmentType === 'senator'
      ? 'Confirm collar, cuff, and front opening decisions before cutting.'
      : '',
    resolvedGarmentType === 'trouser'
      ? 'Confirm rise, seat ease, and hem opening before final cut.'
      : '',
  ]);

  const confidenceBase =
    inspiration && inspiration.title && inspiration.description ? 0.86 : inspiration ? 0.72 : 0.55;

  return {
    suggestedGarmentType: inferredGarmentType,
    silhouette,
    neckline,
    sleeveStyle,
    lengthType,
    fitType,
    recommendedFabricTypes,
    complexityLevel,
    styleNotes,
    constructionNotes,
    confidence: round1(confidenceBase),
  };
}

export function estimateFabricRequirement({
  garmentType,
  measurements,
  analysis,
  selectedFabric,
}: {
  garmentType: GarmentType;
  measurements?: Partial<GarmentMeasurements> | null;
  analysis?: InspirationAnalysis | null;
  selectedFabric?: FabricRecord | null;
}): FabricRequirementEstimate {
  const bust = getMeasurement(measurements, 'bust', 'chest') || 96;
  const hip = getMeasurement(measurements, 'hip') || 102;
  const backLength = getMeasurement(measurements, 'backLength') || 40;
  const sleeve = getMeasurement(measurements, 'sleeve') || 24;
  const skirtLength = getMeasurement(measurements, 'skirtLength') || 75;
  const trouserLength = getMeasurement(measurements, 'trouserLength') || 108;
  const fullLength =
    getMeasurement(measurements, 'fullLength') ||
    Math.max(backLength + skirtLength, backLength + 55);

  const unit = resolveFabricUnit(selectedFabric);

  let mainFabricQty = 0;
  let liningQty = 0;
  let interfacingQty = 0;

  switch (garmentType) {
    case 'bodice':
      mainFabricQty = 1.1 + bust / 220 + sleeve / 200;
      liningQty = 0.7;
      interfacingQty = 0.2;
      break;

    case 'shirt':
      mainFabricQty = 1.9 + bust / 180 + sleeve / 120;
      liningQty = 0;
      interfacingQty = 0.35;
      break;

    case 'blouse':
      mainFabricQty = 1.6 + bust / 190 + sleeve / 150;
      liningQty = 0.5;
      interfacingQty = 0.2;
      break;

    case 'trouser':
      mainFabricQty = 1.7 + hip / 210 + trouserLength / 180;
      liningQty = 0.35;
      interfacingQty = 0.15;
      break;

    case 'skirt':
      mainFabricQty = 1.4 + hip / 220 + skirtLength / 170;
      liningQty = skirtLength > 85 ? 1.0 : 0.6;
      interfacingQty = 0.15;
      break;

    case 'kaftan':
      mainFabricQty = 2.9 + bust / 170 + fullLength / 140;
      liningQty = 0.6;
      interfacingQty = 0.2;
      break;

    case 'dress':
      mainFabricQty = 2.6 + bust / 180 + hip / 220 + fullLength / 150;
      liningQty = 1.2;
      interfacingQty = 0.25;
      break;

    case 'gown':
      mainFabricQty = 3.8 + bust / 170 + hip / 210 + fullLength / 120;
      liningQty = 1.8;
      interfacingQty = 0.35;
      break;

    case 'senator':
      mainFabricQty = 2.7 + bust / 180 + fullLength / 170;
      liningQty = 0.2;
      interfacingQty = 0.3;
      break;

    case 'agbada':
      mainFabricQty = 4.8 + bust / 160 + fullLength / 130;
      liningQty = 0.4;
      interfacingQty = 0.25;
      break;

    case 'custom':
    default:
      mainFabricQty = 2.2 + bust / 200 + hip / 260;
      liningQty = 0.8;
      interfacingQty = 0.2;
      break;
  }

  if (analysis?.complexityLevel === 'medium') {
    mainFabricQty += 0.3;
  }

  if (analysis?.complexityLevel === 'high') {
    mainFabricQty += 0.7;
    liningQty += 0.2;
    interfacingQty += 0.1;
  }

  if ((analysis?.silhouette || '').toLowerCase().includes('flow')) {
    mainFabricQty += 0.5;
  }

  if ((analysis?.silhouette || '').toLowerCase().includes('ball')) {
    mainFabricQty += 1.2;
    liningQty += 0.5;
  }

  const notes = dedupeStrings([
    selectedFabric ? `Estimate based on selected fabric: ${selectedFabric.name}.` : '',
    analysis?.recommendedFabricTypes?.length
      ? `Recommended fabric direction: ${analysis.recommendedFabricTypes
          .slice(0, 3)
          .map(titleCase)
          .join(', ')}.`
      : '',
    analysis?.complexityLevel === 'high'
      ? 'Add extra allowance for matching, directional layout, trimming, and correction during fitting.'
      : 'Add a small extra allowance for shrinkage, seam testing, and matching.',
  ]);

  return {
    fabricType:
      selectedFabric?.fabricType ||
      analysis?.recommendedFabricTypes?.[0] ||
      DEFAULT_FABRIC_BY_GARMENT[garmentType][0],
    mainFabricQty: round1(mainFabricQty),
    liningQty: liningQty > 0 ? round1(liningQty) : undefined,
    interfacingQty: interfacingQty > 0 ? round1(interfacingQty) : undefined,
    unit,
    notes,
  };
}

export function buildCuttingList({
  garmentType,
  analysis,
}: {
  garmentType: GarmentType;
  analysis?: InspirationAnalysis | null;
}): CuttingPiece[] {
  const neckline = normalizeText(analysis?.neckline);
  const sleeveStyle = normalizeText(analysis?.sleeveStyle);

  const commonBodice = [
    { name: 'Front Bodice', quantity: 1, cutOnFold: true, fabric: 'main' as const },
    { name: 'Back Bodice', quantity: 2, fabric: 'main' as const },
    {
      name: 'Facing / Front Facing',
      quantity: 1,
      cutOnFold: true,
      fabric: 'interfacing' as const,
    },
    { name: 'Back Facing', quantity: 2, fabric: 'interfacing' as const },
  ];

  const sleeves =
    sleeveStyle !== 'sleeveless'
      ? [{ name: 'Sleeve', quantity: 2, fabric: 'main' as const }]
      : [];

  switch (garmentType) {
    case 'bodice':
      return [...commonBodice, ...sleeves];

    case 'shirt':
      return [
        { name: 'Front Shirt Panel', quantity: 2, fabric: 'main' },
        { name: 'Back Shirt Panel', quantity: 1, cutOnFold: true, fabric: 'main' },
        { name: 'Sleeve', quantity: 2, fabric: 'main' },
        { name: 'Collar', quantity: 2, fabric: 'main', notes: 'Fuse one side' },
        { name: 'Collar Stand', quantity: 2, fabric: 'main' },
        { name: 'Front Placket', quantity: 2, fabric: 'interfacing' },
        { name: 'Cuff', quantity: 2, fabric: 'main' },
        { name: 'Pocket', quantity: 1, fabric: 'main', notes: 'Optional if style needs it' },
      ];

    case 'blouse':
      return [
        ...commonBodice,
        ...sleeves,
        {
          name: 'Waist Facing / Hem Facing',
          quantity: 1,
          cutOnFold: true,
          fabric: 'interfacing',
        },
      ];

    case 'trouser':
      return [
        { name: 'Front Leg', quantity: 2, fabric: 'main' },
        { name: 'Back Leg', quantity: 2, fabric: 'main' },
        { name: 'Waistband', quantity: 1, fabric: 'main' },
        { name: 'Pocket Bag', quantity: 2, fabric: 'lining' },
        { name: 'Fly Shield', quantity: 1, fabric: 'main' },
        { name: 'Fly Facing', quantity: 1, fabric: 'interfacing' },
      ];

    case 'skirt':
      return [
        { name: 'Front Skirt', quantity: 1, cutOnFold: true, fabric: 'main' },
        { name: 'Back Skirt', quantity: 2, fabric: 'main' },
        { name: 'Waistband', quantity: 1, fabric: 'main' },
        { name: 'Waist Facing', quantity: 1, fabric: 'interfacing' },
        { name: 'Lining Skirt', quantity: 1, cutOnFold: true, fabric: 'lining' },
      ];

    case 'kaftan':
      return [
        { name: 'Front Kaftan Body', quantity: 1, cutOnFold: true, fabric: 'main' },
        { name: 'Back Kaftan Body', quantity: 1, cutOnFold: true, fabric: 'main' },
        { name: 'Neck Facing', quantity: 2, fabric: 'interfacing' },
        {
          name: 'Pocket Piece',
          quantity: 2,
          fabric: 'main',
          notes: 'Optional if adding side pockets',
        },
      ];

    case 'dress':
      return [
        { name: 'Front Bodice', quantity: 1, cutOnFold: true, fabric: 'main' },
        { name: 'Back Bodice', quantity: 2, fabric: 'main' },
        { name: 'Front Skirt Panel', quantity: 1, cutOnFold: true, fabric: 'main' },
        { name: 'Back Skirt Panel', quantity: 2, fabric: 'main' },
        ...sleeves,
        { name: 'Bodice Lining', quantity: 1, cutOnFold: true, fabric: 'lining' },
        { name: 'Back Bodice Lining', quantity: 2, fabric: 'lining' },
        {
          name: neckline.includes('off shoulder') ? 'Upper Facing' : 'Neck Facing',
          quantity: 2,
          fabric: 'interfacing',
        },
      ];

    case 'gown':
      return [
        { name: 'Front Bodice', quantity: 1, cutOnFold: true, fabric: 'main' },
        { name: 'Back Bodice', quantity: 2, fabric: 'main' },
        { name: 'Front Skirt Panel', quantity: 2, fabric: 'main' },
        { name: 'Back Skirt Panel', quantity: 2, fabric: 'main' },
        { name: 'Bodice Lining', quantity: 1, cutOnFold: true, fabric: 'lining' },
        { name: 'Back Bodice Lining', quantity: 2, fabric: 'lining' },
        {
          name: 'Horsehair / Hem Support',
          quantity: 1,
          fabric: 'interfacing',
          notes: 'Optional for structured hem',
        },
        ...sleeves,
      ];

    case 'senator':
      return [
        { name: 'Front Body', quantity: 1, cutOnFold: true, fabric: 'main' },
        { name: 'Back Body', quantity: 1, cutOnFold: true, fabric: 'main' },
        { name: 'Sleeve', quantity: 2, fabric: 'main' },
        { name: 'Collar', quantity: 2, fabric: 'main' },
        { name: 'Collar Stand / Neck Facing', quantity: 2, fabric: 'interfacing' },
        {
          name: 'Pocket Welt',
          quantity: 2,
          fabric: 'main',
          notes: 'Optional depending on style',
        },
      ];

    case 'agbada':
      return [
        { name: 'Inner Tunic Front', quantity: 1, cutOnFold: true, fabric: 'main' },
        { name: 'Inner Tunic Back', quantity: 1, cutOnFold: true, fabric: 'main' },
        { name: 'Outer Agbada Panel', quantity: 2, fabric: 'main' },
        { name: 'Neck Facing', quantity: 2, fabric: 'interfacing' },
        {
          name: 'Side Reinforcement',
          quantity: 2,
          fabric: 'interfacing',
          notes: 'Optional for heavy embroidery zones',
        },
      ];

    case 'custom':
    default:
      return [
        { name: 'Main Front Piece', quantity: 1, cutOnFold: true, fabric: 'main' },
        { name: 'Main Back Piece', quantity: 2, fabric: 'main' },
        { name: 'Facing / Lining Support', quantity: 2, fabric: 'interfacing' },
      ];
  }
}

function withStepNumbers(steps: Array<Omit<SewingOperation, 'step'>>): SewingOperation[] {
  return steps.map((step, index) => ({
    step: index + 1,
    ...step,
  }));
}

export function buildSewingChecklist({
  garmentType,
  analysis,
}: {
  garmentType: GarmentType;
  analysis?: InspirationAnalysis | null;
}): SewingOperation[] {
  const neckline = analysis?.neckline || 'selected neckline';
  const sleeveStyle = analysis?.sleeveStyle || 'selected sleeve';

  const prepSteps: Array<Omit<SewingOperation, 'step'>> = [
    {
      title: 'Review design brief',
      description:
        'Confirm garment style, fabric direction, fit intention, closure choice, and finishing method before cutting.',
      category: 'prep',
    },
    {
      title: 'Check and prepare fabric',
      description:
        'Inspect flaws, pre-shrink if needed, press flat, and align grain before laying out pattern pieces.',
      category: 'prep',
    },
    {
      title: 'Mark pattern pieces',
      description:
        'Transfer notches, darts, grain lines, waistlines, center lines, zipper points, and fitting marks clearly.',
      category: 'cutting',
    },
  ];

  const stepsByGarment: Record<GarmentType, Array<Omit<SewingOperation, 'step'>>> = {
    bodice: [
      {
        title: 'Join darts and shaping lines',
        description: 'Sew bust and waist shaping accurately, then press toward the correct direction.',
        category: 'assembly',
      },
      {
        title: 'Join shoulder seams',
        description: 'Match shoulder seams and stabilize if fabric is soft or stretchy.',
        category: 'assembly',
      },
      {
        title: 'Finish neckline',
        description: `Attach facing or finish the ${neckline.toLowerCase()} neatly.`,
        category: 'assembly',
      },
      {
        title: 'Join side seams',
        description: 'Check waist and bust alignment before closing side seams.',
        category: 'assembly',
      },
      {
        title: 'Set sleeve or finish armhole',
        description: `Attach ${sleeveStyle.toLowerCase()} or finish armhole edges cleanly.`,
        category: 'assembly',
      },
      {
        title: 'Fit check',
        description: 'Test bust fit, neckline balance, shoulder angle, and waist suppression before final hem.',
        category: 'fitting',
      },
      {
        title: 'Final finish',
        description: 'Hem, trim loose threads, press fully, and prepare for styling or joining to skirt.',
        category: 'finishing',
      },
    ],

    shirt: [
      {
        title: 'Prepare front opening',
        description: 'Fuse and sew plackets, then topstitch cleanly.',
        category: 'assembly',
      },
      {
        title: 'Join shoulders and yoke',
        description: 'Assemble shoulder/yoke area and press flat for clean collar setup.',
        category: 'assembly',
      },
      {
        title: 'Build collar and stand',
        description: 'Fuse one collar layer, stitch collar, attach stand, and check symmetry.',
        category: 'assembly',
      },
      {
        title: 'Attach sleeves',
        description: 'Sew sleeves into armholes and smooth ease carefully.',
        category: 'assembly',
      },
      {
        title: 'Close side seams and sleeve seams',
        description: 'Join underarm and side seams with matching notches and armhole points.',
        category: 'assembly',
      },
      {
        title: 'Finish cuffs and hem',
        description: 'Attach cuffs if used, hem body, and finalize topstitching.',
        category: 'finishing',
      },
      {
        title: 'Button placement and pressing',
        description: 'Mark button/buttonhole points, sew, test closure, and final press.',
        category: 'finishing',
      },
    ],

    blouse: [
      {
        title: 'Sew bodice shaping',
        description: 'Join darts or princess lines first and press smoothly.',
        category: 'assembly',
      },
      {
        title: 'Join shoulders and neckline finish',
        description: `Complete shoulder seams, then finish the ${neckline.toLowerCase()}.`,
        category: 'assembly',
      },
      {
        title: 'Attach sleeves or finish armhole',
        description: `Set ${sleeveStyle.toLowerCase()} and balance cap fullness if present.`,
        category: 'assembly',
      },
      {
        title: 'Close side seams',
        description: 'Check bust-to-waist shaping before closing side seams.',
        category: 'assembly',
      },
      {
        title: 'Fit and refine',
        description: 'Check bust fit, arm movement, sleeve balance, and hemline position.',
        category: 'fitting',
      },
      {
        title: 'Final finish',
        description: 'Finish hems, closures, and pressing.',
        category: 'finishing',
      },
    ],

    trouser: [
      {
        title: 'Prepare pockets and fly pieces',
        description: 'Assemble pocket bags, fly shield, and interfaced facing before main joining.',
        category: 'assembly',
      },
      {
        title: 'Sew front and back leg seams',
        description: 'Join darts if any, then sew leg shaping and press seams open or toward back.',
        category: 'assembly',
      },
      {
        title: 'Join crotch seam',
        description: 'Match rise carefully and reinforce stress point at crotch curve.',
        category: 'assembly',
      },
      {
        title: 'Join inseam and side seam',
        description: 'Check leg balance, knee line, and hem width before closing all long seams.',
        category: 'assembly',
      },
      {
        title: 'Attach waistband',
        description: 'Fuse waistband, attach evenly, and confirm waist measurement before closure.',
        category: 'assembly',
      },
      {
        title: 'First fitting',
        description: 'Check waist, seat, thigh ease, crotch depth, and hem length.',
        category: 'fitting',
      },
      {
        title: 'Hem and finish',
        description: 'Mark final length, hem cleanly, and final press crease if needed.',
        category: 'finishing',
      },
    ],

    skirt: [
      {
        title: 'Join darts and skirt panels',
        description: 'Sew shaping darts or panel seams and press flat.',
        category: 'assembly',
      },
      {
        title: 'Install closure',
        description: 'Insert zipper or prepare waistband opening before final waistband join.',
        category: 'assembly',
      },
      {
        title: 'Attach waistband',
        description: 'Fuse waistband, attach, and confirm waist measurement at join stage.',
        category: 'assembly',
      },
      {
        title: 'Join lining if required',
        description: 'Attach or bag out lining/facing based on finish method.',
        category: 'assembly',
      },
      {
        title: 'Fit and length check',
        description: 'Confirm hip ease, waist fit, and hem level.',
        category: 'fitting',
      },
      {
        title: 'Hem and final press',
        description: 'Level hem, stitch final hem, and press thoroughly.',
        category: 'finishing',
      },
    ],

    kaftan: [
      {
        title: 'Prepare neckline',
        description: 'Mark center front and shape neckline carefully before major assembly.',
        category: 'assembly',
      },
      {
        title: 'Join shoulders or upper body',
        description: 'Assemble top section and stabilize neckline area.',
        category: 'assembly',
      },
      {
        title: 'Join side seams',
        description: 'Check body width, sleeve opening, and side slit position before closing.',
        category: 'assembly',
      },
      {
        title: 'Attach pockets or embroidery sections',
        description: 'Apply any design panel, embroidery, or pocket detail before final finishing.',
        category: 'assembly',
      },
      {
        title: 'Fit review',
        description: 'Check drape, neckline depth, width ease, and overall fall on the body.',
        category: 'fitting',
      },
      {
        title: 'Finish openings and hem',
        description: 'Complete neckline, sleeve openings, side slits, and hem with clean pressing.',
        category: 'finishing',
      },
    ],

    dress: [
      {
        title: 'Assemble bodice shaping',
        description: 'Sew darts or princess seams and confirm bodice balance before joining skirt.',
        category: 'assembly',
      },
      {
        title: 'Finish neckline and shoulders',
        description: `Construct neckline around the ${neckline.toLowerCase()} and secure shoulder seams.`,
        category: 'assembly',
      },
      {
        title: 'Attach sleeves or complete armhole finish',
        description: `Set ${sleeveStyle.toLowerCase()} if required and smooth sleeve head.`,
        category: 'assembly',
      },
      {
        title: 'Join skirt panels',
        description: 'Assemble front and back skirt pieces, pockets, and any panel details.',
        category: 'assembly',
      },
      {
        title: 'Join bodice to skirt',
        description: 'Match waist seam accurately at center and side seam reference points.',
        category: 'assembly',
      },
      {
        title: 'Insert closure',
        description: 'Install zipper, loop, or button closure before lining closure.',
        category: 'assembly',
      },
      {
        title: 'First fitting',
        description: 'Check bust, waist, hip, armhole, neckline, and overall length balance.',
        category: 'fitting',
      },
      {
        title: 'Finish hem and final press',
        description: 'Level hem, finish lining, trim threads, and press garment for delivery.',
        category: 'finishing',
      },
    ],

    gown: [
      {
        title: 'Build foundation bodice',
        description: 'Join structured bodice seams and stabilize support areas before decorative work.',
        category: 'assembly',
      },
      {
        title: 'Prepare skirt volume',
        description: 'Assemble skirt panels or layers and confirm grain direction across all panels.',
        category: 'assembly',
      },
      {
        title: 'Join bodice to skirt',
        description: 'Balance waist seam exactly and support heavy skirt join if needed.',
        category: 'assembly',
      },
      {
        title: 'Install lining and closure',
        description: 'Bag out bodice lining and install zipper or corset closure neatly.',
        category: 'assembly',
      },
      {
        title: 'Structured fitting review',
        description: 'Check bust support, waist hold, hip flare, train flow, and movement.',
        category: 'fitting',
      },
      {
        title: 'Final embellishment and finish',
        description: 'Complete beadwork hand-finish, hem control, and full final press.',
        category: 'finishing',
      },
    ],

    senator: [
      {
        title: 'Prepare neckline and front detail',
        description: 'Mark placket/front opening and stabilize neckline area before major joining.',
        category: 'assembly',
      },
      {
        title: 'Join shoulder and side seams',
        description: 'Assemble main body and check ease across chest and waist.',
        category: 'assembly',
      },
      {
        title: 'Attach sleeves',
        description: 'Set sleeves evenly and check mobility at underarm.',
        category: 'assembly',
      },
      {
        title: 'Build collar and finishing edges',
        description: 'Construct collar neatly and finish front opening, cuff, and hem.',
        category: 'assembly',
      },
      {
        title: 'Tailored fitting review',
        description: 'Check neckline stand, chest ease, sleeve balance, and garment length.',
        category: 'fitting',
      },
      {
        title: 'Final topstitch and press',
        description: 'Finish hems, visible topstitching, and presentation pressing.',
        category: 'finishing',
      },
    ],

    agbada: [
      {
        title: 'Prepare inner tunic',
        description: 'Assemble inner garment first and confirm neckline, shoulder, and body width.',
        category: 'assembly',
      },
      {
        title: 'Prepare outer agbada panels',
        description: 'Cut and join wide flowing panels with symmetry and embroidery placement in mind.',
        category: 'assembly',
      },
      {
        title: 'Join neckline and reinforcement',
        description: 'Stabilize neck area and apply facing or support before finishing edges.',
        category: 'assembly',
      },
      {
        title: 'Check drape and width balance',
        description: 'Ensure outer garment hangs evenly and opens correctly over inner layer.',
        category: 'fitting',
      },
      {
        title: 'Finish edges and pressing',
        description: 'Complete visible hems, neckline detailing, and deep pressing for clean fall.',
        category: 'finishing',
      },
    ],

    custom: [
      {
        title: 'Break style into major construction zones',
        description: 'Separate bodice, lower body, closure, neckline, sleeve, and finishing requirements.',
        category: 'prep',
      },
      {
        title: 'Assemble structural seams first',
        description: 'Complete seams that define fit before decorative or finishing work.',
        category: 'assembly',
      },
      {
        title: 'Conduct fitting review',
        description: 'Check all key body balance points and make corrections before final finishing.',
        category: 'fitting',
      },
      {
        title: 'Complete final finishing',
        description: 'Finalize hems, closures, topstitching, trims, and pressing.',
        category: 'finishing',
      },
    ],
  };

  return withStepNumbers([...prepSteps, ...stepsByGarment[garmentType]]);
}

function getMeasurementCompleteness(
  garmentType: GarmentType,
  measurements?: Partial<GarmentMeasurements> | null
): number {
  if (!measurements) return 0;

  const requiredMap: Record<GarmentType, Array<keyof GarmentMeasurements>> = {
    bodice: ['bust', 'waist', 'neck', 'shoulder', 'backLength', 'bustSpan', 'armholeDepth'],
    shirt: ['chest', 'neck', 'shoulder', 'sleeve', 'backLength'],
    blouse: ['bust', 'waist', 'neck', 'shoulder', 'backLength', 'sleeve'],
    trouser: ['waist', 'hip', 'trouserLength', 'thigh', 'knee', 'ankle'],
    skirt: ['waist', 'hip', 'skirtLength'],
    kaftan: ['chest', 'shoulder', 'backLength'],
    dress: ['bust', 'waist', 'hip', 'shoulder', 'backLength'],
    gown: ['bust', 'waist', 'hip', 'shoulder', 'backLength'],
    senator: ['chest', 'waist', 'shoulder', 'backLength', 'sleeve'],
    agbada: ['chest', 'shoulder', 'backLength'],
    custom: ['bust', 'waist', 'hip', 'shoulder', 'backLength'],
  };

  const required = requiredMap[garmentType];
  const present = required.filter((key) => {
    const value = measurements[key];
    return typeof value === 'number' && value > 0;
  }).length;

  return required.length === 0 ? 1 : present / required.length;
}

export function buildFitRiskWarnings({
  garmentType,
  measurements,
  analysis,
}: {
  garmentType: GarmentType;
  measurements?: Partial<GarmentMeasurements> | null;
  analysis?: InspirationAnalysis | null;
}): FitRiskWarning[] {
  const warnings: FitRiskWarning[] = [];

  const bust = getMeasurement(measurements, 'bust', 'chest');
  const waist = getMeasurement(measurements, 'waist');
  const hip = getMeasurement(measurements, 'hip');
  const shoulder = getMeasurement(measurements, 'shoulder');
  const armholeDepth = getMeasurement(measurements, 'armholeDepth');
  const bustSpan = getMeasurement(measurements, 'bustSpan');
  const sleeve = getMeasurement(measurements, 'sleeve');
  const trouserLength = getMeasurement(measurements, 'trouserLength');
  const skirtLength = getMeasurement(measurements, 'skirtLength');

  const completeness = getMeasurementCompleteness(garmentType, measurements);

  if (completeness < 0.6) {
    warnings.push({
      severity: 'high',
      title: 'Insufficient measurement coverage',
      description:
        'The current measurements are not enough for confident drafting and fit balancing for this garment type.',
      recommendation:
        'Capture the missing key measurements before final cutting. Use a first fitting before committing to finishing.',
    });
  }

  if (
    ['bodice', 'dress', 'gown', 'blouse'].includes(garmentType) &&
    (armholeDepth === undefined || bustSpan === undefined)
  ) {
    warnings.push({
      severity: 'medium',
      title: 'Upper-body draft may be unstable',
      description:
        'Bust span or armhole depth is missing, so dart placement and armhole balance may be less accurate.',
      recommendation:
        'Add bust span and armhole depth before final pattern approval.',
    });
  }

  if (shoulder !== undefined && (shoulder < 9.5 || shoulder > 17.5)) {
    warnings.push({
      severity: 'medium',
      title: 'Shoulder balance risk',
      description:
        'The shoulder measurement is outside the usual working range, which may affect neckline balance and sleeve hang.',
      recommendation:
        'Double-check shoulder tip location and test muslin or sample before final cut.',
    });
  }

  if (
    bust !== undefined &&
    waist !== undefined &&
    ['bodice', 'dress', 'gown', 'blouse'].includes(garmentType) &&
    bust - waist > 22
  ) {
    warnings.push({
      severity: 'medium',
      title: 'Strong waist suppression required',
      description:
        'There is a large bust-to-waist difference, so shaping and dart control need extra attention.',
      recommendation:
        'Use fitting seams or controlled darts and plan at least one fitting session.',
    });
  }

  if (
    hip !== undefined &&
    waist !== undefined &&
    ['trouser', 'skirt', 'dress', 'gown'].includes(garmentType) &&
    hip - waist > 28
  ) {
    warnings.push({
      severity: 'medium',
      title: 'Hip ease and shaping risk',
      description:
        'A pronounced waist-to-hip difference can cause pull lines, zipper stress, or restricted movement if not balanced.',
      recommendation:
        'Check hip allowance, zipper length, and side seam shaping before cutting all pieces.',
    });
  }

  if (garmentType === 'trouser' && trouserLength === undefined) {
    warnings.push({
      severity: 'high',
      title: 'Trouser length missing',
      description:
        'Trouser pattern cannot be safely finalized without full length or inseam guidance.',
      recommendation:
        'Add trouser length and check hem style before generating the final trouser draft.',
    });
  }

  if (garmentType === 'skirt' && skirtLength === undefined) {
    warnings.push({
      severity: 'medium',
      title: 'Skirt length missing',
      description:
        'Skirt hem placement and fabric estimate will be approximate without a confirmed skirt length.',
      recommendation:
        'Capture skirt length before final cut and hem planning.',
    });
  }

  if (
    ['shirt', 'blouse', 'senator'].includes(garmentType) &&
    sleeve === undefined &&
    normalizeText(analysis?.sleeveStyle) !== 'sleeveless'
  ) {
    warnings.push({
      severity: 'medium',
      title: 'Sleeve measurement missing',
      description:
        'The chosen style suggests sleeves, but sleeve length is missing.',
      recommendation:
        'Add sleeve measurement to avoid inaccurate sleeve length and cuff placement.',
    });
  }

  if (analysis?.complexityLevel === 'high') {
    warnings.push({
      severity: 'high',
      title: 'High construction complexity',
      description:
        'This style contains advanced design cues that increase the chance of fitting and construction corrections.',
      recommendation:
        'Plan an intermediate sample or fitting before final finishing and embellishment.',
    });
  }

  if (!analysis?.recommendedFabricTypes?.length) {
    warnings.push({
      severity: 'low',
      title: 'Fabric direction not fully defined',
      description:
        'The production plan has limited fabric behavior information, so drape and structure may differ from the inspiration.',
      recommendation:
        'Confirm the exact fabric weight, stretch, and drape before cutting.',
    });
  }

  return warnings;
}

function buildTailorNotes({
  garmentType,
  analysis,
  selectedFabric,
  measurements,
}: {
  garmentType: GarmentType;
  analysis?: InspirationAnalysis | null;
  selectedFabric?: FabricRecord | null;
  measurements?: Partial<GarmentMeasurements> | null;
}): string[] {
  const notes = dedupeStrings([
    `Primary garment interpretation: ${titleCase(garmentType)}.`,
    analysis?.fitType ? `Fit direction: ${titleCase(analysis.fitType)}.` : '',
    analysis?.silhouette ? `Silhouette target: ${analysis.silhouette}.` : '',
    analysis?.neckline ? `Neckline/collar target: ${analysis.neckline}.` : '',
    analysis?.sleeveStyle ? `Sleeve target: ${analysis.sleeveStyle}.` : '',
    selectedFabric
      ? `Selected fabric: ${selectedFabric.name} (${titleCase(selectedFabric.fabricType)}).`
      : '',
    getMeasurement(measurements, 'bust', 'chest')
      ? 'Cross-check bust/chest ease against intended style before cutting all major pieces.'
      : '',
    garmentType === 'trouser'
      ? 'Confirm crotch depth and hem break during fitting before final waistband finishing.'
      : '',
    garmentType === 'dress' || garmentType === 'gown'
      ? 'Balance bodice fit before attaching final skirt or completing full lining close.'
      : '',
    garmentType === 'senator' || garmentType === 'shirt'
      ? 'Finalize front opening, collar height, and sleeve finish before bulk cutting.'
      : '',
    ...(analysis?.constructionNotes || []),
  ]);

  return notes;
}

export function generateProductionPlan(
  input: GenerateProductionPlanInput
): ProductionPlan {
  const garmentType =
    input.garmentType ||
    inferGarmentTypeFromInspiration(
      input.inspiration,
      input.analysis?.suggestedGarmentType || undefined
    );

  const analysis =
    input.analysis || analyzeDesignInspiration(input.inspiration, garmentType);

  const fabricEstimate = estimateFabricRequirement({
    garmentType,
    measurements: input.measurements,
    analysis,
    selectedFabric: input.selectedFabric,
  });

  const cuttingList = buildCuttingList({
    garmentType,
    analysis,
  });

  const sewingChecklist = buildSewingChecklist({
    garmentType,
    analysis,
  });

  const fitRisks = buildFitRiskWarnings({
    garmentType,
    measurements: input.measurements,
    analysis,
  });

  const tailorNotes = buildTailorNotes({
    garmentType,
    analysis,
    selectedFabric: input.selectedFabric,
    measurements: input.measurements,
  });

  return {
    garmentType,
    fabricEstimate,
    cuttingList,
    sewingChecklist,
    fitRisks,
    tailorNotes,
    generatedAt: new Date(),
  };
}

export function generateProductionPlanFromInspiration(
  inspiration: DesignInspiration,
  measurements?: Partial<GarmentMeasurements> | null,
  selectedFabric?: FabricRecord | null
): ProductionPlan {
  const analysis = analyzeDesignInspiration(inspiration);
  return generateProductionPlan({
    garmentType: analysis.suggestedGarmentType,
    measurements,
    inspiration,
    analysis,
    selectedFabric,
  });
}
