import { GameEvent, EventChoice, EventResult, Player, Card, Vocabulary } from '../types';
import { createCard } from './vocabulary';

export const EVENTS: GameEvent[] = [
  {
    id: 'fountain',
    title: 'The Mysterious Fountain',
    description: 'You stumble upon a fountain of clear water in the middle of a dark chamber. It shimmers with a faint blue light. The water looks refreshing, but you notice coins glittering at the bottom.',
    image: 'https://image.pollinations.ai/prompt/mysterious%20glowing%20blue%20fountain%20in%20dark%20dungeon%20room%20fantasy%20art?width=512&height=512&nologo=true',
    choices: [
      { id: 'drink', text: 'Drink', description: 'Heal 20 HP.', type: 'SAFE' },
      { id: 'coin', text: 'Toss a Coin', description: 'Lose 10 Gold. Remove a Card.', type: 'TRADE', requirement: '10 Gold' },
      { id: 'leave', text: 'Leave', type: 'SAFE' }
    ]
  },
  {
    id: 'dice_goblin',
    title: 'The Dice Goblin',
    description: 'A small, manic goblin blocks your path. He holds a giant 20-sided die. "Roll for it!" he screeches. "High you win shiny! Low... I take shiny!"',
    image: 'https://image.pollinations.ai/prompt/fantasy%20goblin%20holding%20giant%20d20%20dice%20dungeon%20art?width=512&height=512&nologo=true',
    choices: [
      { id: 'roll', text: 'Roll the Die', description: 'DC 10. Success: Gain 50 Gold. Fail: Lose 20 Gold.', type: 'ROLL', rollDC: 10 },
      { id: 'attack', text: 'Attack', description: 'Lose 5 HP. Gain 20 Gold.', type: 'RISKY' },
      { id: 'leave', text: 'Ignore', type: 'SAFE' }
    ]
  },
  {
    id: 'cursed_book',
    title: 'The Cursed Tome',
    description: 'An ancient book floats on a pedestal. It whispers to you in a language you shouldn\'t know but somehow understand. It offers power, but the pages are stained with blood.',
    image: 'https://image.pollinations.ai/prompt/floating%20cursed%20grimoire%20dark%20magic%20dungeon%20art?width=512&height=512&nologo=true',
    choices: [
      { id: 'read', text: 'Read', description: 'Lose 10 HP. Obtain a random Rare Power card.', type: 'RISKY' },
      { id: 'take', text: 'Take the Book', description: 'Obtain a special Relic (Not implemented: Gain 50 Gold instead).', type: 'SAFE' },
      { id: 'leave', text: 'Leave', type: 'SAFE' }
    ]
  },
  {
    id: 'beggar',
    title: 'The Old Beggar',
    description: 'A ragged figure sits in the shadows. "Alms for the poor?" he rasps. "Or perhaps you seek to lighten your burden?"',
    image: 'https://image.pollinations.ai/prompt/old%20mysterious%20beggar%20in%20dark%20cloak%20fantasy%20art?width=512&height=512&nologo=true',
    choices: [
      { id: 'give', text: 'Give Gold', description: 'Lose 25 Gold. Heal 30 HP.', type: 'TRADE', requirement: '25 Gold' },
      { id: 'purge', text: 'Purge', description: 'Remove a card from your deck.', type: 'SAFE' },
      { id: 'rob', text: 'Rob', description: 'Gain 20 Gold. Gain a "Shame" Curse (Simulated: Lose 5 HP).', type: 'RISKY' }
    ]
  },
  {
    id: 'mirror',
    title: 'The Mirror of Truth',
    description: 'A pristine mirror stands before you. When you look into it, you see not your reflection, but a stronger version of yourself... or is it?',
    image: 'https://image.pollinations.ai/prompt/ancient%20magic%20mirror%20glowing%20frame%20dungeon%20art?width=512&height=512&nologo=true',
    choices: [
      { id: 'duplicate', text: 'Duplicate', description: 'Duplicate a random card in your deck.', type: 'SAFE' },
      { id: 'smash', text: 'Smash', description: 'Search for loot. DC 12 check.', type: 'ROLL', rollDC: 12 },
      { id: 'leave', text: 'Leave', type: 'SAFE' }
    ]
  }
];

