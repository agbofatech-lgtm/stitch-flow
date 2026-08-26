import { v4 as uuidv4 } from 'uuid';
import {
  Tier,
  Workspace,
  User,
  WorkspaceMember,
  Customer,
  Order,
  OrderMeasurement,
  Invoice,
  Payment,
  DueAlert,
  ProductionStage,
  CustomerMeasurementProfile,
  DesignInspiration,
  FabricRecord,
  OrderMaterialUsage,
  PatternLibraryItem,
  DashboardSummary,
  BodyMeasurements,
} from '../types';

// -----------------------------
// Core tier setup
// -----------------------------
export const tiers: Tier[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    code: 'BASIC',
    name: 'Basic',
    maxCustomers: 25,
    maxAssistants: 0,
    allowPdfExport: false,
    allowPatternGeneration: false,
    allowFabricVisualizer: false,
    monthlyPrice: 0,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    code: 'PRO',
    name: 'Pro',
    maxCustomers: 250,
    maxAssistants: 5,
    allowPdfExport: true,
    allowPatternGeneration: true,
    allowFabricVisualizer: true,
    monthlyPrice: 29,
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    code: 'STUDIO',
    name: 'Studio',
    maxCustomers: null,
    maxAssistants: 15,
    allowPdfExport: true,
    allowPatternGeneration: true,
    allowFabricVisualizer: true,
    monthlyPrice: 79,
  },
];

// -----------------------------
// Users
// -----------------------------
export const users: User[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    fullName: 'Sarah Mitchell',
    email: 'sarah@tailorshop.com',
    isActive: true,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    fullName: 'Assistant',
    email: '',
    isActive: true,
    createdAt: new Date('2024-02-01'),
  },
];

// -----------------------------
// Workspace
// -----------------------------
export const workspaces: Workspace[] = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    name: 'My Workspace',
    tierId: tiers[2].id,
    tier: tiers[2],
    billingStatus: 'active',
    defaultCurrency: 'GHS',
    logoUrl: null,
    useLogoAsWatermark: true,
    brandColor: '#0F6E8C',
    phone: '+233 24 000 0000',
    email: 'studio@mitchelltailoring.com',
    address: 'East Legon, Accra, Ghana',
    createdAt: new Date('2024-01-15'),
  },
];

// -----------------------------
// Workspace members
// -----------------------------
export const workspaceMembers: WorkspaceMember[] = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    workspaceId: workspaces[0].id,
    userId: users[0].id,
    user: users[0],
    role: 'owner',
    canExportPdf: true,
    canManageCustomers: true,
    canManageOrders: true,
    canManagePayments: true,
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    workspaceId: workspaces[0].id,
    userId: users[1].id,
    user: users[1],
    role: 'assistant',
    canExportPdf: false,
    canManageCustomers: true,
    canManageOrders: true,
    canManagePayments: false,
  },
];

