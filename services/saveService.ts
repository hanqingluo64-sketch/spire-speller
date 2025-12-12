
import { UserProfile, RunState, Vocabulary } from '../types';

const PROFILES_KEY = 'spire_speller_profiles_v2';

export const saveManager = {
  // --- Profile Management ---

  getAllProfiles(): UserProfile[] {
    try {
      const data = localStorage.getItem(PROFILES_KEY);
      let profiles: UserProfile[] = data ? JSON.parse(data) : [];
      
      let changed = false;
      profiles = profiles.map(p => {
        // MIGRATION: Move activeRun to saveSlots[0]
        if (!p.saveSlots) {
          p.saveSlots = {};
          if (p.activeRun) {
            // p.activeRun is legacy RunState, might miss new fields but that's okay, App handles nulls
            // We won't auto-migrate here to avoid type mismatch complexities, just init empty slots
          }
          changed = true;
        }
        // MIGRATION: Add currency and unlocks if missing
        if (typeof p.currency === 'undefined') {
            p.currency = 0;
            changed = true;
        }
        if (!p.unlocks) {
            p.unlocks = [];
            changed = true;
        }
        // MIGRATION: Add actsCleared
        if (!p.actsCleared) {
            p.actsCleared = [];
            changed = true;
        }
        return p;
      });

      if (changed) {
        this.saveProfilesToStorage(profiles);
      }

      return profiles;
    } catch (e) {
      console.error("Failed to load profiles", e);
      return [];
    }
  },

  createProfile(name: string): UserProfile {
    const profiles = this.getAllProfiles();
    
    // Check limit (3 profiles)
    if (profiles.length >= 3) {
      throw new Error("Max profiles reached");
    }

    const newProfile: UserProfile = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim() || "Traveler",
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      stats: { runsStarted: 0, wins: 0, wordsMastered: 0 },
      currency: 0, // Reset to 0 for proper economy balance
      unlocks: [],
      actsCleared: [],
      masteryProgress: {},
      saveSlots: {} // Initialize empty slots
    };

    profiles.push(newProfile);
    this.saveProfilesToStorage(profiles);
    return newProfile;
  },

  deleteProfile(id: string) {
    const profiles = this.getAllProfiles().filter(p => p.id !== id);
    this.saveProfilesToStorage(profiles);
  },

  updateProfile(profile: UserProfile) {
    const profiles = this.getAllProfiles();
    const index = profiles.findIndex(p => p.id === profile.id);
    if (index !== -1) {
      profiles[index] = { ...profile, lastPlayed: Date.now() };
      this.saveProfilesToStorage(profiles);
    }
  },

  saveProfilesToStorage(profiles: UserProfile[]) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  },

  // --- Run State Management (Slots) ---

  saveRun(profileId: string, runState: RunState, slotId: number) {
    if (slotId < 0 || slotId > 4) return; // Only 5 slots
    
    const profiles = this.getAllProfiles();
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      if (!profile.saveSlots) profile.saveSlots = {};
      profile.saveSlots[slotId] = runState;
      profile.lastPlayed = Date.now();
      
      // Update local storage
      const index = profiles.findIndex(p => p.id === profileId);
      profiles[index] = profile;
      this.saveProfilesToStorage(profiles);
    }
  },

  deleteRunFromSlot(profileId: string, slotId: number) {
    const profiles = this.getAllProfiles();
    const profile = profiles.find(p => p.id === profileId);
    if (profile && profile.saveSlots) {
      delete profile.saveSlots[slotId];
      // Update local storage
      const index = profiles.findIndex(p => p.id === profileId);
      profiles[index] = profile;
      this.saveProfilesToStorage(profiles);
    }
  },

  // --- Mastery Persistence ---
  
  // Merge local game mastery state into the profile
  syncMastery(profileId: string, vocabList: Vocabulary[]) {
    const profiles = this.getAllProfiles();
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;

    let masterCount = 0;
    vocabList.forEach(v => {
      // Save full vocabulary state to ensure compatibility with Record<string, Vocabulary>
      profile.masteryProgress[v.id] = v;
      
      if (v.proficiency >= 5) masterCount++;
    });
    
    profile.stats.wordsMastered = masterCount;
    this.saveProfilesToStorage(profiles);
  },

  // Apply profile mastery to a fresh vocab list
  applyMasteryToVocab(profile: UserProfile, vocabList: Vocabulary[]): Vocabulary[] {
    return vocabList.map(v => {
      const saved = profile.masteryProgress[v.id];
      if (saved) {
        return { 
          ...v, 
          // Update with saved progress
          proficiency: saved.proficiency,
          masteryStreak: saved.masteryStreak,
          failStreak: saved.failStreak,
          isActive: saved.isActive,
          lastReview: saved.lastReview,
          nextReview: saved.nextReview,
          isRetest: saved.isRetest
        };
      }
      return v;
    });
  }
};