export function resolveEventChoice(
  eventId: string, 
  choiceId: string, 
  player: Player, 
  vocabList: Vocabulary[], 
  rollResult?: number
): EventResult {
  const event = EVENTS.find(e => e.id === eventId);
  const choice = event?.choices.find(c => c.id === choiceId);
  if (!event || !choice) return { message: 'Error', outcome: 'NEUTRAL' };

  // --- DICE GOBLIN ---
  if (eventId === 'dice_goblin') {
    if (choiceId === 'roll') {
      if ((rollResult || 0) >= (choice.rollDC || 10)) {
        return { message: `You rolled a ${rollResult}! The goblin cheers and throws coins at you.`, outcome: 'SUCCESS', goldChange: 50 };
      } else {
        return { message: `You rolled a ${rollResult}... The goblin cackles and swipes your purse!`, outcome: 'FAILURE', goldChange: -20 };
      }
    }
    if (choiceId === 'attack') {
      return { message: "You smack the goblin and take his lunch money, but he bites you.", outcome: 'NEUTRAL', damageTaken: 5, goldChange: 20 };
    }
  }

  // --- FOUNTAIN ---
  if (eventId === 'fountain') {
    if (choiceId === 'drink') return { message: "The water is cool and refreshing.", outcome: 'SUCCESS', healed: 20 };
    if (choiceId === 'coin') return { message: "You toss a coin. You feel lighter.", outcome: 'SUCCESS', goldChange: -10, cardsRemoved: 1 };
  }

  // --- CURSED BOOK ---
  if (eventId === 'cursed_book') {
    if (choiceId === 'read') {
      if (vocabList.length > 0) {
        const randomVocab = vocabList[Math.floor(Math.random() * vocabList.length)];
        // Changed POWER to UTILITY as POWER is not a valid CardType
        const powerCard = createCard('UTILITY', randomVocab);
        return { message: "The words burn your eyes, but knowledge flows into you.", outcome: 'SUCCESS', damageTaken: 10, cardsAdded: [powerCard] };
      } else {
        return { message: "The pages are blank.", outcome: 'NEUTRAL', damageTaken: 5 };
      }
    }
    if (choiceId === 'take') return { message: "You take the book to sell later.", outcome: 'SUCCESS', goldChange: 50 };
  }

  // --- BEGGAR ---
  if (eventId === 'beggar') {
    if (choiceId === 'give') return { message: "The beggar blesses you.", outcome: 'SUCCESS', goldChange: -25, healed: 30 };
    if (choiceId === 'purge') return { message: "The beggar teaches you to let go.", outcome: 'SUCCESS', cardsRemoved: 1 };
    if (choiceId === 'rob') return { message: "You steal his coins. You feel ashamed.", outcome: 'FAILURE', goldChange: 20, damageTaken: 5 };
  }

  // --- MIRROR ---
  if (eventId === 'mirror') {
    if (choiceId === 'duplicate') {
        // Logic handled in App.tsx to pick card, here we just signal
        return { message: "The reflection steps out and joins you.", outcome: 'SUCCESS', cardsAdded: [] }; 
    }
    if (choiceId === 'smash') {
         if ((rollResult || 0) >= (choice.rollDC || 12)) {
             return { message: `Rolled ${rollResult}! You find a hidden stash behind the glass.`, outcome: 'SUCCESS', goldChange: 75 };
         } else {
             return { message: `Rolled ${rollResult}... You cut your hand on the shards.`, outcome: 'FAILURE', damageTaken: 10 };
         }
    }
  }

  return { message: "You leave the area.", outcome: 'NEUTRAL' };
}