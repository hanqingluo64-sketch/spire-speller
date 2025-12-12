import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, GamePhase, Vocabulary, MapNode, Player, Card, Enemy, EnemyIntent, GameEvent, EventResult, Relic, EntityStatus, ShopState, ShopItem, RunState, NodeType, OverlayView, EventChoice, CardDebuff, ActConfig, PendingAction, GoldBreakdown, CombatStats } from './types';
import { audioService } from './services/audioService';
import { saveManager } from './services/saveService';
import { PRESET_PACKS, getClassStarterDeck, createCard, getRandomRewardOptions, getReplacementVocab, updateVocabProficiency, generateSessionDeck } from './data/vocabulary';
import { generateMap, initSeed, rehydrateMap } from './data/mapSystem';
import { ALL_RELICS, getEnemyNextIntent } from './data/gameContent'; 
import { DungeonManager, ACTS } from './data/dungeon';
import { EVENTS, resolveEventChoice } from './data/events';
import { IMAGES, AUDIO_TRACKS } from './data/assets';
import CardComponent from './components/CardComponent';
import SpellingModal from './components/SpellingModal';

// --- TUTORIAL CONFIGURATION ---
const TUTORIAL_STEPS = [
    { id: 0, title: 'Welcome', text: "Welcome to Spire Speller! I am your magical guide. Let's teach you how to survive.", target: null, requireAction: false },
    { id: 1, title: 'Your Grimoire', text: "This is your Draw Pile. You draw 5 cards every turn.", target: 'draw-pile', requireAction: false },
    { id: 2, title: 'Cast a Spell', text: "Short words cost 0 Energy. Click this card to cast it!", target: 'hand-card-2', requireAction: true }, // Targeted index 2 (center)
    { id: 3, title: 'Spelling', text: "Type the word correctly to unleash its power!", target: 'spelling-input', requireAction: true },
    { id: 4, title: 'Sticky Mechanic', text: "If you fail a spell, the card becomes 'Sticky' and returns to your Draw Pile immediately. You must face it again!", target: null, requireAction: false },
    { id: 5, title: 'End Turn', text: "When you are out of Energy or cards, click here to let the enemy move.", target: 'end-turn-btn', requireAction: true },
    { id: 6, title: 'Good Luck', text: "That is all. Survive the Spire, word master!", target: null, requireAction: false }
];

// --- VISUAL ASSETS ---
interface DamageText {
  id: number;
  text: string;
  x: string;
  y: string;
  color: string;
}

const SANCTUM_UPGRADES = [
    { id: 'bonus_hp', name: 'Vitality', desc: '+15 Max HP', icon: 'fa-heart', cost: 100 },
    { id: 'bonus_gold', name: 'Inheritance', desc: '+100 Starting Gold', icon: 'fa-coins', cost: 100 },
    { id: 'bonus_energy', name: 'Inner Fire', desc: '+1 Max Energy', icon: 'fa-bolt', cost: 300 },
    { id: 'bonus_str', name: 'Warrior training', desc: '+1 Starting Strength', icon: 'fa-dumbbell', cost: 200 },
    { id: 'bonus_revive', name: 'Phoenix Feather', desc: 'Revive once with 50% HP', icon: 'fa-feather', cost: 500 },
    { id: 'shop_discount', name: 'Merchant Guild', desc: '20% Shop Discount', icon: 'fa-tags', cost: 150 },
];

// --- COMPONENTS ---

const StatusIcon: React.FC<{ type: keyof EntityStatus, value: number }> = ({ type, value }) => {
  if (value <= 0) return null;
  let icon = ''; let color = ''; let label = ''; let desc = '';
  switch(type) {
    case 'strength': icon = 'fa-fist-raised'; color = 'text-red-400'; label = 'Strength'; desc = `Attacks deal ${value} more damage.`; break;
    case 'weak': icon = 'fa-heart-crack'; color = 'text-slate-400'; label = 'Weak'; desc = `Attacks deal 25% less damage for ${value} turns.`; break;
    case 'vulnerable': icon = 'fa-shield-virus'; color = 'text-purple-400'; label = 'Vulnerable'; desc = `Take 50% more damage from attacks for ${value} turns.`; break;
    case 'poison': icon = 'fa-skull-crossbones'; color = 'text-green-400'; label = 'Poison'; desc = `Take ${value} damage at start of turn. Reduces by 1.`; break;
    case 'ritual': icon = 'fa-crow'; color = 'text-slate-200'; label = 'Ritual'; desc = `Gain ${value} Strength at end of turn.`; break;
    case 'memoryShield': icon = 'fa-brain'; color = 'text-blue-300'; label = 'Memory Shield'; desc = `Blocks the next ${value} instances of damage completely.`; break;
  }
  return (
    <div className="group relative flex items-center justify-center w-8 h-8 bg-slate-800 border border-slate-600 rounded-full shadow-md cursor-help">
       <i className={`fa-solid ${icon} ${color}`}></i>
       <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-black text-white px-1 rounded-full">{value}</span>
       <div className="absolute bottom-full mb-2 w-48 bg-slate-900 border border-slate-600 p-2 rounded shadow-xl text-xs z-50 hidden group-hover:block pointer-events-none">
          <div className={`font-bold ${color} mb-1`}>{label} {value}</div>
          <div className="text-slate-300">{desc}</div>
       </div>
    </div>
  );
};

const EntityTooltip: React.FC<{ entity: Player | Enemy; isEnemy?: boolean; intent?: EnemyIntent }> = ({ entity, isEnemy, intent }) => {
  return (
    <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 bg-slate-900/95 backdrop-blur border border-yellow-500/30 p-4 rounded-xl shadow-2xl z-50 animate-fade-in-up pointer-events-none">
       <h4 className={`font-bold font-serif text-lg border-b border-slate-700 pb-2 mb-2 ${isEnemy ? 'text-red-400' : 'text-blue-400'}`}>{isEnemy ? (entity as Enemy).name : 'Player Status'}</h4>
       <div className="space-y-2 text-sm">
          <div className="flex justify-between text-red-300"><span>HP</span><span className="font-bold">{entity.hp} / {entity.maxHp}</span></div>
          <div className="flex justify-between text-blue-300"><span>Block</span><span className="font-bold">{entity.block}</span></div>
          {(Object.keys(entity.status) as Array<keyof EntityStatus>).filter(k => (entity.status[k] || 0) > 0).length > 0 && (
             <div className="pt-2 mt-2 border-t border-slate-700">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Active Effects</div>
                {(Object.keys(entity.status) as Array<keyof EntityStatus>).map(k => {
                   const val = entity.status[k];
                   if (!val) return null;
                   return (<div key={k} className="flex items-center gap-2 mb-1"><StatusIcon type={k} value={val} /><span className="text-xs text-slate-300 capitalize">{k}</span></div>);
                })}
             </div>
          )}
          {isEnemy && intent && (
             <div className="pt-2 mt-2 border-t border-slate-700">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Intent</div>
                <div className="flex items-center gap-2"><div className="font-bold text-yellow-400">{intent.type === 'ATTACK' && `Attacking for ${intent.value} dmg`}{intent.type === 'DEFEND' && `Blocking for ${intent.value}`}{intent.type === 'BUFF' && `Buffing Self`}{intent.type === 'DEBUFF' && `Debuffing You`}{intent.type === 'UNKNOWN' && `???`}</div></div>
                {intent.description && <div className="text-xs text-slate-400 italic mt-1">"{intent.description}"</div>}
             </div>
          )}
       </div>
    </div>
  );
};

// --- TUTORIAL OVERLAY UI ---
const TutorialOverlay: React.FC<{ 
    stepIndex: number; 
    onNext: () => void; 
    onSkip: () => void; 
}> = ({ stepIndex, onNext, onSkip }) => {
    const step = TUTORIAL_STEPS[stepIndex];
    if (!step) return null;

    return (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-start pointer-events-none transition-all duration-500">
            {/* Top Right Skip Button */}
            <button 
                onClick={onSkip} 
                className="absolute top-4 right-4 z-50 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded border border-slate-600 text-sm font-bold uppercase tracking-wider pointer-events-auto"
            >
                Skip Tutorial
            </button>

            {/* Instruction Box - Positioned Higher */}
            <div className="w-full max-w-2xl p-6 absolute top-24 md:top-32 animate-fade-in-up z-50 pointer-events-auto">
                <div className="bg-slate-900/95 border-2 border-yellow-500 rounded-xl p-6 shadow-[0_0_50px_rgba(234,179,8,0.2)] flex gap-6 items-start">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-600 flex-shrink-0">
                        <i className="fa-solid fa-hat-wizard text-3xl text-purple-400"></i>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-yellow-400 font-serif font-bold text-xl mb-2">{step.title}</h3>
                        <p className="text-white text-lg leading-relaxed">{step.text}</p>
                        
                        {!step.requireAction && (
                            <div className="mt-4 flex justify-end">
                                <button 
                                    onClick={onNext} 
                                    className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded animate-pulse"
                                >
                                    Continue <i className="fa-solid fa-arrow-right ml-2"></i>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Visual Pointer if there is a target but logic requires action (so no 'Continue' button) */}
                {step.target && (
                    <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 text-yellow-400 animate-bounce text-6xl drop-shadow-[0_4px_4px_rgba(0,0,0,1)] pointer-events-none">
                        <i className="fa-solid fa-hand-point-down"></i>
                    </div>
                )}
            </div>
        </div>
    );
};

const StoryModal: React.FC<{ title: string; story: string; icon: string; color: string; onContinue: () => void }> = ({ title, story, icon, color, onContinue }) => (
    <div className="fixed inset-0 z-[120] bg-black flex flex-col items-center justify-center p-8 animate-fade-in-up">
       <div className={`text-6xl md:text-8xl mb-6 ${color} animate-pulse`}><i className={`fa-solid ${icon}`}></i></div>
       <h1 className={`text-4xl md:text-5xl font-serif font-bold text-white mb-8 border-b-2 border-slate-700 pb-4`}>{title}</h1>
       <p className="text-xl md:text-2xl text-slate-300 max-w-2xl text-center leading-relaxed font-serif italic mb-12">"{story}"</p>
       <button onClick={onContinue} className="px-8 py-3 bg-slate-100 hover:bg-white text-black font-bold text-xl rounded-full transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]">Begin Journey</button>
    </div>
);

const ActTransitionModal: React.FC<{ act: ActConfig; onContinue: () => void }> = ({ act, onContinue }) => (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8 animate-fade-in-up text-center">
        <h2 className="text-3xl text-slate-400 mb-4 tracking-widest uppercase">Act {act.index}</h2>
        <h1 className="text-6xl md:text-8xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-8 drop-shadow-lg">{act.name}</h1>
        <p className="text-xl text-slate-300 max-w-2xl italic mb-12">{act.description}</p>
        <button onClick={onContinue} className="px-8 py-3 bg-slate-100 hover:bg-white text-black font-bold text-xl rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-105">Enter</button>
    </div>
);

const RestScreen: React.FC<{ player: Player; onSleep: () => void; onSmith: () => void; onLeave: () => void; }> = ({ player, onSleep, onSmith, onLeave }) => {
    // Check for Coffee Dripper relic to disable sleep
    const hasCoffee = player.relics.some(r => r.id === 'coffee_dripper' || r.id.includes('coffee')); 
    
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 bg-black/80 animate-fade-in-up" style={{ backgroundImage: `url(${IMAGES.BACKGROUNDS.CAMPFIRE})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
            
            <h2 className="relative z-10 text-5xl font-serif text-orange-500 mb-8 drop-shadow-lg tracking-widest">Rest Site</h2>
            
            <div className="relative z-10 flex flex-col md:flex-row gap-8 md:gap-12">
                {/* Sleep Option */}
                <button 
                    onClick={onSleep} 
                    disabled={hasCoffee} 
                    className={`group relative w-64 h-80 bg-slate-900/90 border-2 rounded-2xl flex flex-col items-center justify-center p-6 transition-all duration-300 ${hasCoffee ? 'border-slate-700 opacity-50 cursor-not-allowed' : 'border-slate-600 hover:border-green-400 hover:scale-105 hover:shadow-[0_0_30px_rgba(74,222,128,0.3)]'}`}
                >
                    <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-slate-700 transition-colors">
                        <i className="fa-solid fa-bed text-5xl text-green-400"></i>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Sleep</h3>
                    <p className="text-slate-400 text-center text-sm">Heal 30% HP ({Math.floor(player.maxHp * 0.3)})</p>
                    {hasCoffee && <p className="text-red-500 text-xs mt-4 font-bold uppercase tracking-widest">Coffee Relic Active</p>}
                </button>

                {/* Smith Option */}
                <button 
                    onClick={onSmith} 
                    className="group relative w-64 h-80 bg-slate-900/90 border-2 border-slate-600 rounded-2xl flex flex-col items-center justify-center p-6 transition-all duration-300 hover:border-red-400 hover:scale-105 hover:shadow-[0_0_30px_rgba(248,113,113,0.3)]"
                >
                    <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-slate-700 transition-colors">
                        <i className="fa-solid fa-hammer text-5xl text-red-400"></i>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Smith</h3>
                    <p className="text-slate-400 text-center text-sm">Remove a card from your deck.</p>
                </button>
            </div>

            <button onClick={onLeave} className="relative z-10 mt-12 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full border border-slate-600 transition-all">
                Leave
            </button>
        </div>
    );
};

