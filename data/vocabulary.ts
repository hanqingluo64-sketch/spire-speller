import { Vocabulary, Card, CardType, VocabPack } from '../types';

// --- EBBINGHAUS CONFIGURATION ---
const INTERVALS_MS = [
    5 * 60 * 60 * 1000,       // 5 Hours
    24 * 60 * 60 * 1000,      // 1 Day
    3 * 24 * 60 * 60 * 1000,  // 3 Days
    7 * 24 * 60 * 60 * 1000,  // 7 Days
    14 * 24 * 60 * 60 * 1000  // 14 Days
];

// Helper to create vocab entries easily
const v = (word: string, phonetic: string, meaning: string, difficulty: Vocabulary['difficulty']): Vocabulary => ({
  id: word.toLowerCase(),
  word,
  phonetic,
  meaning,
  difficulty,
  masteryStreak: 0,
  proficiency: 0,
  failStreak: 0,
  isRetest: false,
  nextReview: 0
});

export const PRESET_PACKS: VocabPack[] = [
  {
    id: 'scholar',
    name: 'The Scholar',
    description: 'Master of Logic & Science. Uses complex spells to draw cards and deal massive damage.',
    introStory: "You have spent decades in the Great Library, reading of the Spire's chaotic magic. Now, ink bottle in hand, you seek the Source. Logic is your shield; knowledge is your blade.",
    icon: 'fa-graduation-cap',
    color: 'text-blue-400',
    words: [
      v('Abstract', '/ˈæbstrækt/', '抽象的', 'medium'),
      v('Analyze', '/ˈænəlaɪz/', '分析', 'medium'),
      v('Biology', '/baɪˈɒlədʒi/', '生物学', 'medium'),
      v('Chemistry', '/ˈkemɪstri/', '化学', 'medium'),
      v('Conclusion', '/kənˈkluːʒn/', '结论', 'medium'),
      v('Deduce', '/dɪˈdjuːs/', '推断', 'medium'),
      v('Empirical', '/ɪmˈpɪrɪkl/', '经验主义的', 'hard'),
      v('Hypothesis', '/haɪˈpɒθəsɪs/', '假设', 'long'),
      v('Logic', '/ˈlɒdʒɪk/', '逻辑', 'easy'),
      v('Method', '/ˈmeθəd/', '方法', 'easy'),
      v('Philosophy', '/fəˈlɒsəfi/', '哲学', 'long'),
      v('Theory', '/ˈθɪəri/', '理论', 'medium'),
      v('Research', '/rɪˈsɜːtʃ/', '研究', 'medium'),
      v('Evidence', '/ˈevɪdəns/', '证据', 'medium'),
      v('Concept', '/ˈkɒnsept/', '概念', 'easy')
    ]
  },
  {
    id: 'merchant',
    name: 'The Merchant',
    description: 'A shrewd negotiator. Earns extra Gold and weakens enemies with bad deals.',
    introStory: "They say the Spire is dangerous. You see only opportunity. With a bag of gold and a silver tongue, you plan to buy the Spire itself.",
    icon: 'fa-coins',
    color: 'text-yellow-400',
    words: [
      v('Acquire', '/əˈkwaɪə(r)/', '获得', 'medium'),
      v('Benefit', '/ˈbenɪfɪt/', '利益', 'medium'),
      v('Capital', '/ˈkæpɪtl/', '资本', 'medium'),
      v('Debt', '/det/', '债务', 'easy'),
      v('Economy', '/ɪˈkɒnəmi/', '经济', 'medium'),
      v('Finance', '/ˈfaɪnæns/', '金融', 'medium'),
      v('Invest', '/ɪnˈvest/', '投资', 'easy'),
      v('Market', '/ˈmɑːkɪt/', '市场', 'easy'),
      v('Negotiate', '/nɪˈɡəʊʃieɪt/', '谈判', 'long'),
      v('Profit', '/ˈprɒfɪt/', '利润', 'easy'),
      v('Revenue', '/ˈrevənjuː/', '收入', 'medium'),
      v('Trade', '/treɪd/', '贸易', 'easy'),
      v('Value', '/ˈvæljuː/', '价值', 'easy'),
      v('Wealth', '/welθ/', '财富', 'easy'),
      v('Yield', '/jiːld/', '收益', 'easy')
    ]
  },
  {
    id: 'traveler',
    name: 'The Traveler',
    description: 'Agile and quick. Uses 0-cost cards and energy manipulation to outpace foes.',
    introStory: "You have walked the ends of the earth. The Spire is just another mountain to climb. Your pack is light, your steps are sure.",
    icon: 'fa-person-hiking',
    color: 'text-green-400',
    words: [
      v('Adventure', '/ədˈventʃə(r)/', '冒险', 'medium'),
      v('Border', '/ˈbɔːdə(r)/', '边界', 'easy'),
      v('Culture', '/ˈkʌltʃə(r)/', '文化', 'medium'),
      v('Distance', '/ˈdɪstəns/', '距离', 'medium'),
      v('Explore', '/ɪkˈsplɔː(r)/', '探索', 'medium'),
      v('Foreign', '/ˈfɒrən/', '外国的', 'medium'),
      v('Journey', '/ˈdʒɜːni/', '旅程', 'medium'),
      v('Landscape', '/ˈlændskeɪp/', '风景', 'medium'),
      v('Map', '/mæp/', '地图', 'easy'),
      v('Native', '/ˈneɪtɪv/', '本地的', 'medium'),
      v('Passport', '/ˈpɑːspɔːt/', '护照', 'medium'),
      v('Route', '/ruːt/', '路线', 'easy'),
      v('Tourism', '/ˈtʊərɪzm/', '旅游', 'medium'),
      v('Transit', '/ˈtrænzɪt/', '运输', 'medium'),
      v('Voyage', '/ˈvɔɪɪdʒ/', '航行', 'medium')
    ]
  },
  {
    id: 'diplomat',
    name: 'The Diplomat',
    description: 'Defensive tactician. Builds massive Block and forces enemies to vulnerable states.',
    introStory: "Words are weapons, and silence is armor. You seek to bring order to the chaos of the Spire through law and decree.",
    icon: 'fa-scale-balanced',
    color: 'text-purple-400',
    words: [
      v('Agenda', '/əˈdʒendə/', '议程', 'medium'),
      v('Alliance', '/əˈlaɪəns/', '联盟', 'medium'),
      v('Bureaucracy', '/bjʊəˈrɒkrəsi/', '官僚主义', 'hard'),
      v('Committee', '/kəˈmɪti/', '委员会', 'medium'),
      v('Congress', '/ˈkɒŋɡres/', '国会', 'medium'),
      v('Convention', '/kənˈvenʃn/', '公约', 'medium'),
      v('Delegate', '/ˈdelɪɡət/', '代表', 'medium'),
      v('Embassy', '/ˈembəsi/', '大使馆', 'medium'),
      v('Leader', '/ˈliːdə(r)/', '领导者', 'easy'),
      v('Policy', '/ˈpɒləsi/', '政策', 'easy'),
      v('Protocol', '/ˈprəʊtəkɒl/', '协议', 'medium'),
      v('Representative', '/ˌreprɪˈzentətɪv/', '代表', 'long'),
      v('Senate', '/ˈsenət/', '参议院', 'medium'),
      v('Treaty', '/ˈtriːti/', '条约', 'easy'),
      v('Vote', '/vəʊt/', '投票', 'easy')
    ]
  },
  {
    id: 'artist',
    name: 'The Artist',
    description: 'Creative and chaotic. Deals damage to ALL enemies and scales strength over time.',
    introStory: "The world is grey. The Spire is a canvas waiting for your color. You paint with fire and blood.",
    icon: 'fa-palette',
    color: 'text-pink-400',
    words: [
      v('Aesthetic', '/iːsˈθetɪk/', '审美的', 'medium'),
      v('Canvas', '/ˈkænvəs/', '画布', 'medium'),
      v('Create', '/kriˈeɪt/', '创造', 'easy'),
      v('Design', '/dɪˈzaɪn/', '设计', 'easy'),
      v('Exhibit', '/ɪɡˈzɪbɪt/', '展览', 'medium'),
      v('Gallery', '/ˈɡæləri/', '画廊', 'medium'),
      v('Image', '/ˈɪmɪdʒ/', '图像', 'easy'),
      v('Inspire', '/ɪnˈspaɪə(r)/', '激发', 'medium'),
      v('Masterpiece', '/ˈmɑːstəpiːs/', '杰作', 'long'),
      v('Museum', '/mjuˈziːəm/', '博物馆', 'medium'),
      v('Portrait', '/ˈpɔːtreɪt/', '肖像', 'medium'),
      v('Sculpture', '/ˈskʌlptʃə(r)/', '雕塑', 'medium'),
      v('Sketch', '/sketʃ/', '素描', 'easy'),
      v('Studio', '/ˈstjuːdiəʊ/', '工作室', 'medium'),
      v('Style', '/staɪl/', '风格', 'easy')
    ]
  },
  {
    id: 'engineer',
    name: 'The Engineer',
    description: 'High risk, high reward. Sacrifices HP for massive Strength and Energy.',
    introStory: "If it can be built, it can be broken. You understand the machinery of the Spire better than anyone.",
    icon: 'fa-microchip',
    color: 'text-orange-400',
    words: [
      v('Algorithm', '/ˈælɡərɪðəm/', '算法', 'medium'),
      v('Circuit', '/ˈsɜːkɪt/', '电路', 'medium'),
      v('Code', '/kəʊd/', '代码', 'easy'),
      v('Compute', '/kəmˈpjuːt/', '计算', 'medium'),
      v('Database', '/ˈdeɪtəbeɪs/', '数据库', 'medium'),
      v('Device', '/dɪˈvaɪs/', '设备', 'medium'),
      v('Digital', '/ˈdɪdʒɪtl/', '数字的', 'medium'),
      v('Hardware', '/ˈhɑːdweə(r)/', '硬件', 'medium'),
      v('Innovation', '/ˌɪnəˈveɪʃn/', '创新', 'long'),
      v('Interface', '/ˈɪntəfeɪs/', '接口', 'medium'),
      v('Network', '/ˈnetwɜːk/', '网络', 'medium'),
      v('Robot', '/ˈrəʊbɒt/', '机器人', 'easy'),
      v('Server', '/ˈsɜːvə(r)/', '服务器', 'medium'),
      v('Software', '/ˈsɒftweə(r)/', '软件', 'medium'),
      v('System', '/ˈsɪstəm/', '系统', 'easy')
    ]
  }
];

