import React from 'react';
import { Card } from '../types';
import { audioService } from '../services/audioService';

interface CardProps {
  card: Card;
  onClick: (card: Card) => void;
  canPlay: boolean;
  disabled: boolean;
}

const CardComponent: React.FC<CardProps> = ({ card, onClick, canPlay, disabled }) => {
  const isAttack = card.type === 'ATTACK';
  const isDefense = card.type === 'DEFENSE';
  const isUtility = card.type === 'UTILITY';
  const isHeal = card.type === 'HEAL';
  const isCurse = card.type === 'CURSE';

  // Aesthetic Configurations
  let bgGradient = 'bg-gradient-to-b from-slate-700 to-slate-900';
  let borderClass = 'border-slate-500';
  let titleColor = 'text-slate-200';
  let frameColor = 'border-slate-600';
  let typeIcon = 'fa-question';
  let typeLabel = 'Unknown';
  let typeColor = 'text-slate-400';
  let glowColor = 'shadow-slate-500/20';

  if (isAttack) {
    bgGradient = 'bg-gradient-to-b from-red-900 via-red-950 to-slate-900';
    borderClass = 'border-red-500';
    titleColor = 'text-red-100';
    frameColor = 'border-red-400/30';
    typeIcon = 'fa-khanda';
    typeLabel = 'Attack';
    typeColor = 'text-red-400';
    glowColor = 'shadow-red-500/30';
  } else if (isDefense) {
    bgGradient = 'bg-gradient-to-b from-blue-900 via-blue-950 to-slate-900';
    borderClass = 'border-blue-500';
    titleColor = 'text-blue-100';
    frameColor = 'border-blue-400/30';
    typeIcon = 'fa-shield-halved';
    typeLabel = 'Defense';
    typeColor = 'text-blue-400';
    glowColor = 'shadow-blue-500/30';
  } else if (isUtility) {
    bgGradient = 'bg-gradient-to-b from-purple-900 via-purple-950 to-slate-900';
    borderClass = 'border-purple-500';
    titleColor = 'text-purple-100';
    frameColor = 'border-purple-400/30';
    typeIcon = 'fa-wand-magic-sparkles';
    typeLabel = 'Utility';
    typeColor = 'text-purple-400';
    glowColor = 'shadow-purple-500/30';
  } else if (isHeal) {
    bgGradient = 'bg-gradient-to-b from-green-900 via-green-950 to-slate-900';
    borderClass = 'border-green-500';
    titleColor = 'text-green-100';
    frameColor = 'border-green-400/30';
    typeIcon = 'fa-leaf';
    typeLabel = 'Survival';
    typeColor = 'text-green-400';
    glowColor = 'shadow-green-500/30';
  } else if (isCurse) {
    bgGradient = 'bg-gradient-to-b from-gray-900 via-black to-black';
    borderClass = 'border-gray-600';
    titleColor = 'text-gray-400';
    frameColor = 'border-gray-700/50';
    typeIcon = 'fa-skull';
    typeLabel = 'Curse';
    typeColor = 'text-gray-500';
    glowColor = 'shadow-black/60';
  }

  // Visual Override Checks
  if (card.visualTag === 'FIRE') {
      bgGradient = 'bg-gradient-to-b from-orange-800 via-red-900 to-slate-900';
      typeIcon = 'fa-fire';
      glowColor = 'shadow-orange-500/40';
  } else if (card.visualTag === 'ICE') {
      bgGradient = 'bg-gradient-to-b from-cyan-900 via-blue-900 to-slate-900';
      typeIcon = 'fa-snowflake';
      glowColor = 'shadow-cyan-500/40';
  }

  const isMastered = card.vocab.proficiency >= 5;
  
  // Debuff Checks
  const isBlind = card.debuff === 'BLIND';
  const isRush = card.debuff === 'RUSH';
  const isSilenced = card.debuff === 'SILENCE' && card.energyCost >= 3; // "Ban Cost 3" logic
  
  const isPlayable = canPlay && !disabled && !card.isUnplayable && !isCurse && !isSilenced;
  
  // Golden Bounty Visuals
  const isReview = card.isReview;
  if (isReview) {
      borderClass = 'border-yellow-400';
      glowColor = 'shadow-yellow-500/50 ring-2 ring-yellow-500/30';
  }

  return (
    <div 
      onClick={() => isPlayable && onClick(card)}
      onMouseEnter={() => isPlayable && audioService.playHoverSFX()}
      className={`
        relative w-32 h-48 md:w-44 md:h-64 rounded-xl border-2 shadow-2xl flex flex-col items-center select-none transition-all duration-300
        ${bgGradient} ${borderClass} ${glowColor}
        ${isPlayable ? 'cursor-pointer card-hover' : 'opacity-80 grayscale-[0.3] cursor-not-allowed'}
        ${isMastered || isReview ? 'gold-shine' : ''}
        ${isSilenced ? 'grayscale brightness-50' : ''}
      `}
    >
      {/* Debuff Overlay Icons */}
      {isBlind && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <i className="fa-solid fa-eye-slash text-6xl text-black/50 drop-shadow-lg animate-pulse"></i>
          </div>
      )}
      {isRush && (
          <div className="absolute top-0 right-0 z-30 bg-red-600 text-white rounded-bl-xl px-2 py-1 shadow-lg animate-bounce">
              <i className="fa-solid fa-hourglass-half"></i>
          </div>
      )}
      {isSilenced && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 pointer-events-none rounded-xl">
              <i className="fa-solid fa-ban text-6xl text-red-500/80 drop-shadow-lg rotate-45"></i>
          </div>
      )}

      {/* Golden Bounty Header */}
      {isReview && !isBlind && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold text-[10px] px-3 py-1 rounded-t-lg z-0 border-t border-l border-r border-yellow-200 shadow-lg">
              <i className="fa-solid fa-clock-rotate-left mr-1"></i> REVIEW
          </div>
      )}

      {/* Energy Cost Badge */}
      <div className={`absolute -top-3 -left-3 md:-top-4 md:-left-4 w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full border-2 ${isMastered || isReview ? 'border-yellow-400' : 'border-white'} flex items-center justify-center z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>
         <span className="font-serif font-bold text-lg md:text-2xl text-white drop-shadow-md">{card.isUnplayable || isCurse ? '-' : card.energyCost}</span>
      </div>

      {/* Rarity/Mastery Indicator */}
      {isMastered && !isReview && (
        <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 z-20 bg-yellow-500 text-black w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
           <i className="fa-solid fa-star text-xs md:text-sm"></i>
        </div>
      )}
      
      {/* Review Indicator */}
      {isReview && !isBlind && (
        <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 z-20 bg-red-500 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 border-yellow-400 shadow-lg animate-pulse">
           <i className="fa-solid fa-exclamation text-xs md:text-sm"></i>
        </div>
      )}

      {/* Keywords (Retain / Double) */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 items-end pointer-events-none">
          {card.retain && (
              <span className="text-[8px] md:text-[9px] bg-blue-900/80 text-blue-200 px-1 rounded border border-blue-500 font-bold uppercase">Retain</span>
          )}
          {card.doubleCast && (
              <span className="text-[8px] md:text-[9px] bg-purple-900/80 text-purple-200 px-1 rounded border border-purple-500 font-bold uppercase">x2 Cast</span>
          )}
          {card.lifesteal && (
              <span className="text-[8px] md:text-[9px] bg-red-900/80 text-red-200 px-1 rounded border border-red-500 font-bold uppercase">Lifesteal</span>
          )}
      </div>

      {/* Card Header (Name) */}
      <div className="w-full text-center mt-3 md:mt-4 px-1 relative z-10">
        <h3 className={`text-[10px] md:text-sm font-bold uppercase tracking-wider font-serif ${titleColor} drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] truncate px-2`}>
            {card.name}
        </h3>
      </div>

      {/* Main Art / Content Area */}
      <div className={`
        relative w-24 h-20 md:w-36 md:h-32 mt-1 mx-auto rounded border bg-black/40 ${frameColor} 
        flex flex-col items-center justify-center overflow-hidden shadow-inner group
      `}>
         {/* Background Type Icon Faded */}
         <i className={`fa-solid ${typeIcon} text-5xl md:text-7xl text-white/5 absolute transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}></i>
         
         {/* Phonetic (Centerpiece) */}
         <div className="relative z-10 text-center w-full px-1">
            <div className={`text-lg md:text-2xl font-serif font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-wide truncate ${isReview ? 'text-yellow-300' : 'text-white'} ${isBlind ? 'blur-md' : ''}`}>
               {isBlind ? '???' : card.vocab.phonetic}
            </div>
            {/* Meaning */}
            <div className={`text-[10px] md:text-xs font-bold text-yellow-200 mt-1 bg-black/60 px-2 py-0.5 rounded-full inline-block backdrop-blur-sm border border-white/10 max-w-full truncate ${isBlind ? 'blur-sm bg-black text-transparent' : ''}`}>
               {isBlind ? 'HIDDEN' : card.vocab.meaning}
            </div>
         </div>
         {isBlind && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-slate-500 font-bold text-xs uppercase tracking-widest">Ink Blot</div>}
      </div>

      {/* Card Type Tag with Icon */}
      <div className="w-full flex justify-center mt-1 md:mt-2 items-center gap-1.5 relative z-10">
         <div className={`w-full h-[1px] bg-gradient-to-r from-transparent via-${typeColor.split('-')[1]}-500 to-transparent opacity-50 absolute`}></div>
         <span className={`text-[8px] md:text-[10px] font-bold uppercase tracking-widest ${typeColor} bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-700 z-10 flex items-center gap-1`}>
            <i className={`fa-solid ${typeIcon} text-[8px] md:text-[9px]`}></i>
            {typeLabel}
         </span>
      </div>

      {/* Description Text */}
      <div className="flex-1 w-full px-2 md:px-3 flex items-center justify-center text-center pb-2">
        <p className={`text-[9px] md:text-[11px] font-medium text-white/90 leading-tight font-serif line-clamp-3 drop-shadow-sm`}>
           {card.description}
           {isCurse && <span className="block text-[9px] text-purple-400 mt-1 font-sans font-normal">Unplayable</span>}
           {isSilenced && <span className="block text-[9px] text-red-400 mt-1 font-bold animate-pulse">SILENCED (Cost 3)</span>}
        </p>
      </div>
    </div>
  );
};

export default CardComponent;