// -----------------------------
// Customers
// -----------------------------
export const customers: Customer[] = [
  {
    id: '40000000-0000-0000-0000-000000000001',
    workspaceId: workspaces[0].id,
    fullName: 'Emma Thompson',
    phone: '+233 24 555 0123',
    email: 'emma.t@email.com',
    address: 'East Legon, Accra',
    notes: 'Prefers fitted styles',
    preferredStyle: 'Elegant fitted wear',
    preferredColors: ['Ivory', 'Gold'],
    preferredFabricTypes: ['silk', 'lace'],
    createdBy: users[0].id,
    createdAt: new Date('2024-02-10'),
  },
  {
    id: '40000000-0000-0000-0000-000000000002',
    workspaceId: workspaces[0].id,
    fullName: 'Olivia Martinez',
    phone: '+233 24 555 0124',
    email: 'olivia.m@email.com',
    address: 'Airport Residential, Accra',
    notes: 'Allergic to wool',
    preferredStyle: 'Simple evening wear',
    preferredColors: ['Navy', 'Black'],
    preferredFabricTypes: ['cotton', 'linen'],
    createdBy: users[0].id,
    createdAt: new Date('2024-02-15'),
  },
  {
    id: '40000000-0000-0000-0000-000000000003',
    workspaceId: workspaces[0].id,
    fullName: 'Isabella Chen',
    phone: '+233 24 555 0125',
    email: 'isabella.c@email.com',
    address: 'Cantonments, Accra',
    notes: 'VIP client - wedding order',
    preferredStyle: 'Luxury bridal',
    preferredColors: ['White', 'Champagne'],
    preferredFabricTypes: ['lace', 'silk'],
    createdBy: users[0].id,
    createdAt: new Date('2024-02-20'),
  },
  {
    id: '40000000-0000-0000-0000-000000000004',
    workspaceId: workspaces[0].id,
    fullName: 'Sophia Williams',
    phone: '+233 24 555 0126',
    email: 'sophia.w@email.com',
    address: 'Osu, Accra',
    notes: 'Repeat customer',
    preferredStyle: 'Cocktail dresses',
    preferredColors: ['Black', 'Red'],
    preferredFabricTypes: ['velvet', 'cotton'],
    createdBy: users[1].id,
    createdAt: new Date('2024-03-01'),
  },
  {
    id: '40000000-0000-0000-0000-000000000005',
    workspaceId: workspaces[0].id,
    fullName: 'Ava Johnson',
    phone: '+233 24 555 0127',
    email: 'ava.j@email.com',
    address: 'Tema, Greater Accra',
    notes: 'Corporate uniform orders',
    preferredStyle: 'Structured formal wear',
    preferredColors: ['Gray', 'Navy'],
    preferredFabricTypes: ['cotton', 'wool'],
    createdBy: users[0].id,
    createdAt: new Date('2024-03-05'),
  },
];

// -----------------------------
// Customer measurement profiles
// -----------------------------
export const customerMeasurementProfiles: CustomerMeasurementProfile[] = [
  {
    id: uuidv4(),
    customerId: customers[0].id,
    label: 'Bridal fitting - latest',
    bust: 92,
    waist: 68,
    hip: 96,
    shoulder: 12,
    neck: 36,
    backLength: 40,
    bustSpan: 18,
    armholeDepth: 20,
    notes: 'Structured bridal fit with lace allowance',
    createdAt: new Date('2024-02-11'),
  },
  {
    id: uuidv4(),
    customerId: customers[1].id,
    label: 'Evening dress profile',
    bust: 88,
    waist: 72,
    hip: 94,
    shoulder: 11.5,
    neck: 34,
    backLength: 39,
    notes: 'Relaxed waist, neat shoulder finish',
    createdAt: new Date('2024-02-16'),
  },
  {
    id: uuidv4(),
    customerId: customers[2].id,
    label: 'Wedding profile',
    bust: 90,
    waist: 70,
    hip: 98,
    shoulder: 12,
    bustSpan: 18,
    armholeDepth: 21,
    notes: 'Bride main fitting record',
    createdAt: new Date('2024-02-22'),
  },
  {
    id: uuidv4(),
    customerId: customers[3].id,
    label: 'Cocktail repeat profile',
    bust: 86,
    waist: 70,
    hip: 95,
    shoulder: 11,
    backLength: 38,
    notes: 'Prefers slim waist fit',
    createdAt: new Date('2024-03-02'),
  },
  {
    id: uuidv4(),
    customerId: customers[4].id,
    label: 'Suit profile',
    chest: 102,
    waist: 88,
    shoulder: 14,
    sleeve: 63,
    neck: 40,
    trouserLength: 108,
    notes: 'Corporate structured suit block',
    createdAt: new Date('2024-03-06'),
  },
];

// -----------------------------
// Helpers
// -----------------------------
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);

const nextTwoWeeks = new Date(today);
nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);

