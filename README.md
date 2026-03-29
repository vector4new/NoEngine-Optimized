![image](https://github.com/user-attachments/assets/86f609c7-17cb-40b7-81ca-5411ad1507eb)

## No Engine - Optimized
> **A 3D Graphics Engine made in Javascript with NO Shaders or GLs + several needed optimizations**

## Benchmark:
* Original: Far: 135-142 FPS | Close: 6-7 FPS
* Optimized: Far: 137-144 FPS | Close: 64-79 FPS (~+300% Increase from the original)

## Optimizations:
1) Texture mapping now uses affine transformation + clip() instead of a scanline loop
2) Replaced Vertex with Float32Arrays and hoisted sinT/cosT out of sphere's inner loop in setUp
3) Replaced Array.sort with insertion sort
4) Removed new Vertex allocation inside calcLighting on both classes, replaced with scalar cx/cy/cz accumulation
5) blendWithWhite and hexToRgb are now moved out of drawTriangle

## Setup:
* Download the zip file and extract it in order to get the folder
* Engine is in main.js