export const defaultVocabList: Vocabulary[] = [];

// --- EBBINGHAUS LOGIC ENGINE ---

export function updateVocabProficiency(vocab: Vocabulary, isSuccess: boolean): Vocabulary {
    const now = Date.now();
    let newV = { ...vocab, lastReview: now };

    if (isSuccess) {
        if (newV.proficiency < 5) newV.proficiency += 1;
        const interval = INTERVALS_MS[Math.min(newV.proficiency, INTERVALS_MS.length - 1)];
        newV.nextReview = now + interval;
        newV.failStreak = 0;
        newV.isRetest = false;
        newV.masteryStreak = newV.proficiency; 
    } else {
        newV.failStreak += 1;
        if (newV.isRetest) {
            newV.proficiency = Math.max(0, newV.proficiency - 1);
            newV.isRetest = false; 
            newV.failStreak = 0; 
        } else {
            newV.isRetest = true;
        }
        newV.nextReview = now; 
        newV.masteryStreak = newV.proficiency;
    }
    return newV;
}

// --- NEW CARD STATS ENGINE (Tier + Type Logic) ---

interface CardStats {
    energy: number;
    value: number;
    descSuffix: string;
    name: string;
    
    // Mechanics
    retain: boolean;
    applyDebuff: boolean;
    doubleCast: boolean;
    