function createProductionStages(completedCount: number): ProductionStage[] {
  const stages: Array<{ code: ProductionStage['code']; label: string }> = [
    { code: 'measurement', label: 'Measurement' },
    { code: 'cutting', label: 'Cutting' },
    { code: 'sewing', label: 'Sewing' },
    { code: 'embroidery', label: 'Embroidery' },
    { code: 'first_fitting', label: '1st Fitting' },
    { code: 'second_fitting', label: '2nd Fitting' },
    { code: 'final_press', label: 'Final Press' },
    { code: 'ready', label: 'Ready' },
    { code: 'delivered', label: 'Delivered' },
  ];

  return stages.map((stage, index) => ({
    code: stage.code,
    label: stage.label,
    status: index < completedCount ? 'completed' : 'pending',
    completedAt: index < completedCount ? new Date() : null,
    notes: '',
  }));
}

// -----------------------------
// Fabric records / materials
// -----------------------------
export const fabricRecords: FabricRecord[] = [
  {
    id: '50000000-0000-0000-0000-000000000001',
    workspaceId: workspaces[0].id,
    name: 'Ivory Bridal Lace',
    fabricType: 'lace',
    color: 'Ivory',
    pattern: 'Floral',
    texture: 'Soft lace',
    quantityInStock: 8,
    unit: 'yards',
    costPerUnit: 180,
    supplier: 'Makola Fabric Hub',
    reorderLevel: 5,
    isActive: true,
    notes: 'Used for bridal overlays and sleeves',
    imageUrl: null,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-20'),
  },
  {
    id: '50000000-0000-0000-0000-000000000002',
    workspaceId: workspaces[0].id,
    name: 'Navy Satin',
    fabricType: 'silk',
    color: 'Navy',
    pattern: 'Solid',
    texture: 'Smooth',
    quantityInStock: 3,
    unit: 'yards',
    costPerUnit: 95,
    supplier: 'Accra Textiles Centre',
    reorderLevel: 4,
    isActive: true,
    notes: 'Popular for evening dresses',
    imageUrl: null,
    createdAt: new Date('2024-02-03'),
    updatedAt: new Date('2024-02-25'),
  },
  {
    id: '50000000-0000-0000-0000-000000000003',
    workspaceId: workspaces[0].id,
    name: 'Black Velvet Premium',
    fabricType: 'velvet',
    color: 'Black',
    pattern: 'Solid',
    texture: 'Rich velvet',
    quantityInStock: 10,
    unit: 'yards',
    costPerUnit: 120,
    supplier: 'Osu Premium Fabrics',
    reorderLevel: 3,
    isActive: true,
    notes: 'Used for cocktail and premium evening wear',
    imageUrl: null,
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: '50000000-0000-0000-0000-000000000004',
    workspaceId: workspaces[0].id,
    name: 'Charcoal Suiting Blend',
    fabricType: 'wool',
    color: 'Charcoal',
    pattern: 'Plain weave',
    texture: 'Firm structured',
    quantityInStock: 6,
    unit: 'yards',
    costPerUnit: 140,
    supplier: 'Tema Garment Supply',
    reorderLevel: 4,
    isActive: true,
    notes: 'For suits and structured formal wear',
    imageUrl: null,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-06'),
  },
  {
    id: '50000000-0000-0000-0000-000000000005',
    workspaceId: workspaces[0].id,
    name: 'Ankara Accent Print',
    fabricType: 'ankara',
    color: 'Multi',
    pattern: 'Bold print',
    texture: 'Medium cotton',
    quantityInStock: 14,
    unit: 'yards',
    costPerUnit: 55,
    supplier: 'Kantamanto Prints',
    reorderLevel: 5,
    isActive: true,
    notes: 'Good for accents, collars, and custom panels',
    imageUrl: null,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: '50000000-0000-0000-0000-000000000006',
    workspaceId: workspaces[0].id,
    name: 'Old Linen Stock',
    fabricType: 'linen',
    color: 'Beige',
    pattern: 'Solid',
    texture: 'Dry linen',
    quantityInStock: 5,
    unit: 'yards',
    costPerUnit: 60,
    supplier: 'Legacy Supply',
    reorderLevel: 2,
    isActive: false,
    notes: 'Old stock currently paused from active use',
    imageUrl: null,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-03-02'),
  },
];

