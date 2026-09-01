# SER-F3 motion architecture

Single module: `apps/web/src/experience/motion/motion.ts`.  
Existing **framer-motion** only (already a dependency). No new framework.

Categories: MICRO · CONTEXTUAL · WORKSPACE · MILESTONE.

Transforms/opacity only. `motionOrInstant` keeps **opacity state change** under `prefers-reduced-motion` (does not delete feedback).
