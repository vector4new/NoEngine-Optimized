<img width="680" height="408" alt="image" src="https://github.com/user-attachments/assets/29553753-6663-4a20-bd66-5dc439f8db67" />

## No Engine - Optimized
> **A 3D Graphics Engine made in Javascript with NO Shaders or GLs + several needed optimizations and tweaks**

## Benchmark:
* Original: Far: 135-142 FPS | Close: 6-7 FPS
* Optimized: Far: 139-145 FPS | Close: 122-142 FPS (+966.65% Increase from the original)

## Optimizations:
1) Texture mapping now uses affine transformation + clip() instead of a scanline loop
2) Replaced Vertex with Float32Arrays and hoisted sinT/cosT out of sphere's inner loop in setUp
3) Replaced Array.sort with insertion sort
4) Removed new Vertex allocation inside calcLighting on both classes, replaced with scalar cx/cy/cz accumulation
5) blendWithWhite and hexToRgb are now moved out of drawTriangle
6) Added backface culling (stolen it from ZR3D-Lite) - V1.1
7) Added delta-time (dt) to camera movement - V1.1
8) objQueue's length is now set to 0 everytime instead of creating a brand new array - V1.1

## Adjustments:
1) Every object is in the objects.js file for easier use + added cylinders - V1.1
2) JSON scenes are implemented instead of using hardcoded scenes (may expand this in the future) + dynamic object creation - V1.1

## Setup:
* Download the zip file and extract it in order to get the folder
* Engine is in main.js
