import type { UserProfile } from "../types/domain";

export const user: UserProfile = {
  name: "Player",
  shortName: "Player",
  avatar: "PL",
  portrait: "portrait-one",
  location: "Add your club or city",
  rating: "0 pts",
  level: 0,
  xp: 0,
  xpText: "0 match pts",
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
  skillVotes: {},
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
  rating: "Opponent",
  level: 0
};
