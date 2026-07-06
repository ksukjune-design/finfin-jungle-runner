#!/bin/bash
cd "$(dirname "$0")"
set -x
node gen.js out/obs_a_raw.png 1:1 prompts/obs_sheet_a.txt
node gen.js out/obs_b_raw.png 1:1 prompts/obs_sheet_b.txt
KEY_COLOR=magenta node process.js slice out/obs_a_raw.png ../assets/sprites/obsA_ 2 2 220
node process.js slice out/obs_b_raw.png ../assets/sprites/obsB_ 2 2 220
echo BATCH5_DONE