    // Effects
    drawEffect?: number;
    discardEffect?: number;
    energyNextTurn?: number;
    healValue?: number;
    lifesteal?: boolean;
    cleanseDebuff?: boolean;
    
    // Visuals
    visualTag: 'FIRE' | 'ICE' | 'DEFAULT';
}

function getCardStats(type: CardType, vocab: Vocabulary): CardStats {
    const len = vocab.word.length;
    const p = vocab.proficiency;
    
    // 1. Determine Tier (Length based)
    let tier = 0;
    if (len >= 12) tier = 3;
    else if (len >= 9) tier = 2;
    else if (len >= 5) tier = 1;
    else tier = 0; // 3-4

    // 2. Base Cost
    let energy = tier; // 0, 1, 2, 3
    if (p >= 4) energy = Math.max(0, energy - 1); // Proficiency Bonus: Cost -1

    // 3. Values & Names based on Type + Tier
    let val = 0;
    let name = "Spell";
    let descSuffix = "";
    
    // Effects Defaults
    let drawEffect = 0;
    let discardEffect = 0;
    let energyNextTurn = 0;
    let healValue = 0;
    let lifesteal = false;
    let cleanseDebuff = false;

    if (type === 'ATTACK') {
        const dmgTable = [4, 9, 18, 30];
        val = dmgTable[tier];
        const names = ["Dagger", "Sword", "Hammer", "Nuke"];
        name = names[tier];
    } else if (type === 'DEFENSE') {
        const blockTable = [3, 8, 16, 20];
        val = blockTable[tier];
        const names = ["Parry", "Shield", "Fortress", "Invincible"];
        name = names[tier];
        if (tier === 3) descSuffix += " +1 Turn Invuln (Simulated by massive block)";
    } else if (type === 'UTILITY') {
        val = 0; // Usually utility is effect based
        if (tier === 0) {
            name = "Cantrip";
            drawEffect = 1;
            discardEffect = 1;
            descSuffix += " Draw 1, Discard 1.";
        } else if (tier === 1) {
            name = "Wisdom";
            drawEffect = 2;
            descSuffix += " Draw 2.";
        } else if (tier === 2) {
            name = "Energize";
            energyNextTurn = 2;
            descSuffix += " Next Turn Energy +2.";
        } else if (tier === 3) {
            name = "Omniscience";
            // Implementing search is complex, usually 'Draw 3' or 'Add random rare to hand'
            // For now: Draw 3 Free cards
            drawEffect = 3;
            descSuffix += " Draw 3."; 
        }
    } else if (type === 'HEAL') {
        if (tier === 0) {
            name = "Bandage";
            cleanseDebuff = true;
            descSuffix += " Remove 1 Debuff.";
        } else if (tier === 1) {
            name = "Nap";
            healValue = 3;
            descSuffix += " Heal 3 HP.";
        } else if (tier === 2) {
            name = "Drain";
            val = 10; // Deal 10
            healValue = 10;
            name = "Vampiric Touch"; // Drain is also ok
            descSuffix += ` Deal ${val}, Heal ${healValue}.`;
        } else if (tier === 3) {
            name = "Rebirth";
            healValue = 50; // Special Logic: Heal 50% HP
            descSuffix += " Heal 50% HP. Exhaust.";
        }
    }

    // 4. Proficiency Bonus (L1: x1.3 Value)
    if (p >= 1) {
        val = Math.floor(val * 1.3);
        if (healValue > 0 && tier !== 3) healValue = Math.floor(healValue * 1.3);
    }

    // 5. Keyword Overrides (Easter Eggs)
    const wordLower = vocab.word.toLowerCase();
    let visualTag: 'FIRE' | 'ICE' | 'DEFAULT' = 'DEFAULT';

    if (type === 'ATTACK' && (wordLower.includes('fire') || wordLower.includes('burn') || wordLower.includes('hot') || wordLower.includes('sun'))) {
        visualTag = 'FIRE';
        descSuffix += " (Fire FX)";
    }
    if (type === 'DEFENSE' && (wordLower.includes('ice') || wordLower.includes('cold') || wordLower.includes('snow') || wordLower.includes('freeze'))) {
        visualTag = 'ICE';
        descSuffix += " (Ice FX)";
    }
    if (wordLower.includes('fast') || wordLower.includes('speed') || wordLower.includes('quick')) {
        drawEffect += 1;
        descSuffix += " Draw +1.";
    }
    if ((wordLower.includes('blood') || wordLower.includes('life') || wordLower.includes('heal')) && type === 'ATTACK') {
        lifesteal = true;
        descSuffix += " Lifesteal.";
    }

    // Evolution Mechanics (Retain L2, etc) logic mostly moved to stats calculation or kept as standard perks
    // Re-applying prompt specific evolution rules if they don't conflict with Tier system.
    // Prompt says: "L2: Retain", "L3: Debuff/Block", "L5: DoubleCast".
    let retain = p >= 2;
    let applyDebuff = p >= 3 && (type === 'ATTACK'); // L3 Attack gets Debuff
    if (p >= 3 && type === 'DEFENSE') val += 3; // L3 Defense gets extra block (simplified from prompt "Block effect")
    let doubleCast = p >= 5;

    return {
        energy,
        value: val,
        descSuffix,
        name,
        retain,
        applyDebuff,
        doubleCast,
        drawEffect,
        discardEffect,
        energyNextTurn,
        healValue,
        lifesteal,
        cleanseDebuff,
        visualTag
    };
}