const GameHUD: React.FC<{ player: Player | null; currency: number; phase: GamePhase; onOpenSettings: () => void; onOpenDeck: () => void; onOpenRelics: () => void; onOpenBlessings: () => void; onOpenVocab: () => void; }> = ({ player, currency, phase, onOpenSettings, onOpenDeck, onOpenRelics, onOpenBlessings, onOpenVocab }) => {
  if (!player) return null;
  return (
    <div className="absolute top-0 left-0 w-full p-4 z-40 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
            <div className="flex items-center gap-4 bg-slate-900/80 p-2 rounded-lg border border-slate-700 text-white">
                <div className="flex items-center gap-2 text-red-400 font-bold px-2"><i className="fa-solid fa-heart"></i> {player.hp}/{player.maxHp}</div>
                <div className="flex items-center gap-2 text-yellow-400 font-bold px-2 border-l border-slate-600"><i className="fa-solid fa-coins"></i> {player.gold}</div>
                <div className="flex items-center gap-2 text-blue-400 font-bold px-2 border-l border-slate-600"><i className="fa-solid fa-bolt"></i> {player.energy}/{player.maxEnergy}</div>
                 <div className="flex items-center gap-2 text-purple-400 font-bold px-2 border-l border-slate-600"><i className="fa-solid fa-star"></i> {currency}</div>
            </div>
            {phase === 'COMBAT' && <div className="flex gap-2"><button onClick={onOpenDeck} className="bg-slate-800 p-2 rounded text-xs hover:bg-slate-700 border border-slate-600">Deck</button></div>}
        </div>
        <div className="flex gap-2 pointer-events-auto">
             <button onClick={onOpenVocab} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-600 flex items-center justify-center text-yellow-500"><i className="fa-solid fa-book-open"></i></button>
             <button onClick={onOpenBlessings} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-600 flex items-center justify-center text-purple-400"><i className="fa-solid fa-star"></i></button>
            <button onClick={onOpenRelics} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-600 flex items-center justify-center text-blue-400"><i className="fa-solid fa-gem"></i></button>
            <button onClick={onOpenSettings} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-600 flex items-center justify-center text-slate-300"><i className="fa-solid fa-gear"></i></button>
        </div>
    </div>
  );
};

const SettingsModal: React.FC<{ onClose: () => void; volume: number; setVolume: (v: number) => void; isMuted: boolean; setIsMuted: (m: boolean) => void; onSaveGame?: () => void; onExitGame?: () => void; }> = ({ onClose, volume, setVolume, isMuted, setIsMuted, onSaveGame, onExitGame }) => {
    const [trackName, setTrackName] = useState(audioService.getCurrentTrackName());

    const handlePrevTrack = () => {
        audioService.playPrevBGM();
        setTrackName(audioService.getCurrentTrackName());
    };

    const handleNextTrack = () => {
        audioService.playNextBGM();
        setTrackName(audioService.getCurrentTrackName());
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center">
            <div className="bg-slate-800 p-8 rounded-xl border border-slate-600 w-96">
                <h2 className="text-2xl font-bold mb-6 text-white text-center">Settings</h2>
                
                {/* Volume Slider */}
                <div className="mb-6">
                    <label className="block text-slate-400 mb-2">Master Volume</label>
                    <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full"/>
                </div>

                {/* Mute Toggle */}
                <div className="mb-6 flex items-center justify-between">
                    <span className="text-slate-400">Mute Audio</span>
                    <button onClick={() => setIsMuted(!isMuted)} className={`w-12 h-6 rounded-full p-1 transition-colors ${isMuted ? 'bg-red-500' : 'bg-green-500'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isMuted ? 'translate-x-6' : ''}`}></div>
                    </button>
                </div>

                {/* Music Player Control */}
                <div className="mb-8 border-t border-slate-700 pt-6">
                    <label className="block text-slate-400 mb-3 text-center uppercase text-xs tracking-widest font-bold">Music Player</label>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex flex-col items-center">
                         <div className="text-yellow-400 font-bold text-sm mb-2 text-center w-full truncate">{trackName}</div>
                         <div className="flex gap-6 items-center">
                             <button onClick={handlePrevTrack} className="text-slate-400 hover:text-white transition-colors p-2"><i className="fa-solid fa-backward-step"></i></button>
                             <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-600">
                                 <i className="fa-solid fa-music text-slate-500 text-xs"></i>
                             </div>
                             <button onClick={handleNextTrack} className="text-slate-400 hover:text-white transition-colors p-2"><i className="fa-solid fa-forward-step"></i></button>
                         </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {onSaveGame && <button onClick={onSaveGame} className="py-2 bg-blue-600 rounded hover:bg-blue-500">Save Game</button>}
                    {onExitGame && <button onClick={onExitGame} className="py-2 bg-red-600 rounded hover:bg-red-500">Exit to Menu</button>}
                    <button onClick={onClose} className="py-2 bg-slate-600 rounded hover:bg-slate-500">Resume</button>
                </div>
            </div>
        </div>
    );
};

