#!/usr/bin/env bash
# Lists every place where visual code reads the UI mode or valuation-derived regime instead of the computed
# physical quantities. Each hit must be justified (e.g. copy selection) or replaced by sign/magnitude of
# result.qLiquidW, result.electricalW, inputs.rainMmH, inputs.irradiance, etc.
# Usage: bash .claude/skills/sv-physics-validation/scripts/visual-coupling.sh [repo-root]
root="${1:-.}"
dirs=("$root/src/viz3d" "$root/src/sections" "$root/src/charts" "$root/src/motion")
echo "== reads of UI mode (s.mode / mode ===) in visual code =="
grep -rnE "\bs\.mode\b|\bmode ?===|useStore\(\(s\) => s\.mode\)" "${dirs[@]}" 2>/dev/null | grep -v "\.test\." || echo "(none)"
echo
echo "== reads of result.regime / pumpOn in 3D effects (direction should come from sign(qLiquidW)) =="
grep -rnE "\.regime\b|\bregime ?===" "$root/src/viz3d" "$root/src/motion" 2>/dev/null | grep -v "\.test\." || echo "(none)"
echo
echo "== heat-direction decisions (check each uses the live q, not a flag) =="
grep -rnE "qLiquidW ?[<>]|Math\.sign\(.*qLiquid" "$root/src/viz3d" "$root/src/motion" "$root/src/sections" 2>/dev/null | head -40
