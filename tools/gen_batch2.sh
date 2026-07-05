#!/bin/bash
# Fun-overhaul asset batch: generate + process new sprites
cd "$(dirname "$0")"
set -x

node gen.js out/shiba_slide_raw.png 1:1 prompts/shiba_slide.txt ../assets/sprites/shiba_1.png
node gen.js out/obs_branch_raw.png 1:1 prompts/obs_branch.txt
node gen.js out/toucan_raw.png 16:9 prompts/toucan_sheet.txt
node gen.js out/powerups_raw.png 1:1 prompts/powerups_sheet.txt
node gen.js out/bg_sunset_raw.png 16:9 prompts/bg_sunset.txt ../assets/sprites/bg_jungle.jpg
node gen.js out/bg_night_raw.png 16:9 prompts/bg_night.txt ../assets/sprites/bg_jungle.jpg

node process.js key out/shiba_slide_raw.png ../assets/sprites/shiba_slide.png 360
node process.js key out/obs_branch_raw.png ../assets/sprites/obs_branch.png 420
node process.js slice out/toucan_raw.png ../assets/sprites/toucan_ 1 2 240
node process.js slice out/powerups_raw.png ../assets/sprites/pow_ 2 2 180

echo BATCH_DONE