// -----------------------------
// Design inspirations
// -----------------------------
export const designInspirations: DesignInspiration[] = [
  {
    id: uuidv4(),
    workspaceId: workspaces[0].id,
    title: 'Classic Bridal Lace Bodice',
    description: 'Elegant bridal bodice with soft lace overlay and structured waist shaping.',
    category: 'bridal',
    status: 'selected_for_order',
    imageUrl: 'https://images.unsplash.com/photo-1525258946800-98cfd641d0de',
    thumbnailUrl: null,
    fabricType: 'lace',
    primaryColor: 'Ivory',
    secondaryColor: 'Champagne',
    fitType: 'tailored',
    collarStyle: 'Sweetheart',
    sleeveStyle: 'Sleeveless',
    pocketStyle: '',
    embroideryNotes: 'Light beadwork along neckline',
    occasion: 'Wedding',
    linkedCustomerId: customers[2].id,
    linkedOrderId: null,
    tags: ['bridal', 'lace', 'luxury'],
    createdBy: users[0].id,
    createdAt: new Date('2024-02-18'),
    updatedAt: new Date('2024-02-21'),
  },
  {
    id: uuidv4(),
    workspaceId: workspaces[0].id,
    title: 'Modern Cocktail Velvet Dress',
    description: 'Slim black velvet evening silhouette for repeat premium clients.',
    category: 'dress',
    status: 'inspiration',
    imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c',
    thumbnailUrl: null,
    fabricType: 'velvet',
    primaryColor: 'Black',
    secondaryColor: 'Wine',
    fitType: 'slim',
    collarStyle: 'Boat neck',
    sleeveStyle: 'Cap sleeve',
    pocketStyle: '',
    embroideryNotes: '',
    occasion: 'Cocktail',
    linkedCustomerId: customers[3].id,
    linkedOrderId: null,
    tags: ['cocktail', 'velvet', 'evening'],
    createdBy: users[1].id,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-02'),
  },
  {
    id: uuidv4(),
    workspaceId: workspaces[0].id,
    title: 'Corporate Charcoal Suit Concept',
    description: 'Structured female corporate suit with clean lines and executive finish.',
    category: 'suit',
    status: 'draft',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
    thumbnailUrl: null,
    fabricType: 'wool',
    primaryColor: 'Charcoal',
    secondaryColor: 'Silver',
    fitType: 'tailored',
    collarStyle: 'Suit lapel',
    sleeveStyle: 'Long sleeve',
    pocketStyle: 'Side pocket',
    embroideryNotes: '',
    occasion: 'Corporate',
    linkedCustomerId: customers[4].id,
    linkedOrderId: null,
    tags: ['suit', 'corporate', 'formal'],
    createdBy: users[0].id,
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-06'),
  },
];

