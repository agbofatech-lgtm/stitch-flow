export type TierCode = 'BASIC' | 'PRO' | 'STUDIO';
export type BillingStatus = 'trial' | 'active' | 'past_due' | 'cancelled';
export type UserRole = 'owner' | 'assistant';

export type AppView =
  | 'dashboard'
  | 'customers'
  | 'orders'
  | 'invoices'
  | 'design-studio'
  | 'production-board'
  | 'materials'
  | 'reports'
  | 'settings';

export type OrderStatus =
  | 'draft'
  | 'in_progress'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'void';

export type PaymentStatus = 'pending' | 'captured' | 'failed' | 'refunded';

export type AlertType =
  | 'order_due_today'
  | 'invoice_overdue'
  | 'balance_pending';

export type CurrencyCode = 'USD' | 'GHS' | 'NGN' | 'GBP';
export type MaterialUnit = 'yards' | 'meters' | 'pieces';

export type AppPermissionAction =
  | 'manage_customers'
  | 'manage_orders'
  | 'manage_payments'
  | 'manage_billing'
  | 'manage_assistants'
  | 'manage_materials'
  | 'manage_designs'
  | 'view_reports';

export type DesignCategory =
  | 'senator'
  | 'kaftan'
  | 'agbada'
  | 'suit'
  | 'shirt'
  | 'trousers'
  | 'gown'
  | 'dress'
  | 'skirt'
  | 'blouse'
  | 'bridal'
  | 'wedding'
  | 'casual'
  | 'traditional'
  | 'unisex'
  | 'other';

export type DesignStatus =
  | 'draft'
  | 'inspiration'
  | 'selected_for_order'
  | 'in_production'
  | 'completed';

export type FabricType =
  | 'cotton'
  | 'linen'
  | 'silk'
  | 'wool'
  | 'denim'
  | 'velvet'
  | 'lace'
  | 'adire'
  | 'ankara'
  | 'brocade'
  | 'cashmere'
  | 'other';

export type PatternType =
  | 'bodice'
  | 'shirt'
  | 'trouser'
  | 'kaftan'
  | 'senator'
  | 'agbada'
  | 'suit'
  | 'gown'
  | 'blouse'
  | 'skirt'
  | 'sleeve'
  | 'collar'
  | 'custom';

export type FitType =
  | 'slim'
  | 'regular'
  | 'relaxed'
  | 'oversized'
  | 'tailored'
  | 'custom';

export type GarmentType =
  | 'bodice'
  | 'shirt'
  | 'trouser'
  | 'skirt'
  | 'kaftan'
  | 'dress'
  | 'gown'
  | 'senator'
  | 'agbada'
  | 'blouse'
  | 'custom';

export type MeasurementProfileType =
  | 'shirt'
  | 'dress_kaba'
  | 'skirt'
  | 'trouser'
  | 'blouse'
  | 'custom';

export type ProductionStageCode =
  | 'measurement'
  | 'cutting'
  | 'sewing'
  | 'embroidery'
  | 'first_fitting'
  | 'second_fitting'
  | 'final_press'
  | 'ready'
  | 'delivered';

export type ProductionStageStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'skipped';

export type InspirationComplexity = 'low' | 'medium' | 'high';
export type FitRiskSeverity = 'low' | 'medium' | 'high';

export type SewingOperationCategory =
  | 'prep'
  | 'cutting'
  | 'assembly'
  | 'fitting'
  | 'finishing';

export type MissingOrderDataKey =
  | 'measurements'
  | 'inspiration'
  | 'fabric'
  | 'production_plan';

export type OrderAlertCategory =
  | 'completeness'
  | 'production'
  | 'delivery';

export type OrderAlertSeverity = 'info' | 'warning' | 'critical';

export type OrderAlertCode =
  | 'missing_measurements'
  | 'missing_inspiration'
  | 'missing_fabric'
  | 'missing_production_plan'
  | 'overdue_stage'
  | 'overdue_order'
  | 'fitting_due'
  | 'ready_for_delivery'
  | 'blocked_order';

export interface Tier {
  id: string;
  code: TierCode;
  name: string;
  maxCustomers: number | null;
  maxAssistants: number;
  allowPdfExport: boolean;
  allowPatternGeneration: boolean;
  allowFabricVisualizer: boolean;
  monthlyPrice: number;
}

