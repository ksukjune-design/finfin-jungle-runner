#!/bin/bash
# DX 확장 에셋: 뱀, 원숭이, 코믹 얼굴 2종
cd "$(dirname "$0")"
set -x

node gen.js out/snake_raw.png 16:9 prompts/snake_sheet.txt
node gen.js out/monkey_raw.png 1:1 prompts/monkey.txt
node gen.js out/shiba_face_raw.png 1:1 prompts/shiba_face.txt ../assets/sprites/shiba_1.png
node gen.js out/tiger_face_raw.png 1:1 prompts/tiger_face.txt ../assets/sprites/tiger_1.png

KEY_COLOR=magenta node process.js slice out/snake_raw.png ../assets/sprites/snake_ 1 2 240
KEY_COLOR=magenta node process.js key out/monkey_raw.png ../assets/sprites/monkey.png 240
node process.js key out/shiba_face_raw.png ../assets/sprites/face_shiba.png 300
node process.js key out/tiger_face_raw.png ../assets/sprites/face_tiger.png 300

echo BATCH3_DONE
