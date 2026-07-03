// Gemini image generation helper
// Usage: node gen.js <out.png> <aspect> <promptFile|-> [ref1 ref2 ...]
const fs = require('fs');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash-image';

async function main() {
  const [out, aspect, promptFile, ...refs] = process.argv.slice(2);
  if (!API_KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }
  const prompt = fs.readFileSync(promptFile, 'utf8');

  const parts = [{ text: prompt }];
  for (const r of refs) {
    parts.push({
      inline_data: {
        mime_type: r.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
        data: fs.readFileSync(r).toString('base64'),
      },
    });
  }

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: aspect },
    },
  };

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      const json = await res.json();
      if (!res.ok) {
        console.error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
        if (res.status === 429 || res.status >= 500) {
          await new Promise(r => setTimeout(r, 8000 * attempt));
          continue;
        }
        process.exit(1);
      }
      const cand = json.candidates && json.candidates[0];
      const imgPart = cand && cand.content && cand.content.parts && cand.content.parts.find(p => p.inlineData);
      if (!imgPart) {
        console.error('No image in response: ' + JSON.stringify(json).slice(0, 400));
        await new Promise(r => setTimeout(r, 4000));
        continue;
      }
      fs.writeFileSync(out, Buffer.from(imgPart.inlineData.data, 'base64'));
      console.log('saved ' + out);
      return;
    } catch (e) {
      console.error('attempt ' + attempt + ' failed: ' + e.message);
      await new Promise(r => setTimeout(r, 5000 * attempt));
    }
  }
  process.exit(1);
}
main();