export interface Workspace {
  id: string;
  name: string;
  tierId: string;
  tier: Tier;
  billingStatus: BillingStatus;
  defaultCurrency?: CurrencyCode;

  phone?: string;
  email?: string;
  address?: string;

  logoUrl?: string | null;
  brandColor?: string;
  useLogoAsWatermark?: boolean;

  trialExpiresAt?: Date | null;
  overridePlan?: TierCode | null;
  overrideExpiresAt?: Date | null;

  createdAt: Date;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  user: User;
  role: UserRole;
  canExportPdf: boolean;
  canManageCustomers: boolean;
  canManageOrders: boolean;
  canManagePayments: boolean;
}

export interface GarmentMeasurements {
  bust?: number;
  chest?: number;
  waist?: number;
  hip?: number;

  neck?: number;
  shoulder?: number;
  sleeve?: number;
  sleeveLength?: number;
  aroundArm?: number;
  aroundWrist?: number;

  backLength?: number;
  bustSpan?: number;
  armholeDepth?: number;

  shoulderToWaist?: number;
  shoulderToHip?: number;
  shoulderToNipple?: number;
  nippleToNipple?: number;
  napeToWaist?: number;
  underBust?: number;
  shoulderToUnderBust?: number;

  acrossChest?: number;
  acrossBack?: number;

  thigh?: number;
  knee?: number;
  ankle?: number;
  aroundAnkle?: number;

  trouserLength?: number;
  skirtLength?: number;
  slitLength?: number;
  dressLength?: number;
  kabaLength?: number;
  shirtLength?: number;
  fullLength?: number;

  inseam?: number;
  crotchDepth?: number;
  waistToHip?: number;

  sleeveOpening?: number;
  bicep?: number;

  notes?: string;
}

export interface CustomerMeasurementProfile {
  id: string;
  workspaceId: string;
  customerId: string;
  label: string;
  profileType: MeasurementProfileType;
  fitType?: FitType;
  notes?: string;
  measurements: GarmentMeasurements;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  workspaceId: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  preferredStyle?: string;
  preferredColors?: string[];
  preferredFabricTypes?: FabricType[];
  defaultMeasurementProfileId?: string | null;
  measurementProfileIds?: string[];

  measurementProfiles?: CustomerMeasurementProfile[];
  profiles?: CustomerMeasurementProfile[];
  measurementsProfiles?: CustomerMeasurementProfile[];

  createdBy: string;
  createdAt: Date;
}

export interface OrderMeasurementSnapshot extends GarmentMeasurements {
  profileId?: string | null;
  profileLabel?: string | null;
  profileType?: MeasurementProfileType | null;
  capturedAt?: Date;
}

export interface ProductionStage {
  code: ProductionStageCode;
  label: string;
  status: ProductionStageStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  skippedAt?: Date | null;
  reopenedAt?: Date | null;
  notes?: string;
}

export interface InspirationAnalysis {
  suggestedGarmentType?: GarmentType;
  silhouette?: string;
  neckline?: string;
  sleeveStyle?: string;
  lengthType?: string;
  fitType?: FitType;
  recommendedFabricTypes?: FabricType[];
  complexityLevel?: InspirationComplexity;
  styleNotes?: string[];
  constructionNotes?: string[];
  confidence?: number;
}

export interface FabricRequirementEstimate {
  fabricType?: FabricType;
  mainFabricQty: number;
  liningQty?: number;
  interfacingQty?: number;
  unit: MaterialUnit;
  notes?: string[];
}

export interface CuttingPiece {
  name: string;
  quantity: number;
  cutOnFold?: boolean;
  fabric?: 'main' | 'lining' | 'interfacing';
  notes?: string;
}

export interface SewingOperation {
  step: number;
  title: string;
  description: string;
  category?: SewingOperationCategory;
}

export interface FitRiskWarning {
  severity: FitRiskSeverity;
  title: string;
  description: string;
  recommendation?: string;
}

export interface ProductionPlan {
  garmentType: GarmentType;
  fabricEstimate: FabricRequirementEstimate;
  cuttingList: CuttingPiece[];
  sewingChecklist: SewingOperation[];
  fitRisks: FitRiskWarning[];
  tailorNotes: string[];
  generatedAt: Date;
}

