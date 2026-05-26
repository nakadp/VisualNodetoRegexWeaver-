import { generateRegex } from '../src/utils/regexGenerator';
import { reverseEngineer } from '../src/utils/reverseEngineering';
import { evolveRegexAsync } from '../src/utils/darwinMagic';
import type { Node, Edge } from 'reactflow';

// Mock React Flow node structure for testing the backreference compiler
console.log("=== Test 1: Compile Backreference Node ===");
const mockNodes: Node[] = [
  { id: '1', type: 'groupStart', data: { type: 'groupStart', groupType: 'capturing' }, position: { x: 0, y: 0 } },
  { id: '2', type: 'charClass', data: { type: 'charClass', classPreset: 'wordChars' }, position: { x: 100, y: 0 } },
  { id: '3', type: 'groupEnd', data: { type: 'groupEnd' }, position: { x: 200, y: 0 } },
  { id: '4', type: 'text', data: { type: 'text', value: ' and ' }, position: { x: 300, y: 0 } },
  { id: '5', type: 'backreference', data: { type: 'backreference', groupIndex: '1' }, position: { x: 400, y: 0 } }
];
const mockEdges: Edge[] = [
  { id: 'e1', source: '1', target: '2' },
  { id: 'e2', source: '2', target: '3' },
  { id: 'e3', source: '3', target: '4' },
  { id: 'e4', source: '4', target: '5' }
];

const compiled = generateRegex(mockNodes, mockEdges);
console.log("Compiled Regex:", compiled);
if (compiled === "/(\\w) and \\1/g") {
  console.log("✅ Compilation success: correctly outputted backreference '\\1'.");
} else {
  console.error("❌ Compilation failed: got", compiled);
}

console.log("\n=== Test 2: Reverse Engineer Backreference Node ===");
const testRegex = "/<(?<tag>\\w+)>.*<\\/\\k<tag>>/g";
const decompiled = reverseEngineer(testRegex);
console.log("Decompiled Nodes:");
decompiled.nodes.forEach(n => console.log(`  - Type: ${n.type}, Label: ${n.data.label}, groupIndex: ${n.data.groupIndex || 'N/A'}`));

const hasBackrefNode = decompiled.nodes.some(n => n.type === 'backreference' && n.data.groupIndex === 'tag');
if (hasBackrefNode) {
  console.log("✅ Reverse engineering success: detected named backreference node for 'tag'.");
} else {
  console.error("❌ Reverse engineering failed.");
}

console.log("\n=== Test 3: GA HTML Evolution (Backreference) ===");
const htmlPositives = ["<div>hello</div>", "<span>test</span>", "<a>link</a>"];
const htmlNegatives = ["<div>ok</span>", "<span>hello</div>", "<a>link</b>", "text-only"];

evolveRegexAsync(htmlPositives, htmlNegatives, {
  maxGenerations: 250,
  populationSize: 120,
  onProgress: (p) => {
    if (p.generation % 20 === 0) {
      console.log(`  Gen ${p.generation} | Best: /${p.bestPattern}/ | Score: ${Math.round(p.bestFitness * 100)}%`);
    }
  },
  onComplete: (best) => {
    console.log("HTML Evolution Best Pattern:", `/${best}/`);
    const hasBackref = best.includes('\\1');
    if (hasBackref) {
      console.log("✅ GA success: evolved tag matching with backreference \\1!");
    } else {
      console.warn("⚠️ GA did not use backreference this run, but pattern is:", best);
    }
    runEmailTest();
  }
});