export function createCard(type: CardType, vocabInput: Vocabulary, isReviewCard: boolean = false): Card {
  const uniqueId = Math.random().toString(36).substr(2, 9);
  const stats = getCardStats(type, vocabInput);

  let desc = stats.descSuffix;
  // Construct main description based on type if not custom
  if (type === 'ATTACK') {
      desc = `Deal ${stats.value} Damage. ${desc}`;
  } else if (type === 'DEFENSE') {
      desc = `Gain ${stats.value} Block. ${desc}`;
  } else if (type === 'HEAL' && stats.value > 0) {
      // Hybrid damage/heal (Drain)
      // Desc already handled in getCardStats via suffix usually, but let's ensure base text
  }

  // Prepend keywords
  if (stats.retain) desc = "Retain. " + desc;
  if (stats.doubleCast) desc += " Double Cast.";

  return {
    id: `card_${vocabInput.id}`,
    uniqueId,
    vocab: vocabInput,
    type,
    name: stats.name,
    energyCost: stats.energy,
    value: stats.value,
    description: desc,
    retain: stats.retain,
    applyDebuff: stats.applyDebuff,
    doubleCast: stats.doubleCast,
    
    // New mechanics
    drawEffect: stats.drawEffect,
    discardEffect: stats.discardEffect,
    energyNextTurn: stats.energyNextTurn,
    healValue: stats.healValue,
    lifesteal: stats.lifesteal,
    cleanseDebuff: stats.cleanseDebuff,
    visualTag: stats.visualTag,

    isReview: isReviewCard,
    isExhaust: type === 'HEAL' && stats.name === 'Rebirth' // Specific override
  };
}

