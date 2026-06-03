export const user = {
  name: "Alex Morgan",
  shortName: "A. Morgan",
  avatar: "AM",
  portrait: "portrait-one",
  location: "San Diego, CA",
  rating: "NTRP 4.0",
  level: 23,
  xp: 79,
  xpText: "2,750 / 3,500 XP",
  hand: "Right-handed",
  favoritePro: "Demo pro comparison",
  skills: [
    ["Forehand", 80],
    ["Backhand", 75],
    ["Serve", 85],
    ["Volley", 75],
    ["Slice", 65],
    ["Movement", 80]
  ],
  equipment: {
    racket: "Babolat Pure Aero 98",
    headSize: "98 sq in",
    strings: "Luxilon ALU Power",
    tension: "52 lb",
    grip: "4 3/8"
  }
};

export const opponent = {
  name: "Jamie Carter",
  shortName: "J. Carter",
  avatar: "JC",
  portrait: "portrait-two",
  rating: "NTRP 4.0",
  level: 19
};

export const recentMatches = [
  { id: 1, opponent: "Jamie Carter", result: "W", score: "6-3, 6-4", date: "Yesterday", aces: 7 },
  { id: 2, opponent: "Nora Kim", result: "L", score: "4-6, 7-6, 3-6", date: "Sat", aces: 3 }
];

export const highlights = [
  { id: 1, tag: "Ace", title: "Ace down the T", duration: "00:08", score: "Point 3 · 1st Set", tone: "lime" },
  { id: 2, tag: "Rally", title: "22 shot rally", duration: "00:14", score: "Point 7 · 1st Set", tone: "mint" },
  { id: 3, tag: "Winner", title: "Forehand winner", duration: "00:06", score: "Point 12 · 2nd Set", tone: "peach" },
  { id: 4, tag: "Match Point", title: "Match Point", duration: "00:10", score: "Point 40 · 3rd Set", tone: "sky" }
];

export const nearbyPlayers = [
  { rank: 1, name: "Ethan Brooks", avatar: "EB", portrait: "portrait-three", level: 23, distance: "1.2 mi", streak: 12, points: 2450 },
  { rank: 2, name: "Olivia Martinez", avatar: "OM", portrait: "portrait-four", level: 21, distance: "2.1 mi", streak: 7, points: 2120 },
  { rank: 3, name: "Lucas Green", avatar: "LG", portrait: "portrait-five", level: 20, distance: "2.4 mi", streak: 5, points: 1890 },
  { rank: 4, name: "Maya Patel", avatar: "MP", portrait: "portrait-six", level: 18, distance: "3.0 mi", streak: 3, points: 1560 },
  { rank: 5, name: "Noah Kim", avatar: "NK", portrait: "portrait-seven", level: 17, distance: "3.8 mi", streak: 2, points: 1230 }
];

export const recapStats: Array<[string, string, string, number]> = [
  ["Aces", "7", "5", 62],
  ["Winners", "34", "28", 64],
  ["Unforced Errors", "18", "24", 42]
];
