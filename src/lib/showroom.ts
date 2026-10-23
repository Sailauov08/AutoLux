const photo = (id: string, width = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=75`;

export const SHOWROOM_ZONES = [
  { key: "gallery", src: photo("photo-1767907571229-01cf4ba03590") },
  { key: "reception", src: photo("photo-1765766601432-edcdc9ae017d") },
  { key: "lounge", src: photo("photo-1758915753332-cab59126742c") },
  { key: "vip", src: photo("photo-1758448500596-ce0e0239f1be") },
] as const;

export const SHOWROOM_HERO = photo("photo-1758743460496-54bb89dbee8a", 2200);
