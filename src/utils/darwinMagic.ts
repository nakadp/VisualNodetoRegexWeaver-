export interface EvolutionProgress {
  generation: number;
  bestFitness: number;
  bestPattern: string;
  positiveScores: { text: string; passed: boolean }[];
  negativeScores: { text: string; passed: boolean }[];
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

  // 1. Build a specialized vocabulary from the positive examples
  const vocabSet = new Set<string>(['\\d', '\\w', '\\s', '.', '+', '*', '?', '^', '$']);
  positives.forEach(str => {
    // Add individual characters from the inputs
    for (let char of str) {
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
    const length = Math.floor(Math.random() * 6) + 3; // Initial length between 3 and 8 tokens
    const chromosome: string[] = [];
    for (let j = 0; j < length; j++) {
      chromosome.push(vocabulary[Math.floor(Math.random() * vocabulary.length)]);
    }
    population.push(chromosome);
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
        posResults: positives.map(t => ({ text: t, passed: false })),
        negResults: negatives.map(t => ({ text: t, passed: false }))
      };
    }

    const posResults = positives.map(text => ({ text, passed: regex.test(text) }));
    const negResults = negatives.map(text => ({ text, passed: !regex.test(text) }));

    const posMatched = posResults.filter(r => r.passed).length;
    const negExcluded = negResults.filter(r => r.passed).length;

    const totalPos = positives.length || 1;
    const totalNeg = negatives.length || 1;

    const posScore = posMatched / totalPos;
    const negScore = negExcluded / totalNeg;

    // Fitness formula: balance matching positives and excluding negatives, penalizing length to keep it concise
    const baseFitness = (posScore * 0.6) + (negScore * 0.4);
    const lengthPenalty = pattern.length * 0.003;
    const score = Math.max(0, baseFitness - lengthPenalty);

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

    // 3. Selection & Crossover (Tournament selection)
    const nextGeneration: string[][] = [best.chromosome]; // Elitism: carry over the best individual

    const selectParent = () => {
      // Pick 3 random individuals, return the best
      const candidates = [];
      for (let i = 0; i < 3; i++) {
        candidates.push(evaluated[Math.floor(Math.random() * evaluated.length)]);
      }
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].chromosome;
    };

    while (nextGeneration.length < popSize) {
      const parentA = selectParent();
      const parentB = selectParent();

      // Crossover
      let child: string[] = [];
      const crossoverRate = 0.7;
      if (Math.random() < crossoverRate && parentA.length > 1 && parentB.length > 1) {
        const splitA = Math.floor(Math.random() * (parentA.length - 1)) + 1;
        const splitB = Math.floor(Math.random() * (parentB.length - 1)) + 1;
        child = parentA.slice(0, splitA).concat(parentB.slice(splitB));
      } else {
        child = [...parentA];
      }

      // Mutation (per token mutation)
      const mutationRate = 0.15;
      for (let j = 0; j < child.length; j++) {
        if (Math.random() < mutationRate) {
          const mutationType = Math.random();
          if (mutationType < 0.3) {
            // Replace token
            child[j] = vocabulary[Math.floor(Math.random() * vocabulary.length)];
          } else if (mutationType < 0.6 && child.length > 2) {
            // Delete token
            child.splice(j, 1);
            j--;
          } else {
            // Insert token
            const newToken = vocabulary[Math.floor(Math.random() * vocabulary.length)];
            child.splice(j, 0, newToken);
            j++;
          }
        }
      }

      // Limit max chromosome length to 25 to prevent runaway lengths
      if (child.length > 25) {
        child = child.slice(0, 25);
      }

      nextGeneration.push(child);
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
