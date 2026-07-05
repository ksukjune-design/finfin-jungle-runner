#!/bin/bash
cd "$(dirname "$0")"
set -x
for n in river beach bamboo village canyon city kinder; do
  node gen.js out/bg_${n}_raw.png 16:9 prompts/bg_${n}.txt ../assets/sprites/bg_jungle.jpg
done
node -e "const sharp=require('sharp');(async()=>{for(const n of ['river','beach','bamboo','village','canyon','city','kinder']){await sharp('out/bg_'+n+'_raw.png').resize({width:1200}).jpeg({quality:82}).toFile('../assets/sprites/bg_'+n+'.jpg');console.log(n+' saved');}})()"
echo BATCH4_DONE
