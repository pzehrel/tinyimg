---
"@pz4l/tinyimg-vite": minor
"@pz4l/tinyimg-webpack": minor
"@pz4l/tinyimg-rsbuild": minor
---

Add opt-in renameConvertedFiles for JPEG output under .png filenames, retaining the existing filename-preserving default. Update emitted asset references and metadata, keep source maps, reject filename collisions, and reuse the same compression cache across naming modes.