const SaveLoadModal: React.FC<{ mode: 'SAVE' | 'LOAD'; profile: UserProfile; onAction: (slotId: number) => void; onDelete?: (slotId: number) => void; onClose: () => void; }> = ({ mode, profile, onAction, onDelete, onClose }) => (
    <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-600 rounded-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-yellow-400">{mode === 'SAVE' ? 'Save Game' : 'Load Game'}</h2><button onClick={onClose}><i className="fa-solid fa-xmark text-2xl text-slate-500 hover:text-white"></i></button></div>
            <div className="grid grid-cols-1 gap-4">
                {[0, 1, 2, 3, 4].map(slotId => {
                    const save = profile.saveSlots?.[slotId];
                    return (
                        <div key={slotId} className="flex items-center gap-4 bg-slate-800 p-4 rounded border border-slate-700">
                            <div className="flex-1">{save ? <><div className="font-bold text-white">{save.saveName}</div><div className="text-xs text-slate-400">{new Date(save.savedAt).toLocaleString()}</div></> : <div className="text-slate-500 italic">Empty Slot {slotId + 1}</div>}</div>
                            {mode === 'SAVE' && <button onClick={() => onAction(slotId)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold">{save ? 'Overwrite' : 'Save'}</button>}
                            {mode === 'LOAD' && save && <><button onClick={() => onAction(slotId)} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-sm font-bold">Load</button>{onDelete && <button onClick={() => onDelete(slotId)} className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded text-sm"><i className="fa-solid fa-trash"></i></button>}</>}
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
);

const CardListModal: React.FC<{ title: string; cards: Card[]; onClose: () => void; emptyMessage?: string; onSelect?: (card: Card) => void; }> = ({ title, cards, onClose, emptyMessage, onSelect }) => (
    <div className="fixed inset-0 z-[150] bg-black/90 flex flex-col p-8">
        <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-serif text-white">{title}</h2><button onClick={onClose}><i className="fa-solid fa-xmark text-3xl text-slate-500 hover:text-white"></i></button></div>
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 pb-10">
            {cards.length === 0 && <div className="col-span-full text-center text-slate-500 text-xl">{emptyMessage || "No cards."}</div>}
            {cards.map((card, i) => (<div key={i} className={onSelect ? "cursor-pointer hover:scale-105 transition-transform" : ""}><CardComponent card={card} onClick={onSelect || (() => {})} canPlay={false} disabled={!onSelect} /></div>))}
        </div>
    </div>
);

const RewardScreen: React.FC<{ onReturn: () => void; onAddCard: (c: Card) => void; vocabList: Vocabulary[]; goldBreakdown: GoldBreakdown; shardsReward: number; droppedRelic: Relic | null; }> = ({ onReturn, onAddCard, vocabList, goldBreakdown, shardsReward, droppedRelic }) => {
    const [options, setOptions] = useState<Card[]>([]);
    useEffect(() => { setOptions(getRandomRewardOptions(vocabList)); }, []);
    const handlePick = (card: Card) => { onAddCard(card); onReturn(); };
    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-8">
            <h2 className="text-4xl font-serif text-yellow-500 mb-6">Victory!</h2>
            
            {/* Gold Breakdown Receipt */}
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-600 mb-8 w-full max-w-sm shadow-xl">
                <h3 className="text-slate-400 text-sm uppercase tracking-widest border-b border-slate-600 pb-2 mb-4">Combat Rewards</h3>
                <div className="space-y-2 mb-4 font-mono text-sm">
                    <div className="flex justify-between text-slate-300">
                        <span>Base Drop</span>
                        <span>{goldBreakdown.base} G</span>
                    </div>
                    {goldBreakdown.bounty > 0 && (
                        <div className="flex justify-between text-yellow-300">
                            <span>Bounty ({goldBreakdown.bountyCount}x)</span>
                            <span>+{goldBreakdown.bounty} G</span>
                        </div>
                    )}
                    {goldBreakdown.isPerfect && (
                        <div className="flex justify-between text-purple-300">
                            <span>Perfect Clear</span>
                            <span>+{goldBreakdown.perfect} G</span>
                        </div>
                    )}
                    {goldBreakdown.multiplier > 1 && (
                        <div className="flex justify-between text-green-400 border-t border-slate-600 pt-2">
                            <span>Early Bird Bonus</span>
                            <span>x{goldBreakdown.multiplier}</span>
                        </div>
                    )}
                </div>
                <div className="flex justify-between items-center text-xl font-bold border-t-2 border-yellow-600 pt-3">
                    <span className="text-white">TOTAL</span>
                    <span className="text-yellow-400 flex items-center gap-2"><i className="fa-solid fa-coins"></i> {goldBreakdown.total}</span>
                </div>
                {shardsReward > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-600 flex justify-between items-center text-lg font-bold text-purple-400">
                        <span>Star Shards</span>
                        <span className="flex items-center gap-2"><i className="fa-solid fa-star"></i> {shardsReward}</span>
                    </div>
                )}
                {droppedRelic && (
                    <div className="mt-4 pt-4 border-t border-slate-600">
                        <div className="text-blue-300 font-bold mb-2">Relic Found!</div>
                        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded border border-blue-500/50">
                            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-600">
                                <i className={`fa-solid ${droppedRelic.icon} text-blue-400`}></i>
                            </div>
                            <div className="text-left">
                                <div className="text-white text-sm font-bold">{droppedRelic.name}</div>
                                <div className="text-xs text-slate-400">{droppedRelic.description}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="text-2xl text-slate-300 mb-6">Choose a card to add to your deck:</div>
            <div className="flex gap-6 mb-12">{options.map((card, i) => (<div key={i} className="hover:scale-110 transition-transform cursor-pointer" onClick={() => handlePick(card)}><CardComponent card={card} onClick={() => handlePick(card)} canPlay={false} disabled={false} /></div>))}</div>
            <button onClick={onReturn} className="px-8 py-3 border border-slate-500 rounded text-slate-400 hover:text-white hover:border-white">Skip</button>
        </div>
    );
};

const ShopScreen: React.FC<{ player: Player; shopState: ShopState; onLeave: () => void; onPurchase: (item: ShopItem) => void; }> = ({ player, shopState, onLeave, onPurchase }) => (
    <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4"><h2 className="text-4xl font-serif text-yellow-500">Merchant</h2><div className="text-2xl text-yellow-400 font-bold flex items-center gap-2"><i className="fa-solid fa-coins"></i> {player.gold}</div></div>
        <div className="flex-1 max-w-6xl mx-auto w-full">
            <div className="mb-8"><h3 className="text-xl text-slate-400 mb-4 uppercase tracking-widest">Cards</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-6">{shopState.items.filter(i => i.type === 'CARD').map(item => (<div key={item.id} className="relative flex flex-col items-center gap-2"><CardComponent card={item.data as Card} onClick={()=>{}} canPlay={false} disabled={item.isSold} />{!item.isSold ? (<button onClick={() => onPurchase(item)} className="px-4 py-1 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded shadow disabled:opacity-50">{item.price} G</button>) : <span className="text-red-500 font-bold">SOLD</span>}</div>))}</div></div>
            <div className="mb-8"><h3 className="text-xl text-slate-400 mb-4 uppercase tracking-widest">Relics & Services</h3><div className="flex gap-8">{shopState.items.filter(i => i.type === 'RELIC').map(item => { const r = item.data as Relic; return (<div key={item.id} className="flex flex-col items-center gap-2 bg-slate-800 p-4 rounded border border-slate-600 w-48"><div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-500 mb-2"><i className={`fa-solid ${r.icon} text-3xl text-slate-300`}></i></div><div className="font-bold text-center">{r.name}</div><div className="text-xs text-center text-slate-400 h-10">{r.description}</div>{!item.isSold ? (<button onClick={() => onPurchase(item)} className="mt-2 px-4 py-1 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded">{item.price} G</button>) : <span className="text-red-500 font-bold">SOLD</span>}</div>); })}{shopState.items.filter(i => i.type === 'REMOVE').map(item => (<div key={item.id} className="flex flex-col items-center gap-2 bg-slate-800 p-4 rounded border border-slate-600 w-48"><div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-500 mb-2"><i className="fa-solid fa-ban text-3xl text-red-500"></i></div><div className="font-bold text-center">Purge Card</div><div className="text-xs text-center text-slate-400 h-10">Remove a card from your deck.</div>{!item.isSold ? (<button onClick={() => onPurchase(item)} className="mt-2 px-4 py-1 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded">{item.price} G</button>) : <span className="text-red-500 font-bold">SOLD</span>}</div>))}</div></div>
        </div>
        <div className="mt-auto flex justify-center pt-8"><button onClick={onLeave} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xl rounded shadow-lg border border-slate-500">Leave Shop</button></div>
    </div>
);

const SanctumScreen: React.FC<{ profile: UserProfile; onUpdateProfile: (updates: Partial<UserProfile>, unlock?: string) => void; onClose: () => void; }> = ({ profile, onUpdateProfile, onClose }) => (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col p-8 overflow-y-auto" style={{background: 'radial-gradient(circle at center, #2e1065 0%, #000000 100%)'}}>
        <div className="flex justify-between items-center mb-10 max-w-6xl mx-auto w-full"><div><h2 className="text-5xl font-serif text-purple-400 mb-2">The Sanctum</h2><p className="text-purple-200">Spend Star Shards to permanently empower your future selves.</p></div><div className="text-right"><div className="text-4xl text-yellow-400 font-bold"><i className="fa-solid fa-star"></i> {profile.currency}</div><button onClick={onClose} className="mt-4 text-slate-400 hover:text-white underline">Return to Menu</button></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto w-full">{SANCTUM_UPGRADES.map(upgrade => { const isUnlocked = profile.unlocks.includes(upgrade.id); const canAfford = profile.currency >= upgrade.cost; return (<div key={upgrade.id} className={`p-6 rounded-xl border-2 flex flex-col items-center text-center transition-all ${isUnlocked ? 'bg-purple-900/20 border-purple-500/50' : 'bg-slate-900 border-slate-700'}`}><div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4 ${isUnlocked ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.5)]' : 'bg-slate-800 text-slate-500'}`}><i className={`fa-solid ${upgrade.icon}`}></i></div><h3 className={`text-xl font-bold mb-2 ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>{upgrade.name}</h3><p className="text-sm text-slate-400 mb-6 h-10">{upgrade.desc}</p>{isUnlocked ? (<div className="mt-auto text-green-400 font-bold uppercase tracking-widest text-sm py-2"><i className="fa-solid fa-check mr-1"></i> Active</div>) : (<button onClick={() => { if(canAfford) { onUpdateProfile({ currency: profile.currency - upgrade.cost }, upgrade.id); audioService.playPurchaseSFX(); } else { audioService.playErrorSFX(); } }} className={`mt-auto w-full py-2 rounded font-bold transition-all ${canAfford ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>Unlock ({upgrade.cost})</button>)}</div>); })}</div>
    </div>
);

// --- MAIN APP ---

const App: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [phase, setPhase] = useState<GamePhase>('PROFILE_SELECT');
  const [pendingPhase, setPendingPhase] = useState<GamePhase | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [overlayView, setOverlayView] = useState<OverlayView>('NONE');
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);

  const [currentVocabList, setCurrentVocabList] = useState<Vocabulary[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [previewCards, setPreviewCards] = useState<Card[]>([]);
  const [libraryView, setLibraryView] = useState<'DECK' | 'VOCAB'>('DECK');
  const [wrongAnswers, setWrongAnswers] = useState<Vocabulary[]>([]);

  const [currentAct, setCurrentAct] = useState(1);
  const [gameMap, setGameMap] = useState<MapNode[]>([]);
  const [mapSeed, setMapSeed] = useState<number>(Date.now()); // State for Map Seed
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [activeStory, setActiveStory] = useState<{title: string, story: string, icon: string, color: string} | null>(null);
  
  const [deck, setDeck] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [drawPile, setDrawPile] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | null>(null);
  const [turnCount, setTurnCount] = useState<number>(1);
  const [battlesWon, setBattlesWon] = useState<number>(0);
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(true);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Tutorial State
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);

  // Rewards State
  const [rewardShards, setRewardShards] = useState(0);
  const [goldBreakdown, setGoldBreakdown] = useState<GoldBreakdown>({
      base: 0, bounty: 0, bountyCount: 0, perfect: 0, isPerfect: false, multiplier: 1, total: 0
  });
  const [rewardRelic, setRewardRelic] = useState<Relic | null>(null);

  // Combat Perf Tracking
  const [combatStats, setCombatStats] = useState<CombatStats>({ damageTaken: 0, mistakes: 0, hints: 0, bountyPlayed: 0 });

  const [lastStandWords, setLastStandWords] = useState<Vocabulary[]>([]);
  const [lastStandIndex, setLastStandIndex] = useState(0);

  const [shopState, setShopState] = useState<ShopState>({ items: [], removeCost: 50 });
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  const [eventResult, setEventResult] = useState<EventResult | null>(null);
  
  const [playerAnim, setPlayerAnim] = useState<'' | 'attack' | 'hit'>('');
  const [enemyAnim, setEnemyAnim] = useState<'' | 'attack' | 'hit'>('');
  const [damageNumbers, setDamageNumbers] = useState<DamageText[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const newProfileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getBackgroundImage = (p: GamePhase) => {
    if (p === 'MAP' || p === 'COMBAT') {
        const actConfig = DungeonManager ? DungeonManager.getActConfig(currentAct) : ACTS[0];
        return actConfig?.background || IMAGES.BACKGROUNDS.MAP;
    }
    switch (p) {
        case 'MENU': return IMAGES.BACKGROUNDS.MENU;
        case 'SHOP': return IMAGES.BACKGROUNDS.SHOP;
        case 'CAMPFIRE': return IMAGES.BACKGROUNDS.CAMPFIRE;
        case 'LIBRARY': return IMAGES.BACKGROUNDS.LIBRARY;
        case 'MASTERY_VIEW': return IMAGES.BACKGROUNDS.LIBRARY;
        case 'LAST_STAND': return 'radial-gradient(circle at center, #450a0a 0%, #000000 100%)';
        case 'ACT_TRANSITION': return '#000000';
        default: return IMAGES.BACKGROUNDS.MENU;
    }
  };

  const getCharacterImage = (packId: string | null) => {
      switch(packId) {
          case 'scholar': return IMAGES.CHARACTERS.SCHOLAR;
          case 'merchant': return IMAGES.CHARACTERS.MERCHANT;
          case 'traveler': return IMAGES.CHARACTERS.TRAVELER;
          case 'diplomat': return IMAGES.CHARACTERS.DIPLOMAT;
          case 'artist': return IMAGES.CHARACTERS.ARTIST;
          case 'engineer': return IMAGES.CHARACTERS.ENGINEER;
          default: return IMAGES.CHARACTERS.DEFAULT;
      }
  };

  useEffect(() => {
    const loaded = saveManager.getAllProfiles();
    setProfiles(loaded);
    audioService.initAudioContext();
  }, []);

  const handleVictory = () => {
      // Tutorial Finish Check
      if (tutorialActive) {
          handleTutorialSkip();
          return; // Skip normal victory logic for tutorial to avoid messing with save state/gold
      }

      if (!currentEnemy || !player || !currentProfile) return;
      audioService.playVictorySFX();
      
      const hasBurningBlood = player.relics.some(r => r.id === 'burning_blood');
      let newHp = player.hp;
      if (hasBurningBlood) {
          newHp = Math.min(player.maxHp, player.hp + 6);
          spawnDamageText("+6 HP", "40%", "40%", "#22c55e");
      }

      // --- A. GOLD CALCULATION ---
      const baseGold = Math.floor(Math.random() * 6) + 15 + currentAct; 
      const bountyGold = combatStats.bountyPlayed * 15;
      const isPerfect = combatStats.damageTaken === 0 && combatStats.mistakes === 0 && combatStats.hints === 0;
      const perfectGold = isPerfect ? 30 : 0;
      
      let totalGold = baseGold + bountyGold + perfectGold;
      let multiplier = 1;

      // Early Bird Bonus (Act 1, first 3 battles)
      if (currentAct === 1 && battlesWon < 3) {
          multiplier = 2;
          totalGold *= multiplier;
      }

      // --- ELITE/BOSS RELIC DROP ---
      let droppedRelic: Relic | null = null;
      if (currentEnemy.type === 'ELITE' || currentEnemy.type === 'BOSS') {
          // Find relics the player doesn't have
          const candidates = ALL_RELICS.filter(r => !player.relics.some(pr => pr.id === r.id));
          if (candidates.length > 0) {
               // Prioritize RARE if available, else random
               const rares = candidates.filter(r => r.rarity === 'RARE');
               const pool = rares.length > 0 ? rares : candidates;
               droppedRelic = pool[Math.floor(Math.random() * pool.length)];
          }
      }

      // --- B. DEBUG LOGS: BEFORE ---
      console.log(`[GoldFix] 结算前金币: ${player.gold}`);
      console.log(`[GoldFix] 本局赢得: ${totalGold}`);

      // --- C. CORE: DIRECT MODIFY & D. FORCE SAVE ---
      // We calculate the new player state completely here to avoid React async state closure issues when saving.
      const updatedPlayer: Player = { 
          ...player, 
          hp: newHp, 
          gold: player.gold + totalGold,
          relics: droppedRelic ? [...player.relics, droppedRelic] : player.relics
      };
      
      // Update React State for UI
      setPlayer(updatedPlayer);
      setGoldBreakdown({
          base: baseGold,
          bounty: bountyGold,
          bountyCount: combatStats.bountyPlayed,
          perfect: perfectGold,
          isPerfect,
          multiplier,
          total: totalGold
      });
      setRewardRelic(droppedRelic);

      // --- SHARD LOGIC (Merged into save to ensure atomicity) ---
      let shards = 0;
      let newCurrency = currentProfile.currency || 0;
      let newActsCleared = [...currentProfile.actsCleared];
      
      if (currentEnemy.type === 'BOSS') {
          shards += 30; 
          if (!newActsCleared.includes(currentAct)) {
              shards += 200;
              newActsCleared.push(currentAct);
              spawnDamageText("+200 Shards (First Clear!)", "50%", "20%", "#a855f7");
          }
      }
      newCurrency += shards;
      setRewardShards(shards);

      // --- E. DEBUG & SAVE: FORCE WRITE TO STORAGE ---
      // Construct the full save state manually to ensure it uses the NEW gold value immediately.
      const stateToSave: RunState = {
          saveName: `${activeStory?.title || 'Adventure'} - Act ${currentAct} - Floor ${currentNodeId ? currentNodeId.split('_')[1] : 0}`,
          savedAt: Date.now(),
          player: updatedPlayer, // Uses the updated gold
          deck, gameMap, currentMapNodeId: currentNodeId, phase: 'REWARD', turnCount,
          act: currentAct, battlesWon: battlesWon + 1, // Increment battle count
          hand, drawPile, discardPile, currentEnemy, isPlayerTurn,
          vocabPackId: selectedPackId,
          shopState: phase === 'SHOP' ? shopState : null,
          mapSeed,
          visitedNodeIds: gameMap.filter(n => n.status === 'COMPLETED').map(n => n.id)
      };

      // 1. Save Run
      saveManager.saveRun(currentProfile.id, stateToSave, 0); // Slot 0 is auto-save
      
      // 2. Update Profile (Currency/Shards)
      const updatedProfile = { 
          ...currentProfile, 
          currency: newCurrency, 
          actsCleared: newActsCleared,
          saveSlots: { ...currentProfile.saveSlots, [0]: stateToSave } // sync memory
      };
      setCurrentProfile(updatedProfile);
      saveManager.updateProfile(updatedProfile);

      console.log(`[GoldFix] 结算并保存后金币: ${updatedPlayer.gold}`);
      console.log(`[GoldFix] 存档已强制写入: save_slot_0`);

      // Update local tracking
      setBattlesWon(prev => prev + 1);

      // Map Updates
      if (currentNodeId) {
          setGameMap(prev => {
              const newMap = [...prev];
              const node = newMap.find(n => n.id === currentNodeId);
              if (node) node.status = 'COMPLETED';
              if (node) {
                 node.next.forEach(nid => {
                     const nextNode = newMap.find(n => n.id === nid);
                     if (nextNode) nextNode.status = 'AVAILABLE';
                 });
              }
              return newMap;
          });
      }

      if (currentEnemy.type === 'BOSS') {
          setTimeout(() => setPhase('ACT_TRANSITION'), 1500);
      } else {
          setPhase('REWARD');
      }
  };

  const handleNextAct = () => {
      const nextActIndex = currentAct + 1;
      if (nextActIndex > 3) { setPhase('GAME_OVER'); return; }
      setCurrentAct(nextActIndex);
      setPlayer(p => p ? { ...p, hp: Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.5)) } : null);
      
      const newSeed = Date.now();
      setMapSeed(newSeed);
      setGameMap(generateMap(newSeed)); 
      setCurrentNodeId(null);
      setPhase('MAP'); 
      audioService.playBGM('MAP');
      saveGame(0);
  };

  useEffect(() => {
      if (phase === 'COMBAT' && currentEnemy && currentEnemy.hp <= 0) {
          handleVictory();
      }
  }, [currentEnemy, phase]);

  useEffect(() => {
    if (phase === 'LIBRARY' && selectedPackId && currentVocabList.length > 0) {
      const starterDeck = getClassStarterDeck(selectedPackId, currentVocabList);
      setPreviewCards(starterDeck);
    }
  }, [phase, selectedPackId, currentVocabList]);

  useEffect(() => {
    if (phase === 'MAP' && mapContainerRef.current) {
        if (!currentNodeId) {
            mapContainerRef.current.scrollTop = mapContainerRef.current.scrollHeight;
        } else {
             const node = gameMap.find(n => n.id === currentNodeId);
             if (node) {
                 const ratio = node.y / 15;
                 mapContainerRef.current.scrollTop = mapContainerRef.current.scrollHeight * (1 - ratio) - 300;
             }
        }
        // Force refresh log
        if (player) console.log(`[GoldFix] 地图加载时读取的金币: ${player.gold}`);
    }
  }, [phase, currentNodeId]);

  const triggerAnimation = (target: 'player' | 'enemy', type: 'attack' | 'hit') => {
    if (target === 'player') {
       setPlayerAnim(type);
       setTimeout(() => setPlayerAnim(''), 400); 
    } else {
       setEnemyAnim(type);
       setTimeout(() => setEnemyAnim(''), 400);
    }
  };

  const spawnDamageText = (amount: number | string, x: string, y: string, color: string) => {
    const id = Date.now() + Math.random();
    setDamageNumbers(prev => [...prev, { id, text: amount.toString(), x, y, color }]);
    setTimeout(() => {
       setDamageNumbers(prev => prev.filter(d => d.id !== id));
    }, 1200);
  };

  const checkDeath = (currentHp: number, maxHp: number) => {
      if (currentHp <= 0) {
          setPhase('LAST_STAND');
          let pool = [...wrongAnswers];
          if (pool.length < 3) {
              const hardFillers = currentVocabList.filter(v => v.word.length > 7);
              while (pool.length < 3 && hardFillers.length > 0) {
                  pool.push(hardFillers[Math.floor(Math.random() * hardFillers.length)]);
              }
              while (pool.length < 3) {
                  pool.push(currentVocabList[Math.floor(Math.random() * currentVocabList.length)]);
              }
          }
          pool = pool.sort(() => Math.random() - 0.5).slice(0, 3);
          setLastStandWords(pool);
          setLastStandIndex(0);
          audioService.stopBGM();
      }
  };

  const handleProfileCreate = () => {
     if (!newProfileName.trim()) return;
     const newP = saveManager.createProfile(newProfileName);
     setProfiles(saveManager.getAllProfiles());
     setCurrentProfile(newP);
     setIsCreatingProfile(false);
     setNewProfileName('');
     setPhase('MENU');
  };

  const handleSelectPack = (packId: string) => {
     setSelectedPackId(packId);
     const pack = PRESET_PACKS.find(p => p.id === packId);
     if (pack && currentProfile) {
        const processedVocab = saveManager.applyMasteryToVocab(currentProfile, pack.words);
        setCurrentVocabList(processedVocab);
        setActiveStory({ title: pack.name, story: pack.introStory, icon: pack.icon, color: pack.color });
     }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let parsedVocab: Vocabulary[] = [];
        if (file.name.endsWith('.json')) {
           const json = JSON.parse(content);
           if (Array.isArray(json)) {
              parsedVocab = json.map((item: any) => ({
                 id: item.word?.toLowerCase() || Math.random().toString(),
                 word: item.word || 'Unknown',
                 phonetic: item.phonetic || '/.../',
                 meaning: item.meaning || '',
                 difficulty: (item.word?.length || 0) > 7 ? 'long' : 'medium',
                 masteryStreak: 0,
                 proficiency: 0,
                 failStreak: 0,
                 nextReview: 0,
                 isRetest: false,
                 isActive: false
              }));
           }
        } else {
           const lines = content.split(/\r?\n/);
           parsedVocab = lines.filter(l => l.trim()).map(line => {
              const parts = line.split(/,|;|\t/);
              const word = parts[0]?.trim();
              const meaning = parts[1]?.trim();
              if (!word) return null;
              return {
                 id: word.toLowerCase(),
                 word: word,
                 phonetic: '/.../',
                 meaning: meaning || '',
                 difficulty: word.length > 7 ? 'long' : 'medium',
                 masteryStreak: 0,
                 proficiency: 0,
                 failStreak: 0,
                 nextReview: 0,
                 isRetest: false,
                 isActive: false
              };
           }).filter(v => v !== null) as Vocabulary[];
        }
        if (parsedVocab.length > 0) {
            if (currentProfile) {
                parsedVocab = saveManager.applyMasteryToVocab(currentProfile, parsedVocab);
            }
            setCurrentVocabList(parsedVocab);
            setSelectedPackId('custom');
            setActiveStory({
                title: 'The Outlander',
                story: 'You arrive from a distant land, clutching a tome of strange words.',
                icon: 'fa-file-import',
                color: 'text-gray-200'
            });
            audioService.playSuccessSFX();
        } else {
            alert("No valid vocabulary found.");
        }
      } catch (err) {
        alert("Failed to parse file.");
      }
    };
    reader.readAsText(file);
  };

  const handleStartRun = () => {
    if (!currentProfile || !selectedPackId) return;
    
    // Tutorial Check
    if (!currentProfile.hasCompletedTutorial) {
        setShowTutorialPrompt(true);
        return; // Wait for user decision
    }

    startRunLogic();
  };

  const startRunLogic = (forceTutorial: boolean = false) => {
    if (!currentProfile || !selectedPackId) return;

    let packWords = currentVocabList;
    const mergedVocabList = saveManager.applyMasteryToVocab(currentProfile, packWords);
    let starterDeck = generateSessionDeck(selectedPackId, mergedVocabList);
    
    // --- TUTORIAL DECK OVERRIDE ---
    if (forceTutorial) {
        // Guaranteed short words for tutorial to ensure 0 energy cost
        const tVocab = (w: string, m: string) => ({ id: w, word: w, phonetic: `/${w}/`, meaning: m, difficulty: 'easy' as const, masteryStreak: 0, proficiency: 0, failStreak: 0, isRetest: false, nextReview: 0 });
        
        starterDeck = [
            createCard('DEFENSE', tVocab('Safe', 'Safe')),
            createCard('DEFENSE', tVocab('Hold', 'Hold')),
            createCard('ATTACK', tVocab('Zap', 'Strike')), // Index 2 - Target
            createCard('DEFENSE', tVocab('Stay', 'Stay')),
            createCard('DEFENSE', tVocab('Calm', 'Calm'))
        ];
    }

    setDeck(starterDeck);
    setCurrentVocabList(mergedVocabList);
    setWrongAnswers([]);
    setCurrentAct(1); 
    setBattlesWon(0);

    let maxHp = 70;
    let startGold = 0;
    let str = 0;
    let revivals = 0;
    let maxEnergy = 3;
    let shopDiscount = 0;
    if (currentProfile.unlocks.includes('bonus_hp')) maxHp += 15;
    if (currentProfile.unlocks.includes('bonus_gold')) startGold += 100;
    if (currentProfile.unlocks.includes('bonus_str')) str += 1;
    if (currentProfile.unlocks.includes('bonus_revive')) revivals += 1;
    if (currentProfile.unlocks.includes('bonus_energy')) maxEnergy += 1;
    if (currentProfile.unlocks.includes('shop_discount')) shopDiscount = 0.2;

    const newPlayer: Player = {
        hp: maxHp, maxHp, block: 0, gold: startGold,
        energy: maxEnergy, maxEnergy,
        status: { poison: 0, weak: 0, vulnerable: 0, strength: str },
        relics: [], revivals, shopDiscount,
        combo: 0,
        nextTurnEnergy: 0
    };

    setPlayer(newPlayer);
    
    const seed = Date.now();
    setMapSeed(seed);
    setGameMap(generateMap(seed));
    
    setCurrentNodeId(null);
    setPhase('STORY_INTRO');
    audioService.playBGM('MENU');

    if (forceTutorial) {
        setTutorialActive(true);
        setTutorialStep(0);
    }
  };

  const proceedToMap = () => {
     setPhase('MAP');
     audioService.playBGM('MAP');
     setRewardRelic(null);
     
     // Special Tutorial Logic: Skip map if tutorial is active, go straight to combat
     if (tutorialActive) {
         const dummyNode: MapNode = {
             id: 'tutorial_node', x: 50, y: 0, type: 'MONSTER', status: 'AVAILABLE', next: [], parents: []
         };
         startCombat(dummyNode);
     } else {
         saveGame(0);
     }
  };

  // --- TUTORIAL LOGIC ---
  const handleTutorialNext = () => {
      if (tutorialStep < TUTORIAL_STEPS.length - 1) {
          setTutorialStep(prev => prev + 1);
          // Auto complete "Good Luck" step
          if (TUTORIAL_STEPS[tutorialStep + 1].id === 6) {
              setTimeout(() => handleTutorialSkip(), 3000);
          }
      } else {
          handleTutorialSkip();
      }
  };

  const handleTutorialSkip = () => {
      setTutorialActive(false);
      setTutorialStep(0);
      if (currentProfile) {
          const updated = { ...currentProfile, hasCompletedTutorial: true };
          setCurrentProfile(updated);
          saveManager.updateProfile(updated);
      }
      setPhase('MAP'); // Return to map after tutorial
      audioService.playBGM('MAP');
  };

  const getTutorialDimStyle = (targetId: string | null) => {
      if (!tutorialActive) return {};
      const currentStep = TUTORIAL_STEPS[tutorialStep];
      // If we are on a step that has a target, dim everything except that target
      if (currentStep?.target && currentStep.target !== targetId) {
          return { filter: 'grayscale(100%)', opacity: 0.3, pointerEvents: 'none' as const };
      }
      return { filter: 'none', opacity: 1, pointerEvents: 'auto' as const };
  };

  const saveGame = (slotId: number) => {
    if (!currentProfile || !player) return;
    const state: RunState = {
        saveName: `${activeStory?.title || 'Adventure'} - Act ${currentAct} - Floor ${currentNodeId ? currentNodeId.split('_')[1] : 0}`,
        savedAt: Date.now(),
        player, deck, gameMap, currentMapNodeId: currentNodeId, phase, turnCount,
        act: currentAct,
        hand, drawPile, discardPile, currentEnemy, isPlayerTurn,
        vocabPackId: selectedPackId,
        shopState: phase === 'SHOP' ? shopState : null,
        mapSeed,
        visitedNodeIds: gameMap.filter(n => n.status === 'COMPLETED').map(n => n.id),
        battlesWon // Save battle progress
    };
    saveManager.saveRun(currentProfile.id, state, slotId);
    saveManager.syncMastery(currentProfile.id, currentVocabList);
    spawnDamageText("Game Saved", "50%", "50%", "#4ade80");
    audioService.playSuccessSFX();
    setCurrentProfile({...currentProfile, saveSlots: {...currentProfile.saveSlots, [slotId]: state}});
  };

  const loadGame = (slotId: number) => {
      if (!currentProfile) return;
      const run = currentProfile.saveSlots?.[slotId];
      if (!run) return;
      setPlayer(run.player);
      setDeck(run.deck);
      setBattlesWon(run.battlesWon || 0); // Restore battle count
      
      setMapSeed(run.mapSeed);
      initSeed(run.mapSeed);
      const rawMap = generateMap(run.mapSeed);
      const restoredMap = rehydrateMap(rawMap, run.visitedNodeIds || [], run.currentMapNodeId);
      setGameMap(restoredMap);
      
      setCurrentNodeId(run.currentMapNodeId);
      setCurrentAct(run.act || 1);
      setPendingPhase(run.phase);
      setPhase('MASTERY_VIEW');
      setTurnCount(run.turnCount);
      setHand(run.hand);
      setDrawPile(run.drawPile);
      setDiscardPile(run.discardPile);
      setCurrentEnemy(run.currentEnemy);
      setIsPlayerTurn(run.isPlayerTurn);
      setSelectedPackId(run.vocabPackId);
      setWrongAnswers([]); 
      if (run.shopState) setShopState(run.shopState);
      const pack = PRESET_PACKS.find(p => p.id === run.vocabPackId);
      if (pack) {
         setCurrentVocabList(saveManager.applyMasteryToVocab(currentProfile, pack.words));
         setActiveStory({ title: pack.name, story: pack.introStory, icon: pack.icon, color: pack.color });
      } else if (run.vocabPackId === 'custom' && run.customVocabList) {
         setCurrentVocabList(saveManager.applyMasteryToVocab(currentProfile, run.customVocabList));
      }
      setShowLoadModal(false);
  };

  const continueFromMasteryView = () => {
      if (!pendingPhase) return;
      setPhase(pendingPhase);
      const bgmTrack = pendingPhase === 'COMBAT' ? (currentEnemy?.type === 'BOSS' ? 'BOSS' : 'COMBAT') : (pendingPhase === 'SHOP' ? 'SHOP' : (pendingPhase === 'CAMPFIRE' ? 'MEDITATION' : 'MAP'));
      audioService.playBGM(bgmTrack as any);
      setPendingPhase(null);
  };

  const handleExitGame = () => {
      setPhase('MENU');
      setPlayer(null);
      setCurrentEnemy(null);
      setShowSettings(false);
      audioService.playBGM('MENU');
  };

  const handleNodeSelect = (node: MapNode) => {
     if (tutorialActive) return; // Disable map movement during tutorial (though map is skipped)

     setCurrentNodeId(node.id);
     const newMap = [...gameMap];
     const siblings = newMap.filter(n => n.y === node.y && n.id !== node.id && n.status === 'AVAILABLE');
     siblings.forEach(s => s.status = 'UNREACHABLE');
     const target = newMap.find(n => n.id === node.id);
     if(target) target.status = 'COMPLETED';
     node.next.forEach(nextId => {
         const nextNode = newMap.find(n => n.id === nextId);
         if(nextNode) nextNode.status = 'AVAILABLE';
     });
     setGameMap(newMap);

     if (node.type === 'MONSTER' || node.type === 'ELITE' || node.type === 'BOSS' || node.type === 'START') {
         startCombat(node);
     } else if (node.type === 'TREASURE') {
         setPhase('REWARD');
         setGoldBreakdown({ base: 50, bounty: 0, bountyCount: 0, perfect: 0, isPerfect: false, multiplier: 1, total: 50 });
         setRewardShards(0);
         setPlayer(prev => prev ? {...prev, gold: prev.gold + 50} : null);
         audioService.playPurchaseSFX();
     } else if (node.type === 'CAMPFIRE') {
         setPhase('CAMPFIRE');
         audioService.playBGM('MEDITATION');
     } else if (node.type === 'SHOP') {
         enterShop();
     } else if (node.type === 'EVENT') {
         startEvent();
     }
  };

  // --- REST SITE LOGIC ---
  const handleRestSleep = () => {
      if (!player || !currentProfile) return;
      
      const healAmount = Math.floor(player.maxHp * 0.3);
      const newHp = Math.min(player.maxHp, player.hp + healAmount);
      const updatedPlayer = { ...player, hp: newHp };
      
      setPlayer(updatedPlayer);
      spawnDamageText(`+${healAmount} HP`, "50%", "50%", "#22c55e");
      audioService.playBuffSFX();

      // Force Save & Leave
      const stateToSave: RunState = {
          saveName: `${activeStory?.title || 'Adventure'} - Act ${currentAct} - Floor ${currentNodeId ? currentNodeId.split('_')[1] : 0}`,
          savedAt: Date.now(),
          player: updatedPlayer,
          deck, gameMap, currentMapNodeId: currentNodeId, phase: 'MAP', turnCount,
          act: currentAct, battlesWon,
          hand: [], drawPile: [], discardPile: [], currentEnemy: null, isPlayerTurn: true,
          vocabPackId: selectedPackId, mapSeed, 
          visitedNodeIds: gameMap.filter(n => n.status === 'COMPLETED').map(n => n.id)
      };
      
      saveManager.saveRun(currentProfile.id, stateToSave, 0);
      setCurrentProfile({ ...currentProfile, saveSlots: { ...currentProfile.saveSlots, [0]: stateToSave } });
      
      setTimeout(() => {
          setPhase('MAP');
          audioService.playBGM('MAP');
      }, 1500);
  };

  const handleRestSmith = () => {
      setOverlayView('REMOVE_CARD');
  };

  const startCombat = (node: MapNode) => {
      setPhase('COMBAT');
      const floor = node.y;
      
      let enemy: Enemy;
      
      if (tutorialActive) {
          // TUTORIAL: Fixed Weak Enemy
          enemy = {
              id: 'dummy',
              name: 'Training Dummy',
              type: 'NORMAL',
              tier: 'WEAK',
              hp: 20,
              maxHp: 20,
              block: 0,
              status: {},
              intent: { type: 'UNKNOWN', value: 0 },
              image: 'https://image.pollinations.ai/prompt/cute%20straw%20training%20dummy%20rpg%20game%20asset?width=512&height=512&nologo=true'
          };
      } else {
          // NORMAL: Random Generation
          enemy = DungeonManager.generateEnemyForFloor(currentAct, floor, node.type === 'BOSS' ? 'BOSS' : (node.type === 'ELITE' ? 'ELITE' : 'MONSTER'));
      }

      setCurrentEnemy(enemy);
      setHand([]);
      setDiscardPile([]);
      setPendingAction(null);
      
      let initialDrawPile: Card[] = [];
      let finalDeck: Card[] = [];

      if (tutorialActive) {
          // TUTORIAL FIX: Do not shuffle the deck. Use it as is (crafted in startRunLogic)
          finalDeck = [...deck];
          initialDrawPile = [...deck]; 
      } else {
          // Normal Game: Balance and Shuffle
          const balancedDeck = DungeonManager.cognitiveBalanceDeck(deck, currentVocabList, enemy.tier);
          initialDrawPile = [...balancedDeck].sort(() => Math.random() - 0.5);
          finalDeck = balancedDeck;
      }
      
      setDrawPile(initialDrawPile);
      setDeck(finalDeck); 

      setTurnCount(1);
      setIsPlayerTurn(true);
      setIsDiscarding(false);
      setPlayer(prev => prev ? {...prev, energy: prev.maxEnergy, block: 0, status: {...prev.status, weak:0, vulnerable:0}, combo: 0, nextTurnEnergy: 0} : null);
      setHoveredCardIndex(null);
      
      // Reset Combat Stats
      setCombatStats({ damageTaken: 0, mistakes: 0, hints: 0, bountyPlayed: 0 });
      
      setTimeout(() => {
          drawCards(5, initialDrawPile, [], []); 
      }, 100);
      
      audioService.playBGM(enemy.type === 'BOSS' ? 'BOSS' : 'COMBAT');
  };

  const drawCards = (amount: number, currentDraw = drawPile, currentDiscard = discardPile, currentHand = hand) => {
      let d = [...currentDraw];
      let h = [...currentHand];
      let disc = [...currentDiscard];
      const MAX_HAND_SIZE = 10;

      for(let i=0; i<amount; i++) {
          if (h.length >= MAX_HAND_SIZE) break;
          if (d.length === 0) {
              if (disc.length === 0) break;
              d = [...disc].sort(() => Math.random() - 0.5);
              disc = [];
          }
          const card = d.shift();
          if (card) h.push(card);
      }
      
      setDrawPile(d);
      setHand(h);
      setDiscardPile(disc);
      audioService.playDrawSFX();
  };

  const handleCardClick = (card: Card) => {
     // --- TUTORIAL CONSTRAINT ---
     if (tutorialActive) {
         if (tutorialStep !== 2) {
             audioService.playErrorSFX();
             return;
         }
         // Step 2 is "Play center card". We must ensure we click the right one.
         if (card.type !== 'ATTACK') {
             spawnDamageText("Click the Attack Card!", "50%", "50%", "#fbbf24");
             audioService.playErrorSFX();
             return;
         }
     }

     if (pendingAction?.type === 'DISCARD') {
         setHand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
         setDiscardPile(prev => [...prev, card]);
         const remaining = pendingAction.count - 1;
         if (remaining > 0) {
             setPendingAction({...pendingAction, count: remaining});
             spawnDamageText("Select Another...", "50%", "50%", "#fbbf24");
         } else {
             setPendingAction(null);
             spawnDamageText("Discarded!", "50%", "50%", "#a855f7");
         }
         audioService.playClickSFX();
         return;
     }
     
     if (pendingAction) {
         audioService.playErrorSFX();
         return;
     }
     if (!isPlayerTurn || !player || player.energy < card.energyCost) {
         audioService.playErrorSFX();
         return;
     }
     setActiveCard(card);

     // Fix: Advance tutorial step to 3 (Spelling) immediately so context switches
     if (tutorialActive && tutorialStep === 2) {
         setTutorialStep(3);
     }
  };

  const handleSpellingSuccess = (attempts: number, usedHint: boolean) => {
     if (!activeCard || !player || !currentEnemy) return;
     const cardToPlay = activeCard;
     setActiveCard(null); 

     // --- TUTORIAL ADVANCE ---
     if (tutorialActive && tutorialStep === 3) {
         handleTutorialNext(); // Move to sticky explain
         setTimeout(() => handleTutorialNext(), 4000); // Auto advance Sticky explain after 4s
     }

     // Update Stats
     setCombatStats(prev => ({
         ...prev,
         hints: prev.hints + (usedHint ? 1 : 0),
         bountyPlayed: prev.bountyPlayed + (cardToPlay.isReview ? 1 : 0)
     }));

     setPlayer(p => {
         if (!p) return null;
         return { ...p, energy: Math.max(0, p.energy - cardToPlay.energyCost), combo: p.combo + 1 };
     });

     setHand(prev => prev.filter(c => c.uniqueId !== cardToPlay.uniqueId));

     let multiplier = 1;
     if (usedHint) multiplier *= 0.5;
     if (cardToPlay.isReview) multiplier *= 2;

     if (!usedHint && (cardToPlay.isReview || cardToPlay.vocab.proficiency === 0)) {
         const oldProficiency = cardToPlay.vocab.proficiency;
         const updatedVocab = updateVocabProficiency(cardToPlay.vocab, true);
         const newList = currentVocabList.map(v => v.id === updatedVocab.id ? updatedVocab : v);
         setCurrentVocabList(newList);
         if (updatedVocab.proficiency > oldProficiency) {
             spawnDamageText("Level Up!", "20%", "25%", "#fbbf24");
             audioService.playGoldSFX();
             
             // Mastery Shard Reward Logic
             if (oldProficiency < 5 && updatedVocab.proficiency >= 5 && currentProfile) {
                 const newCurrency = (currentProfile.currency || 0) + 1;
                 const updatedProfile = { ...currentProfile, currency: newCurrency };
                 setCurrentProfile(updatedProfile);
                 saveManager.updateProfile(updatedProfile);
                 spawnDamageText("+1 Shard (Mastery!)", "50%", "15%", "#a855f7");
                 alert(`Mastery Achieved: ${updatedVocab.word}\nObtained +1 Star Shard!`);
             }
         }
     }

     const executions = cardToPlay.doubleCast ? 2 : 1;
     for(let i=0; i<executions; i++) {
         setTimeout(() => {
             applyCardEffect(cardToPlay, multiplier);
             if (executions > 1 && i === 0) spawnDamageText("Double Cast!", "50%", "20%", "#a855f7");
         }, i * 400);
     }

     if (!cardToPlay.isExhaust) {
         const cleansedCard = { ...cardToPlay, debuff: undefined };
         setDiscardPile(prev => [...prev, cleansedCard]);
     }
  };

  const handleSpellingFail = (isFirstAttempt: boolean) => {
      if (!activeCard || !player) return;
      const cardToPlay = activeCard;
      setActiveCard(null); 

      // Update Stats
      setCombatStats(prev => ({ ...prev, mistakes: prev.mistakes + 1 }));

      if (!wrongAnswers.find(v => v.id === cardToPlay.vocab.id)) {
          setWrongAnswers(prev => [...prev, cardToPlay.vocab]);
      }

      setPlayer(p => {
          if (!p) return null;
          return { ...p, combo: 0 };
      });

      setHand(prev => prev.filter(c => c.uniqueId !== cardToPlay.uniqueId));
      spawnDamageText("Sticky!", "20%", "70%", "#fbbf24");
      setDrawPile(prev => [cardToPlay, ...prev]);
  };

  const handleLastStandSuccess = () => {
      if (lastStandIndex < lastStandWords.length - 1) {
          setLastStandIndex(prev => prev + 1);
      } else {
          setPhase('COMBAT');
          setPlayer(p => p ? { ...p, hp: Math.floor(p.maxHp * 0.3) } : null);
          audioService.playVictorySFX();
          audioService.playBGM(currentEnemy?.type === 'BOSS' ? 'BOSS' : 'COMBAT');
          setLastStandWords([]);
          spawnDamageText("LAST STAND SUCCESS!", "50%", "50%", "#facc15");
      }
  };

  const handleLastStandFail = () => {
      setPhase('GAME_OVER');
      if (currentProfile) saveManager.syncMastery(currentProfile.id, currentVocabList);
  };

  const applyCardEffect = (card: Card, multiplier: number) => {
      if (card.procChance && Math.random() < card.procChance) {
         spawnDamageText("Memory Shield!", "30%", "40%", "#60a5fa");
         setPlayer(p => p ? {...p, status: {...p.status, memoryShield: (p.status.memoryShield||0) + 1}} : null);
      }

      let val = Math.floor(card.value * multiplier);
      
      setCurrentEnemy(prevEnemy => {
          if (!prevEnemy) return null;
          let e = { ...prevEnemy };
          let pState = { ...player! };

          if (card.type === 'ATTACK') { 
             let dmg = val + (pState.status.strength || 0);
             if (pState.status.weak > 0) dmg = Math.floor(dmg * 0.75);
             if (e.status.vulnerable > 0) dmg = Math.floor(dmg * 1.5);
             
             const actualDmg = Math.max(0, dmg - e.block);
             const blocked = Math.min(dmg, e.block);
             
             e.hp -= actualDmg;
             e.block -= blocked;
             
             triggerAnimation('player', 'attack');
             setTimeout(() => triggerAnimation('enemy', 'hit'), 200);
             spawnDamageText(actualDmg, "70%", "30%", "#ef4444");
             
             if (card.applyDebuff) {
                 e.status.vulnerable += 1;
                 spawnDamageText("Vulnerable", "70%", "40%", "#a855f7");
             }
             if (card.visualTag === 'FIRE') spawnDamageText("BURN!", "75%", "25%", "#f97316");
          }
          return e;
      });

      setPlayer(prevPlayer => {
          if (!prevPlayer) return null;
          let p = { ...prevPlayer };
          
          if (card.type === 'DEFENSE') {
              let blockVal = val;
              p.block += blockVal;
              spawnDamageText(`+${blockVal} Block`, "30%", "40%", "#60a5fa");
              audioService.playBlockSFX();
              if (card.visualTag === 'ICE') spawnDamageText("FROZEN", "30%", "50%", "#06b6d4");
          } 
          
          if (card.drawEffect) {
              drawCards(card.drawEffect);
              spawnDamageText(`+${card.drawEffect} Cards`, "20%", "40%", "#a855f7");
          }
          
          if (card.energyNextTurn) {
              p.nextTurnEnergy += card.energyNextTurn;
              spawnDamageText(`Charge +${card.energyNextTurn}`, "20%", "30%", "#fbbf24");
          }

          if (card.healValue || card.lifesteal) {
              let heal = (card.healValue || 0);
              if (card.type === 'HEAL' && card.name === 'Rebirth') heal = Math.floor(p.maxHp * 0.5);
              if (card.lifesteal) heal += Math.ceil(val * 0.5); 
              
              if (heal > 0) {
                  p.hp = Math.min(p.maxHp, p.hp + heal);
                  spawnDamageText(`+${heal} HP`, "40%", "40%", "#22c55e");
                  audioService.playBuffSFX();
              }
          }

          if (card.cleanseDebuff) {
              p.status.weak = 0;
              p.status.vulnerable = 0;
              spawnDamageText("Cleansed", "40%", "30%", "#ffffff");
          }
          return p;
      });

      if (card.discardEffect && card.discardEffect > 0) {
          setPendingAction({
              type: 'DISCARD',
              count: card.discardEffect
          });
      }
  };

  const handleEndTurn = () => {
     // --- TUTORIAL CONSTRAINT ---
     if (tutorialActive && tutorialStep !== 5) {
         audioService.playErrorSFX();
         return;
     }
     if (tutorialActive && tutorialStep === 5) {
         handleTutorialNext();
     }

     setIsPlayerTurn(false);
     setHoveredCardIndex(null);
     setIsDiscarding(true); 
     setPendingAction(null);

     setTimeout(() => {
         const cardsInHand = [...hand]; 
         const cardsToRetain: Card[] = [];
         const cardsToDiscard: Card[] = [];

         cardsInHand.forEach(card => {
             const cleanCard = {...card, debuff: undefined};
             if (card.retain) {
                 cardsToRetain.push(card); 
             } else {
                 cardsToDiscard.push(cleanCard);
             }
         });

         setDiscardPile(prev => [...prev, ...cardsToDiscard]);
         setHand(cardsToRetain);
         setIsDiscarding(false); 
         setPlayer(p => p ? {...p, block: 0} : null); 
         handleEnemyTurn();
     }, 600); 
  };

  const handleEnemyTurn = () => {
      if (phase !== 'COMBAT' || !currentEnemy || !player) return;
      const intent = currentEnemy.intent;
      triggerAnimation('enemy', 'attack');
      
      setTimeout(() => {
          if (phase !== 'COMBAT') return;

          if (currentEnemy.tier === 'BOSS' || currentEnemy.tier === 'ELITE') {
              if (Math.random() < 0.3 && hand.length > 0) {
                  const debuffs: CardDebuff[] = ['BLIND', 'RUSH', 'SILENCE'];
                  const chosenDebuff = debuffs[Math.floor(Math.random() * debuffs.length)];
                  setHand(prevHand => {
                      if (prevHand.length === 0) return prevHand;
                      const newHand = [...prevHand];
                      const rIdx = Math.floor(Math.random() * newHand.length);
                      if (chosenDebuff === 'SILENCE') {
                          const highCostIdx = newHand.findIndex(c => c.energyCost >= 3);
                          if (highCostIdx !== -1) {
                              newHand[highCostIdx] = { ...newHand[highCostIdx], debuff: 'SILENCE' };
                              return newHand;
                          }
                      }
                      newHand[rIdx] = { ...newHand[rIdx], debuff: chosenDebuff };
                      return newHand;
                  });
                  spawnDamageText(chosenDebuff, "50%", "20%", "#a855f7");
              }
          }

          if (intent.type === 'ATTACK') {
              let dmg = intent.value + (currentEnemy.status.strength || 0);
              if (currentEnemy.status.weak > 0) dmg = Math.floor(dmg * 0.75);
              if (player.status.vulnerable > 0) dmg = Math.floor(dmg * 1.5);
              if ((player.status.memoryShield || 0) > 0) {
                   spawnDamageText("Blocked!", "30%", "30%", "#60a5fa");
                   setPlayer(p => p ? {...p, status: {...p.status, memoryShield: p.status.memoryShield! - 1}} : null);
                   dmg = 0;
              }
              const actualDmg = Math.max(0, dmg - player.block);
              if (actualDmg > 0) {
                  triggerAnimation('player', 'hit');
                  spawnDamageText(actualDmg, "30%", "30%", "#ef4444");
                  setCombatStats(prev => ({ ...prev, damageTaken: prev.damageTaken + actualDmg })); // Track Damage
              } else {
                  spawnDamageText("Blocked", "30%", "30%", "#cbd5e1");
              }
              setPlayer(p => {
                  if (!p) return null;
                  const newHp = p.hp - actualDmg;
                  if (newHp <= 0 && p.revivals > 0) {
                      spawnDamageText("REVIVED!", "30%", "20%", "#ec4899");
                      return { ...p, hp: Math.floor(p.maxHp * 0.5), revivals: p.revivals - 1 };
                  }
                  return { ...p, hp: newHp };
              });
          } else if (intent.type === 'DEFEND') {
              setCurrentEnemy(e => e ? {...e, block: e.block + intent.value} : null);
              spawnDamageText(`+${intent.value} Block`, "70%", "40%", "#60a5fa");
          } else if (intent.type === 'BUFF') {
              if (intent.description === 'Ritual') {
                  setCurrentEnemy(e => e ? {...e, status: {...e.status, ritual: (e.status.ritual||0) + intent.value}} : null);
              } else {
                  setCurrentEnemy(e => e ? {...e, status: {...e.status, strength: e.status.strength + intent.value}} : null);
              }
              audioService.playBuffSFX();
          } else if (intent.type === 'DEBUFF') {
             setPlayer(p => p ? {...p, status: {...p.status, vulnerable: p.status.vulnerable + 2}} : null);
             spawnDamageText("Vulnerable!", "30%", "20%", "#a855f7");
          }
          
          if (currentEnemy.status.poison > 0) {
              const pDmg = currentEnemy.status.poison;
              if (currentEnemy.hp - pDmg <= 0) {
                  setCurrentEnemy(e => e ? {...e, hp: 0} : null);
                  return; 
              }
              setCurrentEnemy(e => e ? {...e, hp: e.hp - pDmg, status: {...e.status, poison: Math.max(0, pDmg - 1)}} : null);
              spawnDamageText(pDmg, "75%", "25%", "#22c55e");
          }

          setTimeout(() => {
              if (phase !== 'COMBAT') return;
              setTurnCount(prev => prev + 1);
              setIsPlayerTurn(true);
              setPlayer(p => p ? {...p, energy: p.maxEnergy + (p.nextTurnEnergy || 0), nextTurnEnergy: 0} : null);
              setCurrentEnemy(e => {
                  if (!e) return null;
                  const nextIntent = getEnemyNextIntent(e, turnCount + 1);
                  return { ...e, block: 0, intent: nextIntent };
              });
          }, 1000);
      }, 500);
  };

  useEffect(() => {
      if (phase === 'COMBAT' && isPlayerTurn && turnCount > 1) {
          drawCards(5);
      }
  }, [turnCount, isPlayerTurn, phase]);

  useEffect(() => {
      if (player && player.hp <= 0 && phase === 'COMBAT') {
          checkDeath(player.hp, player.maxHp);
      }
  }, [player, phase]);

  const enterShop = () => {
    setPhase('SHOP');
    audioService.playBGM('SHOP');
    const act = DungeonManager.getActConfig(currentAct); 
    const cards = getRandomRewardOptions(currentVocabList);
    const relics = ALL_RELICS.filter(r => !player?.relics.find(pr => pr.id === r.id)).slice(0, 2);
    
    const shopItems: ShopItem[] = [
        ...cards.map(c => ({ id: Math.random().toString(), type: 'CARD' as const, data: c, price: Math.floor((Math.floor(Math.random() * 50) + 50) * act.priceMultiplier), isSold: false })),
        ...relics.map(r => ({ id: Math.random().toString(), type: 'RELIC' as const, data: r, price: Math.floor(150 * act.priceMultiplier), isSold: false })),
        { id: 'remove', type: 'REMOVE', data: null, price: Math.floor(shopState.removeCost * act.priceMultiplier), isSold: false }
    ];
    setShopState({ items: shopItems, removeCost: shopState.removeCost });
  };

  const startEvent = () => {
    const randomEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    setActiveEvent(randomEvent);
    setEventResult(null);
    setPhase('EVENT');
  };

  const handleEventChoice = (choice: EventChoice) => {
    if (!player || !activeEvent) return;
    let roll = 0;
    if (choice.type === 'ROLL') {
        roll = Math.floor(Math.random() * 20) + 1;
    }
    const result = resolveEventChoice(activeEvent.id, choice.id, player, currentVocabList, roll);
    setEventResult(result);
    if (result.goldChange) setPlayer(p => p ? {...p, gold: Math.max(0, p.gold + result.goldChange!)} : null);
    if (result.damageTaken) {
         setPlayer(p => p ? {...p, hp: Math.max(1, p.hp - result.damageTaken!)} : null);
         triggerAnimation('player', 'hit');
    }
    if (result.healed) setPlayer(p => p ? {...p, hp: Math.min(p.maxHp, p.hp + result.healed!)} : null);
    if (result.cardsRemoved && result.cardsRemoved > 0) {
        setDeck(prev => {
            if (prev.length === 0) return prev;
            const newD = [...prev];
            const rnd = Math.floor(Math.random() * newD.length);
            newD.splice(rnd, 1);
            return newD;
        });
    }
    if (result.cardsAdded) {
        setDeck(prev => [...prev, ...result.cardsAdded!]);
    }
  };

  const renderLibraryVocab = () => {
    if (!currentVocabList.length) return <div className="text-center p-10 text-slate-500">No vocabulary loaded.</div>;
    const sorted = [...currentVocabList].sort((a,b) => b.proficiency - a.proficiency || a.word.localeCompare(b.word));
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map(v => (
                <div key={v.id} className={`p-4 rounded border flex justify-between items-center ${v.proficiency >= 5 ? 'bg-yellow-900/20 border-yellow-600' : 'bg-slate-800 border-slate-700'}`}>
                    <div>
                        <div className={`font-bold text-lg ${v.proficiency >= 5 ? 'text-yellow-400' : 'text-white'}`}>{v.word}</div>
                        <div className="text-sm text-slate-400">{v.meaning}</div>
                        <div className="text-xs text-slate-500">{v.phonetic}</div>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex gap-1 mb-1">
                            {[...Array(5)].map((_, i) => (<div key={i} className={`w-2 h-2 rounded-full ${i < v.proficiency ? 'bg-green-500' : 'bg-slate-700'}`}></div>))}
                        </div>
                        <div className="text-xs text-slate-500">Lvl {v.proficiency}</div>
                    </div>
                </div>
            ))}
        </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white font-sans select-none transition-bg duration-1000" style={{ background: getBackgroundImage(phase) }}>
      <div className="bg-stars">{[...Array(50)].map((_, i) => (<div key={i} className="star" style={{ top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, animationDelay: `${Math.random()*5}s` }}></div>))}</div>

      {/* TUTORIAL PROMPT MODAL */}
      {showTutorialPrompt && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-8 animate-fade-in-up text-center">
              <h1 className="text-4xl font-serif text-yellow-500 mb-6">First Time?</h1>
              <p className="text-xl text-slate-300 max-w-lg mb-10">Would you like to play the combat tutorial to learn the mechanics of Spire Speller?</p>
              <div className="flex gap-6">
                  <button onClick={() => { setShowTutorialPrompt(false); startRunLogic(true); }} className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xl rounded shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-transform hover:scale-105">Play Tutorial</button>
                  <button onClick={() => { setShowTutorialPrompt(false); if (currentProfile) saveManager.updateProfile({...currentProfile, hasCompletedTutorial: true}); startRunLogic(false); }} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xl rounded border border-slate-600">Skip</button>
              </div>
          </div>
      )}

      {(phase === 'MAP' || phase === 'COMBAT' || phase === 'EVENT' || phase === 'SHOP' || phase === 'CAMPFIRE' || phase === 'LAST_STAND') && (
         <GameHUD player={player} currency={currentProfile?.currency || 0} phase={phase} onOpenSettings={() => setShowSettings(true)} onOpenDeck={() => setOverlayView('DECK')} onOpenRelics={() => setOverlayView('RELICS')} onOpenBlessings={() => setOverlayView('BLESSINGS')} onOpenVocab={() => setOverlayView('VOCAB_BOOK')} />
      )}

      {/* TUTORIAL OVERLAY */}
      {tutorialActive && (
          <TutorialOverlay stepIndex={tutorialStep} onNext={handleTutorialNext} onSkip={handleTutorialSkip} />
      )}

      {phase === 'ACT_TRANSITION' && (<ActTransitionModal act={DungeonManager.getActConfig(currentAct + 1)} onContinue={handleNextAct} />)}

      {phase === 'COMBAT' && player && currentEnemy && (
          <div className="absolute inset-0 w-full h-full flex flex-col pointer-events-none">
              {damageNumbers.map(d => (<div key={d.id} className="absolute text-4xl font-black drop-shadow-[0_4px_4px_rgba(0,0,0,1)] animate-float-damage z-[60]" style={{ left: d.x, top: d.y, color: d.color }}>{d.text}</div>))}
              
              {/* FIXED BUG 1: Dedicated Discard Selection Overlay */}
              {pendingAction?.type === 'DISCARD' && (
                  <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-start pt-32 pointer-events-auto animate-fade-in-up">
                      <div className="bg-slate-800 border-2 border-yellow-500 px-8 py-4 rounded-full shadow-2xl flex flex-col items-center mb-10">
                          <div className="text-2xl font-bold text-yellow-400 uppercase tracking-widest animate-pulse">Discard Phase</div>
                          <div className="text-lg text-slate-300">Select <span className="text-white font-bold text-2xl mx-1">{pendingAction.count}</span> card{pendingAction.count > 1 ? 's' : ''} to discard</div>
                      </div>
                      <div className="text-sm text-slate-400 italic">Click on cards in your hand below</div>
                  </div>
              )}

              <div className="absolute top-[20%] left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[60%] flex flex-col items-center z-10 pointer-events-auto group">
                   <div className={`relative w-48 h-48 md:w-64 md:h-64 transition-transform duration-200 ${enemyAnim === 'hit' ? 'animate-shake brightness-200 sepia' : enemyAnim === 'attack' ? 'animate-lunge' : 'animate-idle'}`}>
                        <img src={currentEnemy.image || IMAGES.ENEMIES.CULTIST} className="w-full h-full object-contain drop-shadow-2xl" alt="Enemy" />
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-1">{currentEnemy.block > 0 && (<div className="flex items-center justify-center w-8 h-8 bg-blue-900 border border-blue-500 rounded-full shadow-lg text-blue-200 font-bold"><i className="fa-solid fa-shield-halved mr-0.5 text-xs"></i> {currentEnemy.block}</div>)}{(Object.keys(currentEnemy.status) as Array<keyof EntityStatus>).map(k => (<StatusIcon key={k} type={k} value={currentEnemy.status[k] || 0} />))}</div>
                   </div>
                   <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-600 px-3 py-1 rounded-full flex items-center gap-2 shadow-xl animate-bounce-slow">{currentEnemy.intent.type === 'ATTACK' && <i className="fa-solid fa-sword text-red-500 text-xl"></i>}{currentEnemy.intent.type === 'DEFEND' && <i className="fa-solid fa-shield text-blue-400 text-xl"></i>}{currentEnemy.intent.type === 'BUFF' && <i className="fa-solid fa-arrow-up text-green-400 text-xl"></i>}{currentEnemy.intent.type === 'DEBUFF' && <i className="fa-solid fa-skull text-purple-400 text-xl"></i>}{currentEnemy.intent.type === 'UNKNOWN' && <i className="fa-solid fa-question text-slate-400 text-xl"></i>}<span className="font-bold text-xl">{currentEnemy.intent.value > 0 ? currentEnemy.intent.value : ''}</span></div>
                   <div className="w-48 md:w-64 h-4 bg-slate-800 rounded-full mt-8 border border-slate-600 relative overflow-hidden shadow-inner"><div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${(currentEnemy.hp / currentEnemy.maxHp) * 100}%` }}></div><div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">{currentEnemy.hp} / {currentEnemy.maxHp}</div></div>
                   <div className="hidden group-hover:block"><EntityTooltip entity={currentEnemy} isEnemy={true} intent={currentEnemy.intent} /></div>
              </div>
              <div className="absolute top-[40%] left-[10%] md:top-[35%] md:left-[20%] flex flex-col items-center z-10 pointer-events-auto group">
                   <div className={`relative w-40 h-40 md:w-56 md:h-56 transition-transform duration-200 ${playerAnim === 'hit' ? 'animate-shake brightness-150 red-tint' : playerAnim === 'attack' ? 'animate-lunge-right' : ''}`}>
                       <img src={getCharacterImage(selectedPackId)} className="w-full h-full object-contain drop-shadow-2xl" alt="Player" />
                       <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">{player.block > 0 && (<div className="flex items-center justify-center w-10 h-10 bg-blue-600 border-2 border-white rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] text-white font-bold text-lg animate-pulse"><i className="fa-solid fa-shield-halved text-xs mr-1"></i>{player.block}</div>)}{(Object.keys(player.status) as Array<keyof EntityStatus>).map(k => (<StatusIcon key={k} type={k} value={player.status[k] || 0} />))}</div>
                   </div>
                   <div className="w-40 md:w-56 h-4 bg-slate-800 rounded-full mt-6 border border-slate-600 relative overflow-hidden shadow-inner"><div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(player.hp / player.maxHp) * 100}%` }}></div><div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">{player.hp} / {player.maxHp}</div></div>
                   <div className="hidden group-hover:block"><EntityTooltip entity={player} /></div>
              </div>
              
              {/* HAND CONTAINER - ELEVATED Z-INDEX DURING TUTORIAL */}
              <div className={`absolute bottom-0 left-0 w-full h-[35vh] md:h-[40vh] ${tutorialActive ? 'z-[50]' : 'z-20'} flex items-end justify-center pb-4 md:pb-8 px-4 pointer-events-none bg-gradient-to-t from-black/80 to-transparent`}>
                  <div className={`flex items-end justify-center -space-x-4 md:-space-x-8 w-full max-w-6xl relative pointer-events-auto transition-all duration-500 ${pendingAction ? 'z-[60] scale-110 mb-10' : ''}`}>
                      {hand.map((card, index) => {
                          const isHovered = hoveredCardIndex === index;
                          const rotation = (index - (hand.length - 1) / 2) * 5;
                          const lift = isHovered ? -80 : 0;
                          const scale = isHovered ? 1.2 : 1.0;
                          const animClass = isDiscarding && !card.retain ? 'animate-discard' : 'animate-draw';
                          const isSelectionMode = pendingAction !== null;
                          const selectionClass = isSelectionMode ? 'cursor-pointer ring-4 ring-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)] rounded-xl hover:scale-110 hover:ring-yellow-300 z-[70]' : '';
                          
                          // TUTORIAL DIMMING: Only the target card (index 2) stays bright
                          const dimStyle = getTutorialDimStyle(index === 2 ? 'hand-card-2' : null);

                          return (<div key={card.uniqueId} className={`transition-all duration-300 transform-gpu origin-bottom relative ${selectionClass}`} style={{ transform: `rotate(${rotation}deg) translateY(${Math.abs(rotation) * 2 + lift}px) scale(${scale})`, zIndex: isHovered ? 50 : index, ...dimStyle }} onMouseEnter={() => { setHoveredCardIndex(index); audioService.playHoverSFX(); }} onMouseLeave={() => { setHoveredCardIndex(null); }}><div className={animClass} style={{ animationDelay: animClass === 'animate-draw' ? `${index * 0.05}s` : '0s' }}><CardComponent card={card} onClick={() => handleCardClick(card)} canPlay={(!isSelectionMode && isPlayerTurn && player.energy >= card.energyCost && !isDiscarding) || isSelectionMode} disabled={(!isSelectionMode && !isPlayerTurn) || isDiscarding} /></div></div>);
                      })}
                  </div>
                  <div className="absolute bottom-4 right-4 md:bottom-8 md:right-12 flex flex-col gap-4 pointer-events-auto items-center" style={getTutorialDimStyle('end-turn-btn')}>
                      <div className="bg-slate-900/80 p-2 rounded-full border border-slate-600 relative group cursor-pointer" onClick={() => setOverlayView('DISCARD')} style={getTutorialDimStyle('discard-pile')}><div className="w-12 h-16 border border-slate-500 rounded flex items-center justify-center bg-slate-800"><i className="fa-solid fa-recycle text-slate-500"></i></div><span className="absolute -top-2 -right-2 bg-slate-700 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border border-slate-500">{discardPile.length}</span><span className="absolute bottom-full mb-2 bg-black text-xs px-2 py-1 rounded hidden group-hover:block">Discard</span></div>
                      <button onClick={handleEndTurn} disabled={!isPlayerTurn || isDiscarding || pendingAction !== null} className={`w-24 h-24 rounded-full border-4 font-bold text-lg shadow-2xl transition-all hover:scale-105 active:scale-95 ${!isPlayerTurn || isDiscarding ? 'bg-slate-600 border-slate-500 text-slate-400 opacity-50 cursor-not-allowed' : 'bg-red-600 border-red-400 text-white hover:bg-red-500 animate-pulse'}`}>End Turn</button>
                  </div>
                  <div className="absolute bottom-4 left-4 md:bottom-8 md:left-12 flex flex-col gap-4 pointer-events-auto items-center" style={getTutorialDimStyle('draw-pile')}>
                       <div className="bg-slate-900/80 p-2 rounded-full border border-slate-600 relative group cursor-pointer" onClick={() => setOverlayView('DRAW')}><div className="w-12 h-16 border border-slate-500 rounded flex items-center justify-center bg-slate-800"><div className="w-8 h-12 bg-slate-700 rounded border border-slate-600"></div></div><span className="absolute -top-2 -right-2 bg-slate-700 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border border-slate-500">{drawPile.length}</span><span className="absolute bottom-full mb-2 bg-black text-xs px-2 py-1 rounded hidden group-hover:block">Draw Pile</span></div>
                  </div>
              </div>
          </div>
      )}

      {activeCard && (
          <div className="relative z-[100]">
            <SpellingModal 
                card={activeCard} 
                onSuccess={(attempts, usedHint) => handleSpellingSuccess(attempts, usedHint)} 
                onFail={(first) => handleSpellingFail(first)} 
                onCancel={() => {
                    if (tutorialActive) return; // Cannot cancel in tutorial
                    setActiveCard(null);
                }} 
            />
          </div>
      )}
      {phase === 'REWARD' && (<RewardScreen onReturn={proceedToMap} onAddCard={(c) => setDeck(prev => [...prev, c])} vocabList={currentVocabList} goldBreakdown={goldBreakdown} shardsReward={rewardShards} droppedRelic={rewardRelic} />)}
      {phase === 'SHOP' && player && (<ShopScreen player={player} shopState={shopState} onLeave={proceedToMap} onPurchase={(item) => { if (player.gold < item.price) { audioService.playErrorSFX(); return; } setPlayer(p => p ? {...p, gold: p.gold - item.price} : null); audioService.playPurchaseSFX(); if (item.type === 'CARD' && item.data) { setDeck(prev => [...prev, item.data as Card]); } else if (item.type === 'RELIC' && item.data) { setPlayer(p => p ? {...p, relics: [...p.relics, item.data as Relic]} : null); } else if (item.type === 'REMOVE') { setOverlayView('REMOVE_CARD'); } setShopState(prev => ({ ...prev, items: prev.items.map(i => i.id === item.id ? {...i, isSold: true} : i) })); }} />)}
      {phase === 'SANCTUM' && currentProfile && (<SanctumScreen profile={currentProfile} onClose={() => setPhase('MENU')} onUpdateProfile={(updates, unlock) => { const { currency, ...statUpdates } = updates; let newP = {...currentProfile}; if (currency !== undefined) newP.currency = currency; if (Object.keys(statUpdates).length > 0) newP.stats = { ...newP.stats, ...statUpdates }; if (unlock) newP.unlocks = [...newP.unlocks, unlock]; setCurrentProfile(newP); saveManager.updateProfile(newP); }} />)}
      {phase === 'CAMPFIRE' && player && (
          <RestScreen 
            player={player} 
            onSleep={handleRestSleep} 
            onSmith={handleRestSmith} 
            onLeave={proceedToMap} 
          />
      )}
      {phase === 'EVENT' && activeEvent && player && (
         <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in-up overflow-y-auto" style={{ backgroundImage: `url(${IMAGES.EVENTS[activeEvent.id.toUpperCase()] || activeEvent.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
             <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
             <div className="max-w-4xl w-full bg-slate-900/90 border-2 border-slate-600 rounded-2xl overflow-hidden shadow-2xl relative z-10 backdrop-blur-md">
                 <div className="h-64 w-full bg-slate-800 relative overflow-hidden border-b border-slate-700">
                     <img src={IMAGES.EVENTS[activeEvent.id.toUpperCase()] || activeEvent.image} className="w-full h-full object-cover" alt="Event Art" /><div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-slate-900 to-transparent h-32"></div><h2 className="absolute bottom-6 left-8 text-4xl font-serif font-bold text-yellow-400 drop-shadow-lg">{activeEvent.title}</h2>
                 </div>
                 <div className="p-8">{!eventResult ? (<><p className="text-xl text-slate-300 font-serif leading-relaxed mb-8 italic border-l-4 border-yellow-600 pl-4">"{activeEvent.description}"</p><div className="grid gap-4">{activeEvent.choices.map(choice => { let disabled = false; if (choice.requirement?.includes('Gold') && player.gold < parseInt(choice.requirement)) disabled = true; return (<button key={choice.id} disabled={disabled} onClick={() => handleEventChoice(choice)} className={`w-full p-4 border rounded-xl text-left transition-all flex justify-between items-center group ${disabled ? 'border-slate-700 opacity-50 cursor-not-allowed bg-slate-800' : 'border-slate-500 bg-slate-800/80 hover:bg-slate-700 hover:border-yellow-500 hover:shadow-lg'}`}><div><div className={`font-bold text-lg ${disabled ? 'text-slate-500' : 'text-white group-hover:text-yellow-400'}`}>{choice.text}</div><div className="text-sm text-slate-400">{choice.description}</div></div>{choice.type === 'SAFE' && <span className="text-green-500 font-bold text-xs bg-green-900/20 px-2 py-1 rounded">SAFE</span>}{choice.type === 'RISKY' && <span className="text-red-500 font-bold text-xs bg-red-900/20 px-2 py-1 rounded">RISKY</span>}{choice.type === 'TRADE' && <span className="text-yellow-500 font-bold text-xs bg-yellow-900/20 px-2 py-1 rounded">TRADE</span>}{choice.type === 'ROLL' && <span className="text-blue-400 font-bold text-xs bg-blue-900/20 px-2 py-1 rounded">D20 ROLL</span>}</button>); })}</div></>) : (<div className="text-center animate-fade-in-up"><div className={`text-3xl font-serif font-bold mb-6 ${eventResult.outcome === 'SUCCESS' ? 'text-green-400' : eventResult.outcome === 'FAILURE' ? 'text-red-400' : 'text-slate-300'}`}>{eventResult.message}</div><div className="flex justify-center gap-8 mb-8 text-lg font-bold">{eventResult.goldChange !== 0 && <div className={eventResult.goldChange! > 0 ? "text-yellow-400" : "text-red-400"}>{eventResult.goldChange! > 0 ? '+' : ''}{eventResult.goldChange} Gold</div>}{eventResult.damageTaken && <div className="text-red-400">-{eventResult.damageTaken} HP</div>}{eventResult.healed && <div className="text-green-400">+{eventResult.healed} HP</div>}</div><button onClick={proceedToMap} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded text-xl font-bold text-white transition-colors border border-slate-500">Continue</button></div>)}</div>
             </div>
         </div>
      )}

      {showSettings && (<SettingsModal onClose={() => setShowSettings(false)} volume={volume} setVolume={setVolume} isMuted={isMuted} setIsMuted={setIsMuted} onSaveGame={(phase !== 'COMBAT' && phase !== 'MENU' && phase !== 'GAME_OVER' && phase !== 'MASTERY_VIEW') ? () => setShowSaveModal(true) : undefined} onExitGame={(phase !== 'MENU') ? handleExitGame : undefined} />)}
      {(showSaveModal || showLoadModal) && currentProfile && (<SaveLoadModal mode={showSaveModal ? 'SAVE' : 'LOAD'} profile={currentProfile} onAction={showSaveModal ? saveGame : loadGame} onDelete={showLoadModal ? (id) => saveManager.deleteRunFromSlot(currentProfile.id, id) : undefined} onClose={() => { setShowSaveModal(false); setShowLoadModal(false); }} />)}
      {overlayView !== 'NONE' && overlayView !== 'BLESSINGS' && overlayView !== 'VOCAB_BOOK' && (<CardListModal title={overlayView === 'DECK' ? 'Grimoire' : overlayView === 'DRAW' ? 'Draw Pile' : overlayView === 'DISCARD' ? 'Discard Pile' : overlayView === 'REMOVE_CARD' ? 'Choose Card to Remove' : 'Relics'} cards={overlayView === 'DECK' ? deck : overlayView === 'DRAW' ? drawPile : overlayView === 'DISCARD' ? discardPile : overlayView === 'REMOVE_CARD' ? deck : []} onClose={() => { if (overlayView === 'REMOVE_CARD') { if (phase === 'SHOP' || phase === 'EVENT' || phase === 'CAMPFIRE') { setOverlayView('NONE'); if (phase === 'CAMPFIRE') proceedToMap(); } } else { setOverlayView('NONE'); } }} emptyMessage={overlayView === 'RELICS' ? "No Relics found." : undefined} onSelect={overlayView === 'REMOVE_CARD' ? (card) => { setDeck(prev => prev.filter(c => c.uniqueId !== card.uniqueId)); setOverlayView('NONE'); spawnDamageText("Card Removed", "50%", "50%", "#ef4444"); audioService.playErrorSFX(); if (phase === 'CAMPFIRE') setTimeout(proceedToMap, 500); } : undefined} />)}
      {overlayView === 'VOCAB_BOOK' && (<div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col p-4 animate-fade-in-up overflow-hidden"><div className="flex justify-between items-center mb-6 max-w-7xl mx-auto w-full border-b border-slate-700 pb-4 pt-2"><h2 className="text-2xl md:text-4xl font-serif text-yellow-500 flex items-center gap-3"><i className="fa-solid fa-book-open"></i> Vocabulary Book</h2><button onClick={() => setOverlayView('NONE')} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark text-2xl"></i></button></div><div className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto pr-2 scrollbar-hide">{renderLibraryVocab()}</div></div>)}
      {overlayView === 'RELICS' && player && (<div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col p-4 animate-fade-in-up"><div className="flex justify-between items-center mb-6 max-w-4xl mx-auto w-full border-b border-slate-700 pb-4 pt-2"><h2 className="text-3xl font-serif text-yellow-500">Relics</h2><button onClick={() => setOverlayView('NONE')} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark text-2xl"></i></button></div><div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-4">{player.relics.length === 0 && <div className="text-slate-500 italic col-span-2 text-center mt-10">You have no artifacts yet.</div>}{player.relics.map((r, i) => (<div key={i} className="bg-slate-800 p-4 rounded border border-slate-600 flex items-center gap-4"><div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border border-slate-500"><i className={`fa-solid ${r.icon} text-slate-300`}></i></div><div><div className="font-bold text-yellow-400">{r.name}</div><div className="text-sm text-slate-400">{r.description}</div></div></div>))}</div></div>)}
      {overlayView === 'BLESSINGS' && currentProfile && (<div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col p-4 animate-fade-in-up"><div className="flex justify-between items-center mb-6 max-w-4xl mx-auto w-full border-b border-slate-700 pb-4 pt-2"><h2 className="text-3xl font-serif text-yellow-500 flex items-center gap-3"><i className="fa-solid fa-star"></i> Active Blessings</h2><button onClick={() => setOverlayView('NONE')} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark text-2xl"></i></button></div><div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-4">{SANCTUM_UPGRADES.filter(u => currentProfile.unlocks.includes(u.id)).length === 0 && (<div className="text-slate-500 italic col-span-2 text-center mt-10">You have not unlocked any Sanctum Blessings yet.</div>)}{SANCTUM_UPGRADES.filter(u => currentProfile.unlocks.includes(u.id)).map((upgrade, i) => (<div key={i} className="bg-slate-800 p-4 rounded border border-slate-600 flex items-center gap-4 shadow-lg"><div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border border-slate-500"><i className={`fa-solid ${upgrade.icon} text-slate-300`}></i></div><div><div className="font-bold text-yellow-400">{upgrade.name}</div><div className="text-sm text-slate-400">{upgrade.desc}</div></div></div>))}</div></div>)}

      {/* MENU PHASE */}
      {phase === 'PROFILE_SELECT' && (
         <div className="flex flex-col items-center justify-center min-h-screen z-10 p-4">
             <h1 className="text-5xl md:text-7xl font-serif font-bold text-yellow-500 mb-12 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">SPIRE SPELLER</h1>
             {!isCreatingProfile ? (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                     {profiles.map(p => (
                         <div key={p.id} onClick={() => { setCurrentProfile(p); setPhase('MENU'); }} className="bg-slate-800/80 border border-slate-600 p-6 rounded-xl hover:border-yellow-400 cursor-pointer transition-all hover:scale-105 group relative">
                             <div className="text-2xl font-bold text-white group-hover:text-yellow-400 mb-2">{p.name}</div>
                             <div className="text-slate-400 text-sm">Last Played: {new Date(p.lastPlayed).toLocaleDateString()}</div>
                             <div className="mt-4 flex gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest"><span><i className="fa-solid fa-trophy text-yellow-600"></i> {p.stats.wins} Wins</span><span><i className="fa-solid fa-book text-blue-600"></i> {p.stats.wordsMastered} Words</span></div>
                             <button onClick={(e) => { e.stopPropagation(); saveManager.deleteProfile(p.id); setProfiles(saveManager.getAllProfiles()); }} className="absolute top-2 right-2 p-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-trash"></i></button>
                         </div>
                     ))}
                     {profiles.length < 3 && (<div onClick={() => setIsCreatingProfile(true)} className="bg-slate-900/50 border-2 border-dashed border-slate-700 p-6 rounded-xl hover:border-slate-500 cursor-pointer flex flex-col items-center justify-center transition-all hover:bg-slate-800/50"><i className="fa-solid fa-plus text-4xl text-slate-600 mb-2"></i><div className="text-slate-500 font-bold">New Profile</div></div>)}
                 </div>
             ) : (
                 <div className="bg-slate-800 p-8 rounded-xl border border-slate-600 w-full max-w-md animate-fade-in-up"><h2 className="text-2xl font-bold mb-4">Create New Profile</h2><input ref={newProfileInputRef} type="text" value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} placeholder="Enter Name..." className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white mb-6 focus:border-yellow-400 outline-none" /><div className="flex justify-end gap-4"><button onClick={() => setIsCreatingProfile(false)} className="text-slate-400 hover:text-white">Cancel</button><button onClick={handleProfileCreate} className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded">Create</button></div></div>
             )}
         </div>
      )}

      {phase === 'MENU' && currentProfile && (
        <div className="flex flex-col items-center justify-center min-h-screen z-10 relative">
           <h1 className="text-6xl md:text-8xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-8 drop-shadow-lg tracking-wider animate-float">SPIRE SPELLER</h1>
           <div className="flex flex-col gap-4 w-64">
              <button onClick={() => setPhase('LIBRARY')} className="py-4 bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-yellow-400 rounded-lg font-bold text-xl transition-all shadow-lg group"><i className="fa-solid fa-play mr-2 group-hover:text-yellow-400"></i> New Run</button>
              <button onClick={() => setShowLoadModal(true)} className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-white rounded-lg font-bold text-lg transition-all">Load Journey</button>
              <button onClick={() => setPhase('SANCTUM')} className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-purple-400 rounded-lg font-bold text-lg transition-all text-purple-300">The Sanctum</button>
              <button onClick={() => setPhase('PROFILE_SELECT')} className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-400">Change Profile</button>
           </div>
        </div>
      )}

      {phase === 'LIBRARY' && (
         <div className="flex h-screen w-full pt-16 md:pt-0" style={{ background: IMAGES.BACKGROUNDS.LIBRARY }}>
            <div className="w-full md:w-80 bg-slate-900 border-r border-slate-700 flex flex-col p-6 z-20 overflow-y-auto">
               <button onClick={() => setPhase('MENU')} className="mb-4 text-slate-500 hover:text-white flex items-center gap-2"><i className="fa-solid fa-arrow-left"></i> Back</button>
               <h2 className="text-3xl font-serif text-yellow-500 mb-6">Choose Class</h2>
               <div className="space-y-3 pr-2 mb-6">
                  {PRESET_PACKS.map(pack => (<div key={pack.id} onClick={() => handleSelectPack(pack.id)} className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-4 ${selectedPackId === pack.id ? `bg-slate-800 ${pack.color.replace('text', 'border')}` : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}><div className="w-12 h-12 rounded-full overflow-hidden border border-slate-500"><img src={getCharacterImage(pack.id)} alt={pack.name} className="w-full h-full object-cover" /></div><div><div className="font-bold text-white">{pack.name}</div><div className="text-xs text-slate-400">{pack.description}</div></div></div>))}
                  <div onClick={() => fileInputRef.current?.click()} className={`p-4 rounded-lg border-2 border-dashed cursor-pointer transition-all flex items-center gap-4 ${selectedPackId === 'custom' ? 'bg-slate-800 border-white' : 'bg-slate-900 border-slate-600 hover:border-yellow-400'}`}><div className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full"><i className="fa-solid fa-upload text-xl text-slate-400"></i></div><div><div className="font-bold text-white">Upload Custom</div><div className="text-xs text-slate-400">JSON/CSV (.txt)</div></div><input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".json,.txt,.csv" /></div>
               </div>
               {selectedPackId && (<button onClick={handleStartRun} className="w-full py-4 bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600 text-white font-bold text-xl rounded-lg shadow-lg border border-red-500 transition-all animate-pulse mt-auto">BEGIN JOURNEY</button>)}
            </div>
            <div className="flex-1 bg-slate-950/80 p-8 flex flex-col overflow-hidden">
               {selectedPackId ? (<><div className="flex gap-4 mb-6 border-b border-slate-700 pb-2"><button onClick={() => setLibraryView('DECK')} className={`text-xl font-bold pb-2 transition-colors ${libraryView === 'DECK' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-500 hover:text-white'}`}>Starting Deck (Daily Mix)</button><button onClick={() => setLibraryView('VOCAB')} className={`text-xl font-bold pb-2 transition-colors ${libraryView === 'VOCAB' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-500 hover:text-white'}`}>Vocabulary Progress</button></div><div className="flex-1 overflow-y-auto">{libraryView === 'DECK' && (<><div className="text-sm text-slate-400 mb-4 bg-slate-800/50 p-3 rounded"><i className="fa-solid fa-info-circle mr-2"></i>Deck contains: <span className="text-green-400 font-bold">70% New</span>, <span className="text-yellow-400 font-bold">20% Review</span>, <span className="text-purple-400 font-bold">10% Mastered</span></div><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">{previewCards.map((card, i) => (<div key={i} className="opacity-90 hover:opacity-100 transition-opacity transform hover:scale-105"><CardComponent card={card} onClick={()=>{}} canPlay={false} disabled={true} /></div>))}</div></>)}{libraryView === 'VOCAB' && renderLibraryVocab()}</div></>) : (<div className="flex items-center justify-center h-full text-slate-500 text-2xl font-serif italic">Select a class to preview deck</div>)}
            </div>
         </div>
      )}

      {phase === 'STORY_INTRO' && activeStory && (<StoryModal title={activeStory.title} story={activeStory.story} icon={activeStory.icon} color={activeStory.color} onContinue={proceedToMap} />)}

      {phase === 'LAST_STAND' && lastStandWords.length > 0 && (
          <div className="fixed inset-0 z-[60] bg-red-900/20 backdrop-blur-sm flex items-center justify-center">
              <SpellingModal vocab={lastStandWords[lastStandIndex]} onSuccess={() => handleLastStandSuccess()} onFail={() => handleLastStandFail()} onCancel={() => handleLastStandFail()} />
              <div className="absolute top-10 left-0 w-full text-center pointer-events-none"><h2 className="text-5xl font-serif font-bold text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">LAST STAND</h2><p className="text-xl text-red-200 mt-2">Spell {3 - lastStandIndex} words correctly to revive!</p></div>
          </div>
      )}

      {phase === 'MAP' && (
         <div className="flex items-center justify-center min-h-screen pt-12 overflow-hidden" style={{ background: getBackgroundImage('MAP') }}>
            <div className="flex w-full max-w-4xl h-[90vh] shadow-2xl relative border-[8px] border-[#3e3b38] rounded-lg overflow-hidden bg-[#1a1817]">
                <div ref={mapContainerRef} className="relative flex-1 overflow-y-auto scroll-smooth scrollbar-hide" style={{ backgroundImage: 'radial-gradient(circle at center, #2d2a26 0%, #0f0e0d 100%)', boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)' }}>
                  <div className="relative h-[1600px] w-full mt-10 pb-20 px-4 md:px-12"> 
                      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex justify-center pointer-events-none z-0"><div className="w-32 h-32 opacity-20 bg-red-900 rounded-full blur-3xl"></div></div>
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">{gameMap.map(node => node.next.map(childId => { const child = gameMap.find(n => n.id === childId); if (!child) return null; const y1 = 1600 - (1600 * (node.y / 15)) - 24; const x1 = `${node.x}%`; const y2 = 1600 - (1600 * (child.y / 15)) + 24; const x2 = `${child.x}%`; const isAvailablePath = node.status === 'COMPLETED' && child.status === 'AVAILABLE'; const isCompletedPath = node.status === 'COMPLETED' && child.status === 'COMPLETED'; return (<line key={`${node.id}-${child.id}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isAvailablePath ? '#fbbf24' : isCompletedPath ? '#57534e' : '#292524'} strokeWidth="3" strokeDasharray="12 8" strokeLinecap="round" className={isAvailablePath ? "map-path-active" : ""} opacity={isAvailablePath ? 1 : 0.6} />); }))}</svg>
                      {gameMap.map(node => (<div key={node.id} className={`absolute w-14 h-14 -ml-7 rounded-full flex items-center justify-center text-2xl transition-all z-10 duration-200 group ${node.status === 'COMPLETED' ? 'grayscale opacity-50 scale-90' : node.status === 'AVAILABLE' ? 'scale-110 z-20 animate-pulse drop-shadow-[0_0_10px_rgba(251,191,36,0.6)] cursor-pointer' : node.status === 'UNREACHABLE' ? 'opacity-20 grayscale' : 'opacity-80'}`} style={{ left: `${node.x}%`, bottom: `${(node.y / 15) * 100}%` }} onClick={() => node.status === 'AVAILABLE' && handleNodeSelect(node)}>{node.type === 'BOSS' ? (<i className="fa-solid fa-dragon text-6xl text-[#ef4444] drop-shadow-lg z-20"></i>) : (<div className="relative"><div className={`absolute inset-0 rounded-full bg-[#1c1917] scale-125 border-2 ${node.status === 'AVAILABLE' ? 'border-yellow-600' : 'border-[#44403c]'}`}></div><i className={`fa-solid relative z-10 ${node.type === 'MONSTER' ? 'fa-skull text-slate-400' : node.type === 'ELITE' ? 'fa-skull-crossbones text-red-700 scale-125' : node.type === 'TREASURE' ? 'fa-box-open text-yellow-600' : node.type === 'CAMPFIRE' ? 'fa-fire text-orange-600' : node.type === 'SHOP' ? 'fa-sack-dollar text-blue-400' : node.type === 'EVENT' ? 'fa-question text-teal-600' : 'fa-play'}`}></i></div>)}{node.status === 'AVAILABLE' && (<div className="absolute -top-8 bg-black/80 text-yellow-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider whitespace-nowrap border border-yellow-600/50">Select</div>)}</div>))}
                  </div>
                </div>
            </div>
         </div>
      )}

      {phase === 'MASTERY_VIEW' && (
          <div className="flex flex-col h-screen w-full relative z-20">
              <div className="bg-slate-900/90 backdrop-blur border-b border-slate-700 p-6 flex justify-between items-center shadow-lg"><div><h2 className="text-3xl font-serif text-yellow-400">Mastery Status</h2><p className="text-slate-400">Review your current knowledge before proceeding.</p></div><button onClick={continueFromMasteryView} className="px-8 py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg shadow-lg border border-green-500 transition-all hover:scale-105">Continue Journey <i className="fa-solid fa-arrow-right ml-2"></i></button></div>
              <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">{renderLibraryVocab()}</div>
          </div>
      )}

      {phase === 'GAME_OVER' && (
          <div className="flex flex-col items-center justify-center min-h-screen z-20 bg-black/80">
              <h1 className="text-6xl font-serif text-red-600 mb-6 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">DEFEATED</h1><p className="text-xl text-slate-300 mb-8">The Spire claims another soul...</p>
              <div className="bg-slate-900 p-6 rounded-xl border border-red-900/50 mb-8 text-center"><div className="text-yellow-500 text-2xl font-bold mb-2">Run Summary</div><div className="grid grid-cols-2 gap-4 text-left"><div>Words Mastered: {currentProfile?.stats.wordsMastered}</div><div>Act Reached: {currentAct}</div><div>Floor Reached: {currentNodeId ? currentNodeId.split('_')[1] : 0}</div></div></div>
              <button onClick={() => setPhase('MENU')} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded border border-slate-500">Return to Menu</button>
          </div>
      )}
    </div>
  );
};

export default App;