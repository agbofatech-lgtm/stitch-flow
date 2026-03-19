import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  AppContextShape,
  AppPermissionAction,
  AppView,
  BodyMeasurements,
  CurrencyCode,
  Customer,
  CustomerMeasurementProfile,
  DashboardSummary,
  DesignInspiration,
  FabricRecord,
  GarmentMeasurements,
  InspirationAnalysis,
  MaterialUnit,
  Order,
  OrderMaterialUsage,
  PatternLibraryItem,
  Payment,
  ProductionStage,
  TierCode,
  UserRole,
  Workspace,
  WorkspaceMember,
} from '../types';
import { workspaces, workspaceMembers, tiers } from '@data/mockData';
import { getFeatureAccess, checkRolePermission } from '@modules/services/tierEnforcement';
import {
  analyzeDesignInspiration,
  generateProductionPlan,
  inferGarmentTypeFromInspiration,
} from '@modules/services/productionAssistant';
import { initializeAppStorage, saveAppStorage } from '@shared/lib/db';

type AppState = Omit<
  AppContextShape,
  | 'setView'
  | 'simulateTier'
  | 'switchRole'
  | 'canPerform'
  | 'selectOrder'
  | 'addCustomer'
  | 'updateCustomer'
  | 'addOrder'
  | 'updateOrder'
  | 'addPayment'
  | 'updateWorkspaceBranding'
  | 'updateWorkspaceProfile'
  | 'getCustomerOrders'
  | 'getCustomerMeasurementProfiles'
  | 'addCustomerMeasurementProfile'
  | 'updateCustomerMeasurementProfile'
  | 'deleteCustomerMeasurementProfile'
  | 'applyMeasurementProfileToOrder'
  | 'setSelectedGarmentType'
  | 'setDesignMeasurements'
  | 'setGarmentMeasurements'
  | 'generateProductionPlanForStudio'
  | 'setCurrentInspirationAnalysis'
  | 'setFabricImage'
  | 'addDesignInspiration'
  | 'deleteDesignInspiration'
  | 'selectDesignInspiration'
  | 'linkInspirationToOrder'
  | 'linkFabricToOrder'
  | 'linkPatternToOrder'
  | 'saveStudioOutputToOrder'
  | 'addPatternLibraryItem'
  | 'updatePatternLibraryItem'
  | 'deletePatternLibraryItem'
  | 'addFabricRecord'
  | 'updateFabricRecord'
  | 'deleteFabricRecord'
  | 'addMaterialUsage'
  | 'deleteMaterialUsage'
  | 'getOrderMaterialUsages'
  | 'getLowStockMaterials'
>;

const AppContext = createContext<AppContextShape | null>(null);

const AUTO_CUTTING_DEDUCTION_NOTE = '[AUTO_CUTTING_DEDUCTION]';

function getWorkspaceCustomerCount(customers: Customer[], workspaceId: string): number {
  return customers.filter((customer) => customer.workspaceId === workspaceId).length;
}

function getWorkspaceAssistantCount(workspaceId: string): number {
  return workspaceMembers.filter(
    (member) => member.workspaceId === workspaceId && member.role === 'assistant'
  ).length;
}

function buildFeatureAccess(params: {
  workspace: Workspace;
  member: WorkspaceMember;
  customers: Customer[];
  tierCode?: TierCode;
}) {
  return getFeatureAccess(params.workspace, params.member, {
    tierCode: params.tierCode,
    customerCount: getWorkspaceCustomerCount(params.customers, params.workspace.id),
    assistantCount: getWorkspaceAssistantCount(params.workspace.id),
  });
}