export function generateSessionDeck(classId: string, fullVocabList: Vocabulary[]): Card[] {
    if (!fullVocabList.length) return [];
    
    const now = Date.now();
    const DECK_SIZE = 12;

    // 1. Prioritize Selection (Bounty > New > Filler)
    // Same logic as before to pick words
    const bountyPool = fullVocabList.filter(v => (v.proficiency < 5 && v.nextReview > 0 && now >= v.nextReview) || v.isRetest);
    const newPool = fullVocabList.filter(v => v.proficiency === 0 && !bountyPool.includes(v));
    const fillerPool = fullVocabList.filter(v => !bountyPool.includes(v) && !newPool.includes(v));

    const selectedVocabs: { vocab: Vocabulary, isReview: boolean }[] = [];

    // Bounty
    bountyPool.sort((a, b) => (a.isRetest ? -1 : 1) || a.nextReview - b.nextReview);
    const maxBounty = Math.max(0, DECK_SIZE - (newPool.length > 0 ? 3 : 0));
    while (selectedVocabs.length < maxBounty && bountyPool.length > 0) {
        selectedVocabs.push({ vocab: bountyPool.shift()!, isReview: true });
    }
    // New
    newPool.sort(() => Math.random() - 0.5);
    while (selectedVocabs.length < DECK_SIZE && newPool.length > 0) {
        selectedVocabs.push({ vocab: newPool.shift()!, isReview: false });
    }
    // Filler
    const leftovers = [...bountyPool, ...fillerPool].sort(() => Math.random() - 0.5);
    while (selectedVocabs.length < DECK_SIZE && leftovers.length > 0) {
        const v = leftovers.shift()!;
        selectedVocabs.push({ vocab: v, isReview: (v.proficiency < 5 && v.nextReview > 0 && now >= v.nextReview) || v.isRetest });
    }
    // Fill if short
    while (selectedVocabs.length < DECK_SIZE && selectedVocabs.length > 0) {
        selectedVocabs.push(selectedVocabs[Math.floor(Math.random() * selectedVocabs.length)]);
    }

    // 2. Assign Types based on Distribution (40% Red, 35% Blue, 20% Purple, 5% Green)
    // 12 Cards:
    // Red (Attack): 5
    // Blue (Defense): 4
    // Purple (Utility): 2
    // Green (Heal): 1
    
    // We shuffle the vocabs first to randomize which word gets which type
    const shuffledVocabs = selectedVocabs.sort(() => Math.random() - 0.5);
    const deck: Card[] = [];
    
    // Distribution Pattern
    const types: CardType[] = [
        'ATTACK', 'ATTACK', 'ATTACK', 'ATTACK', 'ATTACK', // 5
        'DEFENSE', 'DEFENSE', 'DEFENSE', 'DEFENSE',       // 4
        'UTILITY', 'UTILITY',                             // 2
        'HEAL'                                            // 1
    ];

    shuffledVocabs.forEach((item, i) => {
        // Wrap around types if deck size > 12
        const type = types[i % types.length];
        deck.push(createCard(type, item.vocab, item.isReview));
    });

    return deck.sort(() => Math.random() - 0.5);
}

// Legacy helpers
export function getClassStarterDeck(classId: string, sourceList: Vocabulary[] = defaultVocabList): Card[] {
   return generateSessionDeck(classId, sourceList);
}

export function getRandomRewardOptions(sourceList: Vocabulary[] = defaultVocabList): Card[] {
  if (!sourceList || sourceList.length === 0) return [];
  const pool = sourceList;
  const rewards: Card[] = [];
  const types: CardType[] = ['ATTACK', 'DEFENSE', 'UTILITY', 'HEAL'];
  
  for(let i=0; i<3; i++) {
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomVocab = pool[Math.floor(Math.random() * pool.length)];
    rewards.push(createCard(randomType, randomVocab, false));
  }
  return rewards;
}

export function getReplacementVocab(difficulty: Vocabulary['difficulty'], currentDeckVocabIds: string[], sourceList: Vocabulary[] = defaultVocabList): Vocabulary {
    const candidates = sourceList.filter(v => !currentDeckVocabIds.includes(v.id));
    if (candidates.length === 0) return sourceList[0];
    return candidates[Math.floor(Math.random() * candidates.length)];
}