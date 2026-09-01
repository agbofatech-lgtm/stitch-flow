# Integration Seam

```
DesignStudio (minimal button + dialog)
  → finalizeDesignForTrustedTailoring()
  → assessTrustedReadiness()
  → existing P13–P16 freeze + executeTrustedTailoring
```

Live measurements live in DesignStudio React state. Frame cannot see them. A **minimal Studio seam** was therefore required (button + dialog only). Canvas `useMemo` generation was not redirected.

T7 save paths remain distinct. Trusted artifact is **not** written onto the order JSON (would begin shop SoT migration).
