import type { UserProfile } from "../types/domain";

export const user: UserProfile = {
  name: "Player",
  shortName: "Player",
  avatar: "PL",
  portrait: "portrait-one",
  location: "Add your club or city",
  rating: "NTRP 3.5",
  level: 1,
  xp: 0,
  xpText: "0 / 1,000 XP",
  hand: "Add handedness",
  favoritePro: "",
  skills: [
    ["Forehand", 0],
    ["Backhand", 0],
    ["Serve", 0],
    ["Volley", 0],
    ["Slice", 0],
    ["Movement", 0]
  ],
  equipment: {
    racket: "Add racket",
    headSize: "Add head size",
    strings: "Add strings",
    tension: "Add tension",
    grip: "Add grip"
  }
};

export const opponent = {
  name: "Opponent",
  shortName: "Opponent",
  avatar: "OP",
  portrait: "portrait-two",
  rating: "NTRP",
  level: 1
};