// -----------------------------
// Pattern library
// -----------------------------
export const patternLibrary: PatternLibraryItem[] = [
  {
    id: uuidv4(),
    workspaceId: workspaces[0].id,
    name: 'Basic Bodice Block',
    patternType: 'bodice',
    description: 'Foundational fitted bodice block for dresses and bridal garments.',
    previewImageUrl: null,
    linkedDesignInspirationId: designInspirations[0].id,
    sizeRange: 'UK 8 - 18',
    recommendedFabricTypes: ['cotton', 'lace', 'silk'],
    notes: 'Used for bodice drafting in design studio',
    createdBy: users[0].id,
    createdAt: new Date('2024-02-12'),
    updatedAt: new Date('2024-02-12'),
  },
  {
    id: uuidv4(),
    workspaceId: workspaces[0].id,
    name: 'Tailored Suit Block',
    patternType: 'suit',
    description: 'Structured suit pattern reference for corporate orders.',
    previewImageUrl: null,
    linkedDesignInspirationId: designInspirations[2].id,
    sizeRange: 'UK 10 - 20',
    recommendedFabricTypes: ['wool', 'linen', 'cotton'],
    notes: 'Useful for blazer and fitted jacket development',
    createdBy: users[0].id,
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
];

// -----------------------------
// Orders
// -----------------------------
export const orders: Order[] = [
  {
    id: '60000000-0000-0000-0000-000000000001',
    workspaceId: workspaces[0].id,
    customerId: customers[0].id,
    customer: customers[0],
    assignedTo: users[0].id,
    orderNumber: 'ORD-2024-001',
    status: 'in_progress',
    orderType: 'Wedding Gown',
    dueDate: today,
    notes: 'Ivory silk with lace details',
    designInspirationId: designInspirations[0].id,
    selectedFabricId: fabricRecords[0].id,
    fitType: 'tailored',
    styleNotes: 'Classic bridal silhouette',
    measurementSnapshot: {
      bust: 92,
      waist: 68,
      hip: 96,
      shoulder: 12,
      neck: 36,
      backLength: 40,
      bustSpan: 18,
      armholeDepth: 20,
      notes: 'Bridal fitted profile',
    },
    productionStages: createProductionStages(4),
    subtotal: 2500,
    taxTotal: 200,
    discountTotal: 100,
    totalAmount: 2600,
    currency: 'USD',
    createdAt: new Date('2024-02-10'),
  },
  {
    id: '60000000-0000-0000-0000-000000000002',
    workspaceId: workspaces[0].id,
    customerId: customers[1].id,
    customer: customers[1],
    assignedTo: users[1].id,
    orderNumber: 'ORD-2024-002',
    status: 'ready',
    orderType: 'Evening Dress',
    dueDate: yesterday,
    notes: 'Navy blue satin',
    selectedFabricId: fabricRecords[1].id,
    fitType: 'regular',
    styleNotes: 'Minimal luxury finish',
    measurementSnapshot: {
      bust: 88,
      waist: 72,
      hip: 94,
      shoulder: 11.5,
      neck: 34,
      backLength: 39,
    },
    productionStages: createProductionStages(8),
    subtotal: 800,
    taxTotal: 64,
    discountTotal: 0,
    totalAmount: 864,
    currency: 'GHS',
    createdAt: new Date('2024-02-15'),
  },
  {
    id: '60000000-0000-0000-0000-000000000003',
    workspaceId: workspaces[0].id,
    customerId: customers[2].id,
    customer: customers[2],
    assignedTo: users[0].id,
    orderNumber: 'ORD-2024-003',
    status: 'in_progress',
    orderType: 'Bridesmaid Dress',
    dueDate: nextWeek,
    notes: 'Set of 4 matching dresses',
    selectedFabricId: fabricRecords[4].id,
    fitType: 'tailored',
    styleNotes: 'Soft luxury bridesmaid styling',
    measurementSnapshot: {
      bust: 90,
      waist: 70,
      hip: 98,
      shoulder: 12,
      notes: 'Group fitting pending',
    },
    productionStages: createProductionStages(3),
    subtotal: 1600,
    taxTotal: 128,
    discountTotal: 50,
    totalAmount: 1678,
    currency: 'USD',
    createdAt: new Date('2024-02-20'),
  },
  {
    id: '60000000-0000-0000-0000-000000000004',
    workspaceId: workspaces[0].id,
    customerId: customers[3].id,
    customer: customers[3],
    assignedTo: users[1].id,
    orderNumber: 'ORD-2024-004',
    status: 'delivered',
    dueDate: new Date('2024-02-28'),
    orderType: 'Cocktail Dress',
    notes: 'Black velvet',
    designInspirationId: designInspirations[1].id,
    selectedFabricId: fabricRecords[2].id,
    fitType: 'slim',
    styleNotes: 'Elegant evening finish',
    measurementSnapshot: {
      bust: 86,
      waist: 70,
      hip: 95,
      shoulder: 11,
    },
    productionStages: createProductionStages(9),
    subtotal: 650,
    taxTotal: 52,
    discountTotal: 0,
    totalAmount: 702,
    currency: 'GHS',
    createdAt: new Date('2024-02-25'),
  },
  {
    id: '60000000-0000-0000-0000-000000000005',
    workspaceId: workspaces[0].id,
    customerId: customers[4].id,
    customer: customers[4],
    assignedTo: users[0].id,
    orderNumber: 'ORD-2024-005',
    status: 'draft',
    orderType: 'Business Suit',
    dueDate: nextTwoWeeks,
    notes: 'Charcoal gray wool blend',
    designInspirationId: designInspirations[2].id,
    selectedFabricId: fabricRecords[3].id,
    fitType: 'tailored',
    styleNotes: 'Corporate executive fit',
    measurementSnapshot: {
      chest: 102,
      waist: 88,
      shoulder: 14,
      sleeve: 63,
      trouserLength: 108,
    },
    productionStages: createProductionStages(0),
    subtotal: 1200,
    taxTotal: 96,
    discountTotal: 0,
    totalAmount: 1296,
    currency: 'USD',
    createdAt: new Date('2024-03-05'),
  },
];

// -----------------------------
// Order measurements
// -----------------------------
export const orderMeasurements: OrderMeasurement[] = [
  { id: uuidv4(), orderId: orders[0].id, measurementKey: 'bust', measurementValue: 92, unit: 'cm' },
  { id: uuidv4(), orderId: orders[0].id, measurementKey: 'waist', measurementValue: 68, unit: 'cm' },
  { id: uuidv4(), orderId: orders[0].id, measurementKey: 'hips', measurementValue: 96, unit: 'cm' },
  { id: uuidv4(), orderId: orders[0].id, measurementKey: 'neck', measurementValue: 36, unit: 'cm' },
  { id: uuidv4(), orderId: orders[0].id, measurementKey: 'shoulder', measurementValue: 12, unit: 'cm' },
  { id: uuidv4(), orderId: orders[0].id, measurementKey: 'backLength', measurementValue: 40, unit: 'cm' },
  { id: uuidv4(), orderId: orders[0].id, measurementKey: 'armLength', measurementValue: 58, unit: 'cm' },

  { id: uuidv4(), orderId: orders[1].id, measurementKey: 'bust', measurementValue: 88, unit: 'cm' },
  { id: uuidv4(), orderId: orders[1].id, measurementKey: 'waist', measurementValue: 72, unit: 'cm' },
  { id: uuidv4(), orderId: orders[1].id, measurementKey: 'hips', measurementValue: 94, unit: 'cm' },
  { id: uuidv4(), orderId: orders[1].id, measurementKey: 'neck', measurementValue: 34, unit: 'cm' },
  { id: uuidv4(), orderId: orders[1].id, measurementKey: 'shoulder', measurementValue: 11.5, unit: 'cm' },
  { id: uuidv4(), orderId: orders[1].id, measurementKey: 'backLength', measurementValue: 39, unit: 'cm' },
];

// -----------------------------
// Order material usage
// -----------------------------
export const materialUsages: OrderMaterialUsage[] = [
  {
    id: uuidv4(),
    orderId: orders[0].id,
    fabricRecordId: fabricRecords[0].id,
    quantityUsed: 4,
    unit: 'yards',
    notes: 'Main bodice and lace overlay',
    createdAt: new Date('2024-02-12'),
  },
  {
    id: uuidv4(),
    orderId: orders[1].id,
    fabricRecordId: fabricRecords[1].id,
    quantityUsed: 3,
    unit: 'yards',
    notes: 'Main dress body',
    createdAt: new Date('2024-02-18'),
  },
  {
    id: uuidv4(),
    orderId: orders[2].id,
    fabricRecordId: fabricRecords[4].id,
    quantityUsed: 5,
    unit: 'yards',
    notes: 'Accent panels and trims',
    createdAt: new Date('2024-02-24'),
  },
  {
    id: uuidv4(),
    orderId: orders[3].id,
    fabricRecordId: fabricRecords[2].id,
    quantityUsed: 2,
    unit: 'yards',
    notes: 'Cocktail velvet body',
    createdAt: new Date('2024-02-27'),
  },
  {
    id: uuidv4(),
    orderId: orders[4].id,
    fabricRecordId: fabricRecords[3].id,
    quantityUsed: 2,
    unit: 'yards',
    notes: 'Suit jacket preparation',
    createdAt: new Date('2024-03-06'),
  },
];

// -----------------------------
// Invoices
// -----------------------------
const invoice1Id = '70000000-0000-0000-0000-000000000001';
const invoice2Id = '70000000-0000-0000-0000-000000000002';
const invoice3Id = '70000000-0000-0000-0000-000000000003';

export const invoices: Invoice[] = [
  {
    id: invoice1Id,
    workspaceId: workspaces[0].id,
    orderId: orders[0].id,
    order: orders[0],
    invoiceNumber: 'INV-2024-001',
    issueDate: new Date('2024-02-10'),
    dueDate: new Date('2024-03-10'),
    subtotal: 2500,
    taxTotal: 200,
    discountTotal: 100,
    totalAmount: 2600,
    paidAmount: 1300,
    balanceDue: 1300,
    currency: 'USD',
    status: 'partial',
    pdfUrl: null,
    createdAt: new Date('2024-02-10'),
    items: [
      {
        id: uuidv4(),
        invoiceId: invoice1Id,
        description: 'Wedding Gown - Custom Design',
        quantity: 1,
        unitPrice: 2000,
        lineTotal: 2000,
      },
      {
        id: uuidv4(),
        invoiceId: invoice1Id,
        description: 'Lace Detailing',
        quantity: 1,
        unitPrice: 300,
        lineTotal: 300,
      },
      {
        id: uuidv4(),
        invoiceId: invoice1Id,
        description: 'Premium Silk Material',
        quantity: 2,
        unitPrice: 100,
        lineTotal: 200,
      },
    ],
  },
  {
    id: invoice2Id,
    workspaceId: workspaces[0].id,
    orderId: orders[1].id,
    order: orders[1],
    invoiceNumber: 'INV-2024-002',
    issueDate: new Date('2024-02-15'),
    dueDate: yesterday,
    subtotal: 800,
    taxTotal: 64,
    discountTotal: 0,
    totalAmount: 864,
    paidAmount: 0,
    balanceDue: 864,
    currency: 'GHS',
    status: 'overdue',
    pdfUrl: null,
    createdAt: new Date('2024-02-15'),
    items: [
      {
        id: uuidv4(),
        invoiceId: invoice2Id,
        description: 'Evening Dress - Custom Fit',
        quantity: 1,
        unitPrice: 700,
        lineTotal: 700,
      },
      {
        id: uuidv4(),
        invoiceId: invoice2Id,
        description: 'Alterations',
        quantity: 1,
        unitPrice: 100,
        lineTotal: 100,
      },
    ],
  },
  {
    id: invoice3Id,
    workspaceId: workspaces[0].id,
    orderId: orders[3].id,
    order: orders[3],
    invoiceNumber: 'INV-2024-003',
    issueDate: new Date('2024-02-25'),
    dueDate: new Date('2024-02-28'),
    subtotal: 650,
    taxTotal: 52,
    discountTotal: 0,
    totalAmount: 702,
    paidAmount: 702,
    balanceDue: 0,
    currency: 'GHS',
    status: 'paid',
    pdfUrl: null,
    createdAt: new Date('2024-02-25'),
    items: [
      {
        id: uuidv4(),
        invoiceId: invoice3Id,
        description: 'Cocktail Dress',
        quantity: 1,
        unitPrice: 650,
        lineTotal: 650,
      },
    ],
  },
];

// -----------------------------
// Payments
// -----------------------------
export const payments: Payment[] = [
  {
    id: '80000000-0000-0000-0000-000000000001',
    workspaceId: workspaces[0].id,
    orderId: orders[0].id,
    invoiceId: invoices[0].id,
    amount: 1300,
    method: 'Credit Card',
    referenceCode: 'CC-20240210-001',
    paymentStatus: 'captured',
    paidAt: new Date('2024-02-10'),
    notes: '50% deposit',
    createdBy: users[0].id,
  },
  {
    id: '80000000-0000-0000-0000-000000000002',
    workspaceId: workspaces[0].id,
    orderId: orders[3].id,
    invoiceId: invoices[2].id,
    amount: 702,
    method: 'Cash',
    referenceCode: 'CASH-20240228-001',
    paymentStatus: 'captured',
    paidAt: new Date('2024-02-28'),
    notes: 'Full payment on delivery',
    createdBy: users[1].id,
  },
];

// -----------------------------
// Due alerts
// -----------------------------
export const dueAlerts: DueAlert[] = [
  {
    id: uuidv4(),
    workspaceId: workspaces[0].id,
    orderId: orders[0].id,
    invoiceId: null,
    alertType: 'order_due_today',
    alertDate: today,
    isResolved: false,
    createdAt: today,
  },
  {
    id: uuidv4(),
    workspaceId: workspaces[0].id,
    orderId: null,
    invoiceId: invoices[1].id,
    alertType: 'invoice_overdue',
    alertDate: yesterday,
    isResolved: false,
    createdAt: yesterday,
  },
  {
    id: uuidv4(),
    workspaceId: workspaces[0].id,
    orderId: null,
    invoiceId: invoices[0].id,
    alertType: 'balance_pending',
    alertDate: new Date('2024-03-10'),
    isResolved: false,
    createdAt: new Date('2024-02-10'),
  },
];

// -----------------------------
// Design studio defaults
// -----------------------------
export const defaultDesignStudioMeasurements: BodyMeasurements = {
  bust: 92,
  waist: 72,
  neck: 36,
  shoulder: 12,
  backLength: 40,
  bustSpan: 18,
  armholeDepth: 20,
};

// -----------------------------
// Dashboard calculations
// -----------------------------
export function calculateDashboardSummary(): DashboardSummary {
  const totalRevenue = payments
    .filter((payment) => payment.paymentStatus === 'captured')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const pendingBalances = invoices
    .filter((invoice) => ['sent', 'partial', 'overdue'].includes(invoice.status))
    .reduce((sum, invoice) => sum + invoice.balanceDue, 0);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const ordersDueToday = orders.filter((order) => {
    if (!order.dueDate || !['draft', 'in_progress', 'ready'].includes(order.status)) {
      return false;
    }
    const due = new Date(order.dueDate);
    due.setHours(0, 0, 0, 0);
    return due <= todayDate;
  }).length;

  const overdueInvoices = invoices.filter((invoice) => invoice.status === 'overdue').length;

  const overdueOrders = orders.filter((order) => {
    if (!order.dueDate || ['delivered', 'cancelled'].includes(order.status)) return false;
    const due = new Date(order.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < todayDate;
  }).length;

  return {
    totalRevenue,
    pendingBalances,
    dueAlerts: ordersDueToday + overdueInvoices,
    ordersDueToday,
    overdueInvoices,
    totalCustomers: customers.length,
    activeOrders: orders.filter((order) =>
      ['draft', 'in_progress', 'ready'].includes(order.status)
    ).length,
    deliveredOrders: orders.filter((order) => order.status === 'delivered').length,
    overdueOrders,
  };
}




