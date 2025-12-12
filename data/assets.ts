
// --- VIRTUAL ASSET FOLDERS ---
// Change these URLs to swap assets globally.

export const IMAGES = {
  // Character Portraits (Avatars)
  CHARACTERS: {
    SCHOLAR: 'https://image.pollinations.ai/prompt/fantasy%20scholar%20wizard%20reading%20book%20magic%20blue%20robes%20character%20portrait?width=512&height=512&nologo=true',
    MERCHANT: 'https://image.pollinations.ai/prompt/fantasy%20rich%20merchant%20holding%20gold%20coins%20sly%20smile%20character%20portrait?width=512&height=512&nologo=true',
    TRAVELER: 'https://image.pollinations.ai/prompt/fantasy%20ranger%20traveler%20hooded%20forest%20green%20character%20portrait?width=512&height=512&nologo=true',
    DIPLOMAT: 'https://image.pollinations.ai/prompt/fantasy%20noble%20diplomat%20purple%20robes%20scroll%20character%20portrait?width=512&height=512&nologo=true',
    ARTIST: 'https://image.pollinations.ai/prompt/fantasy%20bard%20artist%20painter%20magic%20brush%20colorful%20character%20portrait?width=512&height=512&nologo=true',
    ENGINEER: 'https://image.pollinations.ai/prompt/fantasy%20steampunk%20engineer%20goggles%20wrench%20character%20portrait?width=512&height=512&nologo=true',
    DEFAULT: 'https://image.pollinations.ai/prompt/mysterious%20adventurer%20shadow%20hood%20character%20portrait?width=512&height=512&nologo=true'
  },
  
  // Background Wallpapers
  BACKGROUNDS: {
    MENU: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)', // Fallback to CSS gradient if no image
    MAP: 'linear-gradient(to bottom, #0f172a, #1e293b)', 
    COMBAT_NORMAL: 'linear-gradient(to bottom, #1a1a1a, #2d3748)',
    COMBAT_BOSS: 'linear-gradient(to bottom, #2e1065, #000000)',
    SHOP: 'linear-gradient(to bottom, #3f2c22, #1a100a)',
    CAMPFIRE: 'linear-gradient(to bottom, #000000, #431407)',
    LIBRARY: 'linear-gradient(to right, #0f172a, #1e293b)'
  },

  // Enemy Sprites
  ENEMIES: {
    CULTIST: 'https://image.pollinations.ai/prompt/dark%20fantasy%20cultist%20minion%20hooded%20figure%20dungeon%20art?width=512&height=512&nologo=true',
    SLIME: 'https://image.pollinations.ai/prompt/fantasy%20acid%20green%20slime%20monster%20dungeon%20art?width=512&height=512&nologo=true',
    CULTIST_LEADER: 'https://image.pollinations.ai/prompt/dark%20fantasy%20cultist%20leader%20necromancer%20dungeon%20art%20high%20quality?width=512&height=512&nologo=true',
    GUARDIAN: 'https://image.pollinations.ai/prompt/fantasy%20dungeon%20boss%20stone%20guardian%20golem%20glowing%20runes%20dark%20art?width=512&height=512&nologo=true'
  },

  // Event Illustrations
  EVENTS: {
    FOUNTAIN: 'https://image.pollinations.ai/prompt/mysterious%20glowing%20blue%20fountain%20in%20dark%20dungeon%20room%20fantasy%20art?width=512&height=512&nologo=true',
    DICE_GOBLIN: 'https://image.pollinations.ai/prompt/fantasy%20goblin%20holding%20giant%20d20%20dice%20dungeon%20art?width=512&height=512&nologo=true',
    CURSED_BOOK: 'https://image.pollinations.ai/prompt/floating%20cursed%20grimoire%20dark%20magic%20dungeon%20art?width=512&height=512&nologo=true',
    BEGGAR: 'https://image.pollinations.ai/prompt/old%20mysterious%20beggar%20in%20dark%20cloak%20fantasy%20art?width=512&height=512&nologo=true',
    MIRROR: 'https://image.pollinations.ai/prompt/ancient%20magic%20mirror%20glowing%20frame%20dungeon%20art?width=512&height=512&nologo=true'
  }
};

export const AUDIO_TRACKS = {
  MENU: 'https://cdn.pixabay.com/audio/2023/09/06/audio_4eb6775671.mp3',
  MAP: 'https://cdn.pixabay.com/audio/2022/05/23/audio_33866c5d1e.mp3',
  COMBAT_NORMAL: 'https://cdn.pixabay.com/audio/2023/10/10/audio_c8c8a73467.mp3',
  COMBAT_BOSS: 'https://cdn.pixabay.com/audio/2022/03/15/audio_b28271016c.mp3',
  VICTORY: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c153e2.mp3',
  SHOP: 'https://cdn.pixabay.com/audio/2022/10/25/audio_106037581b.mp3',
  CAMPFIRE: 'https://cdn.pixabay.com/audio/2022/05/23/audio_33866c5d1e.mp3'
};
