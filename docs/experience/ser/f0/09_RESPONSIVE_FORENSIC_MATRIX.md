# Responsive forensic matrix

**NOT VERIFIED at listed pixel widths.** No viewport lab. SOURCE-EVIDENCED capability only.

| Width | Shell (source) | Studio | Tables/dialogs | Verdict |
|---|---|---|---|---|
| 320–412 | mobile 6-col nav; hamburger header | unknown | inspector default **off** below 1280 | **degraded / unknown** |
| 768 | md header actions appear | unknown | unknown | **unknown** |
| 1024 | lg: desktop nav rail | unknown | unknown | **unknown** |
| 1280–1440 | inspector default **on** | unknown | unknown | **usable (inferred)** |
| 1920 | same | unknown | unknown | **unknown** |

Source hooks:

- `matchMedia('(min-width: 1280px)')` inspector default
- `lg:hidden` / `hidden lg:block` nav
- `grid-cols-6` mobile bar (six workspaces; Settings/Control not in bar)
- Tailwind sm/md/lg/xl in Workroom grids
- Design Studio: large canvas — historically poor on phone (INHERITED, not re-measured)

Do not certify mobile. SER-F7 must lab these widths.