export interface OrderAlert {
  code: OrderAlertCode;
  category: OrderAlertCategory;
  severity: OrderAlertSeverity;
  title: string;
  message: string;
  stageCode?: ProductionStageCode;
  dueDate?: Date | null;
}

export interface StageOverdueAlert {
  stageCode: ProductionStageCode;
  stageLabel: string;
  startedAt?: Date | null;
  expectedBy?: Date | null;
  expectedDurationDays: number;
  daysOverdue: number;
}

export interface OrderCompletenessCheck {
  isComplete: boolean;
  isBlocked: boolean;
  missing: MissingOrderDataKey[];
  alerts: OrderAlert[];
}

export interface OrderAlertSummary {
  alerts: OrderAlert[];
  isBlocked: boolean;
  hasOverdueStages: boolean;
  hasFittingReminder: boolean;
  hasReadyForDeliveryReminder: boolean;
  overdueStages: StageOverdueAlert[];
}

export interface Order {
  id: string;
  workspaceId: string;
  customerId: string;
  customer?: Customer;
  assignedTo: string | null;
  orderNumber: string;
  status: OrderStatus;
  orderType: string;
  dueDate: Date | null;
  notes: string;

  designInspirationId?: string | null;
  selectedFabricId?: string | null;
  selectedPatternId?: string | null;
  selectedMeasurementProfileId?: string | null;
  selectedMeasurementProfileLabel?: string | null;
  selectedMeasurementProfileType?: MeasurementProfileType | null;

  fitType?: FitType;
  styleNotes?: string;

  garmentType?: GarmentType;
  garmentMeasurements?: GarmentMeasurements;
  measurementSnapshot?: OrderMeasurementSnapshot;
  productionPlan?: ProductionPlan | null;
  inspirationAnalysis?: InspirationAnalysis | null;

  productionStages?: ProductionStage[];
  fittingDueDate?: Date | null;

  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  currency?: CurrencyCode;
  createdAt: Date;
}

export interface OrderMeasurement {
  id: string;
  orderId: string;
  measurementKey: string;
  measurementValue: number;
  unit: string;
}

export interface Invoice {
  id: string;
  workspaceId: string;
  orderId: string;
  order?: Order;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: CurrencyCode;
  status: InvoiceStatus;
  pdfUrl: string | null;
  createdAt: Date;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  workspaceId: string;
  orderId: string;
  invoiceId: string;
  amount: number;
  method: string;
  referenceCode: string;
  paymentStatus: PaymentStatus;
  paidAt: Date;
  notes: string;
  createdBy: string;
}

export interface DueAlert {
  id: string;
  workspaceId: string;
  orderId: string | null;
  invoiceId: string | null;
  alertType: AlertType;
  alertDate: Date;
  isResolved: boolean;
  createdAt: Date;
}

export interface DashboardSummary {
  totalRevenue: number;
  pendingBalances: number;
  dueAlerts: number;
  ordersDueToday?: number;
  overdueInvoices?: number;
  totalCustomers?: number;
  activeOrders?: number;
  deliveredOrders?: number;
  overdueOrders?: number;
}

