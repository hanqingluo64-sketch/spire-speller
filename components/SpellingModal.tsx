import React, { useState, useEffect, useRef } from 'react';
import { Card, Vocabulary } from '../types';
import { audioService } from '../services/audioService';

interface SpellingModalProps {
  card?: Card; // Optional, might be just vocab in Last Stand
  vocab?: Vocabulary; // Alternative source
  onSuccess: (attempts: number, usedHint: boolean) => void;
  onFail: (isFirstAttempt: boolean) => void;
  onCancel: () => void;
}

const SpellingModal: React.FC<SpellingModalProps> = ({ card, vocab, onSuccess, onFail, onCancel }) => {
  const targetVocab = card ? card.vocab : vocab!;
  const debuff = card?.debuff;
  
  const [input, setInput] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Play sound on mount
    audioService.speakWord(targetVocab.word);
    
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);

    // Rush Timer
    if (debuff === 'RUSH') {
        setTimeLeft(20);
    }
  }, [card, targetVocab]);

  useEffect(() => {
      if (timeLeft === null || isSuccess) return;
      if (timeLeft <= 0) {
          // Time's up! Fail immediately
          handleFail(true); // Treat as first attempt fail for penalty logic
          return;
      }
      const timer = setInterval(() => {
          setTimeLeft(prev => prev !== null ? prev - 1 : null);
      }, 1000);
      return () => clearInterval(timer);
  }, [timeLeft, isSuccess]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    audioService.playClickSFX(); // Soft click while typing
    if (showHint) setShowHint(false);
  };

  const handleReveal = () => {
      setShowHint(true);
      setUsedHint(true);
  };

  const handleFail = (isTimeout: boolean = false) => {
      setIsError(true);
      setAttempts(prev => prev + 1);
      audioService.playErrorSFX();
      
      const isFirstFail = attempts === 0;
      onFail(isFirstFail || isTimeout);

      if (isTimeout) {
          // If timed out, close after a brief delay or let parent handle
          // Actually, we usually let user retry, but "Rush: Time out = Wrong".
          // If we want strict "Wrong", we should probably close or reset.
          // For gameplay flow, let's treat it as a wrong submission but keep modal open to force spelling?
          // Re-reading: "Rush: Timeout counts as wrong answer".
          // In combat, wrong answer means "Sticky".
          // So we should trigger onFail and maybe close?
          // Let's close it to signify turn loss/penalty application.
          onCancel(); 
      } else {
          setShowHint(true);
          setTimeout(() => setIsError(false), 500);
          inputRef.current?.select();
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = input.trim().toLowerCase();
    
    if (cleanInput === targetVocab.word.toLowerCase()) {
      setIsSuccess(true);
      audioService.playSuccessSFX();
      // Wait for animation before closing
      setTimeout(() => {
        onSuccess(attempts, usedHint);
      }, 1000);
    } else {
      handleFail(false);
    }
  };

  const isBlind = debuff === 'BLIND';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className={`bg-slate-800 border-2 ${timeLeft !== null && timeLeft <= 5 ? 'border-red-500 animate-pulse' : 'border-slate-600'} p-4 md:p-8 rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh] overflow-y-auto`}>
        
        {/* Rush Timer */}
        {timeLeft !== null && (
            <div className="absolute top-0 left-0 w-full h-2 bg-slate-700">
                <div 
                    className="h-full bg-red-500 transition-all duration-1000 linear" 
                    style={{ width: `${(timeLeft / 20) * 100}%` }}
                ></div>
            </div>
        )}
        {timeLeft !== null && (
            <div className="absolute top-4 left-4 text-red-500 font-bold text-xl flex items-center gap-2">
                <i className="fa-solid fa-clock"></i> {timeLeft}s
            </div>
        )}

        {/* Success Overlay */}
        {isSuccess && (
          <div className="absolute inset-0 bg-slate-800 z-20 flex flex-col items-center justify-center animate-success-pulse">
             <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.6)] mb-4">
               <i className="fa-solid fa-check text-4xl md:text-5xl text-white"></i>
             </div>
             <div className="text-3xl md:text-4xl font-serif text-green-400 font-bold text-center px-2">{targetVocab.word}</div>
             <div className="text-slate-400 mt-2">Excellent!</div>
             {usedHint && <div className="text-yellow-500 text-sm font-bold mt-2">(Hint Used: 50% Effect)</div>}
          </div>
        )}

        {/* Close Button */}
        {!isSuccess && (
          <button 
            onClick={onCancel}
            className="absolute top-2 right-2 md:top-4 md:right-4 p-2 text-slate-400 hover:text-white transition-colors"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        )}

        <div className="text-center w-full mt-4">
          <h2 className="text-xl md:text-2xl font-bold text-yellow-400 mb-2">Spell to Cast!</h2>
          
          <div className="mt-4 md:mt-6 mb-4 flex flex-col items-center">
             {/* Clickable Phonetic */}
             <div 
                onClick={handleReveal}
                className="relative group cursor-pointer p-2"
                title="Click to reveal Answer (50% Power)"
             >
                <div className={`text-3xl md:text-4xl font-serif text-white mb-2 group-hover:text-yellow-400 transition-colors duration-200 ${isBlind ? 'blur-md select-none' : ''}`}>
                    {isBlind ? '???' : targetVocab.phonetic}
                </div>
                {!usedHint && (
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity whitespace-nowrap md:absolute md:-bottom-4 md:left-1/2 md:-translate-x-1/2">
                        Reveal (50% Power)
                    </div>
                )}
             </div>
             <div className={`text-sm md:text-lg text-slate-400 mt-1 md:mt-2 px-2 ${isBlind ? 'blur-sm bg-slate-700/50 text-transparent rounded' : ''}`}>
                 {targetVocab.meaning}
             </div>
             {isBlind && <div className="text-xs text-red-400 font-bold mt-2 uppercase tracking-widest"><i className="fa-solid fa-eye-slash"></i> Blinded</div>}
          </div>

          {/* Prominent Hint Area */}
          <div className={`transition-all duration-500 ease-out transform overflow-hidden ${showHint ? 'max-h-40 opacity-100 mb-4 md:mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
             <div className="bg-slate-900/50 border border-yellow-500/40 rounded-xl py-2 px-4 md:py-3 md:px-6 flex flex-col items-center shadow-[0_0_30px_rgba(234,179,8,0.15)] animate-bounce-in mx-auto max-w-[90%]">
                <div className="flex items-center gap-2 text-yellow-500 mb-1 opacity-80">
                   <i className="fa-solid fa-key text-xs"></i>
                   <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Answer</span>
                </div>
                <div className="text-2xl md:text-4xl font-serif font-bold text-white tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] break-all">
                    {targetVocab.word}
                </div>
             </div>
          </div>

          <form onSubmit={handleSubmit} className="relative w-full">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              disabled={isSuccess}
              className={`
                w-full bg-slate-900 border-2 rounded-lg py-3 pl-4 pr-10 text-center text-xl font-bold text-white outline-none focus:border-yellow-400 transition-all
                ${isError ? 'border-red-500 animate-shake' : 'border-slate-600'}
                ${isSuccess ? 'border-green-500 text-green-400' : ''}
              `}
              placeholder="Type word..."
              autoComplete="off"
            />
            
            <button 
              type="button" 
              onClick={() => audioService.speakWord(targetVocab.word)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-yellow-400"
            >
              <i className="fa-solid fa-volume-high text-xl"></i>
            </button>
          </form>
          
          <div className="mt-4 text-xs md:text-sm text-slate-500">
            Press Enter to Cast • Esc to Cancel
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpellingModal;