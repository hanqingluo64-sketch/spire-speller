
export type GamePhase = 'PROFILE_SELECT' | 'MENU' | 'MAP' | 'COMBAT' | 'VICTORY' | 'MASTERY_VIEW' | 'REWARD' | 'CAMPFIRE' | 'GAME_OVER' | 'LIBRARY' | 'EVENT' | 'MEDITATION' | 'SANCTUM' | 'SHOP' | 'STORY_INTRO' | 'LAST_STAND' | 'ACT_TRANSITION';
export type TurnPhase = 'PLAYER_TURN' | 'ENEMY_TURN';
export type OverlayView = 'NONE' | 'DECK' | 'DRAW' | 'DISCARD' | 'RELICS' | 'REMOVE_CARD' | 'BLESSINGS' | 'VOCAB_BOOK';

export interface Vocabulary {
  id: string;
  word: string;
  phonetic: string;
  meaning: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'long';
  masteryStreak: number;
  proficiency: number;
  failStreak: number;
  isRetest: boolean;
  nextReview: number;
  lastReview?: number;
  isActive?: boolean;
}

export interface EntityStatus {
  strength?: number;
  weak?: number;
  vulnerable?: number;
  poison?: number;
  ritual?: number;
  memoryShield?: number;
}

export interface Relic {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'BOSS' | 'SHOP';
  effectType: string;
  value: number;
}

export interface Player {
  hp: number;
  maxHp: number;
  block: number;
  gold: number;
  energy: number;
  maxEnergy: number;
  status: EntityStatus;
  relics: Relic[];
  revivals: number;
  shopDiscount: number;
  combo: number;
  nextTurnEnergy: number;
}

export type CardType = 'ATTACK' | 'DEFENSE' | 'UTILITY' | 'HEAL' | 'CURSE';
export type CardDebuff = 'BLIND' | 'RUSH' | 'SILENCE';

export interface Card {
  id: string;
  uniqueId?: string;
  vocab: Vocabulary;
  type: CardType;
  name: string;
  energyCost: number;
  value: number;
  description: string;
  retain: boolean;
  applyDebuff: boolean;
  doubleCast: boolean;
  drawEffect?: number;
  discardEffect?: number;
  energyNextTurn?: number;
  healValue?: number;
  lifesteal?: boolean;
  cleanseDebuff?: boolean;
  visualTag?: 'FIRE' | 'ICE' | 'DEFAULT';
  isReview: boolean;
  isExhaust?: boolean;
  isUnplayable?: boolean;
  debuff?: CardDebuff;
  procChance?: number;
}

export interface EnemyIntent {
  type: 'ATTACK' | 'DEFEND' | 'BUFF' | 'DEBUFF' | 'UNKNOWN';
  value: number;
  description?: string;
}

export interface Enemy {
  id: string;
  name: string;
  type: 'NORMAL' | 'ELITE' | 'BOSS';
  tier: 'WEAK' | 'STRONG' | 'ELITE' | 'BOSS';
  hp: number;
  maxHp: number;
  block: number;
  status: EntityStatus;
  intent: EnemyIntent;
  movePattern?: number;
  image?: string;
  innateAffixes?: CardDebuff[];
}

export type NodeType = 'START' | 'MONSTER' | 'ELITE' | 'BOSS' | 'TREASURE' | 'SHOP' | 'CAMPFIRE' | 'EVENT';

export interface MapNode {
  id: string;
  x: number;
  y: number;
  type: NodeType;
  status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED' | 'UNREACHABLE';
  next: string[];
  parents: string[];
}

export interface ShopItem {
  id: string;
  type: 'CARD' | 'RELIC' | 'REMOVE';
  data: Card | Relic | null;
  price: number;
  isSold: boolean;
}

export interface ShopState {
  items: ShopItem[];
  removeCost: number;
}

export interface EventChoice {
  id: string;
  text: string;
  description?: string;
  type: 'SAFE' | 'RISKY' | 'TRADE' | 'ROLL';
  requirement?: string;
  rollDC?: number;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  image: string;
  choices: EventChoice[];
}

export interface EventResult {
  message: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'NEUTRAL';
  goldChange?: number;
  damageTaken?: number;
  healed?: number;
  cardsRemoved?: number;
  cardsAdded?: Card[];
}

export interface ActConfig {
    index: number;
    name: string;
    description: string;
    background: string;
    priceMultiplier: number;
    enemyHpMultiplier: number;
    enemyDmgMultiplier: number;
    affixChanceBonus: number;
}

export interface PendingAction {
    type: 'DISCARD';
    count: number;
}

export interface UserProfile {
  id: string;
  name: string;
  createdAt: number;
  lastPlayed: number;
  stats: {
    runsStarted: number;
    wins: number;
    wordsMastered: number;
  };
  currency: number;
  unlocks: string[];
  actsCleared: number[];
  masteryProgress: Record<string, Vocabulary>; 
  saveSlots?: Record<number, RunState>;
  activeRun?: RunState | null;
  hasCompletedTutorial?: boolean;
}

export interface RunState {
  saveName: string; 
  savedAt: number;
  player: Player;
  deck: Card[];
  gameMap: MapNode[];
  mapSeed: number; 
  visitedNodeIds: string[]; 
  currentMapNodeId: string | null;
  phase: GamePhase;
  turnCount: number;
  battlesWon: number;
  act: number;
  hand: Card[];
  drawPile: Card[];
  discardPile: Card[];
  currentEnemy: Enemy | null;
  isPlayerTurn: boolean;
  vocabPackId: string | null;
  customVocabList?: Vocabulary[];
  activeEventId?: string | null;
  shopState?: ShopState | null;
}

export interface GoldBreakdown {
  base: number;
  bounty: number;
  bountyCount: number;
  perfect: number;
  isPerfect: boolean;
  multiplier: number;
  total: number;
}

export interface CombatStats {
  damageTaken: number;
  mistakes: number;
  hints: number;
  bountyPlayed: number;
}

export interface VocabPack {
  id: string;
  name: string;
  description: string;
  introStory: string;
  icon: string;
  color: string;
  words: Vocabulary[];
}
