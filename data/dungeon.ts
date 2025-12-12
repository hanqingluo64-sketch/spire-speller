import { Enemy, EnemyIntent, CardDebuff, ActConfig, Vocabulary, Card } from '../types';
import { getEnemyNextIntent } from './gameContent';
import { createCard } from './vocabulary';

// --- ACT CONFIGURATIONS ---
export const ACTS: ActConfig[] = [
    {
        index: 1,
        name: "The Exiled Spire",
        description: "The base of the tower, where the weak and forgotten dwell.",
        background: 'linear-gradient(to bottom, #1a1a1a, #2d3748)',
        priceMultiplier: 1.0,
        enemyHpMultiplier: 1.0,
        enemyDmgMultiplier: 1.0,
        affixChanceBonus: 0.0
    },
    {
        index: 2,
        name: "The City of Tears",
        description: "A rain-swept metropolis within the Spire's mid-levels.",
        background: 'linear-gradient(to bottom, #0f172a, #1e3a8a)', // Dark Blue
        priceMultiplier: 1.2,
        enemyHpMultiplier: 1.4,
        enemyDmgMultiplier: 1.2,
        affixChanceBonus: 0.3
    },
    {
        index: 3,
        name: "The Cosmic Summit",
        description: "Reality bends near the top. The Source is close.",
        background: 'linear-gradient(to bottom, #2e1065, #000000)', // Dark Purple
        priceMultiplier: 1.5,
        enemyHpMultiplier: 1.8,
        enemyDmgMultiplier: 1.5,
        affixChanceBonus: 0.6
    }
];

// --- ENEMY TEMPLATES ---
interface EnemyTemplate {
    id: string;
    name: string;
    baseHpMin: number;
    baseHpMax: number;
    baseStr: number; 
    image: string;
    innateAffixes: CardDebuff[];
}

const WEAK_POOL: EnemyTemplate[] = [
    { id: 'cultist', name: 'Cultist', baseHpMin: 30, baseHpMax: 45, baseStr: 0, image: 'https://image.pollinations.ai/prompt/dark%20fantasy%20cultist%20minion%20hooded%20figure%20dungeon%20art?width=512&height=512&nologo=true', innateAffixes: [] },
    { id: 'slime', name: 'Acid Slime', baseHpMin: 25, baseHpMax: 40, baseStr: 0, image: 'https://image.pollinations.ai/prompt/fantasy%20acid%20green%20slime%20monster%20dungeon%20art?width=512&height=512&nologo=true', innateAffixes: [] },
    { id: 'louse', name: 'Spire Louse', baseHpMin: 20, baseHpMax: 35, baseStr: 1, image: 'https://image.pollinations.ai/prompt/giant%20armored%20louse%20bug%20monster%20fantasy%20art?width=512&height=512&nologo=true', innateAffixes: [] }
];

const STRONG_POOL: EnemyTemplate[] = [
    { id: 'looter', name: 'Looter', baseHpMin: 45, baseHpMax: 60, baseStr: 2, image: 'https://image.pollinations.ai/prompt/fantasy%20thief%20looter%20monster%20dagger%20gold%20sack?width=512&height=512&nologo=true', innateAffixes: ['RUSH'] },
    { id: 'fungi', name: 'Fungi Beast', baseHpMin: 50, baseHpMax: 65, baseStr: 3, image: 'https://image.pollinations.ai/prompt/mushroom%20monster%20fungi%20beast%20fantasy%20spores?width=512&height=512&nologo=true', innateAffixes: [] },
    { id: 'knight', name: 'Centurion', baseHpMin: 60, baseHpMax: 75, baseStr: 1, image: 'https://image.pollinations.ai/prompt/animated%20armor%20knight%20centurion%20fantasy%20dungeon?width=512&height=512&nologo=true', innateAffixes: [] }
];

const ELITE_POOL: EnemyTemplate[] = [
    { id: 'gremlin_nob', name: 'Gremlin Nob', baseHpMin: 80, baseHpMax: 100, baseStr: 4, image: 'https://image.pollinations.ai/prompt/giant%20angry%20gremlin%20berserker%20fantasy%20art?width=512&height=512&nologo=true', innateAffixes: ['RUSH'] },
    { id: 'sentry', name: 'Sentry', baseHpMin: 70, baseHpMax: 80, baseStr: 2, image: 'https://image.pollinations.ai/prompt/ancient%20robot%20sentry%20construct%20laser%20fantasy?width=512&height=512&nologo=true', innateAffixes: ['BLIND'] },
    { id: 'lagavulin', name: 'Lagavulin', baseHpMin: 90, baseHpMax: 110, baseStr: 5, image: 'https://image.pollinations.ai/prompt/sleeping%20shell%20monster%20lagavulin%20fantasy%20art?width=512&height=512&nologo=true', innateAffixes: ['SILENCE'] }
];

