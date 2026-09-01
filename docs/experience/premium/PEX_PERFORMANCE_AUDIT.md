# PEX Performance Audit

Splash no longer hard-waits 1800ms independently of SplashScreen; min 700ms.

No background video. No 3D.

Main bundle still includes DesignStudio (~4048 lines) — not code-split this pass (would be a later slice).
