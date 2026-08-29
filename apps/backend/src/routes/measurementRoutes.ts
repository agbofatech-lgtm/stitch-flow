/**
 * Phase 13 — Measurement Intelligence API.
 * Mounted under /customers/:customerId/measurement-profiles with
 * authMiddleware + requireWorkspace (see app.ts). All access paths verify
 * customer ownership server-side; UI filtering is never security.
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validate';
import { ApiError } from '../utils/apiError';
import {
  ALL_DEFINITIONS,
  BODY_DEFINITIONS,
  definitionsForGarment,
} from '../modules/measurements/definitions';
import { OBSERVATION_OPTIONS } from '../modules/measurements/types';
import * as svc from '../modules/measurements/profileService';

const router = Router({ mergeParams: true });

const valueSchema = z.object({
  definitionCode: z.string().min(1),
  originalValue: z.union([z.number(), z.string()]),
  originalUnit: z.enum(['cm', 'inch']),
  source: z.enum(['manual', 'historical_copy', 'imported', 'derived', 'estimated']).optional(),
  confidence: z.enum(['verified', 'unverified', 'estimated']).optional(),
  notes: z.string().max(2000).optional(),
  overrideReason: z.string().min(3).max(500).nullable().optional(),
});

const setSchema = z.object({
  id: z.string().optional(),
  category: z.enum(['body', 'garment']),
  garmentType: z.string().min(1).max(40).nullable().optional(),
  values: z.array(valueSchema).max(200),
});

const observationSchema = z
  .object({
    code: z.enum(['posture', 'shoulder_slope', 'waist_position', 'hip_shape', 'back_curve']),
    value: z.string().min(1).max(40),
  })
  .refine((o) => OBSERVATION_OPTIONS[o.code].includes(o.value), { message: 'Invalid observation value' });

const idParams = z.object({ customerId: z.string().min(1) });
const profileParams = z.object({ customerId: z.string().min(1), profileId: z.string().min(1) });

router.get(
  '/',
  validate(z.object({ params: idParams })),
  asyncHandler(async (req, res) => {
    const profiles = await svc.listProfiles(req.workspaceId!, req.params.customerId);
    res.json({ profiles });
  }),
);

router.post(
  '/',
  validate(
    z.object({
      body: z.object({
        name: z.string().min(1).max(120).optional(),
        dateTaken: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        notes: z.string().max(2000).optional(),
      }),
      params: idParams,
    }),
  ),
  asyncHandler(async (req, res) => {
    const profile = await svc.createProfile(req.workspaceId!, req.params.customerId, req.user!.sub, req.body);
    res.status(201).json({ profile });
  }),
);

router.get(
  '/compare',
  validate(
    z.object({
      params: idParams,
      query: z.object({ currentId: z.string().min(1), previousId: z.string().min(1) }),
    }),
  ),
  asyncHandler(async (req, res) => {
    const comparison = await svc.compareProfiles(
      req.workspaceId!,
      req.query.currentId as string,
      req.query.previousId as string,
    );
    res.json({ comparison });
  }),
);

router.get(
  '/:profileId',
  validate(z.object({ params: profileParams })),
  asyncHandler(async (req, res) => {
    const full = await svc.getProfileFull(req.workspaceId!, req.params.profileId);
    if (full.profile.customerId !== req.params.customerId) {
      throw new ApiError(404, 'NOT_FOUND', 'Measurement profile not found for this customer');
    }
    const validation = await svc.computeValidation(full);
    res.json({ profile: full.profile, sets: full.sets, validation });
  }),
);

router.patch(
  '/:profileId',
  validate(
    z.object({
      body: z.object({
        name: z.string().min(1).max(120).optional(),
        dateTaken: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        notes: z.string().max(2000).optional(),
        observations: z.array(observationSchema).max(10).optional(),
        sets: z.array(setSchema).max(12).optional(),
      }),
      params: profileParams,
    }),
  ),
  asyncHandler(async (req, res) => {
    const { full, validation } = await svc.updateDraft(
      req.workspaceId!,
      req.params.profileId,
      req.user!.sub,
      req.body,
    );
    if (full.profile.customerId !== req.params.customerId) {
      throw new ApiError(404, 'NOT_FOUND', 'Measurement profile not found for this customer');
    }
    res.json({ profile: full.profile, sets: full.sets, validation });
  }),
);

router.post(
  '/:profileId/validate',
  validate(z.object({ params: profileParams })),
  asyncHandler(async (req, res) => {
    const result = await svc.validateProfile(req.workspaceId!, req.params.profileId);
    res.json(result);
  }),
);

router.post(
  '/:profileId/activate',
  validate(z.object({ params: profileParams })),
  asyncHandler(async (req, res) => {
    const profile = await svc.activateProfile(req.workspaceId!, req.params.profileId);
    res.json({ profile });
  }),
);

router.post(
  '/:profileId/archive',
  validate(z.object({ params: profileParams })),
  asyncHandler(async (req, res) => {
    const profile = await svc.archiveProfile(req.workspaceId!, req.params.profileId);
    res.json({ profile });
  }),
);

router.post(
  '/:profileId/new-version',
  validate(z.object({ params: profileParams })),
  asyncHandler(async (req, res) => {
    const full = await svc.createNewVersion(req.workspaceId!, req.params.profileId, req.user!.sub);
    res.status(201).json({ profile: full.profile, sets: full.sets });
  }),
);

export default router;

/** Definition registry lookup — global, read-only. */
export const definitionRoutes = Router();
definitionRoutes.get(
  '/',
  validate(
    z.object({
      query: z.object({
        category: z.enum(['body', 'garment', 'pattern', 'derived']).optional(),
        garmentType: z.string().max(40).optional(),
      }),
    }),
  ),
  asyncHandler(async (req, res) => {
    let defs = ALL_DEFINITIONS;
    if (req.query.category === 'body') defs = BODY_DEFINITIONS;
    else if (req.query.garmentType) defs = definitionsForGarment(req.query.garmentType as string);
    else if (req.query.category) defs = ALL_DEFINITIONS.filter((d) => d.category === req.query.category);
    res.json({ definitions: defs });
  }),
);
