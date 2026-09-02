import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useApp } from '../context/AppContext';
import {
  buildWorkflowSpecification,
  historicalSnapshotIntact,
  persistSpecificationSnapshot,
  runPatternFromSpecification,
  runProductionFromSpecification,
  workflowNextActions,
  type PatternArtifactSummary,
} from './orchestrate';
import type { GarmentSpecification } from '../domain/garment/specification';
import { orderStatusWorkflowLabel } from '../domain/garment/specification';

type WorkflowContextValue = {
  customerId: string | null;
  profileId: string | null;
  orderId: string | null;
  specification: GarmentSpecification | null;
  patternSummary: PatternArtifactSummary | null;
  lastError: string | null;
  lastMessage: string | null;
  nextActions: string[];
  selectCustomer: (id: string | null) => void;
  selectProfile: (id: string | null) => void;
  selectOrder: (id: string | null) => void;
  freezeMeasurementsOnOrder: () => { success: boolean; error?: string };
  generatePattern: () => void;
  generateProduction: () => void;
  saveStudioToOrder: () => void;
  snapshotSpecToRepository: () => Promise<void>;
  orderWorkflowLabel: string;
  historyIntact: boolean;
};

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const app = useApp();
  const [orderId, setOrderId] = useState<string | null>(app.selectedOrderId);
  const [customerId, setCustomerId] = useState<string | null>(() => {
    const order = app.orders.find((item) => item.id === app.selectedOrderId);
    return order?.customerId || null;
  });
  const [profileId, setProfileId] = useState<string | null>(() => {
    const order = app.orders.find((item) => item.id === app.selectedOrderId);
    return order?.selectedMeasurementProfileId || null;
  });
  const [patternSummary, setPatternSummary] = useState<PatternArtifactSummary | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const customer = app.customers.find((item) => item.id === customerId) || null;
  const profile =
    app.measurementProfiles.find((item) => item.id === profileId) ||
    app.measurementProfiles.find((item) => item.customerId === customerId && item.isDefault) ||
    null;
  const order = app.orders.find((item) => item.id === orderId) || null;

  const specification = useMemo(
    () =>
      customer || profile || order
        ? buildWorkflowSpecification({ customer, profile, order })
        : null,
    [customer, order, profile]
  );

  const selectCustomer = useCallback(
    (id: string | null) => {
      setCustomerId(id);
      const nextProfile =
        app.measurementProfiles.find((item) => item.customerId === id && item.isDefault) ||
        app.measurementProfiles.find((item) => item.customerId === id) ||
        null;
      setProfileId(nextProfile?.id || null);
      const nextOrder = app.orders.find((item) => item.customerId === id) || null;
      setOrderId(nextOrder?.id || null);
      app.selectOrder(nextOrder?.id || null);
      setLastMessage(id ? 'Client selected. Thread follows this person.' : 'Client cleared.');
    },
    [app]
  );

  const selectProfile = useCallback((id: string | null) => {
    setProfileId(id);
    setLastMessage(id ? 'Measurement profile selected.' : 'Profile cleared.');
  }, []);

  const selectOrder = useCallback(
    (id: string | null) => {
      setOrderId(id);
      app.selectOrder(id);
      const next = app.orders.find((item) => item.id === id);
      if (next?.customerId) setCustomerId(next.customerId);
      if (next?.selectedMeasurementProfileId) setProfileId(next.selectedMeasurementProfileId);
      setLastMessage(id ? 'Order selected. Historical snapshot stays on the order.' : 'Order cleared.');
    },
    [app]
  );

  const freezeMeasurementsOnOrder = useCallback(() => {
    setLastError(null);
    if (!orderId || !profileId) {
      const error = 'Select an order and a measurement profile before freezing.';
      setLastError(error);
      return { success: false, error };
    }
    const result = app.applyMeasurementProfileToOrder(orderId, profileId);
    if (!result.success) {
      setLastError(result.error || 'Freeze failed');
      return result;
    }
    setLastMessage('Measurement version frozen onto the order snapshot. Live profile edits will not rewrite it silently.');
    return result;
  }, [app, orderId, profileId]);

  const generatePattern = useCallback(() => {
    setLastError(null);
    if (!specification) {
      setLastError('No garment specification yet.');
      return;
    }
    try {
      const { summary } = runPatternFromSpecification(specification);
      setPatternSummary(summary);
      setLastMessage(`Pattern generated via T3 wrapper (${summary.kind}, ${summary.pointCount} points). Engine not rewritten.`);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Pattern generation failed');
    }
  }, [specification]);

  const generateProduction = useCallback(() => {
    setLastError(null);
    if (!specification || !orderId) {
      setLastError('Select an order with a specification before generating a production plan.');
      return;
    }
    try {
      const inspiration = app.designInspirations.find((item) => item.id === specification.designInspirationId);
      const plan = runProductionFromSpecification(specification, { inspiration });
      app.updateOrder(orderId, { productionPlan: plan, garmentType: specification.garmentType });
      setLastMessage('Production plan attached to the order via T3 wrapper.');
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Production plan failed');
    }
  }, [app, orderId, specification]);

  const saveStudioToOrder = useCallback(() => {
    setLastError(null);
    if (!orderId) {
      setLastError('Select an order before saving Design Studio output.');
      return;
    }
    app.saveStudioOutputToOrder(orderId);
    setLastMessage('Existing Design Studio output saved onto the selected order. Studio file was not rewritten.');
  }, [app, orderId]);

  const snapshotSpecToRepository = useCallback(async () => {
    setLastError(null);
    if (!specification) {
      setLastError('No specification to snapshot.');
      return;
    }
    try {
      await persistSpecificationSnapshot(specification);
      setLastMessage('Garment specification snapshot written to the T2 garment repository.');
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Repository snapshot failed');
    }
  }, [specification]);

  const value: WorkflowContextValue = {
    customerId,
    profileId,
    orderId,
    specification,
    patternSummary,
    lastError,
    lastMessage,
    nextActions: workflowNextActions({
      customerId,
      profileId,
      orderId,
      specification,
      patternPresent: Boolean(patternSummary),
      productionPlanPresent: Boolean(order?.productionPlan),
    }),
    selectCustomer,
    selectProfile,
    selectOrder,
    freezeMeasurementsOnOrder,
    generatePattern,
    generateProduction,
    saveStudioToOrder,
    snapshotSpecToRepository,
    orderWorkflowLabel: orderStatusWorkflowLabel(order?.status),
    historyIntact: order ? historicalSnapshotIntact(order, profile) : true,
  };

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error('useWorkflow must be used within WorkflowProvider');
  return context;
}