const BOSS_POOL: EnemyTemplate[] = [
    { id: 'guardian', name: 'The Guardian', baseHpMin: 200, baseHpMax: 200, baseStr: 2, image: 'https://image.pollinations.ai/prompt/fantasy%20dungeon%20boss%20stone%20guardian%20golem%20glowing%20runes%20dark%20art?width=512&height=512&nologo=true', innateAffixes: ['BLIND', 'SILENCE'] },
    { id: 'hexaghost', name: 'Hexaghost', baseHpMin: 180, baseHpMax: 180, baseStr: 3, image: 'https://image.pollinations.ai/prompt/green%20ghost%20fire%20spirit%20boss%20fantasy%20hexaghost?width=512&height=512&nologo=true', innateAffixes: ['RUSH', 'BLIND'] },
    { id: 'automaton', name: 'Bronze Automaton', baseHpMin: 240, baseHpMax: 240, baseStr: 4, image: 'https://image.pollinations.ai/prompt/giant%20bronze%20clockwork%20robot%20boss%20steampunk?width=512&height=512&nologo=true', innateAffixes: ['SILENCE', 'RUSH'] }
];

export const DungeonManager = {
    getActConfig(actIndex: number): ActConfig {
        return ACTS.find(a => a.index === actIndex) || ACTS[0];
    },

    generateEnemyForFloor(actIndex: number, floorY: number, nodeType: 'MONSTER' | 'ELITE' | 'BOSS'): Enemy {
        const act = this.getActConfig(actIndex);
        let template: EnemyTemplate;
        let tier: 'WEAK' | 'STRONG' | 'ELITE' | 'BOSS' = 'WEAK';

        if (nodeType === 'BOSS') {
            template = BOSS_POOL[(actIndex - 1) % BOSS_POOL.length];
            tier = 'BOSS';
        } else if (nodeType === 'ELITE') {
            template = ELITE_POOL[Math.floor(Math.random() * ELITE_POOL.length)];
            tier = 'ELITE';
        } else {
            if (floorY <= 3) {
                template = WEAK_POOL[Math.floor(Math.random() * WEAK_POOL.length)];
                tier = 'WEAK';
            } else if (floorY <= 8) {
                if (Math.random() < 0.3) {
                    template = STRONG_POOL[Math.floor(Math.random() * STRONG_POOL.length)];
                    tier = 'STRONG';
                } else {
                    template = WEAK_POOL[Math.floor(Math.random() * WEAK_POOL.length)];
                    tier = 'WEAK';
                }
            } else {
                template = STRONG_POOL[Math.floor(Math.random() * STRONG_POOL.length)];
                tier = 'STRONG';
            }
        }

        const hpRoll = Math.floor(Math.random() * (template.baseHpMax - template.baseHpMin + 1)) + template.baseHpMin;
        const hp = Math.floor(hpRoll * act.enemyHpMultiplier);
        const extraStr = Math.floor(template.baseStr * act.enemyDmgMultiplier) + (actIndex - 1); 

        const enemy: Enemy = {
            id: template.id,
            name: template.name,
            type: nodeType === 'MONSTER' ? 'NORMAL' : nodeType,
            tier: tier,
            hp: hp,
            maxHp: hp,
            block: 0,
            status: {
                poison: 0,
                vulnerable: 0,
                weak: 0,
                strength: extraStr,
                ritual: 0
            },
            intent: { type: 'UNKNOWN', value: 0 },
            image: template.image,
            innateAffixes: template.innateAffixes
        };

        if (tier === 'STRONG' && Math.random() < act.affixChanceBonus) {
            const affixes: CardDebuff[] = ['BLIND', 'RUSH', 'SILENCE'];
            const randomAffix = affixes[Math.floor(Math.random() * affixes.length)];
            if (!enemy.innateAffixes) enemy.innateAffixes = [];
            if (!enemy.innateAffixes.includes(randomAffix)) {
                enemy.innateAffixes.push(randomAffix);
            }
        }

        enemy.intent = getEnemyNextIntent(enemy, 1);
        return enemy;
    },

    cognitiveBalanceDeck(deck: Card[], vocabList: Vocabulary[], enemyTier: 'WEAK' | 'STRONG' | 'ELITE' | 'BOSS'): Card[] {
        if (!vocabList || vocabList.length === 0) return deck;

        let targetPool: Vocabulary[] = [];
        
        // Filter vocab pool based on difficulty preference for the enemy tier
        if (enemyTier === 'BOSS' || enemyTier === 'ELITE') {
            targetPool = vocabList.filter(v => v.proficiency >= 3 || v.word.length <= 7);
            if (targetPool.length < 5) targetPool = vocabList;
        } else if (enemyTier === 'WEAK') {
            targetPool = vocabList.filter(v => v.proficiency < 3 || v.word.length > 6);
            if (targetPool.length < 5) targetPool = vocabList;
        } else {
            targetPool = vocabList;
        }

        targetPool.sort(() => Math.random() - 0.5);

        // Regenerate each card completely to ensure stats (Energy, Damage, etc.) match the new word
        return deck.map((card, i) => {
            const newVocab = targetPool[i % targetPool.length];
            // Use createCard to recalculate everything based on the new word and original type
            const newCard = createCard(card.type, newVocab, card.isReview);
            
            // Preserve unique instance properties if needed, but allow new stats to override
            return {
                ...newCard, 
                uniqueId: card.uniqueId, // Keep React key stability
                id: `card_${newVocab.id}_${Math.random()}`
            };
        });
    }
};