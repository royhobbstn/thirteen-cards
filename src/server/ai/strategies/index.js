import { MarcusStrategy } from './marcusStrategy.js';
import { EddieStrategy } from './eddieStrategy.js';
import { GrandmaLiuStrategy } from './grandmaLiuStrategy.js';
import { VictorStrategy } from './victorStrategy.js';
import { SophieStrategy } from './sophieStrategy.js';
import { FrankStrategy } from './frankStrategy.js';
import { AdaStrategy } from './adaStrategy.js';
import { MeiLinStrategy } from './meilinStrategy.js';

// AI Constants
export const AI_PERSONAS = [
  'marcus',
  'eddie',
  'grandmaliu',
  'victor',
  'sophie',
  'frank',
  'ada',
  'meilin',
];

export const AI_DISPLAY_NAMES = {
  marcus: 'Marcus',
  eddie: 'Eddie',
  grandmaliu: 'Grandma Liu',
  victor: 'Victor',
  sophie: 'Sophie',
  frank: 'Uncle Frank',
  ada: 'Professor Ada',
  meilin: 'Mei-Lin',
};

export const AI_COLORS = {
  marcus: '#3498db', // Blue
  eddie: '#e74c3c', // Red
  grandmaliu: '#9b59b6', // Purple
  victor: '#f39c12', // Orange (explosive)
  sophie: '#2ecc71', // Green (flowing)
  frank: '#1abc9c', // Teal (mysterious)
  ada: '#34495e', // Dark gray (analytical)
  meilin: '#e91e63', // Pink (closing power)
};

// Singleton strategy instances
const strategies = {
  marcus: new MarcusStrategy(),
  eddie: new EddieStrategy(),
  grandmaliu: new GrandmaLiuStrategy(),
  victor: new VictorStrategy(),
  sophie: new SophieStrategy(),
  frank: new FrankStrategy(),
  ada: new AdaStrategy(),
  meilin: new MeiLinStrategy(),
};

/**
 * Get strategy instance for a persona
 * @param {string} persona - 'marcus', 'eddie', or 'grandmaliu'
 * @returns {BaseStrategy} Strategy instance
 */
export function getStrategy(persona) {
  const strategy = strategies[persona];
  if (!strategy) {
    console.warn(`Unknown AI persona: ${persona}, defaulting to marcus`);
    return strategies.marcus;
  }
  return strategy;
}

/**
 * Calculate delay for an AI turn based on persona
 * @param {string} persona - AI persona name
 * @returns {number} Delay in milliseconds
 */
export function getAiDelay(persona) {
  const strategy = getStrategy(persona);
  const range = strategy.maxDelay - strategy.minDelay;
  return strategy.minDelay + Math.random() * range;
}
