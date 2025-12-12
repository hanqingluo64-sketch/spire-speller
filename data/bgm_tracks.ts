
export interface BGMTrack {
  id: string;
  name: string;
  url: string;
}

export const BGM_LIBRARY: BGMTrack[] = [
  { id: 'MENU', name: 'Menu', url: '/music/menu.mp3' },
  { id: 'MAP', name: 'Map', url: '/music/map.mp3' },
  { id: 'COMBAT', name: 'Combat', url: '/music/combat.mp3' },
  { id: 'BOSS', name: 'Boss', url: '/music/boss.mp3' },
  { id: 'VICTORY', name: 'Victory', url: '/music/victory.mp3' },
  { id: 'MEDITATION', name: 'Meditation', url: '/music/meditation.mp3' },
  { id: 'SHOP', name: 'Shop', url: '/music/shop.mp3' }
];

export const getBgmUrl = (id: string): string => {
    const track = BGM_LIBRARY.find(t => t.id === id);
    return track ? track.url : BGM_LIBRARY[0].url;
};
