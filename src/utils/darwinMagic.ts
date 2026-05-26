export interface EvolutionProgress {
  generation: number;
  bestFitness: number;
  bestPattern: string;
  positiveScores: { text: string; passed: boolean }[];
  negativeScores: { text: string; passed: boolean }[];
}

export interface NegativeCase {
  text: string;
  weight: number;
}

export const evolveRegexAsync = (
  positives: string[],
  negatives: string[],
  options: {
    maxGenerations?: number;
    populationSize?: number;
    onProgress: (progress: EvolutionProgress) => void;
    onComplete: (bestPattern: string) => void;
  }
) => {
  const maxGen = options.maxGenerations || 80;
  const popSize = options.populationSize || 60;
  
  if (positives.length === 0) {
    options.onComplete('');
    return;
  }

  // Clone original positives/negatives to compute evaluation stats on the user's actual examples,
  // but run the GA selection against augmented lists to guide proper structure learning.
  const evalPositives = [...positives];
  const evalNegatives = [...negatives];

  const augmentedPositives = [...positives];
  const augmentedNegatives = [...negatives];

  // Detect domain
  const isEmail = positives.some(s => s.includes('@') && s.includes('.'));
  
  // Differentiate date from log format
  const hasDatePattern = positives.some(s => /\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}/.test(s));
  const hasLogIndicators = positives.some(s => /\[(INFO|ERROR|WARN|DEBUG|info|error|warn|debug)\]/.test(s) || s.includes('[') || s.includes(']') || /INFO|ERROR|WARN|DEBUG/i.test(s));
  
  const isLog = hasLogIndicators || (hasDatePattern && positives.some(s => s.length > 25));
  const isDate = hasDatePattern && !isLog;

  const isIP = positives.some(s => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(s) || (s.split('.').length === 4 && s.split('.').every(part => !isNaN(Number(part)))));
  const isHTML = positives.some(s => /<[a-zA-Z0-9]+>.*<\/[a-zA-Z0-9]+>/.test(s));

  const getNegativeWeight = (text: string, gen: number): number => {
    const isEarly = gen < Math.min(80, Math.floor(maxGen * 0.4));
    if (isEmail) {
      if (text.includes('..') || text.includes('.-') || text.includes('-.')) return isEarly ? 0.1 : 5;
      if (/^\.|^-[a-zA-Z0-9]|\.@|-@|\.$/.test(text)) return isEarly ? 0.1 : 5;
      if (text === 'just-text' || text === 'not-an-email') return 1;
      return 3;
    }
    if (isHTML) {
      if (text.includes('div') && text.includes('span')) return 5;
      if (text.includes('a') && text.includes('b')) return 5;
      if (text.includes('h1') && text.includes('h2')) return 5;
      if (text === 'text-only') return 1;
      return 3;
    }
    if (isLog) {
      if (text.includes('INFO') || text.includes('ERROR') || text.includes('WARN')) {
        if (!text.startsWith('[') || !text.includes(']')) return 5;
        return 3;
      }
      return 1;
    }
    if (isIP) {
      if (text.split('.').length > 4 || text.includes('256') || text.includes('300') || text.includes('999')) return 5;
      return 3;
    }
    if (isDate) {
      if (text.includes('31') || text.includes('30') || text.includes('13')) return 5;
      return 3;
    }
    return 1;
  };

  if (isEmail) {
    // Add synthetic positives that don't have 't', 'c', or 's' (breaking single letter shortcuts)
    augmentedPositives.push(
      "foo@bar.ai", "ux@vy.org", "z@w.io", "a@b.co", "hello@world.net",
      "adm@usr.org", "me@home.cn", "mail@box.xyz", "alpha@beta.dev", "ga@engine.net",
      "a1@b2.cc", "user.name+tag@gmail.com", "first_last@sub.domain.com",
      "a-b.c-d@x-y.z-a.org", "test123@a1.b2.c3.net", "x@x.io",
      "abc_def@alpha-beta.gamma.org", "user+filter@service-mail.com",
      "name@sub.sub2.domain.co.uk", "long.email-address@multi.level.domain.com",
      "user.name@company-name.io", "email@123domain.com", "test@domain123.org",
      "a.b.c@x-y-z.tld", "abc+tag@sub-domain.service.net", "simple@example.org",
      "user@one.two.three.com", "z-1@a-b.c-d-ef.net", "a_b-c.d+e@f-g.h-i-j.com",
      "abc.def@sub-domain.example.co.uk", "user123@nested.sub.domain.org",
      "a@very.deep.structure.domain.com", "name+tag@long-domain-name.example.net",
      "x.y.z@alpha-beta-gamma.delta.org", "a1.b2.c3@d4.e5.f6.com",
      "alpha@beta-gamma.delta-epsilon.org", "z@z.zz", "n@n.nn", "test.email+alex@leetcode.com"
    );
    // Add synthetic negatives that have email characters but are structured incorrectly
    augmentedNegatives.push(
      "no-at-sign.com", "@no-user.org", "user@no-tld", "abc@.", "invalid@domain.",
      "@@double-at.com", "space in@email.com", "user@domain..com", "user@domain.c",
      "a..b@c.com", "a.@b.com", ".a@b.com", "user@domain-.com", "user@-domain.com",
      "just-text", "@missing-user.com", "user@domain-without-tld", "invalid_email@.com", "not-an-email",
      "user@domain.toolongtldd", "user@domain,com", "user@domain com", "user@domain..co.uk",
      "user@.sub.domain.com", "user@domain..org", "user@domain-.co", "user@-sub.domain.com",
      "user@domain..co..uk", "userdomain.com", "@domain.com", "user@domain#com", "user@.com",
      "user@do..main.com", "user@domain.-com", "user@domain-.sub.com", "user@-domain.sub.com",
      "user@sub..domain.com", "user@sub.-domain.com"
    );
  } else if (isDate) {
    augmentedPositives.push(
      "2024-05-12", "1999-12-31", "2030-01-01", "2015-08-23", "1988-04-19",
      "2000-02-29", "2026-06-30", "1970-07-07", "2099-09-09", "2025-10-10",
      "2400-02-29", "2020-02-29", "2016-02-29", "2012-02-29", "2008-02-29",
      "2004-02-29", "1996-02-29", "2023-01-31", "2023-03-31", "2023-05-31",
      "2023-07-31", "2023-08-31", "2023-10-31", "2023-12-31", "2023-04-30",
      "2023-06-30", "2023-09-30", "2023-11-30", "1999-12-01", "2022-11-30",
      "2025-08-31", "2026-07-31", "2027-05-31", "2028-02-29", "2010-01-01",
      "2011-02-28", "2013-02-28", "2019-02-28"
    );
    augmentedNegatives.push(
      "202-11-30", "2024-1-1", "9999-99-99", "12-34-5678", "date-text",
      "2024/05/12", "2024.05.12", "24-05-12", "2024-05-123", "2024-00-12",
      "2024-13-12", "2023-11-31", "2023-06-31", "2023-02-30",
      "2023-02-29", "1900-02-29", "2100-02-29", "2200-02-29", "2300-02-29",
      "2023-04-31", "2023-06-31", "2023-09-31", "2023-11-31", "2023-02-31",
      "2023-13-01", "2023-00-10", "2023-01-00", "2023-01-32",
      "2023-002-02", "2023-02-002", "2023-2-2", "23-02-02",
      "2023/02/02", "2023-02-29a", "2023-02-291", "2023-02-03x",
      "2023-02--02", "abcd-ef-gh", "2023-2-02", "2023-02-2",
      "2023-002-2", "2023-02-002a", "2023-02-00"
    );
  } else if (isIP) {
    augmentedPositives.push(
      "1.2.3.4", "255.255.255.255", "192.168.0.1", "10.0.0.1", "172.16.254.1",
      "8.8.8.8", "127.0.0.1", "192.168.1.100", "224.0.0.0", "10.10.10.10"
    );
    augmentedNegatives.push(
      "1.2.3.4.5", "256.1.2.3", "abc.def.ghi.jkl", "123.456", "1.2.3",
      "256.256.256.256", "1.2.3.4a", "192.168.0.01", "192.168.0",
      "300.300.300.300", "256.256.256.256", "999.1.1.1"
    );
  } else if (isHTML) {
    augmentedPositives.push(
      "<div>hello</div>", "<p>world</p>", "<span>test</span>", "<a>link</a>", "<h1>title</h1>",
      "<li>item</li>", "<b>bold</b>", "<i>italic</i>", "<u>underline</u>", "<title>weaver</title>",
      "<div>content</div>", "<span>text</span>", "<p></p>", "<ul>list</ul>", "<header>head</header>",
      "<footer>foot</footer>", "<section>sec</section>", "<nav>nav</nav>", "<main>main</main>",
      "<code>code</code>", "<pre>pre</pre>", "<abc>xyz</abc>", "<tag123>content</tag123>",
      "<alpha-beta>ok</alpha-beta>", "<x>y</x>", "<test>123</test>", "<a1>b1</a1>",
      "<tag-1>t</tag-1>", "<z>z</z>", "<pp>qq</pp>", "<data>value</data>"
    );
    augmentedNegatives.push(
      "<div>no-close", "no-open</div>", "<div class='test'>", "text-only",
      "<div/>", "<div class=\"test\">hello</div>", "<p>world", "<span>test</span",
      "<div>ok</span>", "<span>hello</div>", "<a>link</b>", "<h1>title</h2>", "<div><div></div>",
      "<div>content</span>", "<div>", "</div>", "< div>text</div>", "<div>content</divd>",
      "<div>content</div >", "<div></ span>", "<span>text</div>", "<p></div>", "<a>link",
      "</a", "<div> </span>", "<div/>content</div>", "<></>", "<1div>test</1div>",
      "<div>content</ div>", "<div>content</span>", "<abc>xyz</abx>", "<tag123>123</tag12>",
      "<alpha>ok</alp>", "<x>y</z>", "<test>123</test1>", "<test1>123</test>",
      "<test>123</ test>", "<test>123</test >", "<alpha-beta>ok</alpha_beta>", "<tag-1>t</tag1>",
      "<tag>nested<tag></tag>"
    );
  } else if (isLog) {
    augmentedPositives.push(
      "[INFO] 2026-05-26 12:00:00 - main: App started",
      "[WARN] 2026-05-26 12:05:00 - loader: High load detected",
      "[ERROR] 2026-05-26 12:10:00 - db: Database connection error",
      "[DEBUG] 2026-05-26 12:15:00 - worker: Debug info details",
      "[INFO] 2025-05-20 10:23:11 - moduleA: Start process",
      "[ERROR] 2023-01-01 00:00:00 - core: Crash detected",
      "[WARN] 1999-12-31 23:59:59 - sys: High memory",
      "[DEBUG] 2024-06-10 12:01:02 - auth: Login ok",
      "[INFO] 2026-07-15 08:00:00 - api: Request done",
      "[ERROR] 2022-03-01 11:11:11 - db: Timeout",
      "[WARN] 2021-09-09 09:09:09 - cache: Miss",
      "[INFO] 2020-10-10 10:10:10 - svc: Started",
      "[DEBUG] 2019-01-01 01:01:01 - init: Boot",
      "[INFO] 2018-12-12 12:12:12 - main: Running",
      "[ERROR] 2017-05-05 05:05:05 - worker: Fail",
      "[WARN] 2016-06-06 06:06:06 - fs: Slow",
      "[INFO] 2015-07-07 07:07:07 - net: Up",
      "[DEBUG] 2014-08-08 08:08:08 - job: Done",
      "[INFO] 2013-09-09 09:09:09 - test: OK",
      "[ERROR] 2012-11-11 11:11:11 - kernel: Panic",
      "[WARN] 2011-01-01 01:01:01 - system: Overload",
      "[INFO] 2010-02-02 02:02:02 - app: Init",
      "[DEBUG] 2009-03-03 03:03:03 - engine: Loop",
      "[INFO] 2008-04-04 04:04:04 - srv: Alive",
      "[INFO] 2025-01-01 01:01:01 - x: y",
      "[ERROR] 2024-12-12 12:12:12 - m: n",
      "[WARN] 2023-11-11 11:11:11 - a: b",
      "[DEBUG] 2022-10-10 10:10:10 - k: l",
      "[INFO] 2021-09-09 09:09:09 - short: ok"
    );
    augmentedNegatives.push(
      "2026-05-26 12:00:00 App started",
      "[INFO] App started",
      "INFO] 2026-05-26 12:00:00 App started",
      "[INFO 2026-05-26 12:00:00 App started",
      "[ERROR] 2026-05-26 App started",
      "just normal text line of logs",
      "INFO 2025-05-20 10:23:11 moduleA Start",
      "[INFO 2025-05-20 10:23:11 - moduleA: Start",
      "[INFO] 2025/05/20 10:23:11 - moduleA: Start",
      "[INFO] 2025-05-20 - moduleA: Missing time",
      "[INFO] 10:23:11 - moduleA: Start",
      "[INFO] 2025-05-20 10:23 - moduleA",
      "[INFO] 2025-05-20 10:23:11 moduleA Start",
      "[INFO] 2025-05-20T10:23:11 - moduleA: Start",
      "[INFO] - moduleA: Start",
      "2025-05-20 10:23:11 - moduleA",
      "[ERROR]2025-05-20 10:23:11 - module: fail",
      "[DEBUG] 2025-05-20 10:23:11 module: ok",
      "[WARN] 2025-05-20T10:23:11 - module: warn",
      "[INFO] 2025-05-20 10:23:11 - : msg",
      "[INFO] 2025-05-20 10:23:11 moduleA:",
      "[INFO] 2025-05-20 10:23:11 - moduleA",
      "[INFO]2025-05-20 10:23:11 - moduleA: Start",
      "[LOG] 2025-05-20 10:23:11 - module: msg",
      "[INFO]2025-05-20T10:23:11 module",
      "[INFO] 2025-05-20 10:23:11 moduleA Start process",
      "[INFO] 2025-05-20 10:23:11 - moduleA:",
      "[INFO] 2025-05-20 10:23:11 - :",
      "[INFO] 2025-05-20 - :",
      "[INFO] - :",
      "[INFO] 2025-05-20 10:23:11 moduleA"
    );
  }

  // Choose seed templates based on detected domain
  const activeSeeds: string[][] = [];
  if (isEmail) {
    activeSeeds.push(['\\w', '+', '@', '\\w', '+', '\\.', '\\w', '+']);
    activeSeeds.push(['^', '\\w', '+', '@', '\\w', '+', '\\.', '\\w', '+', '$']);
    activeSeeds.push(['[a-zA-Z0-9._%+-]', '+', '@', '[a-zA-Z0-9.-]', '+', '\\.', '[a-zA-Z]', '{2,}']);
    activeSeeds.push(['^', '[a-zA-Z0-9._%+-]', '+', '@', '[a-zA-Z0-9.-]', '+', '\\.', '[a-zA-Z]', '{2,}', '$']);
    // Advanced lookahead combination seed with alphanumeric borders
    activeSeeds.push(['^', '(?!.*\\.\\.)', '(?!.*-\\.)', '(?!.*\\.-)', '[a-zA-Z0-9]', '[a-zA-Z0-9._%+-]', '*', '[a-zA-Z0-9]', '@', '[a-zA-Z0-9]', '[a-zA-Z0-9.-]', '*', '[a-zA-Z0-9]', '\\.', '[a-zA-Z]', '{2,}', '$']);
  }
  if (isIP) {
    activeSeeds.push(['\\d', '+', '\\.', '\\d', '+', '\\.', '\\d', '+', '\\.', '\\d', '+']);
    activeSeeds.push(['^', '\\d', '+', '\\.', '\\d', '+', '\\.', '\\d', '+', '\\.', '\\d', '+', '$']);
    activeSeeds.push(['^', '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)', '\\.', '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)', '\\.', '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)', '\\.', '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)', '$']);
  }
  if (isDate) {
    activeSeeds.push(['\\d', '{4}', '-', '\\d', '{2}', '-', '\\d', '{2}']);
    activeSeeds.push(['^', '\\d', '{4}', '-', '\\d', '{2}', '-', '\\d', '{2}', '$']);
    activeSeeds.push(['^', '\\d', '{4}', '-', '(?:0[1-9]|1[0-2])', '-', '(?:0[1-9]|[12]\\d|3[01])', '$']);
    activeSeeds.push(['\\d', '+', '-', '\\d', '+', '-', '\\d', '+']);
  }
  if (isHTML) {
    activeSeeds.push(['<', '[a-zA-Z0-9]', '+', '>', '.*?', '<', '\\/', '[a-zA-Z0-9]', '+', '>']);
    activeSeeds.push(['^', '<', '[a-zA-Z0-9]', '+', '>', '.*?', '<', '\\/', '[a-zA-Z0-9]', '+', '>', '$']);
    activeSeeds.push(['^', '<', '([a-zA-Z0-9-]+)', '>', '.*?', '<', '\\/', '\\1', '>', '$']);
    activeSeeds.push(['<', '([a-zA-Z0-9-]+)', '>', '.*?', '<', '\\/', '\\1', '>']);
  }
  if (isLog) {
    activeSeeds.push(['^', '\\[', '(?:INFO|ERROR|WARN|DEBUG)', '\\]', '\\s', '\\d', '{4}', '-', '\\d', '{2}', '-', '\\d', '{2}', '\\s', '\\d', '{2}', ':', '\\d', '{2}', ':', '\\d', '{2}', '\\s', '-', '\\s', '\\w', '+', ':', '\\s', '.', '*', '$']);
    activeSeeds.push(['^', '\\[', '\\w', '+', '\\]', '\\s', '\\d', '+', '-', '\\d', '+', '-', '\\d', '+', '.', '*']);
  }

  // 1. Build a specialized vocabulary from the positive examples
  const vocabSet = new Set<string>([
    '\\d', '\\w', '\\s', '.', '+', '*', '?', '^', '$',
    '[a-zA-Z]', '[a-z]', '[a-zA-Z0-9.-]', '[a-zA-Z0-9._%+-]',
    '{4}', '{2}', '{2,}'
  ]);

  if (isEmail) {
    vocabSet.add('(?!.*\\.\\.)');
    vocabSet.add('(?!.*-\\.)');
    vocabSet.add('(?!.*\\.-)');
  }
  if (isHTML) {
    vocabSet.add('([a-zA-Z0-9-]+)');
    vocabSet.add('(\\w+)');
    vocabSet.add('\\1');
    vocabSet.add('.*');
    vocabSet.add('.*?');
    vocabSet.add('[a-zA-Z0-9-]+');
  }
  if (isLog) {
    vocabSet.add('\\[');
    vocabSet.add('\\]');
    vocabSet.add(':');
    vocabSet.add('-');
    vocabSet.add('\\s-\\s');
    vocabSet.add(':\\s');
    vocabSet.add('(?:INFO|ERROR|WARN|DEBUG)');
  }

  positives.forEach(str => {
    // Add individual characters from the inputs
    for (const char of str) {
      if (['.', '+', '*', '?', '^', '$', '(', ')', '[', ']', '{', '}', '\\', '|'].includes(char)) {
        vocabSet.add('\\' + char); // Add escaped version of regex specials
      } else {
        vocabSet.add(char);
      }
    }
  });

  const vocabulary = Array.from(vocabSet);

  // 2. Initialize Population
  let population: string[][] = [];
  for (let i = 0; i < popSize; i++) {
    if (activeSeeds.length > 0 && Math.random() < 0.3) {
      const randomSeed = activeSeeds[Math.floor(Math.random() * activeSeeds.length)];
      // Filter out lookaheads for initial generation Phase 1
      const cleanSeed = randomSeed.filter(token => !token.startsWith('(?!'));
      population.push(cleanSeed);
    } else {
      const length = Math.floor(Math.random() * 6) + 3; // Initial length between 3 and 8 tokens
      const chromosome: string[] = [];
      const initVocab = vocabulary.filter(token => !token.startsWith('(?!'));
      for (let j = 0; j < length; j++) {
        chromosome.push(initVocab[Math.floor(Math.random() * initVocab.length)]);
      }
      population.push(chromosome);
    }
  }

  let currentGen = 0;
  let running = true;

  // Fitness calculation function
  const calculateFitness = (chromosome: string[]): {
    score: number;
    pattern: string;
    posResults: { text: string; passed: boolean }[];
    negResults: { text: string; passed: boolean }[];
  } => {
    const pattern = chromosome.join('');
    let regex: RegExp;
    
    // Penalize invalid syntax heavily
    try {
      regex = new RegExp(pattern);
    } catch {
      return { 
        score: 0, 
        pattern, 
        posResults: evalPositives.map(t => ({ text: t, passed: false })),
        negResults: evalNegatives.map(t => ({ text: t, passed: false }))
      };
    }

    const isStructural = isEmail || isIP || isDate || isHTML || isLog;

    // Evaluate matching on augmented lists for fitness score
    let posScoreSum = 0;
    augmentedPositives.forEach(text => {
      const match = regex.exec(text);
      regex.lastIndex = 0;
      if (match) {
        const matchedText = match[0];
        const coverage = matchedText.length / text.length;
        const isFullMatch = coverage === 1.0 && match.index === 0;
        if (isStructural) {
          if (isFullMatch) {
            posScoreSum += 1.0;
          } else {
            posScoreSum += Math.pow(coverage, 4) * 0.2;
          }
        } else {
          posScoreSum += (0.3 + 0.7 * coverage);
        }
      }
    });

    const weightedNegatives: NegativeCase[] = augmentedNegatives.map(text => ({
      text,
      weight: getNegativeWeight(text, currentGen)
    }));

    let negScoreSum = 0;
    let totalNegWeight = 0;
    weightedNegatives.forEach(neg => {
      const hasMatch = regex.test(neg.text);
      regex.lastIndex = 0;
      if (!hasMatch) {
        negScoreSum += neg.weight;
      }
      totalNegWeight += neg.weight;
    });

    const posScore = posScoreSum / (augmentedPositives.length || 1);
    const negScore = negScoreSum / (totalNegWeight || 1);

    // Evaluate on original lists for UI display
    const posResults = evalPositives.map(text => {
      const hasMatch = regex.test(text);
      regex.lastIndex = 0;
      return { text, passed: hasMatch };
    });
    const negResults = evalNegatives.map(text => {
      const hasMatch = regex.test(text);
      regex.lastIndex = 0;
      return { text, passed: !hasMatch };
    });

    // Accuracy component (60% weight)
    const accuracy = (posScore * 0.5) + (negScore * 0.5);

    // Structure component (25% weight)
    let structureScore = 0;
    const patternStr = chromosome.join('');
    
    // Capturing groups
    const captureGroups = patternStr.match(/\([^?]/g);
    if (captureGroups) structureScore += captureGroups.length * 0.15;
    
    // Non-capturing groups
    const nonCaptureGroups = patternStr.match(/\(\?:/g);
    if (nonCaptureGroups) structureScore += nonCaptureGroups.length * 0.05;
    
    // Character sets / classes
    const charClasses = patternStr.match(/\[[^\]]+\]/g);
    if (charClasses) structureScore += charClasses.length * 0.15;
    
    // Bound quantifiers
    const boundQuantifiers = patternStr.match(/\{\d+,?\d*\}/g);
    if (boundQuantifiers) structureScore += boundQuantifiers.length * 0.15;

    // HTML specific backreferences
    if (isHTML && patternStr.includes('\\1')) {
      structureScore += 0.3;
    }

    // Log structural bonuses
    if (isLog) {
      if (patternStr.includes('\\[') && patternStr.includes('\\]')) structureScore += 0.2;
      if (patternStr.includes(':')) structureScore += 0.05;
      if (patternStr.includes('-')) structureScore += 0.05;
      if (patternStr.includes('INFO') || patternStr.includes('ERROR') || patternStr.includes('WARN')) structureScore += 0.1;
      
      // Reward module separator: has ' - ' and followed by module name and colon
      if (patternStr.includes('\\s-\\s') || patternStr.includes(' - ')) {
        structureScore += 0.1;
      }
      if (patternStr.includes('\\w+:') || patternStr.includes('[a-zA-Z]+:')) {
        structureScore += 0.15;
      }
    }

    const finalStructureScore = Math.min(1.0, structureScore);

    // Constraint component (15% weight)
    let constraintScore = 0;
    if (patternStr.startsWith('^')) constraintScore += 0.3;
    if (patternStr.endsWith('$')) constraintScore += 0.3;

    if (isEmail) {
      // Reward negative lookaheads for excluding dots/dashes
      const lookaheads = patternStr.match(/\(\?!/g);
      if (lookaheads) constraintScore += lookaheads.length * 0.15;
    } else if (isHTML) {
      if (patternStr.includes('\\1')) constraintScore += 0.4;
    } else if (isIP || isDate || isLog) {
      if (patternStr.includes('\\b')) constraintScore += 0.2;
    }

    const finalConstraintScore = Math.min(1.0, constraintScore);

    // Combine fitness components
    const baseFitness = (0.6 * accuracy) + (0.25 * finalStructureScore) + (0.15 * finalConstraintScore);

    // Generality Penalty (penalize excessive .* or .+)
    let generalityPenalty = 0;
    const dotMatches = patternStr.match(/\.\*|\.\+/g);
    if (dotMatches) {
      generalityPenalty += dotMatches.length * 0.15;
    }

    // Shortcut Penalty (penalize single letter shortcuts like c+, t, s, n)
    let literalCharCount = 0;
    let structuralTokenCount = 0;
    chromosome.forEach(token => {
      if (['\\d', '\\w', '\\s', '[a-zA-Z]', '[a-z]', '[a-zA-Z0-9.-]', '[a-zA-Z0-9._%+-]', '{4}', '{2}', '{2,}'].includes(token)) {
        structuralTokenCount++;
      } else if (/^[a-zA-Z0-9]$/.test(token)) {
        literalCharCount++;
      }
    });
    if (literalCharCount > 0 && structuralTokenCount === 0) {
      generalityPenalty += 0.25;
    }

    const lengthPenalty = pattern.length * 0.0005;
    const score = Math.max(0, baseFitness - generalityPenalty - lengthPenalty);

    return { score, pattern, posResults, negResults };
  };

  const runGeneration = () => {
    if (!running) return;

    // Evaluate all individuals
    const evaluated = population.map(chromosome => {
      const evaluation = calculateFitness(chromosome);
      return { chromosome, ...evaluation };
    });

    // Sort by fitness descending
    evaluated.sort((a, b) => b.score - a.score);

    const best = evaluated[0];

    // Report progress
    options.onProgress({
      generation: currentGen,
      bestFitness: best.score,
      bestPattern: best.pattern,
      positiveScores: best.posResults,
      negativeScores: best.negResults
    });

    // Check completion condition (perfect match or max generations reached)
    const allPosMatched = best.posResults.every(r => r.passed);
    const allNegExcluded = best.negResults.every(r => r.passed);
    
    if (currentGen >= maxGen || (allPosMatched && allNegExcluded)) {
      options.onComplete(best.pattern);
      running = false;
      return;
    }

    // 3. Selection & Crossover (Tournament selection with 5% elitism)
    const seenPatterns = new Set<string>();
    const nextGeneration: string[][] = [];
    
    // Carry over top 5% individuals (elitism)
    const eliteCount = Math.max(1, Math.ceil(popSize * 0.05));
    for (let i = 0; i < eliteCount; i++) {
      const elite = evaluated[i];
      if (elite) {
        nextGeneration.push([...elite.chromosome]);
        seenPatterns.add(elite.pattern);
      }
    }

    const selectParent = () => {
      const candidates = [];
      for (let i = 0; i < 3; i++) {
        candidates.push(evaluated[Math.floor(Math.random() * evaluated.length)]);
      }
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].chromosome;
    };

    const getSafeVocabularyToken = (oldToken: string, activeVocab: string[]): string => {
      let candidates = activeVocab;
      const isDigitStructural = ['\\d', '\\d+', '\\d{1,3}', '{4}', '{2}', '{2,}'].includes(oldToken) || /\\d\{\d+\}/.test(oldToken);
      if (isDigitStructural) {
        candidates = activeVocab.filter(t => 
          ['\\d', '\\d+', '\\d{1,3}', '{4}', '{2}', '{2,}'].includes(t) || /\\d\{\d+\}/.test(t)
        );
        if (candidates.length === 0) candidates = [oldToken];
      }
      return candidates[Math.floor(Math.random() * candidates.length)];
    };

    const mutate = (child: string[]) => {
      const mutationRate = 0.2;
      const activeVocab = currentGen < Math.min(80, Math.floor(maxGen * 0.4))
        ? vocabulary.filter(token => !token.startsWith('(?!'))
        : vocabulary;

      for (let j = 0; j < child.length; j++) {
        if (Math.random() < mutationRate) {
          const mutationType = Math.random();
          const oldToken = child[j];

          if (mutationType < 0.25) {
            // Semantic Mutation
            if (isHTML && (oldToken === '\\w' || oldToken === '\\w+' || oldToken === '.+' || oldToken === '[a-zA-Z0-9]+')) {
              child[j] = Math.random() < 0.45 ? '.*?' : (Math.random() < 0.2 ? '.*' : '[a-zA-Z0-9-]+');
            } else if (oldToken === '.') {
              child[j] = '[a-z]';
            } else if (oldToken === '\\w') {
              child[j] = '[a-zA-Z0-9._-]';
            } else if (oldToken === '\\d' || oldToken === '\\d+') {
              child[j] = Math.random() < 0.5 ? '\\d{1,3}' : '\\d';
            } else {
              child[j] = getSafeVocabularyToken(oldToken, activeVocab);
            }
          } else if (mutationType < 0.5) {
            // Replacement Mutation
            child[j] = getSafeVocabularyToken(oldToken, activeVocab);
          } else if (mutationType < 0.75 && child.length > 2) {
            // Deletion Mutation
            child.splice(j, 1);
            j--;
          } else {
            // Insertion Mutation
            const newToken = activeVocab[Math.floor(Math.random() * activeVocab.length)];
            child.splice(j, 0, newToken);
            j++;
          }
        }
      }
      if (child.length > 25) {
        child.length = 25;
      }
    };

    while (nextGeneration.length < popSize) {
      const parentA = selectParent();
      const parentB = selectParent();

      // Crossover
      let child: string[];
      const crossoverRate = 0.7;
      if (Math.random() < crossoverRate && parentA.length > 1 && parentB.length > 1) {
        const splitA = Math.floor(Math.random() * (parentA.length - 1)) + 1;
        const splitB = Math.floor(Math.random() * (parentB.length - 1)) + 1;
        child = parentA.slice(0, splitA).concat(parentB.slice(splitB));
      } else {
        child = [...parentA];
      }

      mutate(child);

      // Unique pattern check (speciation/niching)
      const childPattern = child.join('');
      if (!seenPatterns.has(childPattern)) {
        nextGeneration.push(child);
        seenPatterns.add(childPattern);
      } else {
        const mutatedChild = [...child];
        let foundUnique = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          mutate(mutatedChild);
          const mutatedPattern = mutatedChild.join('');
          if (!seenPatterns.has(mutatedPattern)) {
            nextGeneration.push(mutatedChild);
            seenPatterns.add(mutatedPattern);
            foundUnique = true;
            break;
          }
        }
        if (!foundUnique) {
          const newRandom: string[] = [];
          const length = Math.floor(Math.random() * 6) + 3;
          const activeVocab = currentGen < Math.min(80, Math.floor(maxGen * 0.4))
            ? vocabulary.filter(token => !token.startsWith('(?!'))
            : vocabulary;
          for (let j = 0; j < length; j++) {
            newRandom.push(activeVocab[Math.floor(Math.random() * activeVocab.length)]);
          }
          nextGeneration.push(newRandom);
        }
      }
    }

    population = nextGeneration;
    currentGen++;

    // Run next generation in next event loop tick to keep UI responsive
    setTimeout(runGeneration, 5);
  };

  // Start the GA
  setTimeout(runGeneration, 0);

  // Return a cancellation function
  return () => {
    running = false;
  };
};

export const evolveRegex = (inputs: string[]): string => {
  // Maintain backward compatibility for original synchronous calls if needed
  if (!inputs || inputs.length === 0) return '';
  // Falls back to a basic combination generator
  return `(?:${inputs.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`;
};
