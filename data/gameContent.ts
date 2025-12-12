
import { Enemy, Relic, EnemyIntent } from '../types';

// --- RELICS ---
export const ALL_RELICS: Relic[] = [
  {
    id: 'burning_blood',
    name: 'Burning Blood',
    description: 'Heal 6 HP at the end of combat.',
    icon: 'fa-droplet',
    rarity: 'COMMON',
    effectType: 'ON_VICTORY',
    value: 6
  },
  {
    id: 'vajra',
    name: 'Vajra',
    description: 'Start each combat with 1 Strength.',
    icon: 'fa-gavel',
    rarity: 'COMMON',
    effectType: 'ON_COMBAT_START',
    value: 1
  },
  {
    id: 'anchor',
    name: 'Anchor',
    description: 'Start each combat with 10 Block.',
    icon: 'fa-anchor',
    rarity: 'COMMON',
    effectType: 'ON_COMBAT_START',
    value: 10
  },
  {
    id: 'bag_of_prep',
    name: 'Bag of Prep',
    description: 'Draw 2 extra cards on turn 1 (Implemented as passive energy for now).',
    icon: 'fa-suitcase',
    rarity: 'RARE',
    effectType: 'ON_COMBAT_START',
    value: 0
  }
];

// --- ENEMY AI PATTERNS ---

/**
 * CULTIST
 * Turn 1: Incantation (Gain Ritual/Strength)
 * Turn 2+: Dark Strike (Attack)
 */
export const getCultistIntent = (turn: number, currentEnemy: Enemy): EnemyIntent => {
  if (turn === 1) {
    return { type: 'BUFF', value: 3, description: 'Ritual' }; // Gain 3 strength per turn
  }
  return { type: 'ATTACK', value: 6 };
};

/**
 * ACID SLIME
 * Pattern: Attack -> Debuff (Poison) -> Attack -> Block
 */
export const getSlimeIntent = (turn: number, currentEnemy: Enemy): EnemyIntent => {
  const move = turn % 3;
  if (move === 1) return { type: 'ATTACK', value: 8 };
  if (move === 2) return { type: 'DEBUFF', value: 3, description: 'Poison' };
  return { type: 'DEFEND', value: 8 };
};

/**
 * THE GUARDIAN (BOSS)
 * Mode Shift mechanics simplified
 */
export const getBossIntent = (turn: number, currentEnemy: Enemy): EnemyIntent => {
  const move = turn % 3;
  if (move === 1) return { type: 'BUFF', value: 2, description: 'Charge Up' }; // Gain Str
  if (move === 2) return { type: 'ATTACK', value: 15, description: 'Hyper Beam' }; // Big Hit
  return { type: 'DEFEND', value: 20, description: 'Defensive Mode' };
};

// --- ENEMY GENERATOR ---

export function generateEnemy(floor: number): Enemy {
  // Scaling logic: Progressive Difficulty
  // HP Scale: Linear but robust
  const hpScale = 1 + (floor * 0.2);
  
  // Strength Scaling: Enemies hit harder on higher floors
  let strengthBonus = 0;
  if (floor >= 4) strengthBonus = 1;
  if (floor >= 7) strengthBonus = 2;
  if (floor >= 10) strengthBonus = 3;

  // Boss Floor
  if (floor % 5 === 0 && floor > 0) { // Floor 15 effectively in UI
    return {
      id: 'guardian',
      name: 'The Guardian',
      type: 'BOSS',
      tier: 'BOSS',
      hp: Math.floor(120 * hpScale),
      maxHp: Math.floor(120 * hpScale),
      block: 0,
      status: { poison: 0, vulnerable: 0, weak: 0, strength: strengthBonus },
      intent: { type: 'UNKNOWN', value: 0 }, // Will be set by init logic
      movePattern: 0,
      image: 'https://image.pollinations.ai/prompt/fantasy%20dungeon%20boss%20stone%20guardian%20golem%20glowing%20runes%20dark%20art?width=512&height=512&nologo=true'
    };
  }

  // Random Normal/Elite
  const isElite = floor > 1 && Math.random() < 0.3;
  
  if (isElite) {
    return {
      id: 'cultist_leader',
      name: 'Cultist Leader',
      type: 'ELITE',
      tier: 'ELITE',
      hp: Math.floor(70 * hpScale),
      maxHp: Math.floor(70 * hpScale),
      block: 0,
      status: { poison: 0, vulnerable: 0, weak: 0, strength: 2 + strengthBonus }, // Starts with extra str
      intent: { type: 'UNKNOWN', value: 0 },
      movePattern: 0,
      image: 'https://image.pollinations.ai/prompt/dark%20fantasy%20cultist%20leader%20necromancer%20dungeon%20art%20high%20quality?width=512&height=512&nologo=true'
    };
  }

  // Normal Enemies
  const type = Math.random() > 0.5 ? 'cultist' : 'slime';
  
  if (type === 'cultist') {
    return {
      id: 'cultist',
      name: 'Cultist',
      type: 'NORMAL',
      tier: 'WEAK',
      hp: Math.floor(40 * hpScale),
      maxHp: Math.floor(40 * hpScale),
      block: 0,
      status: { poison: 0, vulnerable: 0, weak: 0, strength: strengthBonus },
      intent: { type: 'UNKNOWN', value: 0 },
      movePattern: 0,
      image: 'https://image.pollinations.ai/prompt/dark%20fantasy%20cultist%20minion%20hooded%20figure%20dungeon%20art?width=512&height=512&nologo=true'
    };
  } else {
    return {
      id: 'slime',
      name: 'Acid Slime',
      type: 'NORMAL',
      tier: 'WEAK',
      hp: Math.floor(45 * hpScale),
      maxHp: Math.floor(45 * hpScale),
      block: 0,
      status: { poison: 0, vulnerable: 0, weak: 0, strength: strengthBonus },
      intent: { type: 'UNKNOWN', value: 0 },
      movePattern: 0,
      image: 'https://image.pollinations.ai/prompt/fantasy%20acid%20green%20slime%20monster%20dungeon%20art?width=512&height=512&nologo=true'
    };
  }
}

export function getEnemyNextIntent(enemy: Enemy, turnCount: number): EnemyIntent {
  // Normalize turn count to 1-based for logic
  const turn = turnCount;

  switch (enemy.id) {
    case 'cultist':
    case 'cultist_leader':
      return getCultistIntent(turn, enemy);
    case 'slime':
      return getSlimeIntent(turn, enemy);
    case 'guardian':
      return getBossIntent(turn, enemy);
    default:
      return { type: 'ATTACK', value: 5 };
  }
}