function runEmailTest() {
  console.log("\n=== Test 4: GA Email Evolution (Complex Addresses) ===");
  const emailPositives = [
    "foo@bar.ai", "ux@vy.org", "z@w.io", "a@b.co",
    "user.name+tag@gmail.com", "first_last@sub.domain.com",
    "a-b.c-d@x-y.z-a.org", "abc_def@alpha-beta.gamma.org",
    "simple@example.org", "user@one.two.three.com",
    "a1.b2.c3@d4.e5.f6.com", "test.email+alex@leetcode.com"
  ];
  const emailNegatives = [
    ".@gmail.com", "a.@b.com", ".a@b.com",
    "a..b@c.com", "user@domain..com", "user@domain-.com",
    "user@-domain.com", "not-an-email", "userdomain.com",
    "user@domain#com", "user@.com"
  ];

  evolveRegexAsync(emailPositives, emailNegatives, {
    maxGenerations: 300,
    populationSize: 120,
    onProgress: (p) => {
      if (p.generation % 20 === 0) {
        console.log(`  Gen ${p.generation} | Best: /${p.bestPattern}/ | Score: ${Math.round(p.bestFitness * 100)}%`);
      }
    },
    onComplete: (best) => {
      console.log("Email Evolution Best Pattern:", `/${best}/`);
      const excludesDoubleDot = !new RegExp(best).test("user@domain..com");
      const excludesBorderDash = !new RegExp(best).test("user@domain-.com") && !new RegExp(best).test("user@-domain.com");
      const posCount = emailPositives.filter(e => new RegExp(best).test(e)).length;
      console.log(`  Positive matches: ${posCount}/${emailPositives.length}`);
      if (excludesDoubleDot && excludesBorderDash) {
        console.log("✅ GA success: email pattern correctly excludes double dots and border dashes!");
      } else {
        console.warn("⚠️ Email pattern has structural issues.");
      }
      runLogTest();
    }
  });
}

function runLogTest() {
  console.log("\n=== Test 5: GA Log Evolution (Full Line, with module separator) ===");
  const logPositives = [
    "[INFO] 2025-05-20 10:23:11 - moduleA: Start process",
    "[ERROR] 2023-01-01 00:00:00 - core: Crash detected",
    "[WARN] 1999-12-31 23:59:59 - sys: High memory",
    "[DEBUG] 2024-06-10 12:01:02 - auth: Login ok",
    "[INFO] 2026-07-15 08:00:00 - api: Request done"
  ];
  const logNegatives = [
    "INFO 2025-05-20 10:23:11 moduleA Start",        // missing brackets
    "[INFO 2025-05-20 10:23:11 - moduleA: Start",    // missing closing bracket
    "[INFO] 2025/05/20 10:23:11 - moduleA: Start",   // wrong date separator
    "[INFO] 2025-05-20 - moduleA: Missing time",     // missing time
    "[INFO] 10:23:11 - moduleA: Start",              // missing date
    "[INFO] 2025-05-20 10:23:11 moduleA Start",      // missing ' - ' separator
    "2025-05-20 10:23:11 - moduleA",                 // missing level bracket
    "[LOG] 2025-05-20 10:23:11 - module: msg",       // invalid log level
    "just normal text line of logs"
  ];

  evolveRegexAsync(logPositives, logNegatives, {
    maxGenerations: 300,
    populationSize: 120,
    onProgress: (p) => {
      if (p.generation % 20 === 0) {
        console.log(`  Gen ${p.generation} | Best: /${p.bestPattern}/ | Score: ${Math.round(p.bestFitness * 100)}%`);
      }
    },
    onComplete: (best) => {
      console.log("Log Evolution Best Pattern:", `/${best}/`);
      const matchesPos = logPositives.every(log => new RegExp(best).test(log));
      const excludesNeg = logNegatives.every(log => !new RegExp(best).test(log));
      const posCount = logPositives.filter(log => new RegExp(best).test(log)).length;
      const negCount = logNegatives.filter(log => !new RegExp(best).test(log)).length;
      console.log(`  Positive matches: ${posCount}/${logPositives.length}, Negative exclusions: ${negCount}/${logNegatives.length}`);
      if (matchesPos && excludesNeg) {
        console.log("✅ GA success: Log pattern evolved with 100% precision!");
      } else {
        console.warn(`⚠️ Log evaluation: Match Pos: ${matchesPos}, Exclude Neg: ${excludesNeg}`);
        logPositives.forEach(log => {
          const pass = new RegExp(best).test(log);
          if (!pass) console.warn(`  ❌ Positive failed: ${log}`);
        });
        logNegatives.forEach(log => {
          const excluded = !new RegExp(best).test(log);
          if (!excluded) console.warn(`  ❌ Negative leaked: ${log}`);
        });
      }
      console.log("\n=== All Verification Tests Finished ===");
      process.exit(0);
    }
  });
}
