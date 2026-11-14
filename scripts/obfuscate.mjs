// 빌드 후 난독화 (성능 영향이 큰 제어 흐름 평탄화는 쓰지 않는다)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import JavaScriptObfuscator from 'javascript-obfuscator';

const dir = 'dist/assets';
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const p = join(dir, f);
  const src = readFileSync(p, 'utf8');
  const out = JavaScriptObfuscator.obfuscate(src, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: false,
    stringArray: true,
    stringArrayEncoding: [],
    stringArrayThreshold: 0.6,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
    disableConsoleOutput: true,
    target: 'browser',
  });
  writeFileSync(p, out.getObfuscatedCode());
  console.log('obfuscated', f, (src.length / 1024).toFixed(0) + 'KB →', (out.getObfuscatedCode().length / 1024).toFixed(0) + 'KB');
}