export interface DesignInspiration {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  category: DesignCategory;
  status: DesignStatus;
  imageUrl: string;
  thumbnailUrl?: string | null;
  fabricType?: FabricType;
  primaryColor?: string;
  secondaryColor?: string;
  fitType?: FitType;
  collarStyle?: string;
  sleeveStyle?: string;
  pocketStyle?: string;
  embroideryNotes?: string;
  occasion?: string;
  linkedCustomerId?: string | null;
  linkedOrderId?: string | null;
  tags: string[];
  analysis?: InspirationAnalysis | null;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface FabricRecord {
  id: string;
  workspaceId: string;
  name: string;
  fabricType: FabricType;
  color: string;
  pattern?: string;
  texture?: string;
  quantityInStock: number;
  unit: MaterialUnit;
  costPerUnit?: number;
  supplier?: string;
  reorderLevel?: number;
  isActive?: boolean;
  notes?: string;
  imageUrl?: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface OrderMaterialUsage {
  id: string;
  orderId: string;
  fabricRecordId: string;
  quantityUsed: number;
  unit: MaterialUnit;
  notes?: string;
  createdAt: Date;
}

export interface PatternLibraryItem {
  id: string;
  workspaceId: string;
  name: string;

  patternType: PatternType;
  description?: string;
  previewImageUrl?: string | null;
  linkedDesignInspirationId?: string | null;
  sizeRange?: string;
  recommendedFabricTypes?: FabricType[];
  notes?: string;
  createdBy?: string;

  garmentType?: GarmentType;
  patternKind?: 'bodice' | 'shirt' | 'trouser' | 'skirt' | 'kaftan';
  measurements?: Partial<GarmentMeasurements>;
  recommendedFabric?: string;
  linkedOrderId?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerStyleProfile {
  id: string;
  customerId: string;
  preferredCategories: DesignCategory[];
  preferredColors: string[];
  preferredFabricTypes: FabricType[];
  fitPreference?: FitType;
  styleNotes?: string;
  inspirationImageIds: string[];
  updatedAt: Date;
}

export interface Point {
  x: number;
  y: number;
}

export interface BodicePatternResult {
  points: Point[];
  controlPoints: BodiceControlPoints;
  measurements: BodiceCalculatedMeasurements;
}

export interface BodiceControlPoints {
  A: Point;
  B: Point;
  C: Point;
  D: Point;
  E: Point;
  F: Point;
  G: Point;
  H: Point;
  I: Point;
  J: Point;
  K: Point;
  dartLeft: Point;
  dartRight: Point;
  dartTip: Point;
}

export interface BodiceCalculatedMeasurements {
  quarterBust: number;
  quarterWaist: number;
  neckWidth: number;
  neckDepth: number;
  armholeDepth: number;
  dartIntake: number;
}

export interface GenericPatternDraft {
  kind: 'shirt' | 'trouser' | 'skirt' | 'kaftan';
  points: Point[];
  outline: Point[];
  measurements: Record<string, number>;
  guides: {
    start: Point;
    end: Point;
    label: string;
  }[];
  notes: string[];
}

export type StylePatternResult = BodicePatternResult | GenericPatternDraft;

export interface BodyMeasurements extends GarmentMeasurements {
  bust: number;
  waist: number;
  neck: number;
  shoulder: number;
  backLength: number;
  bustSpan?: number;
  armholeDepth?: number;
}

export interface FeatureGate {
  allowed: boolean;
  reason?: string;
  limit?: number | null;
}

export interface FeatureAccess {
  canCreateCustomer: FeatureGate;
  canExportPdf: FeatureGate;
  canBrandExport: FeatureGate;
  canInviteAssistant: FeatureGate;
  canViewAnalytics: FeatureGate;
  canViewAdvancedReports: FeatureGate;
  canUseFabricVisualizer: FeatureGate;
  canGeneratePattern: FeatureGate;
  canSavePreview: FeatureGate;
  canManageMaterialInventory: FeatureGate;
  canViewLowStockAlerts?: FeatureGate;
  canUseMultiCurrencyReporting?: FeatureGate;
}

export interface TierFeatureRow {
  key: string;
  name: string;
  included: boolean;
}

export interface TierFeatureComparisonPlan {
  code: TierCode;
  name: string;
  features: TierFeatureRow[];
}

export interface AppContextShape {
  currentView: AppView;
  setView: (view: AppView) => void;

  currentWorkspace: Workspace;
  currentMember: WorkspaceMember;

  tierSimulation: TierCode;
  simulateTier: (tier: TierCode) => void;
  switchRole: (role: UserRole) => void;
  canPerform: (action: AppPermissionAction) => boolean;

  featureAccess: FeatureAccess;
  dashboardSummary: DashboardSummary;

  customers: Customer[];
  orders: Order[];
  invoices: Invoice[];
  payments: Payment[];
  dueAlerts: DueAlert[];

  designInspirations: DesignInspiration[];
  fabricRecords: FabricRecord[];
  materialUsages: OrderMaterialUsage[];
  patternLibrary: PatternLibraryItem[];
  measurementProfiles: CustomerMeasurementProfile[];

  selectedOrderId: string | null;
  selectOrder: (orderId: string | null) => void;

  selectedGarmentType: GarmentType;
  setSelectedGarmentType: (garmentType: GarmentType) => void;

  designStudioMeasurements: BodyMeasurements;
  setDesignMeasurements: (updates: Partial<BodyMeasurements>) => void;

  designStudioGarmentMeasurements: GarmentMeasurements;
  setGarmentMeasurements: (updates: Partial<GarmentMeasurements>) => void;

  generatedProductionPlan: ProductionPlan | null;
  generateProductionPlanForStudio: () => void;

  currentInspirationAnalysis: InspirationAnalysis | null;
  setCurrentInspirationAnalysis: (analysis: InspirationAnalysis | null) => void;

  fabricImage: string | null;
  setFabricImage: (imageUrl: string | null) => void;

  addCustomer: (data: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
  }) => { success: boolean; error?: string };

  updateCustomer: (
    customerId: string,
    updates: Partial<
      Pick<Customer, 'fullName' | 'phone' | 'email' | 'address' | 'notes'>
    >
  ) => void;

  addOrder: (
    data: Omit<Order, 'id' | 'workspaceId' | 'createdAt'>
  ) => string | null;

  updateOrder: (orderId: string, updates: Partial<Order>) => void;

  addPayment: (
    data: Omit<Payment, 'id' | 'workspaceId' | 'createdBy'>
  ) => void;

  updateWorkspaceBranding: (updates: {
    logoUrl?: string | null;
    brandColor?: string;
    useLogoAsWatermark?: boolean;
  }) => void;

  updateWorkspaceProfile: (updates: {
    name?: string;
    defaultCurrency?: CurrencyCode;
    phone?: string;
    email?: string;
    address?: string;
  }) => void;

  getCustomerOrders: (customerId: string) => Order[];
  getCustomerMeasurementProfiles: (
    customerId: string
  ) => CustomerMeasurementProfile[];

  addCustomerMeasurementProfile: (
    profile: Omit<
      CustomerMeasurementProfile,
      'id' | 'createdAt' | 'updatedAt'
    >
  ) => string;

  updateCustomerMeasurementProfile: (
    profileId: string,
    updates: Partial<
      Omit<
        CustomerMeasurementProfile,
        'id' | 'workspaceId' | 'customerId' | 'createdAt'
      >
    >
  ) => void;

  deleteCustomerMeasurementProfile: (profileId: string) => void;

  applyMeasurementProfileToOrder: (
    orderId: string,
    profileId: string
  ) => { success: boolean; error?: string };

  addDesignInspiration: (
    data: Omit<
      DesignInspiration,
      'id' | 'workspaceId' | 'createdAt' | 'createdBy'
    >
  ) => void;

  deleteDesignInspiration: (designInspirationId: string) => void;
  selectDesignInspiration: (designInspirationId: string | null) => void;
  selectedInspirationId: string | null;

  linkInspirationToOrder: (
    orderId: string,
    designInspirationId: string
  ) => void;

  linkFabricToOrder?: (
    orderId: string,
    fabricRecordId: string | null
  ) => void;

  linkPatternToOrder?: (
    orderId: string,
    patternLibraryId: string | null
  ) => void;

  saveStudioOutputToOrder: (orderId: string) => void;

  addPatternLibraryItem: (
    data: Omit<PatternLibraryItem, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>
  ) => string;

  updatePatternLibraryItem: (
    patternLibraryId: string,
    updates: Partial<Omit<PatternLibraryItem, 'id' | 'workspaceId' | 'createdAt'>>
  ) => void;

  deletePatternLibraryItem: (patternLibraryId: string) => void;

  addFabricRecord: (
    data: Omit<FabricRecord, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>
  ) => void;

  updateFabricRecord: (
    fabricRecordId: string,
    updates: Partial<FabricRecord>
  ) => void;

  deleteFabricRecord: (fabricRecordId: string) => void;

  addMaterialUsage: (data: {
    orderId: string;
    fabricRecordId: string;
    quantityUsed: number;
    unit: MaterialUnit;
    notes?: string;
  }) => { success: boolean; error?: string };

  deleteMaterialUsage: (usageId: string) => void;
  getOrderMaterialUsages: (orderId: string) => OrderMaterialUsage[];
  getLowStockMaterials: () => FabricRecord[];
}