function buildDashboardSummary(params: {
  customers: Customer[];
  orders: Order[];
  invoices: AppContextShape['invoices'];
  payments: AppContextShape['payments'];
}): DashboardSummary {
  const { customers, orders, invoices, payments } = params;

  const totalRevenue = payments
    .filter((payment) => payment.paymentStatus === 'captured')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const pendingBalances = invoices
    .filter((invoice) => ['sent', 'partial', 'overdue'].includes(invoice.status))
    .reduce((sum, invoice) => sum + invoice.balanceDue, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ordersDueToday = orders.filter((order) => {
    if (!order.dueDate || ['delivered', 'cancelled'].includes(order.status)) return false;
    const due = new Date(order.dueDate);
    due.setHours(0, 0, 0, 0);
    return due <= today;
  }).length;

  const overdueInvoices = invoices.filter((invoice) => invoice.status === 'overdue').length;

  const overdueOrders = orders.filter((order) => {
    if (!order.dueDate || ['delivered', 'cancelled'].includes(order.status)) return false;
    const due = new Date(order.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
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

function mergeBodyMeasurements(
  current: BodyMeasurements,
  updates: Partial<BodyMeasurements>
): BodyMeasurements {
  return {
    ...current,
    ...updates,
  };
}

function mergeGarmentMeasurements(
  current: GarmentMeasurements,
  updates: Partial<GarmentMeasurements>
): GarmentMeasurements {
  return {
    ...current,
    ...updates,
  };
}

function resolveWorkspace(workspaceId: string, tierCode: TierCode): Workspace {
  const baseWorkspace =
    workspaces.find((workspace) => workspace.id === workspaceId) || workspaces[0];

  const tier = tiers.find((item) => item.code === tierCode) || baseWorkspace.tier;

  return {
    ...baseWorkspace,
    tier,
    tierId: tier.id,
  };
}

function resolveMember(workspaceId: string, memberId: string): WorkspaceMember {
  const exactMatch = workspaceMembers.find(
    (member) => member.workspaceId === workspaceId && member.id === memberId
  );

  if (exactMatch) return exactMatch;

  const ownerMatch = workspaceMembers.find(
    (member) => member.workspaceId === workspaceId && member.role === 'owner'
  );

  return ownerMatch || workspaceMembers[0];
}

function getCuttingStageStatus(
  stages?: ProductionStage[] | null
): ProductionStage['status'] | null {
  return stages?.find((stage) => stage.code === 'cutting')?.status || null;
}

function hasCuttingStarted(stages?: ProductionStage[] | null): boolean {
  const status = getCuttingStageStatus(stages);
  return status === 'active' || status === 'completed';
}

function getAutoCuttingUsage(
  materialUsages: OrderMaterialUsage[],
  orderId: string,
  fabricRecordId: string
): OrderMaterialUsage | undefined {
  return materialUsages.find(
    (usage) =>
      usage.orderId === orderId &&
      usage.fabricRecordId === fabricRecordId &&
      typeof usage.notes === 'string' &&
      usage.notes.includes(AUTO_CUTTING_DEDUCTION_NOTE)
  );
}

function toBodyMeasurementUpdates(
  source?: Partial<GarmentMeasurements> | null
): Partial<BodyMeasurements> {
  if (!source) return {};

  return {
    bust:
      typeof source.bust === 'number'
        ? source.bust
        : typeof source.chest === 'number'
        ? source.chest
        : undefined,
    waist: typeof source.waist === 'number' ? source.waist : undefined,
    neck: typeof source.neck === 'number' ? source.neck : undefined,
    shoulder: typeof source.shoulder === 'number' ? source.shoulder : undefined,
    backLength: typeof source.backLength === 'number' ? source.backLength : undefined,
    bustSpan: typeof source.bustSpan === 'number' ? source.bustSpan : undefined,
    armholeDepth:
      typeof source.armholeDepth === 'number' ? source.armholeDepth : undefined,
  };
}

function normalizeMeasurementValues(
  measurements?: Partial<GarmentMeasurements> | null
): GarmentMeasurements {
  if (!measurements) return {};

  return {
    bust: measurements.bust,
    chest: measurements.chest,
    waist: measurements.waist,
    hip: measurements.hip,
    neck: measurements.neck,
    shoulder: measurements.shoulder,
    sleeve:
      typeof measurements.sleeve === 'number'
        ? measurements.sleeve
        : measurements.sleeveLength,
    sleeveLength:
      typeof measurements.sleeveLength === 'number'
        ? measurements.sleeveLength
        : measurements.sleeve,
    aroundArm: measurements.aroundArm,
    aroundWrist: measurements.aroundWrist,
    backLength: measurements.backLength,
    bustSpan: measurements.bustSpan,
    armholeDepth: measurements.armholeDepth,
    shoulderToWaist: measurements.shoulderToWaist,
    shoulderToHip: measurements.shoulderToHip,
    shoulderToNipple: measurements.shoulderToNipple,
    nippleToNipple: measurements.nippleToNipple,
    napeToWaist: measurements.napeToWaist,
    underBust: measurements.underBust,
    shoulderToUnderBust: measurements.shoulderToUnderBust,
    acrossChest: measurements.acrossChest,
    acrossBack: measurements.acrossBack,
    thigh: measurements.thigh,
    knee: measurements.knee,
    ankle:
      typeof measurements.ankle === 'number'
        ? measurements.ankle
        : measurements.aroundAnkle,
    aroundAnkle:
      typeof measurements.aroundAnkle === 'number'
        ? measurements.aroundAnkle
        : measurements.ankle,
    trouserLength: measurements.trouserLength,
    skirtLength: measurements.skirtLength,
    slitLength: measurements.slitLength,
    dressLength: measurements.dressLength,
    kabaLength: measurements.kabaLength,
    shirtLength: measurements.shirtLength,
    fullLength: measurements.fullLength,
    inseam: measurements.inseam,
    crotchDepth: measurements.crotchDepth,
    waistToHip: measurements.waistToHip,
    sleeveOpening: measurements.sleeveOpening,
    bicep: measurements.bicep,
    notes: measurements.notes,
  };
}

function normalizeMeasurementProfileSnapshot(
  profile: CustomerMeasurementProfile
): GarmentMeasurements {
  return normalizeMeasurementValues(profile.measurements);
}

function getPatternTypeFromLegacyItem(
  item: Partial<PatternLibraryItem>
): PatternLibraryItem['patternType'] {
  if (item.patternType) return item.patternType;

  switch (item.garmentType || item.patternKind) {
    case 'bodice':
      return 'bodice';
    case 'shirt':
      return 'shirt';
    case 'trouser':
      return 'trouser';
    case 'skirt':
      return 'skirt';
    case 'kaftan':
      return 'kaftan';
    case 'senator':
      return 'senator';
    case 'agbada':
      return 'agbada';
    case 'gown':
      return 'gown';
    case 'blouse':
      return 'blouse';
    case 'suit':
      return 'suit';
    case 'sleeve':
      return 'sleeve';
    case 'collar':
      return 'collar';
    default:
      return 'custom';
  }
}

function normalizePatternLibraryItem(
  item: PatternLibraryItem
): PatternLibraryItem {
  return {
    ...item,
    patternType: getPatternTypeFromLegacyItem(item),
    description: item.description || '',
    previewImageUrl: item.previewImageUrl || null,
    linkedDesignInspirationId: item.linkedDesignInspirationId || null,
    recommendedFabricTypes: item.recommendedFabricTypes || [],
  };
}

function attachProfilesToCustomer(
  customer: Customer,
  profiles: CustomerMeasurementProfile[]
): Customer {
  const customerProfiles = profiles
    .filter((profile) => profile.customerId === customer.id)
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
    );

  return {
    ...customer,
    measurementProfiles: customerProfiles,
    profiles: customerProfiles,
    measurementsProfiles: customerProfiles,
  };
}

function hydrateCustomersWithProfiles(
  customers: Customer[],
  profiles: CustomerMeasurementProfile[]
): Customer[] {
  return customers.map((customer) => attachProfilesToCustomer(customer, profiles));
}

function hydrateOrdersWithCustomers(
  orders: Order[],
  customers: Customer[]
): Order[] {
  return orders.map((order) => {
    const customer = customers.find((item) => item.id === order.customerId) || order.customer;

    return {
      ...order,
      customer,
      selectedMeasurementProfileLabel:
        order.selectedMeasurementProfileLabel ||
        order.measurementSnapshot?.profileLabel ||
        null,
      selectedMeasurementProfileType:
        order.selectedMeasurementProfileType ||
        order.measurementSnapshot?.profileType ||
        null,
    };
  });
}

function stripEmbeddedProfileCollections(customer: Customer): Customer {
  const nextCustomer = { ...customer };
  delete nextCustomer.measurementProfiles;
  delete nextCustomer.profiles;
  delete nextCustomer.measurementsProfiles;
  return nextCustomer;
}

function stripCustomersForStorage(customers: Customer[]): Customer[] {
  return customers.map(stripEmbeddedProfileCollections);
}

function buildInitialState(): AppState {
  const persisted = initializeAppStorage();

  const currentWorkspace = resolveWorkspace(
    persisted.currentWorkspaceId,
    persisted.tierSimulation
  );

  const currentMember = resolveMember(
    currentWorkspace.id,
    persisted.currentMemberId
  );

  const hydratedCustomers = hydrateCustomersWithProfiles(
    persisted.customers,
    persisted.measurementProfiles
  );

  const hydratedOrders = hydrateOrdersWithCustomers(
    persisted.orders,
    hydratedCustomers
  );

  const normalizedPatternLibrary = persisted.patternLibrary.map(normalizePatternLibraryItem);

  return {
    currentView: 'dashboard',
    currentWorkspace,
    currentMember,
    tierSimulation: persisted.tierSimulation,
    featureAccess: buildFeatureAccess({
      workspace: currentWorkspace,
      member: currentMember,
      customers: hydratedCustomers,
      tierCode: persisted.tierSimulation,
    }),
    dashboardSummary: buildDashboardSummary({
      customers: hydratedCustomers,
      orders: hydratedOrders,
      invoices: persisted.invoices,
      payments: persisted.payments,
    }),
    customers: hydratedCustomers,
    orders: hydratedOrders,
    invoices: persisted.invoices,
    payments: persisted.payments,
    dueAlerts: persisted.dueAlerts,
    designInspirations: persisted.designInspirations,
    fabricRecords: persisted.fabricRecords,
    materialUsages: persisted.materialUsages,
    patternLibrary: normalizedPatternLibrary,
    measurementProfiles: persisted.measurementProfiles,
    selectedOrderId: persisted.studioSession.selectedOrderId,
    selectedGarmentType: persisted.studioSession.selectedGarmentType,
    designStudioMeasurements: persisted.studioSession.designStudioMeasurements,
    designStudioGarmentMeasurements:
      persisted.studioSession.designStudioGarmentMeasurements,
    generatedProductionPlan: persisted.studioSession.generatedProductionPlan,
    currentInspirationAnalysis: persisted.studioSession.currentInspirationAnalysis,
    fabricImage: persisted.studioSession.fabricImage,
    selectedInspirationId: persisted.studioSession.selectedInspirationId,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(buildInitialState);

  useEffect(() => {
    saveAppStorage({
      currentWorkspaceId: state.currentWorkspace.id,
      currentMemberId: state.currentMember.id,
      tierSimulation: state.tierSimulation,

      customers: stripCustomersForStorage(state.customers),
      orders: state.orders,
      invoices: state.invoices,
      payments: state.payments,
      dueAlerts: state.dueAlerts,

      designInspirations: state.designInspirations,
      fabricRecords: state.fabricRecords,
      materialUsages: state.materialUsages,
      patternLibrary: state.patternLibrary,
      measurementProfiles: state.measurementProfiles,

      studioSession: {
        selectedGarmentType: state.selectedGarmentType,
        selectedInspirationId: state.selectedInspirationId,
        currentInspirationAnalysis: state.currentInspirationAnalysis,
        generatedProductionPlan: state.generatedProductionPlan,
        designStudioMeasurements: state.designStudioMeasurements,
        designStudioGarmentMeasurements: state.designStudioGarmentMeasurements,
        fabricImage: state.fabricImage,
        selectedOrderId: state.selectedOrderId,
      },
    });
  }, [
    state.currentWorkspace.id,
    state.currentMember.id,
    state.tierSimulation,
    state.customers,
    state.orders,
    state.invoices,
    state.payments,
    state.dueAlerts,
    state.designInspirations,
    state.fabricRecords,
    state.materialUsages,
    state.patternLibrary,
    state.measurementProfiles,
    state.selectedGarmentType,
    state.selectedInspirationId,
    state.currentInspirationAnalysis,
    state.generatedProductionPlan,
    state.designStudioMeasurements,
    state.designStudioGarmentMeasurements,
    state.fabricImage,
    state.selectedOrderId,
  ]);

  const setView = useCallback((view: AppView) => {
    setState((prev) => ({ ...prev, currentView: view }));
  }, []);

  const updateWorkspaceProfile = useCallback(
    (updates: {
      name?: string;
      defaultCurrency?: CurrencyCode;
      phone?: string;
      email?: string;
      address?: string;
    }) => {
      setState((prev) => ({
        ...prev,
        currentWorkspace: {
          ...prev.currentWorkspace,
          ...updates,
        },
      }));
    },
    []
  );

  const updateWorkspaceBranding = useCallback(
    (updates: {
      logoUrl?: string | null;
      brandColor?: string;
      useLogoAsWatermark?: boolean;
    }) => {
      setState((prev) => ({
        ...prev,
        currentWorkspace: {
          ...prev.currentWorkspace,
          ...updates,
        },
      }));
    },
    []
  );

  const simulateTier = useCallback((tierCode: TierCode) => {
    setState((prev) => {
      const tier = tiers.find((item) => item.code === tierCode);
      if (!tier) return prev;

      const currentWorkspace: Workspace = {
        ...prev.currentWorkspace,
        tier,
        tierId: tier.id,
      };

      return {
        ...prev,
        tierSimulation: tierCode,
        currentWorkspace,
        featureAccess: buildFeatureAccess({
          workspace: currentWorkspace,
          member: prev.currentMember,
          customers: prev.customers,
          tierCode,
        }),
      };
    });
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setState((prev) => {
      const nextMember =
        workspaceMembers.find(
          (member) =>
            member.workspaceId === prev.currentWorkspace.id && member.role === role
        ) || prev.currentMember;

      return {
        ...prev,
        currentMember: nextMember,
        featureAccess: buildFeatureAccess({
          workspace: prev.currentWorkspace,
          member: nextMember,
          customers: prev.customers,
          tierCode: prev.tierSimulation,
        }),
      };
    });
  }, []);

  const canPerform = useCallback(
    (action: AppPermissionAction) => {
      if (state.currentMember.role === 'owner') return true;

      switch (action) {
        case 'manage_materials':
        case 'manage_designs':
          return checkRolePermission(state.currentMember, 'manage_orders');

        case 'view_reports':
          return (
            state.featureAccess.canViewAnalytics.allowed ||
            state.featureAccess.canViewAdvancedReports.allowed
          );

        case 'manage_billing':
        case 'manage_assistants':
        case 'manage_customers':
        case 'manage_orders':
        case 'manage_payments':
          return checkRolePermission(state.currentMember, action);

        default:
          return false;
      }
    },
    [state.currentMember, state.featureAccess]
  );

  const selectOrder = useCallback((orderId: string | null) => {
    setState((prev) => ({ ...prev, selectedOrderId: orderId }));
  }, []);

  const setSelectedGarmentType = useCallback(
    (garmentType: AppContextShape['selectedGarmentType']) => {
      setState((prev) => ({
        ...prev,
        selectedGarmentType: garmentType,
        generatedProductionPlan: null,
      }));
    },
    []
  );

  const setDesignMeasurements = useCallback((updates: Partial<BodyMeasurements>) => {
    setState((prev) => ({
      ...prev,
      designStudioMeasurements: mergeBodyMeasurements(
        prev.designStudioMeasurements,
        updates
      ),
      designStudioGarmentMeasurements: mergeGarmentMeasurements(
        prev.designStudioGarmentMeasurements,
        updates
      ),
      generatedProductionPlan: null,
    }));
  }, []);

  const setGarmentMeasurements = useCallback((updates: Partial<GarmentMeasurements>) => {
    setState((prev) => ({
      ...prev,
      designStudioGarmentMeasurements: mergeGarmentMeasurements(
        prev.designStudioGarmentMeasurements,
        updates
      ),
      designStudioMeasurements: mergeBodyMeasurements(prev.designStudioMeasurements, {
        bust:
          typeof updates.bust === 'number'
            ? updates.bust
            : typeof updates.chest === 'number'
            ? updates.chest
            : prev.designStudioMeasurements.bust,
        waist:
          typeof updates.waist === 'number'
            ? updates.waist
            : prev.designStudioMeasurements.waist,
        neck:
          typeof updates.neck === 'number'
            ? updates.neck
            : prev.designStudioMeasurements.neck,
        shoulder:
          typeof updates.shoulder === 'number'
            ? updates.shoulder
            : prev.designStudioMeasurements.shoulder,
        backLength:
          typeof updates.backLength === 'number'
            ? updates.backLength
            : prev.designStudioMeasurements.backLength,
        bustSpan:
          typeof updates.bustSpan === 'number'
            ? updates.bustSpan
            : prev.designStudioMeasurements.bustSpan,
        armholeDepth:
          typeof updates.armholeDepth === 'number'
            ? updates.armholeDepth
            : prev.designStudioMeasurements.armholeDepth,
      }),
      generatedProductionPlan: null,
    }));
  }, []);

  const setCurrentInspirationAnalysis = useCallback((analysis: InspirationAnalysis | null) => {
    setState((prev) => ({
      ...prev,
      currentInspirationAnalysis: analysis,
      selectedGarmentType: analysis?.suggestedGarmentType || prev.selectedGarmentType,
      generatedProductionPlan: null,
    }));
  }, []);

  const setFabricImage = useCallback((imageUrl: string | null) => {
    setState((prev) => ({ ...prev, fabricImage: imageUrl }));
  }, []);

  const addCustomer = useCallback(
    (data: {
      fullName: string;
      phone: string;
      email: string;
      address: string;
      notes: string;
    }) => {
      if (!state.featureAccess.canCreateCustomer.allowed) {
        return {
          success: false,
          error:
            state.featureAccess.canCreateCustomer.reason ||
            'Customer creation not allowed',
        };
      }

      const newCustomer: Customer = {
        id: crypto.randomUUID(),
        workspaceId: state.currentWorkspace.id,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        notes: data.notes,
        defaultMeasurementProfileId: null,
        measurementProfileIds: [],
        measurementProfiles: [],
        profiles: [],
        measurementsProfiles: [],
        createdBy: state.currentMember.userId,
        createdAt: new Date(),
      };

      setState((prev) => {
        const customers = hydrateCustomersWithProfiles(
          [...prev.customers, newCustomer],
          prev.measurementProfiles
        );

        return {
          ...prev,
          customers,
          featureAccess: buildFeatureAccess({
            workspace: prev.currentWorkspace,
            member: prev.currentMember,
            customers,
            tierCode: prev.tierSimulation,
          }),
          dashboardSummary: buildDashboardSummary({
            customers,
            orders: prev.orders,
            invoices: prev.invoices,
            payments: prev.payments,
          }),
        };
      });

      return { success: true };
    },
    [
      state.currentWorkspace.id,
      state.currentMember.userId,
      state.featureAccess.canCreateCustomer,
    ]
  );

  const updateCustomer = useCallback(
    (
      customerId: string,
      updates: Partial<
        Pick<Customer, 'fullName' | 'phone' | 'email' | 'address' | 'notes'>
      >
    ) => {
      setState((prev) => {
        const customers = prev.customers.map((customer) =>
          customer.id === customerId ? { ...customer, ...updates } : customer
        );

        const nextCustomers = hydrateCustomersWithProfiles(customers, prev.measurementProfiles);
        const nextOrders = hydrateOrdersWithCustomers(prev.orders, nextCustomers);

        return {
          ...prev,
          customers: nextCustomers,
          orders: nextOrders,
        };
      });
    },
    []
  );

  const addOrder = useCallback(
    (data: Omit<Order, 'id' | 'workspaceId' | 'createdAt'>) => {
      const customer = state.customers.find((item) => item.id === data.customerId);
      if (!customer) return null;

      const linkedInspiration = data.designInspirationId
        ? state.designInspirations.find(
            (item) => item.id === data.designInspirationId
          ) || null
        : null;

      const inspirationAnalysis =
        data.inspirationAnalysis ||
        linkedInspiration?.analysis ||
        (linkedInspiration
          ? analyzeDesignInspiration(
              linkedInspiration,
              data.garmentType || state.selectedGarmentType
            )
          : null);

      const newOrder: Order = {
        ...data,
        id: crypto.randomUUID(),
        workspaceId: state.currentWorkspace.id,
        customer,
        inspirationAnalysis,
        selectedMeasurementProfileLabel:
          data.selectedMeasurementProfileLabel ||
          data.measurementSnapshot?.profileLabel ||
          null,
        selectedMeasurementProfileType:
          data.selectedMeasurementProfileType ||
          data.measurementSnapshot?.profileType ||
          null,
        createdAt: new Date(),
      };

      setState((prev) => {
        const nextCustomers = hydrateCustomersWithProfiles(
          prev.customers,
          prev.measurementProfiles
        );
        const orders = hydrateOrdersWithCustomers([...prev.orders, newOrder], nextCustomers);

        return {
          ...prev,
          customers: nextCustomers,
          orders,
          dashboardSummary: buildDashboardSummary({
            customers: nextCustomers,
            orders,
            invoices: prev.invoices,
            payments: prev.payments,
          }),
        };
      });

      return newOrder.id;
    },
    [
      state.customers,
      state.currentWorkspace.id,
      state.designInspirations,
      state.selectedGarmentType,
    ]
  );

  const updateOrder = useCallback((orderId: string, updates: Partial<Order>) => {
    setState((prev) => {
      const existingOrder = prev.orders.find((order) => order.id === orderId);
      if (!existingOrder) return prev;

      const orders = prev.orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              ...updates,
              selectedMeasurementProfileLabel:
                updates.selectedMeasurementProfileLabel ??
                updates.measurementSnapshot?.profileLabel ??
                order.selectedMeasurementProfileLabel ??
                order.measurementSnapshot?.profileLabel ??
                null,
              selectedMeasurementProfileType:
                updates.selectedMeasurementProfileType ??
                updates.measurementSnapshot?.profileType ??
                order.selectedMeasurementProfileType ??
                order.measurementSnapshot?.profileType ??
                null,
              customer:
                updates.customerId && updates.customerId !== order.customerId
                  ? prev.customers.find(
                      (customer) => customer.id === updates.customerId
                    ) || order.customer
                  : order.customer,
            }
          : order
      );

      const updatedOrder = orders.find((order) => order.id === orderId);
      if (!updatedOrder) {
        const nextCustomers = hydrateCustomersWithProfiles(prev.customers, prev.measurementProfiles);
        const hydratedOrders = hydrateOrdersWithCustomers(orders, nextCustomers);

        return {
          ...prev,
          customers: nextCustomers,
          orders: hydratedOrders,
          dashboardSummary: buildDashboardSummary({
            customers: nextCustomers,
            orders: hydratedOrders,
            invoices: prev.invoices,
            payments: prev.payments,
          }),
        };
      }

      let nextFabricRecords = prev.fabricRecords;
      let nextMaterialUsages = prev.materialUsages;

      const cuttingJustStarted =
        !hasCuttingStarted(existingOrder.productionStages) &&
        hasCuttingStarted(updatedOrder.productionStages);

      const selectedFabricId = updatedOrder.selectedFabricId || null;
      const mainFabricQty =
        updatedOrder.productionPlan?.fabricEstimate?.mainFabricQty || 0;

      if (
        cuttingJustStarted &&
        selectedFabricId &&
        mainFabricQty > 0 &&
        !getAutoCuttingUsage(prev.materialUsages, updatedOrder.id, selectedFabricId)
      ) {
        const selectedFabric = prev.fabricRecords.find(
          (item) => item.id === selectedFabricId
        );

        if (
          selectedFabric &&
          selectedFabric.unit !== 'pieces' &&
          selectedFabric.quantityInStock >= mainFabricQty
        ) {
          const autoUsage: OrderMaterialUsage = {
            id: crypto.randomUUID(),
            orderId: updatedOrder.id,
            fabricRecordId: selectedFabricId,
            quantityUsed: mainFabricQty,
            unit: selectedFabric.unit,
            notes: `${AUTO_CUTTING_DEDUCTION_NOTE} Auto-reserved when cutting started`,
            createdAt: new Date(),
          };

          nextMaterialUsages = [...prev.materialUsages, autoUsage];

          nextFabricRecords = prev.fabricRecords.map((item) =>
            item.id === selectedFabricId
              ? {
                  ...item,
                  quantityInStock: item.quantityInStock - mainFabricQty,
                  updatedAt: new Date(),
                }
              : item
          );
        }
      }

      const nextCustomers = hydrateCustomersWithProfiles(prev.customers, prev.measurementProfiles);
      const hydratedOrders = hydrateOrdersWithCustomers(orders, nextCustomers);

      return {
        ...prev,
        customers: nextCustomers,
        orders: hydratedOrders,
        fabricRecords: nextFabricRecords,
        materialUsages: nextMaterialUsages,
        dashboardSummary: buildDashboardSummary({
          customers: nextCustomers,
          orders: hydratedOrders,
          invoices: prev.invoices,
          payments: prev.payments,
        }),
      };
    });
  }, []);

  const addPayment = useCallback(
    (data: Omit<Payment, 'id' | 'workspaceId' | 'createdBy'>) => {
      const newPayment: Payment = {
        ...data,
        id: crypto.randomUUID(),
        workspaceId: state.currentWorkspace.id,
        createdBy: state.currentMember.userId,
      };

      setState((prev) => {
        const payments = [...prev.payments, newPayment];

        const invoices = prev.invoices.map((invoice) => {
          if (invoice.id !== data.invoiceId) return invoice;

          const paidAmount = invoice.paidAmount + data.amount;
          const balanceDue = Math.max(0, invoice.totalAmount - paidAmount);

          let status = invoice.status;
          if (balanceDue <= 0) status = 'paid';
          else if (paidAmount > 0) status = 'partial';

          return {
            ...invoice,
            paidAmount,
            balanceDue,
            status,
          };
        });

        return {
          ...prev,
          payments,
          invoices,
          dashboardSummary: buildDashboardSummary({
            customers: prev.customers,
            orders: prev.orders,
            invoices,
            payments,
          }),
        };
      });
    },
    [state.currentMember.userId, state.currentWorkspace.id]
  );

  const getCustomerOrders = useCallback(
    (customerId: string) =>
      state.orders.filter((order) => order.customerId === customerId),
    [state.orders]
  );

  const getCustomerMeasurementProfiles = useCallback(
    (customerId: string) =>
      state.measurementProfiles
        .filter((profile) => profile.customerId === customerId)
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
        ),
    [state.measurementProfiles]
  );

  const addCustomerMeasurementProfile = useCallback(
    (
      profile: Omit<CustomerMeasurementProfile, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      const newProfile: CustomerMeasurementProfile = {
        ...profile,
        measurements: normalizeMeasurementValues(profile.measurements),
        updatedAt: new Date(),
        createdAt: new Date(),
        id: crypto.randomUUID(),
      };

      setState((prev) => {
        const measurementProfiles = [newProfile, ...prev.measurementProfiles];

        const customers = prev.customers.map((customer) => {
          if (customer.id !== newProfile.customerId) return customer;

          const currentIds = customer.measurementProfileIds || [];
          const nextIds = currentIds.includes(newProfile.id)
            ? currentIds
            : [newProfile.id, ...currentIds];

          const shouldSetDefault =
            newProfile.isDefault ||
            !customer.defaultMeasurementProfileId ||
            currentIds.length === 0;

          return {
            ...customer,
            measurementProfileIds: nextIds,
            defaultMeasurementProfileId: shouldSetDefault
              ? newProfile.id
              : customer.defaultMeasurementProfileId,
          };
        });

        const normalizedProfiles = newProfile.isDefault
          ? measurementProfiles.map((item) =>
              item.customerId === newProfile.customerId
                ? { ...item, isDefault: item.id === newProfile.id }
                : item
            )
          : measurementProfiles;

        const nextCustomers = hydrateCustomersWithProfiles(customers, normalizedProfiles);
        const nextOrders = hydrateOrdersWithCustomers(prev.orders, nextCustomers);

        return {
          ...prev,
          customers: nextCustomers,
          orders: nextOrders,
          measurementProfiles: normalizedProfiles,
        };
      });

      return newProfile.id;
    },
    []
  );

  const updateCustomerMeasurementProfile = useCallback(
    (
      profileId: string,
      updates: Partial<
        Omit<CustomerMeasurementProfile, 'id' | 'workspaceId' | 'customerId' | 'createdAt'>
      >
    ) => {
      setState((prev) => {
        const existingProfile = prev.measurementProfiles.find((profile) => profile.id === profileId);
        if (!existingProfile) return prev;

        const nextProfiles = prev.measurementProfiles.map((profile) => {
          if (profile.id !== profileId) return profile;

          return {
            ...profile,
            ...updates,
            measurements: updates.measurements
              ? normalizeMeasurementValues({
                  ...profile.measurements,
                  ...updates.measurements,
                })
              : profile.measurements,
            updatedAt: new Date(),
          };
        });

        const measurementProfiles =
          updates.isDefault === true
            ? nextProfiles.map((profile) =>
                profile.customerId === existingProfile.customerId
                  ? { ...profile, isDefault: profile.id === profileId }
                  : profile
              )
            : nextProfiles;

        const customers = prev.customers.map((customer) => {
          if (customer.id !== existingProfile.customerId) return customer;

          const currentIds = customer.measurementProfileIds || [];
          const nextIds = currentIds.includes(profileId) ? currentIds : [profileId, ...currentIds];

          return {
            ...customer,
            measurementProfileIds: nextIds,
            defaultMeasurementProfileId:
              updates.isDefault === true
                ? profileId
                : customer.defaultMeasurementProfileId === profileId &&
                  updates.isDefault === false
                ? null
                : customer.defaultMeasurementProfileId,
          };
        });

        const orders = prev.orders.map((order) =>
          order.selectedMeasurementProfileId === profileId
            ? {
                ...order,
                selectedMeasurementProfileLabel:
                  updates.label ?? order.selectedMeasurementProfileLabel ?? existingProfile.label,
                selectedMeasurementProfileType:
                  updates.profileType ??
                  order.selectedMeasurementProfileType ??
                  existingProfile.profileType,
                measurementSnapshot: order.measurementSnapshot
                  ? {
                      ...order.measurementSnapshot,
                      profileLabel:
                        updates.label ??
                        order.measurementSnapshot.profileLabel ??
                        existingProfile.label,
                      profileType:
                        updates.profileType ??
                        order.measurementSnapshot.profileType ??
                        existingProfile.profileType,
                    }
                  : order.measurementSnapshot,
              }
            : order
        );

        const nextCustomers = hydrateCustomersWithProfiles(customers, measurementProfiles);
        const nextOrders = hydrateOrdersWithCustomers(orders, nextCustomers);

        return {
          ...prev,
          customers: nextCustomers,
          orders: nextOrders,
          measurementProfiles,
        };
      });
    },
    []
  );

  const deleteCustomerMeasurementProfile = useCallback((profileId: string) => {
    setState((prev) => {
      const existingProfile = prev.measurementProfiles.find((profile) => profile.id === profileId);
      if (!existingProfile) return prev;

      const remainingProfiles = prev.measurementProfiles.filter(
        (profile) => profile.id !== profileId
      );

      const fallbackDefault =
        remainingProfiles.find(
          (profile) => profile.customerId === existingProfile.customerId
        ) || null;

      const customers = prev.customers.map((customer) => {
        if (customer.id !== existingProfile.customerId) return customer;

        const nextIds = (customer.measurementProfileIds || []).filter((id) => id !== profileId);

        return {
          ...customer,
          measurementProfileIds: nextIds,
          defaultMeasurementProfileId:
            customer.defaultMeasurementProfileId === profileId
              ? fallbackDefault?.id || null
              : customer.defaultMeasurementProfileId,
        };
      });

      const orders = prev.orders.map((order) =>
        order.selectedMeasurementProfileId === profileId
          ? {
              ...order,
              selectedMeasurementProfileId: null,
              selectedMeasurementProfileLabel: null,
              selectedMeasurementProfileType: null,
              measurementSnapshot: order.measurementSnapshot
                ? {
                    ...order.measurementSnapshot,
                    profileId: null,
                    profileLabel: null,
                    profileType: null,
                  }
                : order.measurementSnapshot,
            }
          : order
      );

      const nextCustomers = hydrateCustomersWithProfiles(customers, remainingProfiles);
      const nextOrders = hydrateOrdersWithCustomers(orders, nextCustomers);

      return {
        ...prev,
        customers: nextCustomers,
        orders: nextOrders,
        measurementProfiles: remainingProfiles,
      };
    });
  }, []);

  const applyMeasurementProfileToOrder = useCallback(
    (orderId: string, profileId: string) => {
      let outcome: { success: boolean; error?: string } = { success: true };

      setState((prev) => {
        const order = prev.orders.find((item) => item.id === orderId);
        const profile = prev.measurementProfiles.find((item) => item.id === profileId);

        if (!order) {
          outcome = { success: false, error: 'Order not found' };
          return prev;
        }

        if (!profile) {
          outcome = { success: false, error: 'Measurement profile not found' };
          return prev;
        }

        const profileSnapshot = normalizeMeasurementProfileSnapshot(profile);

        const nextGarmentMeasurements = {
          ...(order.garmentMeasurements || {}),
          ...profileSnapshot,
        };

        const nextMeasurementSnapshot = {
          ...(order.measurementSnapshot || {}),
          ...profileSnapshot,
          profileId: profile.id,
          profileLabel: profile.label,
          profileType: profile.profileType,
          capturedAt: new Date(),
        };

        const orders = prev.orders.map((item) =>
          item.id === orderId
            ? {
                ...item,
                selectedMeasurementProfileId: profile.id,
                selectedMeasurementProfileLabel: profile.label,
                selectedMeasurementProfileType: profile.profileType,
                garmentMeasurements: nextGarmentMeasurements,
                measurementSnapshot: nextMeasurementSnapshot,
                fitType: item.fitType || profile.fitType,
              }
            : item
        );

        const nextCustomers = hydrateCustomersWithProfiles(prev.customers, prev.measurementProfiles);
        const hydratedOrders = hydrateOrdersWithCustomers(orders, nextCustomers);

        const isSelectedOrder = prev.selectedOrderId === orderId;
        const nextBodyUpdates = toBodyMeasurementUpdates(profileSnapshot);

        return {
          ...prev,
          customers: nextCustomers,
          orders: hydratedOrders,
          designStudioGarmentMeasurements: isSelectedOrder
            ? mergeGarmentMeasurements(prev.designStudioGarmentMeasurements, profileSnapshot)
            : prev.designStudioGarmentMeasurements,
          designStudioMeasurements: isSelectedOrder
            ? mergeBodyMeasurements(prev.designStudioMeasurements, nextBodyUpdates)
            : prev.designStudioMeasurements,
          dashboardSummary: buildDashboardSummary({
            customers: nextCustomers,
            orders: hydratedOrders,
            invoices: prev.invoices,
            payments: prev.payments,
          }),
        };
      });

      return outcome;
    },
    []
  );

  const addDesignInspiration = useCallback(
    (
      data: Omit<
        DesignInspiration,
        'id' | 'workspaceId' | 'createdAt' | 'createdBy'
      >
    ) => {
      const draftForAnalysis: DesignInspiration = {
        ...data,
        id: 'draft-inspiration',
        workspaceId: state.currentWorkspace.id,
        createdBy: state.currentMember.userId,
        createdAt: new Date(),
      };

      const analysis =
        data.analysis ||
        analyzeDesignInspiration(draftForAnalysis, state.selectedGarmentType);

      const newDesignInspiration: DesignInspiration = {
        ...draftForAnalysis,
        id: crypto.randomUUID(),
        analysis,
      };

      setState((prev) => ({
        ...prev,
        designInspirations: [newDesignInspiration, ...prev.designInspirations],
      }));
    },
    [state.currentMember.userId, state.currentWorkspace.id, state.selectedGarmentType]
  );

  const deleteDesignInspiration = useCallback((designInspirationId: string) => {
    setState((prev) => ({
      ...prev,
      designInspirations: prev.designInspirations.filter(
        (item) => item.id !== designInspirationId
      ),
      selectedInspirationId:
        prev.selectedInspirationId === designInspirationId
          ? null
          : prev.selectedInspirationId,
      currentInspirationAnalysis:
        prev.selectedInspirationId === designInspirationId
          ? null
          : prev.currentInspirationAnalysis,
      generatedProductionPlan:
        prev.selectedInspirationId === designInspirationId
          ? null
          : prev.generatedProductionPlan,
    }));
  }, []);

  const selectDesignInspiration = useCallback(
    (designInspirationId: string | null) => {
      setState((prev) => {
        const inspiration =
          prev.designInspirations.find(
            (item) => item.id === designInspirationId
          ) || null;

        const analysis =
          inspiration?.analysis ||
          (inspiration
            ? analyzeDesignInspiration(inspiration, prev.selectedGarmentType)
            : null);

        const nextGarmentType = inspiration
          ? inferGarmentTypeFromInspiration(inspiration, prev.selectedGarmentType)
          : prev.selectedGarmentType;

        return {
          ...prev,
          selectedInspirationId: designInspirationId,
          currentInspirationAnalysis: analysis,
          selectedGarmentType: nextGarmentType,
          generatedProductionPlan: null,
        };
      });
    },
    []
  );

  const generateProductionPlanForStudio = useCallback(() => {
    setState((prev) => {
      const selectedInspiration =
        prev.designInspirations.find(
          (item) => item.id === prev.selectedInspirationId
        ) || undefined;

      const currentInspirationAnalysis =
        prev.currentInspirationAnalysis ||
        (selectedInspiration
          ? analyzeDesignInspiration(selectedInspiration, prev.selectedGarmentType)
          : null);

      const resolvedGarmentType = selectedInspiration
        ? inferGarmentTypeFromInspiration(
            selectedInspiration,
            prev.selectedGarmentType
          )
        : prev.selectedGarmentType;

      const generatedProductionPlan = generateProductionPlan({
        garmentType: resolvedGarmentType,
        measurements: prev.designStudioGarmentMeasurements,
        inspiration: selectedInspiration,
        analysis: currentInspirationAnalysis || undefined,
      });

      return {
        ...prev,
        selectedGarmentType: resolvedGarmentType,
        currentInspirationAnalysis,
        generatedProductionPlan,
      };
    });
  }, []);

  const saveStudioOutputToOrder = useCallback((orderId: string) => {
    setState((prev) => {
      const selectedInspiration =
        prev.designInspirations.find(
          (item) => item.id === prev.selectedInspirationId
        ) || undefined;

      const currentInspirationAnalysis =
        prev.currentInspirationAnalysis ||
        (selectedInspiration
          ? analyzeDesignInspiration(selectedInspiration, prev.selectedGarmentType)
          : null);

      const resolvedGarmentType = selectedInspiration
        ? inferGarmentTypeFromInspiration(
            selectedInspiration,
            prev.selectedGarmentType
          )
        : prev.selectedGarmentType;

      const generatedProductionPlan =
        prev.generatedProductionPlan ||
        generateProductionPlan({
          garmentType: resolvedGarmentType,
          measurements: prev.designStudioGarmentMeasurements,
          inspiration: selectedInspiration,
          analysis: currentInspirationAnalysis || undefined,
        });

      const orders = prev.orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              garmentType: resolvedGarmentType,
              garmentMeasurements: prev.designStudioGarmentMeasurements,
              measurementSnapshot: {
                ...order.measurementSnapshot,
                ...prev.designStudioGarmentMeasurements,
                capturedAt: new Date(),
              },
              selectedMeasurementProfileLabel:
                order.selectedMeasurementProfileLabel ||
                order.measurementSnapshot?.profileLabel ||
                null,
              selectedMeasurementProfileType:
                order.selectedMeasurementProfileType ||
                order.measurementSnapshot?.profileType ||
                null,
              productionPlan: generatedProductionPlan,
              inspirationAnalysis: currentInspirationAnalysis,
              designInspirationId:
                prev.selectedInspirationId || order.designInspirationId,
            }
          : order
      );

      const designInspirations = selectedInspiration
        ? prev.designInspirations.map((item) =>
            item.id === selectedInspiration.id
              ? {
                  ...item,
                  linkedOrderId: orderId,
                  analysis: currentInspirationAnalysis || item.analysis,
                }
              : item
          )
        : prev.designInspirations;

      const nextCustomers = hydrateCustomersWithProfiles(prev.customers, prev.measurementProfiles);
      const hydratedOrders = hydrateOrdersWithCustomers(orders, nextCustomers);

      return {
        ...prev,
        customers: nextCustomers,
        selectedGarmentType: resolvedGarmentType,
        orders: hydratedOrders,
        designInspirations,
        currentInspirationAnalysis,
        generatedProductionPlan,
      };
    });
  }, []);

  const linkInspirationToOrder = useCallback(
    (orderId: string, designInspirationId: string) => {
      setState((prev) => {
        const inspiration =
          prev.designInspirations.find(
            (item) => item.id === designInspirationId
          ) || null;

        const analysis =
          inspiration?.analysis ||
          (inspiration
            ? analyzeDesignInspiration(inspiration, prev.selectedGarmentType)
            : null);

        const resolvedGarmentType = inspiration
          ? inferGarmentTypeFromInspiration(inspiration, prev.selectedGarmentType)
          : prev.selectedGarmentType;

        const orders = prev.orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                designInspirationId,
                inspirationAnalysis: analysis,
                garmentType: resolvedGarmentType,
              }
            : order
        );

        const designInspirations = prev.designInspirations.map((item) =>
          item.id === designInspirationId
            ? {
                ...item,
                linkedOrderId: orderId,
                analysis: analysis || item.analysis,
              }
            : item
        );

        const nextCustomers = hydrateCustomersWithProfiles(prev.customers, prev.measurementProfiles);
        const hydratedOrders = hydrateOrdersWithCustomers(orders, nextCustomers);

        return {
          ...prev,
          customers: nextCustomers,
          orders: hydratedOrders,
          designInspirations,
          selectedInspirationId: designInspirationId,
          currentInspirationAnalysis: analysis,
          selectedGarmentType: resolvedGarmentType,
          generatedProductionPlan: null,
        };
      });
    },
    []
  );

  const linkFabricToOrder = useCallback(
    (orderId: string, fabricRecordId: string | null) => {
      setState((prev) => {
        const nextCustomers = hydrateCustomersWithProfiles(prev.customers, prev.measurementProfiles);
        const orders = hydrateOrdersWithCustomers(
          prev.orders.map((order) =>
            order.id === orderId
              ? { ...order, selectedFabricId: fabricRecordId }
              : order
          ),
          nextCustomers
        );

        return {
          ...prev,
          customers: nextCustomers,
          orders,
        };
      });
    },
    []
  );

  const linkPatternToOrder = useCallback(
    (orderId: string, patternLibraryId: string | null) => {
      setState((prev) => {
        const nextCustomers = hydrateCustomersWithProfiles(prev.customers, prev.measurementProfiles);
        const orders = hydrateOrdersWithCustomers(
          prev.orders.map((order) =>
            order.id === orderId
              ? { ...order, selectedPatternId: patternLibraryId }
              : order
          ),
          nextCustomers
        );

        return {
          ...prev,
          customers: nextCustomers,
          orders,
        };
      });
    },
    []
  );

  const addPatternLibraryItem = useCallback(
    (
      data: Omit<PatternLibraryItem, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>
    ) => {
      const newPatternLibraryItem = normalizePatternLibraryItem({
        ...data,
        id: crypto.randomUUID(),
        workspaceId: state.currentWorkspace.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as PatternLibraryItem);

      setState((prev) => ({
        ...prev,
        patternLibrary: [newPatternLibraryItem, ...prev.patternLibrary],
      }));

      return newPatternLibraryItem.id;
    },
    [state.currentWorkspace.id]
  );

  const updatePatternLibraryItem = useCallback(
    (
      patternLibraryId: string,
      updates: Partial<Omit<PatternLibraryItem, 'id' | 'workspaceId' | 'createdAt'>>
    ) => {
      setState((prev) => ({
        ...prev,
        patternLibrary: prev.patternLibrary.map((item) =>
          item.id === patternLibraryId
            ? normalizePatternLibraryItem({
                ...item,
                ...updates,
                updatedAt: new Date(),
              } as PatternLibraryItem)
            : item
        ),
      }));
    },
    []
  );

  const deletePatternLibraryItem = useCallback((patternLibraryId: string) => {
    setState((prev) => {
      const nextCustomers = hydrateCustomersWithProfiles(prev.customers, prev.measurementProfiles);
      const orders = hydrateOrdersWithCustomers(
        prev.orders.map((order) =>
          order.selectedPatternId === patternLibraryId
            ? { ...order, selectedPatternId: null }
            : order
        ),
        nextCustomers
      );

      return {
        ...prev,
        customers: nextCustomers,
        patternLibrary: prev.patternLibrary.filter((item) => item.id !== patternLibraryId),
        orders,
      };
    });
  }, []);

  const addFabricRecord = useCallback(
    (data: Omit<FabricRecord, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>) => {
      const newFabricRecord: FabricRecord = {
        ...data,
        id: crypto.randomUUID(),
        workspaceId: state.currentWorkspace.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setState((prev) => ({
        ...prev,
        fabricRecords: [newFabricRecord, ...prev.fabricRecords],
      }));
    },
    [state.currentWorkspace.id]
  );

  const updateFabricRecord = useCallback(
    (fabricRecordId: string, updates: Partial<FabricRecord>) => {
      setState((prev) => ({
        ...prev,
        fabricRecords: prev.fabricRecords.map((item) =>
          item.id === fabricRecordId
            ? { ...item, ...updates, updatedAt: new Date() }
            : item
        ),
      }));
    },
    []
  );

  const deleteFabricRecord = useCallback((fabricRecordId: string) => {
    setState((prev) => {
      const nextCustomers = hydrateCustomersWithProfiles(prev.customers, prev.measurementProfiles);
      const orders = hydrateOrdersWithCustomers(
        prev.orders.map((order) =>
          order.selectedFabricId === fabricRecordId
            ? { ...order, selectedFabricId: null }
            : order
        ),
        nextCustomers
      );

      return {
        ...prev,
        customers: nextCustomers,
        fabricRecords: prev.fabricRecords.filter((item) => item.id !== fabricRecordId),
        materialUsages: prev.materialUsages.filter(
          (usage) => usage.fabricRecordId !== fabricRecordId
        ),
        orders,
      };
    });
  }, []);

  const addMaterialUsage = useCallback(
    (data: {
      orderId: string;
      fabricRecordId: string;
      quantityUsed: number;
      unit: MaterialUnit;
      notes?: string;
    }) => {
      const fabricRecord = state.fabricRecords.find(
        (item) => item.id === data.fabricRecordId
      );

      if (!fabricRecord) {
        return { success: false, error: 'Material not found' };
      }

      if (fabricRecord.unit !== data.unit) {
        return {
          success: false,
          error: `Unit mismatch. Material uses ${fabricRecord.unit}`,
        };
      }

      if (data.quantityUsed <= 0) {
        return { success: false, error: 'Quantity must be greater than 0' };
      }

      if (fabricRecord.quantityInStock < data.quantityUsed) {
        return { success: false, error: 'Not enough stock available' };
      }

      const newUsage: OrderMaterialUsage = {
        id: crypto.randomUUID(),
        orderId: data.orderId,
        fabricRecordId: data.fabricRecordId,
        quantityUsed: data.quantityUsed,
        unit: data.unit,
        notes: data.notes,
        createdAt: new Date(),
      };

      setState((prev) => ({
        ...prev,
        materialUsages: [...prev.materialUsages, newUsage],
        fabricRecords: prev.fabricRecords.map((item) =>
          item.id === data.fabricRecordId
            ? {
                ...item,
                quantityInStock: item.quantityInStock - data.quantityUsed,
                updatedAt: new Date(),
              }
            : item
        ),
      }));

      return { success: true };
    },
    [state.fabricRecords]
  );

  const deleteMaterialUsage = useCallback((usageId: string) => {
    setState((prev) => {
      const usage = prev.materialUsages.find((item) => item.id === usageId);
      if (!usage) return prev;

      return {
        ...prev,
        materialUsages: prev.materialUsages.filter((item) => item.id !== usageId),
        fabricRecords: prev.fabricRecords.map((item) =>
          item.id === usage.fabricRecordId
            ? {
                ...item,
                quantityInStock: item.quantityInStock + usage.quantityUsed,
                updatedAt: new Date(),
              }
            : item
        ),
      };
    });
  }, []);

  const getOrderMaterialUsages = useCallback(
    (orderId: string) =>
      state.materialUsages.filter((usage) => usage.orderId === orderId),
    [state.materialUsages]
  );

  const getLowStockMaterials = useCallback(
    () =>
      state.fabricRecords.filter(
        (item) =>
          item.isActive !== false &&
          typeof item.reorderLevel === 'number' &&
          item.quantityInStock <= item.reorderLevel
      ),
    [state.fabricRecords]
  );

  return (
    <AppContext.Provider
      value={{
        ...state,
        setView,
        simulateTier,
        switchRole,
        canPerform,
        selectOrder,
        setSelectedGarmentType,
        setDesignMeasurements,
        setGarmentMeasurements,
        generateProductionPlanForStudio,
        setCurrentInspirationAnalysis,
        setFabricImage,
        addCustomer,
        updateCustomer,
        addOrder,
        updateOrder,
        addPayment,
        updateWorkspaceBranding,
        updateWorkspaceProfile,
        getCustomerOrders,
        getCustomerMeasurementProfiles,
        addCustomerMeasurementProfile,
        updateCustomerMeasurementProfile,
        deleteCustomerMeasurementProfile,
        applyMeasurementProfileToOrder,
        addDesignInspiration,
        deleteDesignInspiration,
        selectDesignInspiration,
        linkInspirationToOrder,
        linkFabricToOrder,
        linkPatternToOrder,
        saveStudioOutputToOrder,
        addPatternLibraryItem,
        updatePatternLibraryItem,
        deletePatternLibraryItem,
        addFabricRecord,
        updateFabricRecord,
        deleteFabricRecord,
        addMaterialUsage,
        deleteMaterialUsage,
        getOrderMaterialUsages,
        getLowStockMaterials,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

