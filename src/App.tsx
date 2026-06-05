import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Download,
  Dumbbell,
  Flame,
  Gauge,
  Heart,
  Home,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Mic,
  Minus,
  MoreHorizontal,
  Shuffle,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Trash2,
  UserPlus,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
  Zap
} from "lucide-react";
import { opponent, user } from "./data/starterData";
import { createMatchRecord, type MatchFeedbackInput, type MatchStatsInput } from "./backend/createMatchRecord";
import {
  createEmailAccount,
  getCurrentAppUser,
  sendPasswordReset,
  signInWithEmail,
  signOutAppUser,
  subscribeToAppAuthState,
  type AppUser
} from "./backend/authRepository";
import { getBackendMode, listUserMatchRecords, saveMatchRecord } from "./backend/matchRepository";
import {
  createMatchRemoteSession,
  markMatchRemoteCommandHandled,
  sendMatchRemoteCommand,
  subscribeToMatchRemoteCommands,
  type MatchRemoteCommand,
  type MatchRemoteCommandType,
  type MatchRemoteSession
} from "./backend/matchRemoteRepository";
import { listPlayerLocations, savePlayerLocation, subscribeToPlayerLocations, toNearbyPlayers } from "./backend/nearbyRepository";
import { publishPlayerDirectoryProfile, searchPlayerDirectoryProfiles, type PlayerDirectoryProfile } from "./backend/playerDirectoryRepository";
import { createManagedUserProfile, deleteUserProfile, listUserProfiles, loadUserProfile, saveUserProfile } from "./backend/profileRepository";
import {
  acceptFriendRequest,
  declineFriendRequest,
  listFriendRequests,
  listFriendships,
  listFriendMessages,
  listIncomingSocialActions,
  listSentFriendRequests,
  sendFriendRequest,
  sendSocialMessage,
  sendSocialAction,
  subscribeToFriendMessages,
  subscribeToFriendRequests,
  subscribeToFriendships,
  subscribeToIncomingSocialActions,
  toSocialProfile,
  updateSocialActionStatus,
  type FriendRequest,
  type Friendship,
  type SocialAction,
  type SocialMessage,
  type SocialProfileSnapshot
} from "./backend/socialRepository";
import { usePersistentState } from "./hooks/usePersistentState";
import { createMatch, getCompletedSets, getFinalScore, getPointDisplay, scorePoint, undoPoint, type MatchState } from "./lib/tennisScoring";
import type { AdminUserProfile, MatchRecord, NearbyPlayer, UserProfile } from "./types/domain";
import "./styles.css";

type Screen = "home" | "live" | "complete" | "highlights" | "social" | "profile" | "account" | "admin";
type AuthPhase = "loading" | "signed-out" | "signed-in";
type MatchMode = "setup" | "playing";
type GpsPoint = {
  accuracy?: number;
  latitude: number;
  longitude: number;
};
type TennisCourt = {
  details?: string;
  distance: string;
  distanceKm: number;
  id: string;
  lat: number;
  lng: number;
  name: string;
};
type PointTag = {
  acePlayer?: 0 | 1;
  winnerPlayer?: 0 | 1;
  errorPlayer?: 0 | 1;
  shot?: string;
  source?: "remote" | "tap" | "voice";
};
type VoicePrompt = {
  action: "point" | "ace" | "winner" | "error";
  title: string;
  detail: string;
};
type MatchProgression = {
  engagementPoints: number;
  gamesLost: number;
  gamesWon: number;
  level: number;
  losses: number;
  matchPoints: number;
  nextLevelPoints: number;
  points: number;
  wins: number;
  xp: number;
  xpText: string;
};
type EngagementReward = NonNullable<UserProfile["engagement"]>["rewards"][string];
type SkillFeedback = Record<string, -1 | 0 | 1 | undefined>;
type FriendSearchResult = PlayerDirectoryProfile & {
  source: "directory" | "known";
};
type MatchOptions = {
  customNames: boolean;
  scorer: 0 | 1;
  server: 0 | 1 | 2 | 3;
  sideA: [string, string];
  sideB: [string, string];
  singles: boolean;
  soundEnabled: boolean;
};
type RemoteRouteParams = {
  players: [string, string];
  sessionId: string;
  token: string;
};

const ADMIN_EMAIL = "gorodscyflavio@gmail.com";
const AUTH_ACTION_TIMEOUT_MS = 15000;
const defaultMatchOptions: MatchOptions = {
  customNames: true,
  scorer: 0,
  server: 0,
  sideA: [user.name, "Partner"],
  sideB: [opponent.name, "Partner"],
  singles: true,
  soundEnabled: true
};

const emptyMatchStats: MatchStatsInput = {
  aces: [0, 0],
  winners: [0, 0],
  unforcedErrors: [0, 0]
};

const famousTennisPlayerProfiles = [
  { name: "Roger Federer", style: "all-court elegance", skills: [94, 91, 89, 88, 92, 90] },
  { name: "Serena Williams", style: "power serve and first strike", skills: [91, 88, 98, 80, 76, 88] },
  { name: "Rafael Nadal", style: "heavy topspin and relentless defense", skills: [96, 89, 86, 78, 84, 98] },
  { name: "Novak Djokovic", style: "returning, balance, and backhand control", skills: [90, 97, 87, 82, 86, 97] },
  { name: "Venus Williams", style: "aggressive baseline and net pressure", skills: [88, 86, 93, 86, 74, 90] },
  { name: "Carlos Alcaraz", style: "explosive attack and drop-shot creativity", skills: [96, 91, 89, 87, 91, 98] },
  { name: "Iga Swiatek", style: "forehand pressure and footwork", skills: [95, 89, 84, 77, 83, 96] },
  { name: "Coco Gauff", style: "movement, defense, and improving attack", skills: [87, 90, 89, 82, 78, 97] },
  { name: "Naomi Osaka", style: "serve plus forehand power", skills: [94, 86, 95, 72, 74, 86] },
  { name: "Maria Sharapova", style: "flat baseline aggression", skills: [91, 89, 91, 72, 70, 84] },
  { name: "Steffi Graf", style: "forehand, slice, and speed", skills: [98, 84, 87, 82, 95, 96] },
  { name: "Andre Agassi", style: "early ball striking and return pressure", skills: [92, 94, 84, 75, 80, 88] },
  { name: "Pete Sampras", style: "serve, volley, and clutch points", skills: [88, 84, 99, 96, 86, 89] },
  { name: "Billie Jean King", style: "complete all-court problem solving", skills: [88, 87, 86, 94, 86, 90] },
  { name: "Martina Navratilova", style: "serve-volley and athletic court coverage", skills: [88, 90, 90, 99, 88, 96] },
  { name: "Jannik Sinner", style: "clean power and baseline timing", skills: [94, 93, 91, 78, 78, 94] },
  { name: "João Fonseca", style: "fearless forehand and rising baseline power", skills: [92, 86, 88, 74, 76, 90] }
] as const;

const famousTennisPlayers = famousTennisPlayerProfiles.map((player) => player.name);

const navItems: Array<{ screen: Screen; label: string; icon: typeof Home }> = [
  { screen: "home", label: "Play", icon: Home },
  { screen: "highlights", label: "Matches", icon: Calendar },
  { screen: "social", label: "Social", icon: Users },
  { screen: "profile", label: "Profile", icon: CircleUserRound }
];

export default function App() {
  const [screen, setScreen] = usePersistentState<Screen>("acetrack:screen", "home");
  const [profile, setProfile] = usePersistentState<UserProfile>("acetrack:profile", user);
  const [match, setMatch] = usePersistentState("acetrack:live-match", createMatch([user.name, opponent.name]));
  const [matchMode, setMatchMode] = usePersistentState<MatchMode>("acetrack:match-mode", "setup");
  const [matchOptions, setMatchOptions] = usePersistentState<MatchOptions>("acetrack:match-options", defaultMatchOptions);
  const [matchStartedAt, setMatchStartedAt] = usePersistentState<number | undefined>("acetrack:match-started-at", undefined);
  const [matchStats, setMatchStats] = usePersistentState<MatchStatsInput>("acetrack:match-stats", emptyMatchStats);
  const [pointTags, setPointTags] = usePersistentState<PointTag[]>("acetrack:point-tags", []);
  const [pendingAce, setPendingAce] = usePersistentState<0 | 1 | undefined>("acetrack:pending-ace", undefined);
  const [pendingShotTag, setPendingShotTag] = usePersistentState<string | undefined>("acetrack:pending-shot-tag", undefined);
  const [skillFeedback, setSkillFeedback] = usePersistentState<SkillFeedback>("acetrack:skill-feedback", {});
  const [opponentSkillFeedback, setOpponentSkillFeedback] = usePersistentState<SkillFeedback>("acetrack:opponent-skill-feedback", {});
  const [activeFilter, setActiveFilter] = usePersistentState("acetrack:highlight-filter", "All");
  const [socialTab, setSocialTab] = usePersistentState("acetrack:social-tab", "Nearby");
  const [saveStatus, setSaveStatus] = useState("");
  const [profileSaveStatus, setProfileSaveStatus] = useState("");
  const [matchRecords, setMatchRecords] = useState<MatchRecord[]>([]);
  const [matchRecordsStatus, setMatchRecordsStatus] = useState("No saved matches yet");
  const [appMessage, setAppMessage] = useState("");
  const [incomingActions, setIncomingActions] = useState<SocialAction[]>([]);
  const [challengeBannerDismissed, setChallengeBannerDismissed] = useState(false);
  const [accountStatus, setAccountStatus] = useState("Checking account...");
  const [authPhase, setAuthPhase] = useState<AuthPhase>("loading");
  const [appUser, setAppUser] = useState<AppUser | undefined>();
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Voice ready");
  const [voicePrompt, setVoicePrompt] = useState<VoicePrompt | undefined>();
  const [remoteSession, setRemoteSession] = usePersistentState<MatchRemoteSession | undefined>("acetrack:match-remote-session", undefined);
  const [remoteStatus, setRemoteStatus] = useState("Watch remote starts after the match begins.");
  const remoteParams = useMemo(() => getRemoteRouteParams(), []);
  const hydratedUserRef = useRef<string | undefined>(undefined);
  const handledRemoteCommandIdsRef = useRef(new Set<string>());
  const matchRef = useRef(match);
  const matchOptionsRef = useRef(matchOptions);
  const pendingAceRef = useRef(pendingAce);
  const pendingShotTagRef = useRef(pendingShotTag);
  const pointTagsRef = useRef(pointTags);
  const voicePromptRef = useRef(voicePrompt);
  const voiceShouldListenRef = useRef(false);
  const screenRef = useRef(screen);
  const voiceRecognitionRef = useRef<{ start: () => void; stop: () => void; abort?: () => void; onend: (() => void) | null; onerror: ((event: unknown) => void) | null; onresult: ((event: unknown) => void) | null; continuous?: boolean; interimResults?: boolean; lang?: string } | undefined>(undefined);

  const progression = useMemo(() => getPlayerProgression(matchRecords, profile.engagement), [matchRecords, profile.engagement]);
  const displayProfile = useMemo(() => applyMatchProgression(profile, progression), [profile, progression]);
  const pointDisplay = getPointDisplay(match);
  const sets = getCompletedSets(match);
  const elapsedMatchTime = useElapsedTime(matchStartedAt, matchMode === "playing");
  const winnerName = match.winner !== undefined ? match.players[match.winner] : "";
  const finalScore = getFinalScore(match) || getLiveScoreSummary(match);
  const isAdmin = appUser?.email?.toLowerCase() === ADMIN_EMAIL;
  const incomingChallenges = incomingActions.filter((action) => action.type === "challenge");

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    if (screen === "live" || !voiceShouldListenRef.current) return;
    voiceShouldListenRef.current = false;
    voiceRecognitionRef.current?.stop();
    setIsVoiceListening(false);
  }, [screen]);

  useEffect(() => {
    matchRef.current = match;
  }, [match]);

  useEffect(() => {
    matchOptionsRef.current = matchOptions;
  }, [matchOptions]);

  useEffect(() => {
    pendingAceRef.current = pendingAce;
  }, [pendingAce]);

  useEffect(() => {
    pendingShotTagRef.current = pendingShotTag;
  }, [pendingShotTag]);

  useEffect(() => {
    pointTagsRef.current = pointTags;
  }, [pointTags]);

  useEffect(() => {
    voicePromptRef.current = voicePrompt;
  }, [voicePrompt]);

  useEffect(() => {
    if (!remoteSession || screen !== "live" || matchMode !== "playing") return;

    let isActive = true;
    let unsubscribe = () => {};
    setRemoteStatus("Connecting watch remote...");

    subscribeToMatchRemoteCommands(remoteSession.id, async (command) => {
      if (!isActive || command.handled || command.token !== remoteSession.token || handledRemoteCommandIdsRef.current.has(command.id)) return;

      handledRemoteCommandIdsRef.current.add(command.id);
      handleRemoteCommand(command);
      await markMatchRemoteCommandHandled(remoteSession.id, command.id).catch((error) => {
        console.warn("Could not mark watch command handled.", error);
      });
    })
      .then((nextUnsubscribe) => {
        if (!isActive) {
          nextUnsubscribe();
          return;
        }

        unsubscribe = nextUnsubscribe;
        setRemoteStatus("Watch remote connected.");
      })
      .catch((error) => {
        console.warn("Watch remote listener failed.", error);
        setRemoteStatus(getRemoteErrorMessage(error));
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [matchMode, remoteSession, screen]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeAuth = () => {};
    const loadingTimeout = window.setTimeout(() => {
      if (!isMounted) return;
      setAccountStatus("Not signed in");
      setAuthPhase("signed-out");
    }, 3200);

    subscribeToAppAuthState(
      (nextUser) => {
        if (!isMounted) return;
        window.clearTimeout(loadingTimeout);
        if (nextUser) {
          finishSignedIn(nextUser);
          return;
        }

        hydratedUserRef.current = undefined;
        setAppUser(undefined);
        setAccountStatus("Not signed in");
        setAuthPhase("signed-out");
      },
      (error) => {
        if (!isMounted) return;
        window.clearTimeout(loadingTimeout);
        console.warn("Firebase auth state failed.", error);
        hydratedUserRef.current = undefined;
        setAppUser(undefined);
        setAccountStatus("Account unavailable");
        setAuthPhase("signed-out");
      }
    )
      .then((unsubscribe) => {
        if (!isMounted) {
          unsubscribe();
          return;
        }
        unsubscribeAuth = unsubscribe;
      })
      .catch((error) => {
        if (!isMounted) return;
        window.clearTimeout(loadingTimeout);
        console.warn("Firebase auth listener failed.", error);
        hydratedUserRef.current = undefined;
        setAppUser(undefined);
        setAccountStatus("Account unavailable");
        setAuthPhase("signed-out");
      });

    return () => {
      isMounted = false;
      window.clearTimeout(loadingTimeout);
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (screen === "admin" && !isAdmin) setScreen("home");
  }, [isAdmin, screen, setScreen]);

  useEffect(() => {
    if (!appUser) {
      setMatchRecords([]);
      setMatchRecordsStatus("Sign in to load saved matches");
      setIncomingActions([]);
      return;
    }

    refreshMatchRecords(appUser.id);
    refreshIncomingActions(appUser.id);
  }, [appUser]);

  useEffect(() => {
    const migratedProfile = sanitizeProfile(profile, appUser);
    if (migratedProfile !== profile) {
      setProfile(migratedProfile);
      if (appUser) {
        saveUserProfile(appUser.id, migratedProfile).catch((error) => {
          console.warn("Profile migration save failed.", error);
        });
      }
      return;
    }

    setMatchOptions((current) => sanitizeMatchOptions(current, migratedProfile.name));
    setMatch((current) => sanitizeMatchState(current, migratedProfile.name));
  }, [appUser, profile, setMatch, setMatchOptions, setProfile]);

  useEffect(() => {
    return () => {
      voiceShouldListenRef.current = false;
      voiceRecognitionRef.current?.abort?.();
    };
  }, []);

  async function refreshMatchRecords(userId: string) {
    setMatchRecordsStatus("Loading saved matches...");
    try {
      const records = await listUserMatchRecords(userId);
      setMatchRecords(records);
      setMatchRecordsStatus(records.length ? `${records.length} saved match${records.length === 1 ? "" : "es"}` : "No saved matches yet");
    } catch (error) {
      console.warn("Match records failed to load.", error);
      setMatchRecords([]);
      setMatchRecordsStatus(getMatchRecordsErrorMessage(error));
    }
  }

  async function refreshIncomingActions(userId: string) {
    try {
      const actions = await listIncomingSocialActions(userId);
      setIncomingActions(actions);
      if (actions.some((action) => action.type === "challenge")) setChallengeBannerDismissed(false);
    } catch (error) {
      console.warn("Incoming social actions failed to load.", error);
    }
  }

  function showMessage(message: string) {
    setAppMessage(message);
    window.setTimeout(() => setAppMessage(""), 2400);
  }

  function resetRemoteScoring(status = "Watch remote starts after the match begins.") {
    handledRemoteCommandIdsRef.current = new Set<string>();
    setRemoteSession(undefined);
    setRemoteStatus(status);
  }

  async function persistProfile(nextProfile: UserProfile, message = "Profile saved") {
    const progressedProfile = applyMatchProgression(nextProfile, getPlayerProgression(matchRecords, nextProfile.engagement));
    setProfile(progressedProfile);
    setProfileSaveStatus("Saving profile...");
    const activeUser = appUser ?? await getCurrentAppUser();
    setAppUser(activeUser);
    const result = await saveUserProfile(activeUser.id, progressedProfile);
    setProfileSaveStatus(result.mode === "firebase" ? "Profile saved to cloud" : "Profile saved locally");
    showMessage(message);
    return progressedProfile;
  }

  async function awardProfileXp(id: string, reward: EngagementReward) {
    const result = addEngagementReward(profile, id, reward);
    if (!result.awarded) return false;

    await persistProfile(result.profile, `+${reward.points} Ace XP · ${reward.label}`);
    return true;
  }

  async function hydrateProfile(appUser: AppUser) {
    setProfileSaveStatus("Loading profile...");
    const result = await loadUserProfile(appUser.id);

    if (result.profile) {
      const nextProfile = sanitizeProfile(result.profile, appUser);
      setProfile(nextProfile);
      setProfileSaveStatus(result.mode === "firebase" ? "Profile loaded from cloud" : "Profile loaded locally");
      if (nextProfile !== result.profile || result.mode === "firebase") {
        await saveUserProfile(appUser.id, nextProfile);
        setProfileSaveStatus(nextProfile !== result.profile ? "Profile cleaned and saved" : "Profile loaded from cloud");
      }
      return nextProfile;
    }

    const nextProfile = sanitizeProfile(profile, appUser);
    setProfile(nextProfile);
    const saveResult = await saveUserProfile(appUser.id, nextProfile);
    setProfileSaveStatus(saveResult.mode === "firebase" ? "Profile saved to cloud" : "Profile saved locally");
    return nextProfile;
  }

  function startProfileHydration(appUser: AppUser) {
    hydrateProfile(appUser).catch((error) => {
      console.warn("Profile sync failed after sign-in.", error);
      setProfileSaveStatus("Profile sync needs retry");
    });
  }

  function finishSignedIn(appUser: AppUser, options: { message?: string; navigateHome?: boolean } = {}) {
    setAppUser(appUser);
    setAccountStatus(formatAccountStatus(appUser));
    setAuthPhase("signed-in");

    if (options.navigateHome || screenRef.current === "account") {
      setScreen("home");
    }

    if (hydratedUserRef.current !== appUser.id) {
      hydratedUserRef.current = appUser.id;
      startProfileHydration(appUser);
    }

    if (options.message) showMessage(options.message);
  }

  function addPoint(player: 0 | 1, tag: PointTag = {}) {
    const activeMatch = matchRef.current;
    const activePendingAce = pendingAceRef.current;
    const activePendingShotTag = pendingShotTagRef.current;
    if (activeMatch.winner !== undefined) return;

    if (activePendingAce !== undefined && activePendingAce !== player && tag.acePlayer === undefined) {
      showMessage(`Ace is tagged for ${activeMatch.players[activePendingAce]}. Score that player or clear the tag.`);
      return;
    }

    const next = scorePoint(activeMatch, player);
    matchRef.current = next;
    setMatch(next);
    const pointTag: PointTag = {
      ...tag,
      acePlayer: tag.acePlayer ?? (activePendingAce === player ? player : undefined),
      shot: tag.shot ?? activePendingShotTag,
      source: tag.source ?? (activePendingAce === player || activePendingShotTag ? "tap" : undefined)
    };
    setPointTags((current) => {
      const nextTags = [...current, pointTag];
      pointTagsRef.current = nextTags;
      return nextTags;
    });
    if (pointTag.acePlayer !== undefined) {
      setMatchStats((current) => ({ ...current, aces: incrementPair(current.aces, pointTag.acePlayer!) }));
    }
    if (pointTag.winnerPlayer !== undefined) {
      setMatchStats((current) => ({ ...current, winners: incrementPair(current.winners, pointTag.winnerPlayer!) }));
    }
    if (pointTag.errorPlayer !== undefined) {
      setMatchStats((current) => ({ ...current, unforcedErrors: incrementPair(current.unforcedErrors, pointTag.errorPlayer!) }));
    }
    clearPendingScoringTags();
    playUiSound(player === 0 ? "point" : "opponent", matchOptionsRef.current.soundEnabled);
    if (next.winner !== undefined) setScreen("complete");
  }

  function clearPendingScoringTags() {
    pendingAceRef.current = undefined;
    pendingShotTagRef.current = undefined;
    voicePromptRef.current = undefined;
    setPendingAce(undefined);
    setPendingShotTag(undefined);
    setVoicePrompt(undefined);
  }

  function clearVoicePrompt() {
    voicePromptRef.current = undefined;
    setVoicePrompt(undefined);
  }

  function toggleAceTag(player: 0 | 1) {
    setPendingAce((current) => {
      const next = current === player ? undefined : player;
      pendingAceRef.current = next;
      showMessage(next === undefined ? "Ace tag cleared" : `Ace tagged for ${matchRef.current.players[next]}. Tap their point to score it.`);
      return next;
    });
    clearVoicePrompt();
    playUiSound("tap", matchOptionsRef.current.soundEnabled);
  }

  function recordVoicePoint(player: 0 | 1, shot?: string) {
    const playerName = matchRef.current.players[player];
    addPoint(player, { shot, source: "voice" });
    setVoiceStatus(`${shot ? `${shot} ` : ""}Point ${playerName}`);
  }

  function recordVoiceAce(player: 0 | 1) {
    const playerName = matchRef.current.players[player];
    addPoint(player, { acePlayer: player, shot: "Ace", source: "voice" });
    setVoiceStatus(`Ace ${playerName}`);
    showMessage(`Ace recorded for ${playerName}`);
  }

  function recordVoiceWinner(player: 0 | 1, shot?: string) {
    const playerName = matchRef.current.players[player];
    const label = shot ? `${shot} winner` : "Winner";
    addPoint(player, { winnerPlayer: player, shot: label, source: "voice" });
    setVoiceStatus(`${label} ${playerName}`);
    showMessage(`${label} recorded for ${playerName}`);
  }

  function recordVoiceError(player: 0 | 1) {
    const playerName = matchRef.current.players[player];
    const pointWinner = player === 0 ? 1 : 0;
    addPoint(pointWinner, { errorPlayer: player, shot: "Unforced error", source: "voice" });
    setVoiceStatus(`Error ${playerName}`);
    showMessage(`Error recorded for ${playerName}`);
  }

  function handleRemoteCommand(command: MatchRemoteCommand) {
    const activePlayers = matchRef.current.players;

    if (command.type === "pointA") {
      addPoint(0, { source: "remote" });
      setVoiceStatus(`Watch: point ${activePlayers[0]}`);
      return;
    }

    if (command.type === "pointB") {
      addPoint(1, { source: "remote" });
      setVoiceStatus(`Watch: point ${activePlayers[1]}`);
      return;
    }

    if (command.type === "aceA") {
      addPoint(0, { acePlayer: 0, shot: "Ace", source: "remote" });
      setVoiceStatus(`Watch: ace ${activePlayers[0]}`);
      showMessage(`Ace recorded for ${activePlayers[0]}`);
      return;
    }

    if (command.type === "aceB") {
      addPoint(1, { acePlayer: 1, shot: "Ace", source: "remote" });
      setVoiceStatus(`Watch: ace ${activePlayers[1]}`);
      showMessage(`Ace recorded for ${activePlayers[1]}`);
      return;
    }

    if (command.type === "undo") {
      undoMatchAction();
      setVoiceStatus("Watch: undo");
      return;
    }

    playUiSound("end", matchOptionsRef.current.soundEnabled);
    setVoiceStatus("Watch: match ended");
    setScreen("complete");
  }

  function promptForVoicePlayer(prompt: VoicePrompt) {
    setVoicePrompt(prompt);
    voicePromptRef.current = prompt;
    setVoiceStatus(prompt.title);
    showMessage(prompt.detail);
  }

  function handleVoicePromptSelection(player: 0 | 1) {
    const activePrompt = voicePromptRef.current ?? voicePrompt;
    if (!activePrompt) return;

    completeVoicePromptSelection(activePrompt, player);
  }

  function completeVoicePromptSelection(prompt: VoicePrompt, player: 0 | 1) {
    if (prompt.action === "ace") {
      recordVoiceAce(player);
      return;
    }

    if (prompt.action === "winner") {
      recordVoiceWinner(player, pendingShotTagRef.current);
      return;
    }

    if (prompt.action === "error") {
      recordVoiceError(player);
      return;
    }

    recordVoicePoint(player);
  }

  function undoMatchAction() {
    const activeMatch = matchRef.current;
    const activePendingAce = pendingAceRef.current;
    const activePointTags = pointTagsRef.current;
    if (activePendingAce !== undefined) {
      pendingAceRef.current = undefined;
      setPendingAce(undefined);
      showMessage("Ace tag cleared");
      playUiSound("undo", matchOptionsRef.current.soundEnabled);
      return;
    }

    if (!activeMatch.history.length) {
      showMessage("No point to undo");
      return;
    }

    const lastTag = activePointTags.at(-1);
    const previousMatch = undoPoint(activeMatch);
    matchRef.current = previousMatch;
    setMatch(previousMatch);
    setPointTags((current) => {
      const nextTags = current.slice(0, -1);
      pointTagsRef.current = nextTags;
      return nextTags;
    });
    if (lastTag?.acePlayer !== undefined) {
      setMatchStats((current) => ({ ...current, aces: decrementPair(current.aces, lastTag.acePlayer!) }));
    }
    if (lastTag?.winnerPlayer !== undefined) {
      setMatchStats((current) => ({ ...current, winners: decrementPair(current.winners, lastTag.winnerPlayer!) }));
    }
    if (lastTag?.errorPlayer !== undefined) {
      setMatchStats((current) => ({ ...current, unforcedErrors: decrementPair(current.unforcedErrors, lastTag.errorPlayer!) }));
    }
    clearVoicePrompt();
    playUiSound("undo", matchOptionsRef.current.soundEnabled);
  }

  function startNewMatch() {
    setMatchMode("setup");
    setSaveStatus("");
    resetRemoteScoring();
    pointTagsRef.current = [];
    setPointTags([]);
    clearPendingScoringTags();
    setScreen("live");
  }

  function startChallenge(playerName: string) {
    const nextOptions = normalizeMatchOptions({
      ...matchOptions,
      customNames: true,
      sideA: [profile.name, "Partner"],
      sideB: [playerName, "Partner"],
      singles: true
    }, profile.name);
    setMatchOptions(nextOptions);
    setMatchMode("setup");
    setSaveStatus("");
    resetRemoteScoring();
    pointTagsRef.current = [];
    setPointTags([]);
    clearPendingScoringTags();
    setScreen("live");
  }

  async function acceptIncomingAction(action: SocialAction) {
    await updateSocialActionStatus(action, "accepted");
    setIncomingActions((current) => current.filter((item) => item.id !== action.id));
    if (action.type === "challenge") {
      startChallenge(action.fromProfile.name);
      showMessage(`Challenge accepted from ${action.fromProfile.name}`);
    } else {
      showMessage(`Poke answered`);
    }
  }

  async function dismissIncomingAction(action: SocialAction) {
    await updateSocialActionStatus(action, "dismissed");
    setIncomingActions((current) => current.filter((item) => item.id !== action.id));
    showMessage(`${action.type === "challenge" ? "Challenge" : "Poke"} dismissed`);
  }

  function beginMatch(options: MatchOptions) {
    const normalizedOptions = normalizeMatchOptions(options, profile.name);
    const nextMatch = createMatch(getMatchSideNames(normalizedOptions));
    nextMatch.server = getInitialServerSide(normalizedOptions);
    resetRemoteScoring("Creating watch remote...");
    matchRef.current = nextMatch;
    matchOptionsRef.current = normalizedOptions;
    setMatchOptions(normalizedOptions);
    setMatch(nextMatch);
    setMatchStartedAt(Date.now());
    setMatchStats(emptyMatchStats);
    pointTagsRef.current = [];
    setPointTags([]);
    clearPendingScoringTags();
    setSkillFeedback({});
    setOpponentSkillFeedback({});
    setMatchMode("playing");
    setSaveStatus("");
    setScreen("live");
    playUiSound("start", normalizedOptions.soundEnabled);
    showMessage("Match started");
    createRemoteSessionForMatch(nextMatch);
  }

  async function createRemoteSessionForMatch(nextMatch: MatchState) {
    try {
      const activeUser = appUser ?? await getCurrentAppUser();
      setAppUser(activeUser);
      if (activeUser.mode !== "firebase") {
        setRemoteStatus("Watch remote needs a Firebase sign-in so your watch can talk to this phone.");
        return;
      }

      const session = await createMatchRemoteSession(activeUser.id, nextMatch.players);
      if (!session) {
        setRemoteStatus("Watch remote needs Firebase.");
        return;
      }

      setRemoteSession(session);
      setRemoteStatus("Watch remote ready. Open or share it to Apple Watch.");
    } catch (error) {
      console.warn("Could not create watch remote.", error);
      setRemoteStatus(getRemoteErrorMessage(error));
    }
  }

  async function shareRemoteLink() {
    if (!remoteSession) {
      showMessage("Start the match first to create the watch remote");
      return;
    }

    const url = getRemoteScoringUrl(remoteSession);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "AceTrack Watch Remote",
          text: "Open this on Apple Watch to score the match from your wrist.",
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        showMessage("Watch remote link copied");
      }
    } catch (error) {
      console.warn("Could not share watch remote.", error);
      showMessage("Watch remote link ready");
    }
  }

  function toggleSound() {
    setMatchOptions((current) => {
      const next = { ...current, soundEnabled: !current.soundEnabled };
      matchOptionsRef.current = next;
      playUiSound(next.soundEnabled ? "start" : "tap", next.soundEnabled);
      return next;
    });
  }

  function toggleVoiceCommands() {
    if (isVoiceListening) {
      voiceShouldListenRef.current = false;
      voiceRecognitionRef.current?.stop();
      setIsVoiceListening(false);
      setVoiceStatus("Voice paused");
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setVoiceStatus("Voice commands unavailable");
      showMessage("Voice commands are not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event: unknown) => {
      const transcript = getSpeechTranscript(event);
      if (!transcript) return;
      setVoiceStatus(`Heard: ${transcript}`);
      handleVoiceCommand(transcript);
    };
    recognition.onerror = () => {
      voiceShouldListenRef.current = false;
      setIsVoiceListening(false);
      setVoiceStatus("Voice needs permission");
    };
    recognition.onend = () => {
      if (voiceShouldListenRef.current) {
        window.setTimeout(() => {
          if (!voiceShouldListenRef.current) return;
          try {
            recognition.start();
            setIsVoiceListening(true);
          } catch {
            voiceShouldListenRef.current = false;
            setIsVoiceListening(false);
            setVoiceStatus("Voice paused. Tap Voice to restart.");
          }
        }, 250);
        return;
      }
      setIsVoiceListening(false);
    };
    voiceRecognitionRef.current = recognition;
    try {
      voiceShouldListenRef.current = true;
      recognition.start();
      setIsVoiceListening(true);
      setVoiceStatus("Listening for commands");
    } catch {
      voiceShouldListenRef.current = false;
      setIsVoiceListening(false);
      setVoiceStatus("Mic blocked. Use command buttons");
    }
  }

  function handleVoiceCommand(transcript: string) {
    const activeMatch = matchRef.current;
    const command = normalizeVoiceText(transcript);
    const voicePlayer = resolveVoicePlayer(command, activeMatch.players);
    const shotTag = getVoiceShotTag(command);
    const activePrompt = voicePromptRef.current;

    if (command.includes("undo") || command.includes("back")) {
      undoMatchAction();
      return;
    }

    if (command.includes("end match") || command.includes("finish match")) {
      playUiSound("end", matchOptionsRef.current.soundEnabled);
      setScreen("complete");
      return;
    }

    if (command.includes("new match") || command.includes("reset match")) {
      startNewMatch();
      return;
    }

    if (activePrompt && voicePlayer !== undefined && !hasExplicitVoiceScoringAction(command)) {
      completeVoicePromptSelection(activePrompt, voicePlayer);
      return;
    }

    if (shotTag && !command.includes("winner") && !command.includes("point") && !command.includes("score")) {
      pendingShotTagRef.current = shotTag;
      setPendingShotTag(shotTag);
      clearVoicePrompt();
      setVoiceStatus(`${shotTag} tagged for next point`);
      showMessage(`${shotTag} tagged. Say "point ${getCompactSideName(activeMatch.players[0])}" or "point ${getCompactSideName(activeMatch.players[1])}".`);
      playUiSound("tap", matchOptionsRef.current.soundEnabled);
      return;
    }

    if (command.includes("ace")) {
      if (voicePlayer !== undefined) {
        recordVoiceAce(voicePlayer);
        return;
      }

      promptForVoicePlayer({
        action: "ace",
        title: "Ace for who?",
        detail: `Say "Ace ${getCompactSideName(activeMatch.players[0])}" or "Ace ${getCompactSideName(activeMatch.players[1])}", or tap a player.`
      });
      return;
    }

    if (command.includes("winner")) {
      if (voicePlayer !== undefined) {
        recordVoiceWinner(voicePlayer, shotTag);
        return;
      }

      if (shotTag) {
        pendingShotTagRef.current = shotTag;
        setPendingShotTag(shotTag);
      }
      promptForVoicePlayer({
        action: "winner",
        title: "Winner for who?",
        detail: `Say "winner ${getCompactSideName(activeMatch.players[0])}" or "winner ${getCompactSideName(activeMatch.players[1])}".`
      });
      return;
    }

    if (command.includes("error") || command.includes("mistake") || command.includes("double fault")) {
      if (voicePlayer !== undefined) {
        recordVoiceError(voicePlayer);
        return;
      }

      promptForVoicePlayer({
        action: "error",
        title: "Error by who?",
        detail: `Say "error ${getCompactSideName(activeMatch.players[0])}" or "error ${getCompactSideName(activeMatch.players[1])}".`
      });
      return;
    }

    if (command.includes("point") || command.includes("score") || voicePlayer !== undefined) {
      if (voicePlayer !== undefined) {
        recordVoicePoint(voicePlayer, shotTag);
        return;
      }

      promptForVoicePlayer({
        action: "point",
        title: "Point for who?",
        detail: `Say "point ${getCompactSideName(activeMatch.players[0])}" or "point ${getCompactSideName(activeMatch.players[1])}".`
      });
      return;
    }

    setVoiceStatus("Try: point player 1, ace player 2, winner Flavio");
    showMessage("Try: point player 1, ace player 2, winner by name, or nice slice.");
  }

  async function saveCurrentMatch() {
    setSaveStatus("Saving...");
    const appUser = await getCurrentAppUser();
    setAppUser(appUser);
    setAccountStatus(formatAccountStatus(appUser));
    const feedback = createFeedbackSummary(skillFeedback);
    const opponentFeedback = createFeedbackSummary(opponentSkillFeedback);
    const record = createMatchRecord(match, appUser.id, elapsedMatchTime, matchStats, feedback, opponentFeedback);
    const result = await saveMatchRecord(record);
    const nextRecords = [record, ...matchRecords.filter((item) => item.id !== record.id)].slice(0, 25);
    setMatchRecords(nextRecords);
    const profileWithFeedback = applySkillFeedback(profile, skillFeedback);
    const feedbackReward = opponentFeedback.tokensUsed
      ? addEngagementReward(
        profileWithFeedback,
        `feedback:${record.id}`,
        createEngagementReward("feedback", 25 + opponentFeedback.tokensUsed * 2, "Gave opponent feedback")
      )
      : { awarded: false, profile: profileWithFeedback };
    const nextProfile = applyMatchProgression(feedbackReward.profile, getPlayerProgression(nextRecords, feedbackReward.profile.engagement));
    setProfile(nextProfile);
    await saveUserProfile(appUser.id, nextProfile).catch((error) => {
      console.warn("Could not persist earned match points.", error);
    });
    setMatchRecordsStatus("Match saved");
    setSkillFeedback({});
    setOpponentSkillFeedback({});
    const feedbackText = feedbackReward.awarded ? ` · +${25 + opponentFeedback.tokensUsed * 2} feedback XP` : "";
    setSaveStatus(result.mode === "firebase" ? `Saved to Firebase · +${calculateMatchPoints(record)} match XP${feedbackText}` : `Saved locally · +${calculateMatchPoints(record)} match XP${feedbackText}`);
  }

  function setReceivedSkillFeedback(skill: string, value: -1 | 0 | 1 | undefined) {
    setSkillFeedback((current) => {
      const next = { ...current, [skill]: value };
      if (value === undefined) delete next[skill];
      const tokensUsed = getFeedbackTokensUsed(next);
      if (tokensUsed > 5) {
        showMessage("Feedback has 5 tokens max");
        return current;
      }
      return next;
    });
  }

  function setOpponentMatchSkillFeedback(skill: string, value: -1 | 0 | 1 | undefined) {
    setOpponentSkillFeedback((current) => {
      const next = { ...current, [skill]: value };
      if (value === undefined) delete next[skill];
      const tokensUsed = getFeedbackTokensUsed(next);
      if (tokensUsed > 5) {
        showMessage("Opponent feedback has 5 tokens max");
        return current;
      }
      return next;
    });
  }

  async function signInAccount(email: string, password: string) {
    setAccountStatus("Signing in...");
    try {
      const appUser = await signInWithEmail(email, password);
      finishSignedIn(appUser, { message: "Signed in", navigateHome: true });
    } catch (error) {
      setAccountStatus("Sign in failed");
      throw error;
    }
  }

  async function createAccount(email: string, password: string) {
    setAccountStatus("Creating account...");
    try {
      const appUser = await createEmailAccount(email, password);
      finishSignedIn(appUser, { message: "Account created", navigateHome: true });
    } catch (error) {
      setAccountStatus("Account creation failed");
      throw error;
    }
  }

  async function resetPassword(email: string) {
    await sendPasswordReset(email);
    showMessage("Password reset email sent");
  }

  async function continueAnonymously() {
    setAccountStatus("Starting guest session...");
    try {
      const appUser = await getCurrentAppUser();
      finishSignedIn(appUser, { message: "Guest session ready", navigateHome: true });
    } catch (error) {
      setAccountStatus("Guest session failed");
      throw error;
    }
  }

  async function signOutAccount() {
    await signOutAppUser();
    hydratedUserRef.current = undefined;
    setAppUser(undefined);
    setAccountStatus("Signed out");
    setProfileSaveStatus("");
    setAuthPhase("signed-out");
    setScreen("home");
    showMessage("Signed out");
  }

  if (remoteParams) {
    return <RemoteScoringScreen params={remoteParams} />;
  }

  if (authPhase === "loading") {
    return (
      <main className="app-shell">
        <div className="phone-frame auth-frame">
          <CourtLines />
          <SplashScreen />
        </div>
      </main>
    );
  }

  if (authPhase === "signed-out") {
    return (
      <main className="app-shell">
        <div className="phone-frame auth-frame">
          <CourtLines />
          <AccountScreen
            accountStatus={accountStatus}
            appUser={appUser}
            isEntry
            onAnonymous={continueAnonymously}
            onCreate={createAccount}
            onNavigate={setScreen}
            onResetPassword={resetPassword}
            onSignIn={signInAccount}
            onSignOut={signOutAccount}
          />
          {appMessage && <div className="toast">{appMessage}</div>}
        </div>
      </main>
    );
  }

  return (
    <main className={screen === "live" ? "app-shell is-live-shell" : "app-shell"}>
      <div className={`phone-frame ${screen === "live" ? "is-live" : ""}`}>
        <CourtLines />
        {screen === "home" && (
          <HomeScreen
            incomingChallenges={incomingChallenges}
            matchRecords={matchRecords}
            matchRecordsStatus={matchRecordsStatus}
            profile={displayProfile}
            onAction={showMessage}
            onAcceptChallenge={acceptIncomingAction}
            onDismissChallenge={dismissIncomingAction}
            onNavigate={setScreen}
            onStartMatch={startNewMatch}
          />
        )}
        {screen === "live" && matchMode === "setup" && (
          <MatchSetupScreen
            options={matchOptions}
            profileName={displayProfile.name}
            onAction={showMessage}
            onExit={() => setScreen("home")}
            onStart={beginMatch}
            onUpdate={setMatchOptions}
          />
        )}
        {screen === "live" && matchMode === "playing" && (
          <LiveMatchScreen
            isVoiceListening={isVoiceListening}
            matchWinner={match.winner}
            options={matchOptions}
            playerNames={match.players}
            pendingAce={pendingAce}
            pendingShotTag={pendingShotTag}
            pointDisplay={pointDisplay}
            profile={displayProfile}
            remoteStatus={remoteStatus}
            remoteUrl={remoteSession ? getRemoteScoringUrl(remoteSession) : ""}
            server={match.server}
            sets={sets}
            elapsedTime={elapsedMatchTime}
            onAction={showMessage}
            onPoint={addPoint}
            onAceTag={toggleAceTag}
            onSoundToggle={toggleSound}
            onUndo={undoMatchAction}
            onComplete={() => setScreen("complete")}
            onEndMatch={() => {
              playUiSound("end", matchOptions.soundEnabled);
              setScreen("complete");
            }}
            onExit={() => setScreen("home")}
            onNewMatch={startNewMatch}
            onShareRemote={shareRemoteLink}
            onVoiceCommand={handleVoiceCommand}
            onVoicePromptSelection={handleVoicePromptSelection}
            onVoiceToggle={toggleVoiceCommands}
            voicePrompt={voicePrompt}
            voiceStatus={voiceStatus}
          />
        )}
        {screen === "complete" && (
          <CompleteScreen
            backendMode={getBackendMode()}
            finalScore={finalScore}
            feedback={skillFeedback}
            opponentFeedback={opponentSkillFeedback}
            matchStats={matchStats}
            playerNames={match.players}
            profile={displayProfile}
            saveStatus={saveStatus}
            sets={sets}
            elapsedTime={elapsedMatchTime}
            winnerName={winnerName}
            onNavigate={setScreen}
            onSave={saveCurrentMatch}
            onOpponentSkillFeedback={setOpponentMatchSkillFeedback}
            onSkillFeedback={setReceivedSkillFeedback}
          />
        )}
        {screen === "highlights" && (
          <HighlightsScreen
            activeFilter={activeFilter}
            currentMatch={match}
            matchRecords={matchRecords}
            matchRecordsStatus={matchRecordsStatus}
            profile={displayProfile}
            onAction={showMessage}
            onAwardXp={awardProfileXp}
            onFilter={setActiveFilter}
          />
        )}
        {screen === "social" && (
          <SocialScreen
            activeTab={socialTab}
            appUser={appUser}
            profile={displayProfile}
            onAction={showMessage}
            onAwardXp={awardProfileXp}
            onStartChallenge={startChallenge}
            onSocialChanged={() => appUser && refreshIncomingActions(appUser.id)}
            onTab={setSocialTab}
          />
        )}
        {screen === "profile" && (
          <ProfileScreen
            accountStatus={accountStatus}
            profile={displayProfile}
            progression={progression}
            profileSaveStatus={profileSaveStatus}
            onAction={showMessage}
            onNavigate={setScreen}
            onSaveProfile={async (nextProfile) => {
              await persistProfile(nextProfile, "Profile saved");
            }}
          />
        )}
        {screen === "account" && (
          <AccountScreen
            accountStatus={accountStatus}
            appUser={appUser}
            onAnonymous={continueAnonymously}
            onCreate={createAccount}
            onNavigate={setScreen}
            onResetPassword={resetPassword}
            onSignIn={signInAccount}
            onSignOut={signOutAccount}
          />
        )}
        {screen === "admin" && isAdmin && <AdminScreen onAction={showMessage} />}
        {incomingChallenges.length > 0 && !challengeBannerDismissed && (
          <ChallengeBanner
            action={incomingChallenges[0]}
            onAccept={acceptIncomingAction}
            onClose={() => setChallengeBannerDismissed(true)}
            onDismiss={dismissIncomingAction}
          />
        )}
        {screen !== "live" && <BottomNav active={screen} isAdmin={isAdmin} onNavigate={setScreen} />}
        {appMessage && <div className="toast">{appMessage}</div>}
      </div>
    </main>
  );
}

function HomeScreen({
  incomingChallenges,
  matchRecords,
  matchRecordsStatus,
  profile,
  onAction,
  onAcceptChallenge,
  onDismissChallenge,
  onNavigate,
  onStartMatch
}: {
  incomingChallenges: SocialAction[];
  matchRecords: MatchRecord[];
  matchRecordsStatus: string;
  profile: UserProfile;
  onAction: (message: string) => void;
  onAcceptChallenge: (action: SocialAction) => void | Promise<void>;
  onDismissChallenge: (action: SocialAction) => void | Promise<void>;
  onNavigate: (screen: Screen) => void;
  onStartMatch: () => void;
}) {
  const latestMatch = matchRecords[0];
  const stats = getUserMatchSummary(matchRecords);

  return (
    <section className="screen content home-screen">
      <header className="topbar">
        <div>
          <p className="eyebrow"><span className="status-dot" /> Live</p>
          <h1>Play smarter. Every point counts.</h1>
          <p className="hero-copy">Connect, compete, and improve your game.</p>
        </div>
        <button
          className="icon-button"
          aria-label="Notifications"
          onClick={() => onAction(incomingChallenges.length ? `${incomingChallenges.length} pending challenge${incomingChallenges.length === 1 ? "" : "s"}` : "No new notifications")}
        >
          <Bell size={21} />
        </button>
      </header>

      <h2 className="section-title">Get started</h2>
      <div className="start-grid">
        <InfoCard icon={Play} title="Start Match" value="Begin scoring" onClick={onStartMatch} />
        <InfoCard icon={Users} title="Quick Challenge" value="Find players" onClick={() => onNavigate("social")} />
        <InfoCard icon={Share2} title="Match Cards" value="Share score" onClick={() => onNavigate("highlights")} />
      </div>

      {incomingChallenges.length > 0 && (
        <ChallengeInboxCard
          action={incomingChallenges[0]}
          count={incomingChallenges.length}
          onAccept={onAcceptChallenge}
          onDismiss={onDismissChallenge}
        />
      )}

      <article className="recent-match-card">
        <div className="section-row">
          <h2>Recent Match</h2>
          <button onClick={() => onNavigate("highlights")}>View all</button>
        </div>
        {latestMatch ? (
          <div className="recent-match-grid real-match-grid">
            <div className="mini-player">
              <Portrait className={profile.portrait} initials={profile.avatar} photoDataUrl={profile.photoDataUrl} />
              <div><strong>{latestMatch.players[0]}</strong><span>{profile.rating}</span></div>
            </div>
            <MiniMatchScore record={latestMatch} />
            <div className="mini-player">
              <Portrait className={opponent.portrait} initials={getInitials(latestMatch.players[1])} />
              <div><strong>{latestMatch.players[1]}</strong><span>{latestMatch.durationLabel}</span></div>
            </div>
            <div className="winner-mark">{latestMatch.winner ? `${latestMatch.winner} won` : "Saved"}</div>
          </div>
        ) : (
          <EmptyState
            actionLabel="Start Match"
            icon={Calendar}
            message={matchRecordsStatus}
            title="No saved matches yet"
            onAction={onStartMatch}
          />
        )}
      </article>

      <article className="progress-card">
        <Metric label="Matches Played" value={String(stats.played)} />
        <div className="progress-ring">{stats.winRate}%</div>
        <Metric label="Games Won" value={String(stats.gamesWon)} />
      </article>
    </section>
  );
}

function SplashScreen() {
  return (
    <section className="screen content splash-screen">
      <AceTrackWordmark />
      <div className="splash-orbit">
        <TennisBall />
      </div>
      <p>Loading your court...</p>
    </section>
  );
}

function RemoteScoringScreen({ params }: { params: RemoteRouteParams }) {
  const [status, setStatus] = useState("Remote ready");
  const compactNames = params.players.map(getCompactSideName) as [string, string];

  async function sendRemote(type: MatchRemoteCommandType, label: string) {
    setStatus(`Sending ${label}...`);
    try {
      await sendMatchRemoteCommand(params.sessionId, params.token, type);
      setStatus(`${label} sent`);
      playUiSound(type === "undo" ? "undo" : type === "end" ? "end" : "point", true);
    } catch (error) {
      setStatus(getRemoteErrorMessage(error));
    }
  }

  return (
    <main className="watch-remote-shell">
      <section className="watch-remote-screen">
        <AceTrackWordmark />
        <div className="watch-remote-head">
          <p className="eyebrow"><span className="status-dot" /> Watch remote</p>
          <h1>Score match</h1>
          <span>{compactNames[0]} vs {compactNames[1]}</span>
        </div>
        <div className="watch-score-buttons">
          <button onClick={() => sendRemote("pointA", `Point ${compactNames[0]}`)}>
            <Plus size={22} />
            <span>Point</span>
            <strong>{compactNames[0]}</strong>
          </button>
          <button onClick={() => sendRemote("pointB", `Point ${compactNames[1]}`)}>
            <Plus size={22} />
            <span>Point</span>
            <strong>{compactNames[1]}</strong>
          </button>
          <button className="accent" onClick={() => sendRemote("aceA", `Ace ${compactNames[0]}`)}>
            <Zap size={21} />
            <span>Ace + point</span>
            <strong>{compactNames[0]}</strong>
          </button>
          <button className="accent" onClick={() => sendRemote("aceB", `Ace ${compactNames[1]}`)}>
            <Zap size={21} />
            <span>Ace + point</span>
            <strong>{compactNames[1]}</strong>
          </button>
        </div>
        <div className="watch-utility-row">
          <button onClick={() => sendRemote("undo", "Undo")}><RotateCcw size={18} /> Undo</button>
          <button className="danger" onClick={() => sendRemote("end", "End match")}><Trophy size={18} /> End</button>
        </div>
        <p className="watch-remote-status">{status}</p>
      </section>
    </main>
  );
}

function MatchSetupScreen({
  options,
  profileName,
  onAction,
  onExit,
  onStart,
  onUpdate
}: {
  options: MatchOptions;
  profileName: string;
  onAction: (message: string) => void;
  onExit: () => void;
  onStart: (options: MatchOptions) => void;
  onUpdate: (options: MatchOptions) => void;
}) {
  const currentOptions = normalizeMatchOptions(options, profileName);
  const visibleNameIndexes: Array<0 | 1> = currentOptions.singles ? [0] : [0, 1];
  const serverSide = currentOptions.server >= 2 ? 1 : 0;
  const serverChoices = [
    {
      side: 0,
      server: 0 as const,
      players: currentOptions.singles
        ? [{ label: "1", name: currentOptions.sideA[0] }]
        : currentOptions.sideA.map((name, index) => ({ label: String(index + 1), name }))
    },
    {
      side: 1,
      server: 2 as const,
      players: currentOptions.singles
        ? [{ label: "2", name: currentOptions.sideB[0] }]
        : currentOptions.sideB.map((name, index) => ({ label: String(index + 3), name }))
    }
  ];

  function updateSide(side: "sideA" | "sideB", index: 0 | 1, value: string) {
    const nextSide = [...currentOptions[side]] as [string, string];
    nextSide[index] = value;
    onUpdate({ ...currentOptions, [side]: nextSide });
  }

  function swapSides() {
    onUpdate({
      ...currentOptions,
      sideA: currentOptions.sideB,
      sideB: currentOptions.sideA,
      scorer: currentOptions.scorer === 0 ? 1 : 0,
      server: currentOptions.server < 2 ? currentOptions.server + 2 as 2 | 3 : currentOptions.server - 2 as 0 | 1
    });
    onAction("Sides swapped");
  }

  function toggleSingles(enabled: boolean) {
    onUpdate({
      ...currentOptions,
      singles: enabled,
      server: enabled ? (currentOptions.server >= 2 ? 2 : 0) : currentOptions.server
    });
  }

  return (
    <section className="screen content match-setup-screen">
      <header className="match-setup-hero">
        <div className="setup-hero-top">
          <p className="eyebrow"><span className="status-dot" /> New Match</p>
          <button className="setup-exit-button" onClick={onExit}><X size={16} /> Play</button>
        </div>
        <h1>Set the court.</h1>
      </header>

      <div className={currentOptions.singles ? "setup-name-grid singles" : "setup-name-grid doubles"}>
        {visibleNameIndexes.map((index) => (
          <label className="setup-name-card" key={`a-${index}`}>
            <span>{index === 0 ? "Player" : "Partner"}</span>
            <input
              aria-label={`Team one player ${index + 1}`}
              disabled={!currentOptions.customNames}
              value={currentOptions.sideA[index]}
              onChange={(event) => updateSide("sideA", index as 0 | 1, event.target.value)}
              placeholder={index === 0 ? "Player 1" : "Partner"}
            />
            <MenuIcon />
          </label>
        ))}
        <button className="swap-sides-button" aria-label="Swap sides" onClick={swapSides}><Shuffle size={24} /></button>
        {visibleNameIndexes.map((index) => (
          <label className="setup-name-card" key={`b-${index}`}>
            <span>{index === 0 ? "Opponent" : "Partner"}</span>
            <input
              aria-label={`Team two player ${index + 1}`}
              disabled={!currentOptions.customNames}
              value={currentOptions.sideB[index]}
              onChange={(event) => updateSide("sideB", index as 0 | 1, event.target.value)}
              placeholder={index === 0 ? "Opponent" : "Partner"}
            />
            <MenuIcon />
          </label>
        ))}
      </div>

      <div className="setup-toggle-row">
        <label><input checked={currentOptions.customNames} onChange={(event) => onUpdate({ ...currentOptions, customNames: event.target.checked })} type="checkbox" /> Custom Names</label>
        <label><input checked={currentOptions.singles} onChange={(event) => toggleSingles(event.target.checked)} type="checkbox" /> Singles</label>
        <button className="sound-pill" onClick={() => onUpdate({ ...currentOptions, soundEnabled: !currentOptions.soundEnabled })}>
          {currentOptions.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />} Sound
        </button>
      </div>

      <section className="setup-choice-section scoring-control-section">
        <h2>Game controls</h2>
        <div className="scoring-control-grid">
          <article className="scoring-control-card">
            <span><Radio size={18} /></span>
            <strong>Tripod scoreboard</strong>
            <p>Start the match and keep this phone visible from the court.</p>
          </article>
          <article className="scoring-control-card">
            <span><Mic size={18} /></span>
            <strong>Voice or touch</strong>
            <p>Say “point player 1”, “ace player 2”, or tap the scoring buttons.</p>
          </article>
          <article className="scoring-control-card">
            <span><Share2 size={18} /></span>
            <strong>Apple Watch remote</strong>
            <p>After Start Match, share the remote link and open it on your watch.</p>
          </article>
        </div>
      </section>

      <section className="setup-choice-section">
        <h2>Who serves first?</h2>
        <div className="choice-grid two">
          {serverChoices.map((choice) => (
            <button
              className={serverSide === choice.side ? "choice-card active compact" : "choice-card compact"}
              key={choice.side}
              onClick={() => onUpdate({ ...currentOptions, server: choice.server })}
            >
              {choice.players.map((player) => (
                <span key={player.label}><b>{player.label}</b> {player.name}</span>
              ))}
            </button>
          ))}
        </div>
      </section>

      <button className="hero-action match-start-button" onClick={() => onStart(currentOptions)}>Start Match</button>
    </section>
  );
}

function LiveMatchScreen({
  isVoiceListening,
  options,
  playerNames,
  pendingAce,
  pendingShotTag,
  pointDisplay,
  profile,
  remoteStatus,
  remoteUrl,
  server,
  sets,
  elapsedTime,
  matchWinner,
  onAction,
  onAceTag,
  onPoint,
  onSoundToggle,
  onUndo,
  onComplete,
  onEndMatch,
  onExit,
  onNewMatch,
  onShareRemote,
  onVoiceCommand,
  onVoicePromptSelection,
  onVoiceToggle,
  voicePrompt,
  voiceStatus
}: {
  isVoiceListening: boolean;
  options: MatchOptions;
  playerNames: [string, string];
  pendingAce?: 0 | 1;
  pendingShotTag?: string;
  pointDisplay: [string, string];
  profile: UserProfile;
  remoteStatus: string;
  remoteUrl: string;
  server: 0 | 1;
  sets: ReturnType<typeof getCompletedSets>;
  elapsedTime: string;
  matchWinner?: 0 | 1;
  onAction: (message: string) => void;
  onAceTag: (player: 0 | 1) => void;
  onPoint: (player: 0 | 1) => void;
  onSoundToggle: () => void;
  onUndo: () => void;
  onComplete: () => void;
  onEndMatch: () => void;
  onExit: () => void;
  onNewMatch: () => void;
  onShareRemote: () => void;
  onVoiceCommand: (command: string) => void;
  onVoicePromptSelection: (player: 0 | 1) => void;
  onVoiceToggle: () => void;
  voicePrompt?: VoicePrompt;
  voiceStatus: string;
}) {
  const sideLabels = playerNames;
  const compactSideLabels = sideLabels.map(getCompactSideName) as [string, string];
  const scoringStatus = pendingAce !== undefined
    ? `Ace tagged for ${sideLabels[pendingAce]} · tap Point ${compactSideLabels[pendingAce]}`
    : pendingShotTag
      ? `${pendingShotTag} tagged · score next point`
    : voiceStatus;
  const voiceExamples = [
    `point ${compactSideLabels[0]}`,
    `point player 2`,
    "ace",
    `ace ${compactSideLabels[0]}`,
    `winner ${compactSideLabels[1]}`,
    "nice slice"
  ];
  const scoreClassA = pointDisplay[0].length > 2 ? "stage-score long" : "stage-score";
  const scoreClassB = pointDisplay[1].length > 2 ? "stage-score long" : "stage-score";

  return (
    <section className="screen content live-screen">
      <div className="match-status live-command-bar">
        <div>
          <p><span className="status-dot" /> Live</p>
          <strong>Singles Match</strong>
        </div>
        <div className="live-top-actions">
          <span><Radio size={16} /> Voice scoring</span>
          <button onClick={onNewMatch}><Play size={14} /> New</button>
          <button onClick={onExit}><LogOut size={14} /> Exit</button>
          <button className="danger" onClick={onEndMatch}><Trophy size={14} /> End</button>
        </div>
      </div>

      <div className="live-score-stage">
        <div className={server === 0 ? "live-side-name left serving" : "live-side-name left"}>
          <strong>{sideLabels[0]}</strong>
          {server === 0 && <span>Serving</span>}
        </div>
        <TennisBall />
        <div className={server === 1 ? "live-side-name right serving" : "live-side-name right"}>
          <strong>{sideLabels[1]}</strong>
          {server === 1 && <span>Serving</span>}
        </div>
        <div className={scoreClassA}>{pointDisplay[0]}</div>
        <div className={scoreClassB}>{pointDisplay[1]}</div>
        <div className="mini-set-floating">
          <SetTable playerNames={playerNames} profile={profile} sets={sets} />
        </div>
      </div>

      <SetTable playerNames={playerNames} profile={profile} sets={sets} full />

      <div className="timer-row live-remote-row">
        <span>{pendingAce !== undefined ? <Zap size={16} /> : <Radio size={16} />} {scoringStatus}</span>
        <strong><Clock3 size={16} /> {elapsedTime}</strong>
      </div>
      <article className="watch-remote-card">
        <div>
          <p className="eyebrow"><Radio size={14} /> Watch remote</p>
          <strong>Phone on tripod. Score from your wrist.</strong>
          <span>{remoteStatus}</span>
        </div>
        <div className="watch-remote-actions">
          <a className={remoteUrl ? "ghost-button" : "ghost-button disabled"} href={remoteUrl || undefined} rel="noreferrer" target="_blank">
            <ArrowRight size={16} /> Open
          </a>
          <button className="hero-action compact" disabled={!remoteUrl} onClick={onShareRemote}><Share2 size={16} /> Share</button>
        </div>
      </article>
      <div className={voicePrompt ? "voice-assist-panel needs-choice" : "voice-assist-panel"}>
        <div className="voice-assist-copy">
          <span><Sparkles size={16} /></span>
          <div>
            <strong>{voicePrompt?.title ?? (isVoiceListening ? "Listening commands" : "Voice command examples")}</strong>
            <small>{voicePrompt?.detail ?? "Say or tap one of these. Names and player numbers both work."}</small>
          </div>
        </div>
        {voicePrompt ? (
          <div className="voice-choice-row">
            <button onClick={() => onVoicePromptSelection(0)}>{compactSideLabels[0]}</button>
            <button onClick={() => onVoicePromptSelection(1)}>{compactSideLabels[1]}</button>
          </div>
        ) : (
          <div className="voice-example-row">
            {voiceExamples.map((example) => (
              <button key={example} onClick={() => onVoiceCommand(example)}>{example}</button>
            ))}
          </div>
        )}
      </div>
      <div className="voice-command-panel">
        {[
          [`Point ${compactSideLabels[0]}`, `point ${sideLabels[0]}`],
          [`Point ${compactSideLabels[1]}`, `point ${sideLabels[1]}`],
          [`Ace ${compactSideLabels[0]}`, `ace ${sideLabels[0]}`],
          [`Ace ${compactSideLabels[1]}`, `ace ${sideLabels[1]}`],
          ["Undo", "undo"],
          ["End", "end match"]
        ].map(([label, command]) => (
          <button key={command} onClick={() => onVoiceCommand(command)}>{label}</button>
        ))}
      </div>

      <div className="point-actions">
        <button className="match-action primary" onClick={() => onPoint(0)}>
          <span className="action-icon"><Plus size={26} /></span>
          <span className="action-label">Point {compactSideLabels[0]}{pendingAce === 0 ? " + ace" : ""}</span>
        </button>
        <button className="match-action opponent" onClick={() => onPoint(1)}>
          <span className="action-icon"><Plus size={26} /></span>
          <span className="action-label">Point {compactSideLabels[1]}{pendingAce === 1 ? " + ace" : ""}</span>
        </button>
        <button className={pendingAce === 0 ? "match-action ace active" : "match-action ace"} onClick={() => onAceTag(0)}>
          <span className="action-icon"><Zap size={24} /></span>
          <span className="action-label">{pendingAce === 0 ? "Ace tagged" : `Tag ace ${compactSideLabels[0]}`}</span>
        </button>
        <button className={pendingAce === 1 ? "match-action ace opponent active" : "match-action ace opponent"} onClick={() => onAceTag(1)}>
          <span className="action-icon"><Zap size={24} /></span>
          <span className="action-label">{pendingAce === 1 ? "Ace tagged" : `Tag ace ${compactSideLabels[1]}`}</span>
        </button>
        <button className="match-action" onClick={onUndo}>
          <span className="action-icon"><RotateCcw size={24} /></span>
          <span className="action-label">Undo</span>
        </button>
        <button className={isVoiceListening ? "match-action listening" : "match-action"} onClick={onVoiceToggle}>
          <span className="action-icon"><Mic size={24} /></span>
          <span className="action-label">{isVoiceListening ? "Listening" : "Voice"}</span>
        </button>
        <button className="match-action utility" onClick={onSoundToggle}>
          <span className="action-icon">{options.soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}</span>
          <span className="action-label">Sound</span>
        </button>
      </div>

      {matchWinner !== undefined && <button className="ghost-button" onClick={onComplete}>View recap</button>}
    </section>
  );
}

function CompleteScreen({
  backendMode,
  elapsedTime,
  feedback,
  opponentFeedback,
  winnerName,
  finalScore,
  matchStats,
  playerNames,
  profile,
  sets,
  saveStatus,
  onNavigate,
  onSave,
  onOpponentSkillFeedback,
  onSkillFeedback
}: {
  backendMode: "local" | "firebase";
  elapsedTime: string;
  feedback: SkillFeedback;
  opponentFeedback: SkillFeedback;
  winnerName: string;
  finalScore: string;
  matchStats: MatchStatsInput;
  playerNames: [string, string];
  profile: UserProfile;
  sets: ReturnType<typeof getCompletedSets>;
  saveStatus: string;
  onNavigate: (screen: Screen) => void;
  onSave: () => void;
  onOpponentSkillFeedback: (skill: string, value: -1 | 0 | 1 | undefined) => void;
  onSkillFeedback: (skill: string, value: -1 | 0 | 1 | undefined) => void;
}) {
  const feedbackSummary = createFeedbackSummary(feedback);
  const opponentFeedbackSummary = createFeedbackSummary(opponentFeedback);
  const estimatedPoints = calculateMatchPointsFromData(
    sets,
    winnerName === playerNames[0] ? 0 : winnerName === playerNames[1] ? 1 : undefined,
    matchStats,
    feedbackSummary
  );

  return (
    <section className="screen content complete-screen">
      <div className="celebration">
        <p className="eyebrow"><span className="status-dot" /> Match Complete</p>
        <h1>{winnerName ? `${winnerName} wins` : "Match ended"}</h1>
        <p>{finalScore}</p>
      </div>

      <div className="complete-score">
        <PlayerScore name={playerNames[0]} meta={profile.rating} avatar={profile.avatar} photoDataUrl={profile.photoDataUrl} portrait={profile.portrait} score={getDisplayScoreForSide(sets, 0)} />
        <div className="divider">vs</div>
        <PlayerScore name={playerNames[1]} meta="Opponent" avatar={getInitials(playerNames[1])} portrait={opponent.portrait} score={getDisplayScoreForSide(sets, 1)} />
      </div>

      <SetTable playerNames={playerNames} profile={profile} sets={sets} full title="Set by set" />

      <div className="match-stats">
        <div className="section-row">
          <p className="eyebrow">Match stats</p>
          <span>Match time {elapsedTime}</span>
        </div>
        <div className="earned-points-card">
          <strong>+{estimatedPoints} pts</strong>
          <span>Score margin, games won, result, aces, and feedback bonus</span>
        </div>
        <StatBalance label="Aces" values={matchStats.aces} />
        <StatBalance label="Winners" values={matchStats.winners} />
        <StatBalance label="Unforced Errors" values={matchStats.unforcedErrors} />
        {!hasTrackedStats(matchStats) && (
          <p className="save-status">Only scored points were tracked. Tag an ace first, then tap that player's point to record ace stats.</p>
        )}
      </div>

      <FeedbackCard
        feedback={feedback}
        skills={profile.skills}
        subtitle="Have your opponent use up to five tokens for your skills. Each vote adds a 1% match-points bonus."
        summary={feedbackSummary}
        title={`Opponent votes for ${playerNames[0]}`}
        onChange={onSkillFeedback}
      />

      <FeedbackCard
        feedback={opponentFeedback}
        skills={profile.skills.map(([skill]) => [skill, 0] as [string, number])}
        showSkillValue={false}
        subtitle={`Your vote for ${playerNames[1]} is saved with the match card. It does not change your own skills.`}
        summary={opponentFeedbackSummary}
        title={`You vote for ${playerNames[1]}`}
        onChange={onOpponentSkillFeedback}
      />

      <div className="stack">
        <button className="hero-action compact" onClick={onSave}><Bookmark size={20} /> Save Match</button>
        <p className="save-status">{saveStatus || `Backend: ${backendMode === "firebase" ? "Firebase" : "local"}`}</p>
        <div className="button-pair">
          <button className="ghost-button" onClick={() => onNavigate("highlights")}><Share2 size={18} /> Create Share Card</button>
          <button className="ghost-button" onClick={() => onNavigate("highlights")}><Play size={18} /> View Match Cards</button>
        </div>
      </div>
    </section>
  );
}

function HighlightsScreen({
  activeFilter,
  currentMatch,
  matchRecords,
  matchRecordsStatus,
  profile,
  onAction,
  onAwardXp,
  onFilter
}: {
  activeFilter: string;
  currentMatch: MatchState;
  matchRecords: MatchRecord[];
  matchRecordsStatus: string;
  profile: UserProfile;
  onAction: (message: string) => void;
  onAwardXp: (id: string, reward: EngagementReward) => Promise<boolean>;
  onFilter: (filter: string) => void;
}) {
  const [shareCard, setShareCard] = useState("");
  const matchFilterOptions = useMemo(() => getMatchFilterOptions(matchRecords), [matchRecords]);
  const currentFilter = matchFilterOptions.some((option) => option.id === activeFilter) ? activeFilter : "All";
  const filteredRecords = useMemo(() => {
    return matchRecords.filter((record) => recordMatchesFilter(record, currentFilter));
  }, [currentFilter, matchRecords]);
  const shareRecord = matchRecords[0] ?? createUnsavedMatchPreview(currentMatch);

  function generateShareCard() {
    const card = createShareCardSvg(profile, shareRecord);
    setShareCard(card);
    onAction("Share card generated");
    onAwardXp(`share-card:${shareRecord.id}`, createEngagementReward("shareCard", 30, "Created match card"));
  }

  async function shareGeneratedCard() {
    await shareMatchCard(shareCard, onAction);
    await onAwardXp(`share-post:${shareRecord.id}`, createEngagementReward("sharePost", 40, "Shared match card"));
  }

  return (
    <section className="screen content highlights-screen">
      <header className="simple-header">
        <h1>Match Cards</h1>
        <p>Saved matches and share cards from real scoring data.</p>
      </header>
      <article className="feature-card match-card-hero">
        <div className="match-card-hero-copy">
          <p className="eyebrow">Share your match</p>
          <h2>Create a match card.</h2>
          <p>{shareRecord.finalScore === "In progress" ? "Score a match first, or generate a draft from the current board." : shareRecord.finalScore}</p>
        </div>
        <div className="share-preview match-card-hero-preview">
          <Portrait className={profile.portrait} initials={profile.avatar} photoDataUrl={profile.photoDataUrl} />
          <span>vs</span>
          <Portrait className={opponent.portrait} initials={getInitials(shareRecord.players[1])} />
        </div>
        <button className="match-card-hero-button" onClick={generateShareCard}>Generate Share Card <ArrowRight size={17} /></button>
      </article>
      {shareCard && (
        <article className="generated-share-card">
          <div className="section-row">
            <h2>Share card ready</h2>
            <button className="text-button" onClick={() => setShareCard("")}>Close</button>
          </div>
          <img alt="Generated AceTrack match share card" src={shareCard} />
          <div className="button-pair">
            <a className="ghost-button" download="acetrack-share-card.svg" href={shareCard}><Download size={18} /> Download</a>
            <button className="hero-action compact" onClick={shareGeneratedCard}><Share2 size={18} /> Share Card</button>
          </div>
        </article>
      )}
      <div className="section-row">
        <h2>Saved Matches</h2>
        <button className="text-button" onClick={() => onAction(matchRecordsStatus)}>Status</button>
      </div>
      <div className="filter-row">
        {matchFilterOptions.map((filter) => (
          <button className={filter.id === currentFilter ? "active" : ""} key={filter.id} onClick={() => onFilter(filter.id)}>
            {filter.label}<span>{filter.count}</span>
          </button>
        ))}
      </div>
      <div className="highlight-grid">
        {filteredRecords.map((record) => (
          <article className="highlight-card real-match-card" key={record.id}>
            <div className="thumb lime">
              <span><Trophy size={16} /> {record.durationLabel}</span>
              <b>{record.winner ? "Saved" : "Open"}</b>
            </div>
            <div>
              <h3>{record.players[0]} vs {record.players[1]}</h3>
              <p>{record.finalScore} · {formatMatchDate(record.createdAt)}</p>
            </div>
            <div className="card-icons">
              <button aria-label={`Share ${record.players[0]} vs ${record.players[1]}`} onClick={() => { setShareCard(createShareCardSvg(profile, record)); onAction("Share card generated"); onAwardXp(`share-card:${record.id}`, createEngagementReward("shareCard", 30, "Created match card")); }}><Share2 size={18} /></button>
            </div>
          </article>
        ))}
        {!filteredRecords.length && (
          <EmptyState
            icon={Video}
            message={matchRecordsStatus}
            title="No saved match cards yet"
          />
        )}
      </div>
    </section>
  );
}

function SocialScreen({
  activeTab,
  appUser,
  profile,
  onAction,
  onAwardXp,
  onStartChallenge,
  onSocialChanged,
  onTab
}: {
  activeTab: string;
  appUser?: AppUser;
  profile: UserProfile;
  onAction: (message: string) => void;
  onAwardXp: (id: string, reward: EngagementReward) => Promise<boolean>;
  onStartChallenge: (playerName: string) => void;
  onSocialChanged: () => void;
  onTab: (tab: string) => void;
}) {
  const [nearbyStatus, setNearbyStatus] = useState("Share GPS to find friends nearby");
  const [nearbyList, setNearbyList] = useState<NearbyPlayer[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentFriendRequests, setSentFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendMessages, setFriendMessages] = useState<Record<string, SocialMessage[]>>({});
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [selectedFriendProfile, setSelectedFriendProfile] = useState<{ friendship: Friendship; profile: SocialProfileSnapshot; userId: string } | undefined>();
  const [socialActions, setSocialActions] = useState<SocialAction[]>([]);
  const [socialStatus, setSocialStatus] = useState("Connect with real players nearby.");
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState<FriendSearchResult[]>([]);
  const [friendSearchStatus, setFriendSearchStatus] = useState("Search real AceTrack players by name.");
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);
  const [directorySyncStatus, setDirectorySyncStatus] = useState("");
  const [isSyncingDirectory, setIsSyncingDirectory] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAlwaysOn, setGpsAlwaysOn] = usePersistentState("acetrack:gps-always-on", false);
  const [radiusKm, setRadiusKm] = usePersistentState("acetrack:gps-radius-km", 15);
  const [courtOrigin, setCourtOrigin] = useState<GpsPoint | undefined>();
  const [tennisCourts, setTennisCourts] = useState<TennisCourt[]>([]);
  const [courtStatus, setCourtStatus] = useState("Use GPS to find real tennis courts nearby.");
  const [isLoadingCourts, setIsLoadingCourts] = useState(false);
  const directorySyncPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const directorySyncStartedRef = useRef(false);
  const lastCourtLookupRef = useRef("");
  const currentUserId = appUser?.id;
  const canSyncDirectory = appUser?.email?.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    setNearbyList((current) => rankNearbyPlayers(current));
  }, [radiusKm]);

  useEffect(() => {
    if (!canSyncDirectory || directorySyncStartedRef.current) return;
    directorySyncStartedRef.current = true;
    syncPlayerDirectory(false);
  }, [canSyncDirectory]);

  useEffect(() => {
    if (!currentUserId) {
      setFriendRequests([]);
      setSentFriendRequests([]);
      setFriends([]);
      setFriendMessages({});
      setMessageDrafts({});
      setSelectedFriendProfile(undefined);
      setSocialActions([]);
      setSocialStatus("Sign in to add friends and send challenges.");
      return;
    }

    let isActive = true;
    const unsubscribers: Array<() => void> = [];
    setSocialStatus("Connecting live social activity...");

    Promise.all([
      subscribeToFriendRequests(currentUserId, "incoming", (requests) => {
        if (!isActive) return;
        setFriendRequests(requests);
      }, (error) => {
        if (isActive) setSocialStatus(getSocialErrorMessage(error));
      }),
      subscribeToFriendRequests(currentUserId, "sent", (requests) => {
        if (!isActive) return;
        setSentFriendRequests(requests);
      }, (error) => {
        if (isActive) setSocialStatus(getSocialErrorMessage(error));
      }),
      subscribeToFriendships(currentUserId, (friendships) => {
        if (!isActive) return;
        setFriends(friendships);
        setSocialStatus(friendships.length ? `${friendships.length} friend${friendships.length === 1 ? "" : "s"} connected` : "No friends yet. Add real players from Nearby.");
      }, (error) => {
        if (isActive) setSocialStatus(getSocialErrorMessage(error));
      }),
      subscribeToIncomingSocialActions(currentUserId, (actions) => {
        if (!isActive) return;
        setSocialActions(actions);
      }, (error) => {
        if (isActive) setSocialStatus(getSocialErrorMessage(error));
      })
    ])
      .then((nextUnsubscribers) => {
        if (!isActive) {
          nextUnsubscribers.forEach((unsubscribe) => unsubscribe());
          return;
        }

        unsubscribers.push(...nextUnsubscribers);
      })
      .catch((error) => {
        if (isActive) setSocialStatus(getSocialErrorMessage(error));
      });

    return () => {
      isActive = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || !friends.length) {
      setFriendMessages({});
      return;
    }

    let isActive = true;
    const unsubscribers: Array<() => void> = [];
    const activeFriendIds = new Set(friends.map((friendship) => friendship.id));
    setFriendMessages((current) => Object.fromEntries(Object.entries(current).filter(([friendshipId]) => activeFriendIds.has(friendshipId))));

    Promise.all(friends.map((friendship) => subscribeToFriendMessages(friendship.id, currentUserId, (messages) => {
      if (!isActive) return;
      setFriendMessages((current) => ({ ...current, [friendship.id]: messages }));
    }, (error) => {
      if (isActive) setSocialStatus(getSocialErrorMessage(error));
    })))
      .then((nextUnsubscribers) => {
        if (!isActive) {
          nextUnsubscribers.forEach((unsubscribe) => unsubscribe());
          return;
        }

        unsubscribers.push(...nextUnsubscribers);
      })
      .catch((error) => {
        if (isActive) setSocialStatus(getSocialErrorMessage(error));
      });

    return () => {
      isActive = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentUserId, friends]);

  useEffect(() => {
    if (!gpsAlwaysOn || activeTab !== "Nearby" || !navigator.geolocation) return;

    setNearbyStatus("GPS is on. Updating nearby players...");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        syncNearbyPosition(position, false);
      },
      (error) => {
        setNearbyStatus(getLocationErrorMessage(error));
        setGpsAlwaysOn(false);
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeTab, appUser, gpsAlwaysOn, profile, setGpsAlwaysOn]);

  useEffect(() => {
    if (!currentUserId || !courtOrigin) return;

    let isActive = true;
    let unsubscribe: () => void = () => undefined;
    subscribeToPlayerLocations((locations) => {
      if (!isActive) return;
      const livePlayers = rankNearbyPlayers(toNearbyPlayers(locations, courtOrigin, currentUserId));
      setNearbyList(livePlayers);
      setNearbyStatus(livePlayers.length ? `${livePlayers.length} live players found nearby` : "GPS is on. Waiting for friends nearby");
    }, (error) => {
      if (isActive) setNearbyStatus(getSocialErrorMessage(error));
    })
      .then((nextUnsubscribe) => {
        if (!isActive) {
          nextUnsubscribe();
          return;
        }

        unsubscribe = nextUnsubscribe;
      })
      .catch((error) => {
        if (isActive) setNearbyStatus(getSocialErrorMessage(error));
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [courtOrigin, currentUserId]);

  async function syncNearbyPosition(position: GeolocationPosition, announce: boolean) {
    const activeUser = appUser ?? await getCurrentAppUser();
    if (activeUser.mode !== "firebase") {
      throw new Error("Sign in to share GPS with nearby players.");
    }

    const gpsPoint = toGpsPoint(position.coords);
    setCourtOrigin(gpsPoint);
    await savePlayerLocation(activeUser.id, profile, position.coords);
    const liveLocations = await listPlayerLocations();
    const livePlayers = toNearbyPlayers(liveLocations, position.coords, activeUser.id);
    const combined = rankNearbyPlayers(livePlayers);
    setNearbyList(combined);
    setNearbyStatus(livePlayers.length ? `${livePlayers.length} live players found nearby` : "GPS is on. Waiting for friends nearby");
    await refreshTennisCourts(gpsPoint, false);
    if (announce) onAction("Nearby players updated");
  }

  async function loadSocialConnections(userId = currentUserId) {
    if (!userId) return;
    setSocialStatus("Loading social activity...");
    try {
      const [requests, sentRequests, friendships, actions] = await Promise.all([
        listFriendRequests(userId),
        listSentFriendRequests(userId),
        listFriendships(userId),
        listIncomingSocialActions(userId)
      ]);
      setFriendRequests(requests);
      setSentFriendRequests(sentRequests);
      setFriends(friendships);
      setSocialActions(actions);
      await loadFriendMessageThreads(friendships, userId);
      setSocialStatus(friendships.length ? `${friendships.length} friend${friendships.length === 1 ? "" : "s"} connected` : "No friends yet. Add real players from Nearby.");
    } catch (error) {
      setSocialStatus(getSocialErrorMessage(error));
    }
  }

  async function loadFriendMessageThreads(friendships: Friendship[], userId: string) {
    if (!friendships.length) {
      setFriendMessages({});
      return;
    }

    const entries = await Promise.all(friendships.map(async (friendship) => [friendship.id, await listFriendMessages(friendship.id, userId)] as const));
    setFriendMessages(Object.fromEntries(entries));
  }

  async function refreshNearbyFromGps() {
    if (!navigator.geolocation) {
      setNearbyStatus("GPS is not available in this browser");
      return;
    }

    setIsLocating(true);
    setNearbyStatus("Requesting GPS permission...");

    try {
      const position = await getCurrentPosition();
      await syncNearbyPosition(position, true);
      setGpsAlwaysOn(true);
    } catch (error) {
      setNearbyStatus(getLocationErrorMessage(error));
    } finally {
      setIsLocating(false);
    }
  }

  async function refreshTennisCourtsFromGps() {
    if (courtOrigin) {
      await refreshTennisCourts(courtOrigin, true);
      return;
    }

    if (!navigator.geolocation) {
      setCourtStatus("GPS is not available in this browser");
      return;
    }

    setIsLoadingCourts(true);
    setCourtStatus("Requesting GPS to find tennis courts...");

    try {
      const position = await getCurrentPosition();
      const gpsPoint = toGpsPoint(position.coords);
      setCourtOrigin(gpsPoint);
      await refreshTennisCourts(gpsPoint, true);
    } catch (error) {
      setCourtStatus(getLocationErrorMessage(error));
    } finally {
      setIsLoadingCourts(false);
    }
  }

  async function refreshTennisCourts(origin: GpsPoint, force: boolean) {
    const lookupRadiusKm = getCourtLookupRadiusKm(radiusKm);
    const lookupKey = `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)},${lookupRadiusKm}`;
    if (!force && lastCourtLookupRef.current === lookupKey) return;

    lastCourtLookupRef.current = lookupKey;
    setIsLoadingCourts(true);
    setCourtStatus(`Searching real tennis courts within ${lookupRadiusKm} km...`);

    try {
      const courts = await fetchNearbyTennisCourts(origin, lookupRadiusKm);
      setTennisCourts(courts);
      setCourtStatus(courts.length ? `${courts.length} tennis court${courts.length === 1 ? "" : "s"} found within ${lookupRadiusKm} km` : `No tennis courts found within ${lookupRadiusKm} km`);
    } catch (error) {
      setCourtStatus(error instanceof Error ? error.message : "Could not load tennis courts from OpenStreetMap");
    } finally {
      setIsLoadingCourts(false);
    }
  }

  const visibleNearbyPlayers = nearbyList.filter((player) => player.distanceKm <= radiusKm);
  const requestCount = friendRequests.length + sentFriendRequests.length + socialActions.length;
  const inviteLink = getFriendInviteUrl(profile, currentUserId);

  function updateRadius(value: number) {
    setRadiusKm(Math.max(1, Math.min(250, Math.round(value) || 1)));
  }

  async function addFriend(player: NearbyPlayer) {
    try {
      const activeUser = appUser ?? await getCurrentAppUser();
      if (activeUser.mode !== "firebase") {
        onAction("Sign in to add friends across devices");
        return;
      }

      const result = await sendFriendRequest(activeUser.id, profile, player.id, nearbyPlayerToSocialProfile(player));
      setSentFriendRequests((current) => upsertFriendRequest(current, result.request));
      onAction(`Friend request sent to ${player.name}`);
      onSocialChanged();
    } catch (error) {
      onAction(getSocialErrorMessage(error));
    }
  }

  async function searchFriendByName() {
    const term = friendSearchQuery.trim();
    if (term.length < 2) {
      setFriendSearchResults([]);
      setFriendSearchStatus("Type at least 2 letters to search.");
      return;
    }

    if (!currentUserId) {
      setFriendSearchResults([]);
      setFriendSearchStatus("Sign in to search AceTrack players.");
      return;
    }

    setIsSearchingFriends(true);
    setFriendSearchStatus("Searching real AceTrack profiles...");

    try {
      if (canSyncDirectory && (!directorySyncStatus || directorySyncPromiseRef.current)) {
        await syncPlayerDirectory(false);
      }

      const directoryResults = await searchPlayerDirectoryProfiles(term, currentUserId);
      const knownResults = getKnownFriendSearchResults(term, currentUserId, friends, friendRequests, sentFriendRequests, socialActions);
      const results = mergeFriendSearchResults(directoryResults, knownResults);
      setFriendSearchResults(results);
      setFriendSearchStatus(results.length ? `${results.length} player${results.length === 1 ? "" : "s"} found` : "No AceTrack player found with that name. Send an invite link instead.");
    } catch (error) {
      setFriendSearchResults([]);
      setFriendSearchStatus(getSocialErrorMessage(error));
    } finally {
      setIsSearchingFriends(false);
    }
  }

  async function syncPlayerDirectory(announce = true) {
    if (!canSyncDirectory) return;
    if (directorySyncPromiseRef.current) {
      if (announce) setDirectorySyncStatus("Syncing profile search...");
      await directorySyncPromiseRef.current;
      return;
    }

    setIsSyncingDirectory(true);
    if (announce) setDirectorySyncStatus("Syncing profile search...");

    const syncPromise = (async () => {
      const profiles = await listUserProfiles();
      await Promise.all(profiles.map((userProfile) => publishPlayerDirectoryProfile(userProfile.userId, userProfile)));
      setDirectorySyncStatus(`${profiles.length} profile${profiles.length === 1 ? "" : "s"} searchable`);
      directorySyncStartedRef.current = true;
    })();

    directorySyncPromiseRef.current = syncPromise;

    try {
      await syncPromise;
    } catch (error) {
      setDirectorySyncStatus(getSocialErrorMessage(error));
    } finally {
      directorySyncPromiseRef.current = undefined;
      setIsSyncingDirectory(false);
    }
  }

  async function addDirectoryFriend(player: PlayerDirectoryProfile) {
    try {
      const activeUser = appUser ?? await getCurrentAppUser();
      if (activeUser.mode !== "firebase") {
        onAction("Sign in to add friends across devices");
        return;
      }

      const result = await sendFriendRequest(activeUser.id, profile, player.id, directoryProfileToSocialProfile(player));
      setSentFriendRequests((current) => upsertFriendRequest(current, result.request));
      onAction(`Friend request sent to ${player.name}`);
      onSocialChanged();
    } catch (error) {
      onAction(getSocialErrorMessage(error));
    }
  }

  async function shareInviteLink() {
    const text = `${profile.name} invited you to AceTrack. Open this link, create your profile, then search each other by name.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join me on AceTrack", text, url: inviteLink });
        onAction("Invite shared");
        return;
      }

      await navigator.clipboard.writeText(inviteLink);
      onAction("Invite link copied");
    } catch (error) {
      console.warn("Invite share failed.", error);
      onAction("Invite link ready");
    }
  }

  async function challengePlayer(player: NearbyPlayer | SocialProfileSnapshot, playerId: string) {
    try {
      const activeUser = appUser ?? await getCurrentAppUser();
      if (activeUser.mode !== "firebase") {
        onAction("Sign in to send challenges across devices");
        return false;
      }

      const socialProfile = "distance" in player ? nearbyPlayerToSocialProfile(player) : player;
      const result = await sendSocialAction("challenge", activeUser.id, profile, playerId, socialProfile);
      let awarded = false;
      try {
        awarded = await onAwardXp(`challenge:${result.action.id}`, createEngagementReward("challenge", 15, "Sent challenge"));
      } catch (error) {
        console.warn("Challenge XP reward failed after challenge was sent.", error);
      }

      onAction(awarded ? `Challenge sent to ${player.name} · +15 Ace XP` : `Challenge sent to ${player.name}`);
      await loadSocialConnections(activeUser.id);
      onSocialChanged();
      return true;
    } catch (error) {
      onAction(getSocialErrorMessage(error));
      return false;
    }
  }

  async function challengeFriend(friendship: Friendship, friend: SocialProfileSnapshot, friendId: string) {
    const challengeSent = await challengePlayer(friend, friendId);
    if (!challengeSent) return;
    await sendFriendMessage(friendship, friend, friendId, `Challenge sent. Want to play this week?`, "challenge", false);
  }

  async function sendFriendMessage(
    friendship: Friendship,
    friend: SocialProfileSnapshot,
    friendId: string,
    fallbackBody?: string,
    kind: SocialMessage["kind"] = "message",
    clearDraft = true
  ) {
    const body = (fallbackBody ?? messageDrafts[friendship.id] ?? "").trim();
    if (!body) {
      onAction("Write a message first");
      return;
    }

    try {
      const activeUser = appUser ?? await getCurrentAppUser();
      if (activeUser.mode !== "firebase") {
        onAction("Sign in to send messages across devices");
        return;
      }

      const result = await sendSocialMessage(friendship, activeUser.id, profile, friendId, friend, body, kind);
      setFriendMessages((current) => ({
        ...current,
        [friendship.id]: [...(current[friendship.id] ?? []), result.message]
      }));
      if (clearDraft) {
        setMessageDrafts((current) => ({ ...current, [friendship.id]: "" }));
      }
      onAction(kind === "challenge" ? `Challenge message sent to ${friend.name}` : `Message sent to ${friend.name}`);
    } catch (error) {
      onAction(getSocialErrorMessage(error));
    }
  }

  async function pokePlayer(player: SocialProfileSnapshot, playerId: string) {
    const activeUser = appUser ?? await getCurrentAppUser();
    await sendSocialAction("poke", activeUser.id, profile, playerId, player);
    onAction(`Poked ${player.name}`);
    onSocialChanged();
  }

  async function acceptRequest(request: FriendRequest) {
    const result = await acceptFriendRequest(request, profile);
    setFriendRequests((current) => current.filter((item) => item.id !== request.id));
    setFriends((current) => upsertFriendship(current, result.friendship));
    onAction(`${request.fromProfile.name} added`);
    await loadSocialConnections();
    onTab("Friends");
    onSocialChanged();
  }

  async function declineRequest(request: FriendRequest) {
    await declineFriendRequest(request);
    setFriendRequests((current) => current.filter((item) => item.id !== request.id));
    onAction(`${request.fromProfile.name} declined`);
    await loadSocialConnections();
    onSocialChanged();
  }

  async function cancelSentRequest(request: FriendRequest) {
    await declineFriendRequest(request);
    setSentFriendRequests((current) => current.filter((item) => item.id !== request.id));
    onAction(`Request to ${request.toProfile.name} canceled`);
    await loadSocialConnections();
    onSocialChanged();
  }

  async function acceptAction(action: SocialAction) {
    await updateSocialActionStatus(action, "accepted");
    onAction(action.type === "challenge" ? `Challenge accepted from ${action.fromProfile.name}` : `Poke answered`);
    if (action.type === "challenge") onStartChallenge(action.fromProfile.name);
    await loadSocialConnections();
    onSocialChanged();
  }

  async function dismissAction(action: SocialAction) {
    await updateSocialActionStatus(action, "dismissed");
    onAction(`${action.type === "challenge" ? "Challenge" : "Poke"} dismissed`);
    await loadSocialConnections();
    onSocialChanged();
  }

  return (
    <section className="screen content social-screen">
      <header className="simple-header">
        <p className="eyebrow">Social</p>
        <h1>Play together. Get better.</h1>
      </header>
      <div className="tabs">
        {["Nearby", "Friends", "Requests"].map((tab) => (
          <button className={tab === activeTab ? "active" : ""} onClick={() => onTab(tab)} key={tab}>
            {tab}{tab === "Requests" && requestCount > 0 && <span className="badge">{requestCount}</span>}
          </button>
        ))}
      </div>

      <article className="friend-search-card">
        <form onSubmit={(event) => {
          event.preventDefault();
          searchFriendByName();
        }}>
          <div>
            <p className="eyebrow">Find friend</p>
            <h2>Search by name.</h2>
            <p>Find real AceTrack profiles, then add or challenge them.</p>
          </div>
          <div className="friend-search-controls">
            <input
              aria-label="Search friend by name"
              onChange={(event) => setFriendSearchQuery(event.target.value)}
              placeholder="Type a friend name"
              value={friendSearchQuery}
            />
            <button className="hero-action compact" disabled={isSearchingFriends} type="submit">
              <Users size={18} /> {isSearchingFriends ? "Searching..." : "Search"}
            </button>
          </div>
        </form>
        {canSyncDirectory && (
          <div className="directory-sync-row">
            <span>{directorySyncStatus || "Admin search sync keeps existing database profiles findable."}</span>
            <button className="text-button" disabled={isSyncingDirectory} onClick={() => syncPlayerDirectory(true)}>
              {isSyncingDirectory ? "Syncing..." : "Sync users"}
            </button>
          </div>
        )}
        <p className="friend-search-status">{friendSearchStatus}</p>
        {friendSearchResults.length > 0 && (
          <div className="friend-search-results">
            {friendSearchResults.map((player) => {
              const friendshipStatus = getNearbyFriendshipStatus(friends, friendRequests, sentFriendRequests, player.id, currentUserId);
              return (
                <article className="friend-search-result" key={player.id}>
                  <Portrait className={player.portrait} initials={player.avatar} />
                  <div>
                    <h3>{player.name}</h3>
                    <p>{player.rating}{player.location ? ` · ${player.location}` : ""}</p>
                  </div>
                  <div className="request-actions">
                    <button
                      disabled={friendshipStatus.kind === "friend" || friendshipStatus.kind === "sent"}
                      onClick={() => friendshipStatus.kind === "incoming" && friendshipStatus.request ? acceptRequest(friendshipStatus.request) : addDirectoryFriend(player)}
                    >
                      {friendshipStatus.label}
                    </button>
                    <button onClick={() => challengePlayer(directoryProfileToSocialProfile(player), player.id)}>Challenge</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {friendSearchQuery.trim().length >= 2 && !friendSearchResults.length && !isSearchingFriends && (
          <div className="friend-invite-row">
            <div>
              <strong>Not on AceTrack yet?</strong>
              <span>Send your friend an invite link to open the app and create a profile.</span>
            </div>
            <div>
              <button className="ghost-button" onClick={shareInviteLink}><Share2 size={17} /> Share link</button>
              <a className="ghost-button sms-link" href={getSmsInviteHref(profile.name, inviteLink)}><Mail size={17} /> SMS</a>
            </div>
          </div>
        )}
      </article>

      {activeTab === "Nearby" && (
        <>
          <article className="distance-control-card">
            <div className="section-row">
              <div>
                <p className="eyebrow">Distance</p>
                <strong>Within {radiusKm} km</strong>
              </div>
              <label>
                <input min="1" max="250" value={radiusKm} type="number" onChange={(event) => updateRadius(Number(event.target.value))} />
                <span>km</span>
              </label>
            </div>
            <input aria-label="Nearby search distance" min="1" max="250" type="range" value={radiusKm} onChange={(event) => updateRadius(Number(event.target.value))} />
            <p>{nearbyList.length ? `${visibleNearbyPlayers.length} of ${nearbyList.length} real GPS players inside this radius.` : "Only real GPS-enabled AceTrack users will appear here."}</p>
          </article>
          <article className="gps-card">
            <div>
              <p className="eyebrow">Live GPS</p>
              <strong>{nearbyStatus}</strong>
              <span>{gpsAlwaysOn ? "GPS stays on while AceTrack is open." : "Tap once to authorize GPS. Browser permission is remembered."}</span>
            </div>
            <button className="hero-action compact" disabled={isLocating} onClick={refreshNearbyFromGps}>
              <MapPin size={18} /> {isLocating ? "Finding..." : gpsAlwaysOn ? "Update GPS" : "Use GPS"}
            </button>
            <button className="ghost-button gps-toggle" onClick={() => setGpsAlwaysOn((enabled) => !enabled)}>
              {gpsAlwaysOn ? "Turn GPS off" : "Keep GPS on"}
            </button>
          </article>
          <TennisCourtMapCard
            courts={tennisCourts}
            isLoading={isLoadingCourts}
            origin={courtOrigin}
            radiusKm={getCourtLookupRadiusKm(radiusKm)}
            status={courtStatus}
            onRefresh={refreshTennisCourtsFromGps}
          />
          <p className="list-label">Nearby players</p>
          <div className="player-list">
            {visibleNearbyPlayers.map((player) => {
              const friendshipStatus = getNearbyFriendshipStatus(friends, friendRequests, sentFriendRequests, player.id, currentUserId);
              return (
                <article className={player.isLive ? "player-row live-player" : "player-row"} key={player.id}>
                  <div className="player-card-head">
                    <strong className={player.rank <= 3 ? "rank active" : "rank"}>{player.rank}</strong>
                    <Portrait className={player.portrait} initials={player.avatar} />
                    <div className="player-card-copy">
                      <h3>{player.name}{player.isLive && <span className="live-chip">GPS</span>}</h3>
                      <p>Ace level <b>{player.level}</b>{player.rating && <span>{player.rating}</span>}</p>
                      <p><MapPin size={13} /> {player.distance} away</p>
                    </div>
                  </div>
                  <div className="player-card-stats">
                    <span className="streak"><Flame size={16} /> {player.streak} day streak</span>
                    <div className="points"><strong>{player.points.toLocaleString()}</strong><span>PTS</span></div>
                  </div>
                  <div className="player-actions">
                    <button
                      disabled={friendshipStatus.kind === "friend" || friendshipStatus.kind === "sent"}
                      onClick={() => friendshipStatus.kind === "incoming" && friendshipStatus.request ? acceptRequest(friendshipStatus.request) : addFriend(player)}
                    >
                      {friendshipStatus.label}
                    </button>
                    <button onClick={() => challengePlayer(player, player.id)}>Challenge</button>
                  </div>
                </article>
              );
            })}
            {!visibleNearbyPlayers.length && (
              <EmptyState
                icon={MapPin}
                message={nearbyList.length ? `${nearbyList.length} real player${nearbyList.length === 1 ? " is" : "s are"} outside this radius. Increase the km range to see them.` : gpsAlwaysOn ? "Nobody in your area yet. Ask your friend to open AceTrack and enable GPS too." : "Enable GPS to publish your location and load nearby real players."}
                title={`No players inside ${radiusKm} km yet`}
                actionLabel={gpsAlwaysOn ? "Update GPS" : "Use GPS"}
                onAction={refreshNearbyFromGps}
              />
            )}
          </div>
        </>
      )}

      {activeTab === "Friends" && (
        <div className="request-list">
          <p className="social-status">Friends live here. Send a message, challenge them, or open SMS with an invite. {socialStatus}</p>
          {friends.map((friendship) => {
            const friend = getFriendProfile(friendship, currentUserId);
            const friendId = getFriendId(friendship, currentUserId);
            const messages = friendMessages[friendship.id] ?? [];
            const recentMessages = messages.slice(-3);
            if (!friend || !friendId) return null;
            return (
              <article className="friend-thread-card" key={friendship.id}>
                <div className="friend-thread-head">
                  <Portrait className={friend.portrait} initials={friend.avatar} />
                  <div>
                    <p className="eyebrow">Friend</p>
                    <h3>{friend.name}</h3>
                    <span>{friend.rating} · You: {profile.rating}</span>
                  </div>
                </div>
                <div className="friend-message-list">
                  {recentMessages.map((message) => (
                    <div className={message.fromUserId === currentUserId ? "friend-message mine" : "friend-message"} key={message.id}>
                      <strong>{message.kind === "challenge" ? "Challenge" : message.fromProfile.name}</strong>
                      <p>{message.body}</p>
                      <span>{formatMessageTime(message.createdAt)}</span>
                    </div>
                  ))}
                  {!recentMessages.length && (
                    <div className="friend-message-empty">
                      <MessageCircle size={18} />
                      <span>No messages yet. Start with a challenge or quick note.</span>
                    </div>
                  )}
                </div>
                <form className="friend-message-form" onSubmit={(event) => {
                  event.preventDefault();
                  sendFriendMessage(friendship, friend, friendId);
                }}>
                  <input
                    aria-label={`Message ${friend.name}`}
                    maxLength={180}
                    onChange={(event) => setMessageDrafts((current) => ({ ...current, [friendship.id]: event.target.value }))}
                    placeholder={`Message ${getCompactSideName(friend.name)}`}
                    value={messageDrafts[friendship.id] ?? ""}
                  />
                  <button type="submit"><Send size={17} /> Send</button>
                </form>
                <div className="friend-quick-actions">
                  <button onClick={() => setSelectedFriendProfile({ friendship, profile: friend, userId: friendId })}><CircleUserRound size={17} /> Profile</button>
                  <button onClick={() => pokePlayer(friend, friendId)}>Poke</button>
                  <button onClick={() => challengeFriend(friendship, friend, friendId)}><Trophy size={17} /> Challenge</button>
                  <a className="ghost-button sms-link" href={getSmsInviteHref(profile.name)}><Mail size={17} /> SMS invite</a>
                </div>
              </article>
            );
          })}
          {!friends.length && (
            <EmptyState
              icon={Users}
              message="Add real GPS players nearby to follow their points and compare weekly progress."
              title="No friends yet"
            />
          )}
        </div>
      )}

      {activeTab === "Requests" && (
        <div className="request-list">
          <p className="social-status">Challenge center: incoming friend requests, pokes, and match challenges appear here.</p>
          {friendRequests.map((request) => (
            <article className="request-row" key={request.id}>
              <Portrait className={request.fromProfile.portrait} initials={request.fromProfile.avatar} />
              <div><h3>{request.fromProfile.name}</h3><p>{request.fromProfile.rating} · Wants to follow your progress</p></div>
              <div className="request-actions">
                <button aria-label={`Accept ${request.fromProfile.name}`} onClick={() => acceptRequest(request)}><Check size={17} /> Accept</button>
                <button aria-label={`Decline ${request.fromProfile.name}`} className="quiet" onClick={() => declineRequest(request)}><X size={17} /> Decline</button>
              </div>
            </article>
          ))}
          {sentFriendRequests.map((request) => (
            <article className="request-row" key={`sent-${request.id}`}>
              <Portrait className={request.toProfile.portrait} initials={request.toProfile.avatar} />
              <div><h3>{request.toProfile.name}</h3><p>{request.toProfile.rating} · Waiting for response</p></div>
              <div className="request-actions">
                <button disabled><Clock3 size={17} /> Pending</button>
                <button aria-label={`Cancel request to ${request.toProfile.name}`} className="quiet" onClick={() => cancelSentRequest(request)}><X size={17} /> Cancel</button>
              </div>
            </article>
          ))}
          {socialActions.map((action) => (
            <article className="request-row" key={action.id}>
              <Portrait className={action.fromProfile.portrait} initials={action.fromProfile.avatar} />
              <div><h3>{action.fromProfile.name}</h3><p>{action.type === "challenge" ? "Sent a challenge" : "Poked you"} · {action.fromProfile.rating}</p></div>
              <div className="request-actions">
                <button aria-label={`Accept ${action.type}`} onClick={() => acceptAction(action)}><Check size={17} /> {action.type === "challenge" ? "Accept" : "Answer"}</button>
                <button aria-label={`Dismiss ${action.type}`} className="quiet" onClick={() => dismissAction(action)}><X size={17} /> Dismiss</button>
              </div>
            </article>
          ))}
          {!requestCount && (
            <EmptyState
              icon={UserPlus}
              message="Friend requests, pokes, and challenges from real players will appear here."
              title="No pending requests"
            />
          )}
        </div>
      )}

      {selectedFriendProfile && (
        <aside className="friend-profile-sheet" role="dialog" aria-label={`${selectedFriendProfile.profile.name} profile`}>
          <button className="friend-profile-close" aria-label="Close friend profile" onClick={() => setSelectedFriendProfile(undefined)}><X size={18} /></button>
          <div className="friend-profile-head">
            <Portrait className={`${selectedFriendProfile.profile.portrait} large`} initials={selectedFriendProfile.profile.avatar} />
            <div>
              <p className="eyebrow">Friend profile</p>
              <h2>{selectedFriendProfile.profile.name}</h2>
              <span>{selectedFriendProfile.profile.rating}</span>
            </div>
          </div>
          <div className="friend-profile-stats">
            <div><span>Ace level</span><strong>{selectedFriendProfile.profile.level}</strong></div>
            <div><span>Points</span><strong>{selectedFriendProfile.profile.points.toLocaleString()}</strong></div>
            <div><span>Status</span><strong>Friend</strong></div>
          </div>
          <div className="button-pair">
            <button className="hero-action compact" onClick={() => challengeFriend(selectedFriendProfile.friendship, selectedFriendProfile.profile, selectedFriendProfile.userId)}><Trophy size={17} /> Challenge</button>
            <button className="ghost-button" onClick={() => { setSelectedFriendProfile(undefined); onTab("Friends"); }}><MessageCircle size={17} /> Message</button>
          </div>
        </aside>
      )}
      <p className="list-label">Local ladder</p>
      <article className="ladder-card">
        <div><span>Your Rank</span><strong>-- <small>of --</small></strong><b>{profile.rating}</b></div>
        <div className="ladder-steps">
          {["Rising Ace", "Court Challenger", "Match Master", "Local Legend"].map((step, index) => (
            <span className={index === 1 ? "active" : ""} key={step}><Trophy size={20} />{step}</span>
          ))}
        </div>
      </article>
    </section>
  );
}

function ProfileScreen({
  accountStatus,
  profile,
  progression,
  profileSaveStatus,
  onAction,
  onNavigate,
  onSaveProfile
}: {
  accountStatus: string;
  profile: UserProfile;
  progression: MatchProgression;
  profileSaveStatus: string;
  onAction: (message: string) => void;
  onNavigate: (screen: Screen) => void;
  onSaveProfile: (profile: UserProfile) => Promise<void> | void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocatingHome, setIsLocatingHome] = useState(false);
  const [homeStatus, setHomeStatus] = useState("");
  const [editStatus, setEditStatus] = useState("");

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  function updateDraft(field: keyof UserProfile, value: string | number) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateEquipment(field: keyof UserProfile["equipment"], value: string) {
    setDraft((current) => ({ ...current, equipment: { ...current.equipment, [field]: value } }));
  }

  function updateSkill(skillName: string, value: number) {
    setDraft((current) => ({
      ...current,
      skills: current.skills.map(([label, currentValue]) => (
        label === skillName ? [label, Math.max(0, Math.min(100, value))] : [label, currentValue]
      ))
    }));
  }

  async function updatePhoto(file?: File) {
    if (!file) return;
    setEditStatus("Preparing profile photo...");
    try {
      const photoDataUrl = await resizeProfilePhoto(file);
      setDraft((current) => ({ ...current, photoDataUrl }));
      setEditStatus("Photo ready. Tap Save changes.");
    } catch (error) {
      setEditStatus(error instanceof Error ? error.message : "Could not prepare profile photo");
    }
  }

  async function saveProfile() {
    const nextProfile = normalizeProfileDraft({
      ...draft,
      avatar: getInitials(draft.name),
      shortName: getShortName(draft.name),
      level: progression.level,
      rating: `${progression.points} pts`,
      xp: progression.xp,
      xpText: progression.xpText
    });
    setIsSaving(true);
    setEditStatus("Saving profile...");
    try {
      await onSaveProfile(nextProfile);
      setDraft(nextProfile);
      setEditStatus("Profile saved");
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save profile";
      setEditStatus(message);
      onAction(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveHomeArea() {
    if (!navigator.geolocation) {
      setHomeStatus("GPS is not available in this browser");
      return;
    }

    setIsLocatingHome(true);
    setHomeStatus("Requesting location permission...");

    try {
      const position = await getCurrentPosition();
      const homeArea = createPrivateHomeArea(position.coords);
      const profileWithHome = {
        ...draft,
        homeArea,
        location: isPlaceholderLocation(draft.location) ? homeArea.label : draft.location
      };
      const rewardResult = addEngagementReward(
        profileWithHome,
        "profile:home-area",
        createEngagementReward("homeArea", 50, "Saved home area")
      );
      const nextProfile = normalizeProfileDraft(rewardResult.profile);
      setDraft(nextProfile);
      await onSaveProfile(nextProfile);
      setHomeStatus(rewardResult.awarded ? "Home area saved privately · +50 Ace XP" : "Home area updated privately");
      onAction(rewardResult.awarded ? "+50 Ace XP · Home area saved" : "Home area updated");
    } catch (error) {
      setHomeStatus(getLocationErrorMessage(error));
    } finally {
      setIsLocatingHome(false);
    }
  }

  const selectedPro = getFamousPlayerProfile(profile.favoritePro);
  const comparisonPro = selectedPro ?? getFamousPlayerProfile("João Fonseca");

  return (
    <section className="screen content profile-screen">
      <div className="profile-hero">
        <Portrait className={`${profile.portrait} large`} initials={profile.avatar} photoDataUrl={profile.photoDataUrl} />
        <div>
          <h1>{profile.name}</h1>
          <p><MapPin size={17} /> {profile.location}</p>
          <span className="rating-pill">{profile.rating}</span>
        </div>
        <button className="account-button" onClick={() => setIsEditing((editing) => !editing)}>{isEditing ? "Close" : "Edit"}</button>
      </div>

      <article className="home-area-card">
        <div>
          <p className="eyebrow">Private location</p>
          <h2>{profile.homeArea ? "Home area saved" : "Add your home area"}</h2>
          <p>{profile.homeArea ? `${profile.homeArea.label} · not your exact street address` : "Pin an approximate home area for future nearby features. Your exact address is not saved."}</p>
          {homeStatus && <span>{homeStatus}</span>}
        </div>
        <button className="hero-action compact" disabled={isLocatingHome} onClick={saveHomeArea}>
          <MapPin size={18} /> {isLocatingHome ? "Locating..." : profile.homeArea ? "Update home" : "Save home +50 XP"}
        </button>
      </article>

      {isEditing && (
        <article className="edit-profile-card">
          <div className="section-row">
            <h2>Edit profile</h2>
            <button className="text-button" disabled={isSaving} onClick={saveProfile}>{isSaving ? "Saving..." : "Save"}</button>
          </div>
          <div className="edit-grid">
            <label className="photo-field">
              <span>Profile picture</span>
              <div>
                <Portrait className={`${draft.portrait} large`} initials={draft.avatar} photoDataUrl={draft.photoDataUrl} />
                <input accept="image/*" type="file" onChange={(event) => updatePhoto(event.target.files?.[0])} />
                <button className="ghost-button" type="button" onClick={() => setDraft((current) => ({ ...current, photoDataUrl: undefined }))}><Camera size={17} /> Clear photo</button>
              </div>
            </label>
            <label>
              <span>Name</span>
              <input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} />
            </label>
            <label>
              <span>Location</span>
              <input value={draft.location} onChange={(event) => updateDraft("location", event.target.value)} />
            </label>
            <label>
              <span>Handedness</span>
              <input value={draft.hand} onChange={(event) => updateDraft("hand", event.target.value)} />
            </label>
            <label className="profile-goal-field">
              <span>Tennis inspiration</span>
              <input value={draft.favoritePro} onChange={(event) => updateDraft("favoritePro", event.target.value)} placeholder="Choose a famous player or write your own goal" />
              <div className="famous-player-pills" aria-label="Famous tennis player inspirations">
                {famousTennisPlayers.map((playerName) => (
                  <button
                    className={draft.favoritePro === playerName ? "active" : ""}
                    key={playerName}
                    type="button"
                    onClick={() => updateDraft("favoritePro", playerName)}
                  >
                    {playerName}
                  </button>
                ))}
              </div>
            </label>
            <label>
              <span>Racket</span>
              <input value={draft.equipment.racket} onChange={(event) => updateEquipment("racket", event.target.value)} />
            </label>
            <label>
              <span>Head size</span>
              <input value={draft.equipment.headSize} onChange={(event) => updateEquipment("headSize", event.target.value)} />
            </label>
            <label>
              <span>Strings</span>
              <input value={draft.equipment.strings} onChange={(event) => updateEquipment("strings", event.target.value)} />
            </label>
            <label>
              <span>Tension</span>
              <input value={draft.equipment.tension} onChange={(event) => updateEquipment("tension", event.target.value)} />
            </label>
            <label>
              <span>Grip</span>
              <input value={draft.equipment.grip} onChange={(event) => updateEquipment("grip", event.target.value)} />
            </label>
          </div>
          <div className="skill-editor-list">
            <div className="section-row">
              <h3>Set your skills</h3>
              <span>Opponent feedback can adjust these after matches.</span>
            </div>
            {draft.skills.map(([skill, value]) => (
              <label className="skill-editor-row" key={skill}>
                <span>{skill}</span>
                <input min="0" max="100" type="range" value={value} onChange={(event) => updateSkill(skill, Number(event.target.value))} />
                <strong>{(value / 10).toFixed(1)}</strong>
              </label>
            ))}
          </div>
          <div className="button-pair">
            <button className="hero-action compact" disabled={isSaving} onClick={saveProfile}>{isSaving ? "Saving..." : "Save changes"}</button>
            <button className="ghost-button" onClick={() => { setDraft(profile); setIsEditing(false); }}>Cancel</button>
          </div>
          {editStatus && <p className="profile-edit-status">{editStatus}</p>}
        </article>
      )}

      <article className="account-card">
        <div>
          <p className="eyebrow">Account</p>
          <strong>{accountStatus}</strong>
          {profileSaveStatus && <span className="profile-sync-status">{profileSaveStatus}</span>}
        </div>
        <button onClick={() => onNavigate("account")}>Manage</button>
      </article>

      <div className="level-row">
        <div><span>Ace Level</span><strong>{profile.level}</strong></div>
        <div>
          <p>{profile.xpText}</p>
          <div className="xp-track"><span style={{ width: `${profile.xp}%` }} /></div>
        </div>
      </div>

      <article className="flat-section rewards-section">
        <div className="section-row">
          <h2>Ace XP rewards</h2>
          <span>{progression.engagementPoints} from actions · {progression.matchPoints} from matches</span>
        </div>
        <div className="reward-list">
          {getRecentEngagementRewards(profile.engagement).map((reward) => (
            <div className="reward-row" key={`${reward.type}-${reward.earnedAt}`}>
              <span><Sparkles size={17} /> {reward.label}</span>
              <strong>+{reward.points}</strong>
            </div>
          ))}
          {!getRecentEngagementRewards(profile.engagement).length && (
            <p className="save-status">Earn Ace XP by saving your home area, challenging players, giving feedback, and sharing match cards.</p>
          )}
        </div>
      </article>

      <article className="flat-section">
        <div className="section-row">
          <h2>Skills</h2>
          <button className="text-button" onClick={() => setIsEditing(true)}>Edit</button>
        </div>
        <div className="skill-list">
          {profile.skills.map(([skill, value]) => (
            <div className="skill" key={skill}>
              <Dumbbell size={20} />
              <span>{skill}<small>{formatSkillVoteSummary(profile.skillVotes?.[skill])}</small></span>
              <div><i style={{ width: `${value}%` }} /></div>
              <strong>{Number(value) / 10}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="flat-section">
        <div className="section-row">
          <h2>Equipment</h2>
          <button className="text-button" onClick={() => setIsEditing(true)}>Edit</button>
        </div>
        <div className="equipment-list">
          {Object.entries(profile.equipment).map(([label, value]) => (
            <button className="equipment-row" key={label} onClick={() => setIsEditing(true)}>
              <span className="equipment-label"><Gauge size={20} /> {formatEquipmentLabel(label)}</span>
              <span className="equipment-value">{value}<ChevronRight size={17} /></span>
            </button>
          ))}
        </div>
      </article>

      <article className="pro-card">
        <div className="section-row">
          <h2>Compare with pros</h2>
          <button className="text-button" onClick={() => setIsEditing(true)}>Edit</button>
        </div>
        <div className="pro-compare-head">
          <div>
            <Portrait className={profile.portrait} initials={profile.avatar} photoDataUrl={profile.photoDataUrl} />
            <div><strong>{profile.hand}</strong><span>Your current skills</span></div>
          </div>
          <div>
            <span className="pro-badge">Pro</span>
            <div><strong>{comparisonPro?.name ?? "Choose a pro"}</strong><span>{comparisonPro?.style ?? "Pick an inspiration in Edit"}</span></div>
          </div>
        </div>
        <div className="pro-comparison-bars">
          {profile.skills.slice(0, 6).map(([label, value], index) => {
            const proValue = comparisonPro?.skills[index] ?? 0;
            return (
              <div className="pro-comparison-row" key={label}>
                <span>{getSkillCode(label)}</span>
                <div aria-label={`${label} comparison`}>
                  <i className="you" style={{ width: `${value}%` }} />
                  <i className="pro" style={{ width: `${proValue}%` }} />
                </div>
                <strong>{(value / 10).toFixed(1)}</strong>
              </div>
            );
          })}
        </div>
        <p className="pro-card-note">{selectedPro ? `You are comparing yourself with ${selectedPro.name}.` : "Default comparison shown with João Fonseca. Tap Edit to choose Federer, Serena, Nadal, Djokovic, Alcaraz, João Fonseca, and more."}</p>
      </article>
    </section>
  );
}

function AccountScreen({
  accountStatus,
  appUser,
  isEntry = false,
  onAnonymous,
  onCreate,
  onNavigate,
  onResetPassword,
  onSignIn,
  onSignOut
}: {
  accountStatus: string;
  appUser?: AppUser;
  isEntry?: boolean;
  onAnonymous: () => Promise<void>;
  onCreate: (email: string, password: string) => Promise<void>;
  onNavigate: (screen: Screen) => void;
  onResetPassword: (email: string) => Promise<void>;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [authAction, setAuthAction] = useState<"sign-in" | "create" | "reset" | "guest" | undefined>();
  const isGuest = appUser?.mode === "firebase" && appUser.isAnonymous;
  const isRegistered = Boolean(appUser?.email);
  const createLabel = isGuest ? "Upgrade guest account" : "Create account";
  const statusLabel = isRegistered ? appUser?.email : accountStatus;
  const normalizedEmail = email.trim().toLowerCase();

  async function runAuth(action: "sign-in" | "create") {
    if (!normalizedEmail || password.length < 6) {
      setFormStatus("Use an email and a password with 6+ characters.");
      return;
    }

    try {
      setAuthAction(action);
      setFormStatus(action === "sign-in" ? "Signing in..." : "Creating account...");
      if (action === "sign-in") {
        await withFriendlyTimeout(onSignIn(normalizedEmail, password), "Sign in is taking too long. Check the connection and try again.");
      } else {
        await withFriendlyTimeout(onCreate(normalizedEmail, password), "Account creation is taking too long. Check the connection and try again.");
      }
      setFormStatus("Account ready.");
    } catch (error) {
      setFormStatus(getAuthErrorMessage(error));
    } finally {
      setAuthAction(undefined);
    }
  }

  async function runPasswordReset() {
    if (!normalizedEmail) {
      setFormStatus("Enter your email first.");
      return;
    }

    try {
      setAuthAction("reset");
      setFormStatus("Sending reset email...");
      await withFriendlyTimeout(onResetPassword(normalizedEmail), "Password reset is taking too long. Check the connection and try again.");
      setFormStatus("Password reset email sent.");
    } catch (error) {
      setFormStatus(getAuthErrorMessage(error));
    } finally {
      setAuthAction(undefined);
    }
  }

  async function runGuest() {
    try {
      setAuthAction("guest");
      setFormStatus("Starting guest session...");
      await withFriendlyTimeout(onAnonymous(), "Guest session is taking too long. Check the connection and try again.");
    } catch (error) {
      setFormStatus(getAuthErrorMessage(error));
    } finally {
      setAuthAction(undefined);
    }
  }

  return (
    <section className={`screen content account-screen ${isEntry ? "entry-screen" : ""}`}>
      <header className="simple-header">
        {isEntry && <AceTrackWordmark />}
        <p className="eyebrow">{isEntry ? "Welcome" : "AceTrack account"}</p>
        <h1>{isEntry ? "Log in to start tracking." : "Save every match."}</h1>
        <p>{isEntry ? "Create your profile, save matches, and keep every point synced." : "Manage your login, guest mode, and saved match identity."}</p>
      </header>

      <article className="login-card">
        {!isEntry && (
          <div className="account-summary">
            <span>{isRegistered ? "Registered account" : isGuest ? "Guest account" : "Signed out"}</span>
            <strong>{statusLabel}</strong>
            <p>{isGuest ? "Add an email and password to keep this guest profile." : isRegistered ? "Your matches are tied to this login." : "Sign in or create an account to sync matches."}</p>
          </div>
        )}
        <label>
          <span><Mail size={17} /> Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" />
        </label>
        <label>
          <span><Lock size={17} /> Password</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="6+ characters" type="password" />
        </label>
        <div className="account-actions">
          <button className="hero-action compact" disabled={Boolean(authAction)} onClick={() => runAuth("sign-in")}><LogIn size={18} /> {authAction === "sign-in" ? "Signing in..." : "Sign in"}</button>
          <button className="ghost-button" disabled={Boolean(authAction)} onClick={() => runAuth("create")}>{authAction === "create" ? "Creating..." : createLabel}</button>
          <button className="ghost-button" disabled={Boolean(authAction)} onClick={runPasswordReset}>{authAction === "reset" ? "Sending..." : "Forgot password"}</button>
          <button className="ghost-button" disabled={Boolean(authAction)} onClick={runGuest}>{authAction === "guest" ? "Starting..." : "Continue as guest"}</button>
          {!isEntry && <button className="ghost-button quiet" disabled={Boolean(authAction)} onClick={onSignOut}><LogOut size={18} /> Sign out</button>}
        </div>
        <p className="save-status">{formStatus}</p>
        <p className="auth-help">Created an account before? Use the same email with Sign in. If it says incorrect, use Forgot password.</p>
      </article>

      {!isEntry && <button className="ghost-button" onClick={() => onNavigate("profile")}>Back to profile</button>}
    </section>
  );
}

function AdminScreen({ onAction }: { onAction: (message: string) => void }) {
  const [profiles, setProfiles] = useState<AdminUserProfile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<UserProfile | undefined>();
  const [newUserDraft, setNewUserDraft] = useState<UserProfile>(() => createBlankManagedProfile());
  const [newUserEmail, setNewUserEmail] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Loading users...");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    let isMounted = true;
    loadAdminProfiles(() => isMounted);

    return () => {
      isMounted = false;
    };
  }, []);

  async function loadAdminProfiles(isMounted = () => true) {
    setIsLoadingUsers(true);
    setStatus("Loading user profiles...");
    try {
      const items = await listUserProfiles();
      if (!isMounted()) return;
      setProfiles(items);
      setSelectedId((current) => items.some((item) => item.userId === current) ? current : items[0]?.userId || "");
      setStatus(items.length ? `${items.length} user profiles loaded` : "No profile documents found yet. Ask a user to sign in once, then refresh.");
    } catch (error) {
      if (!isMounted()) return;
      setProfiles([]);
      setSelectedId("");
      setDraft(undefined);
      setStatus(getAdminLoadErrorMessage(error));
    } finally {
      if (isMounted()) setIsLoadingUsers(false);
    }
  }

  const selectedProfile = profiles.find((item) => item.userId === selectedId);

  useEffect(() => {
    if (selectedProfile) setDraft(stripAdminFields(selectedProfile));
  }, [selectedProfile]);

  const filteredProfiles = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return profiles;

    return profiles.filter((item) =>
      [item.name, item.location, item.rating, item.userId, item.email, item.accountType]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [profiles, query]);

  const totalXp = profiles.reduce((sum, item) => sum + item.xp, 0);
  const averageLevel = profiles.length
    ? Math.round(profiles.reduce((sum, item) => sum + item.level, 0) / profiles.length)
    : 0;

  function updateDraft(field: keyof UserProfile, value: string | number) {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  }

  function updateEquipment(field: keyof UserProfile["equipment"], value: string) {
    setDraft((current) => current ? { ...current, equipment: { ...current.equipment, [field]: value } } : current);
  }

  function updateNewUser(field: keyof UserProfile, value: string | number) {
    setNewUserDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveAdminProfile() {
    if (!selectedProfile || !draft) return;

    const nextProfile = normalizeProfileDraft(draft);
    setIsSaving(true);
    setStatus("Saving user profile...");
    const result = await saveUserProfile(selectedProfile.userId, nextProfile);
    const updatedProfile: AdminUserProfile = {
      ...nextProfile,
      userId: selectedProfile.userId,
      updatedAt: new Date().toISOString()
    };
    setProfiles((current) => current.map((item) => item.userId === selectedProfile.userId ? updatedProfile : item));
    setDraft(nextProfile);
    setStatus(result.mode === "firebase" ? "User profile saved to Firebase" : "User profile saved locally");
    setIsSaving(false);
    onAction("Admin changes saved");
  }

  async function createAdminUser() {
    const nextProfile = normalizeProfileDraft(newUserDraft);
    setIsSaving(true);
    setStatus("Creating managed user...");
    try {
      const result = await createManagedUserProfile(nextProfile, newUserEmail);
      const createdProfile: AdminUserProfile = {
        ...nextProfile,
        accountType: "managed",
        email: newUserEmail.trim().toLowerCase() || undefined,
        userId: result.userId,
        updatedAt: new Date().toISOString()
      };
      setProfiles((current) => [createdProfile, ...current]);
      setSelectedId(result.userId);
      setDraft(nextProfile);
      setNewUserDraft(createBlankManagedProfile());
      setNewUserEmail("");
      setShowCreateUser(false);
      setStatus(result.mode === "firebase" ? "Managed user created" : "Managed user created locally");
      onAction("User created");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create user");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSelectedUser() {
    if (!selectedProfile) return;

    const confirmed = window.confirm(`Remove ${selectedProfile.name} from AceTrack management? This deletes their app profile and GPS card, not their Firebase Auth login.`);
    if (!confirmed) return;

    setIsDeletingUser(true);
    setStatus("Deleting user profile...");
    try {
      const result = await deleteUserProfile(selectedProfile.userId);
      setProfiles((current) => current.filter((item) => item.userId !== selectedProfile.userId));
      setSelectedId("");
      setDraft(undefined);
      setStatus(result.mode === "firebase" ? "User profile deleted" : "User profile removed locally");
      onAction("User profile deleted");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not delete user profile");
    } finally {
      setIsDeletingUser(false);
    }
  }

  return (
    <section className="screen content admin-screen">
      <header className="simple-header admin-header">
        <p className="eyebrow"><ShieldCheck size={15} /> Admin</p>
        <h1>User management.</h1>
        <p>Manage AceTrack player profiles and support accounts.</p>
      </header>

      <div className="admin-stats">
        <Metric label="Profiles" value={String(profiles.length)} />
        <Metric label="Avg Ace Level" value={String(averageLevel)} />
        <Metric label="Total Progress" value={totalXp.toLocaleString()} />
      </div>

      <label className="admin-search">
        <span>Search users</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, city, points, or user id" />
      </label>
      <button className="ghost-button admin-refresh" disabled={isLoadingUsers} onClick={() => loadAdminProfiles()}>
        <RotateCcw size={17} /> {isLoadingUsers ? "Refreshing..." : "Refresh users"}
      </button>
      <button className="hero-action compact admin-create-toggle" onClick={() => setShowCreateUser((visible) => !visible)}>
        <UserPlus size={18} /> {showCreateUser ? "Close creator" : "Create user"}
      </button>

      {showCreateUser && (
        <article className="admin-create-card">
          <div className="section-row">
            <h2>Create managed user</h2>
            <button className="text-button" disabled={isSaving} onClick={createAdminUser}>{isSaving ? "Creating..." : "Create"}</button>
          </div>
          <div className="edit-grid admin-form">
            <label>
              <span>Name</span>
              <input value={newUserDraft.name} onChange={(event) => updateNewUser("name", event.target.value)} />
            </label>
            <label>
              <span>Email</span>
              <input value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} placeholder="optional@email.com" type="email" />
            </label>
            <label>
              <span>Location</span>
              <input value={newUserDraft.location} onChange={(event) => updateNewUser("location", event.target.value)} />
            </label>
            <p className="save-status">Match points start at 0 and are earned from saved matches.</p>
          </div>
        </article>
      )}

      <div className="admin-layout">
        <div className="admin-list" aria-label="User profiles">
          {filteredProfiles.map((item) => (
            <button className={item.userId === selectedId ? "admin-row active" : "admin-row"} key={item.userId} onClick={() => setSelectedId(item.userId)}>
              <Portrait className={item.portrait} initials={item.avatar} photoDataUrl={item.photoDataUrl} />
              <span>
                <strong>{item.name}</strong>
                <small>{item.location} · {item.rating}{item.email ? ` · ${item.email}` : ""}</small>
                <em>{item.userId}</em>
              </span>
              <b>{item.accountType === "managed" ? "Managed" : `Lv ${item.level}`}</b>
            </button>
          ))}
          {!filteredProfiles.length && (
            <div className="admin-empty">
              <strong>{query ? "No matching users" : "No users visible"}</strong>
              <span>{query ? "Try a different name, city, points, or user id." : status}</span>
            </div>
          )}
        </div>

        <article className="admin-editor">
          <div className="section-row">
            <h2>{draft ? "Edit selected user" : "Select a user"}</h2>
            <button className="text-button" disabled={!draft || isSaving} onClick={saveAdminProfile}>{isSaving ? "Saving..." : "Save"}</button>
          </div>
          {draft ? (
            <>
              <div className="admin-user-card">
                <Portrait className={`${draft.portrait} large`} initials={draft.avatar} photoDataUrl={draft.photoDataUrl} />
                <div>
                  <strong>{draft.name}</strong>
                  <span>{selectedProfile?.userId}</span>
                  {selectedProfile?.email && <span>{selectedProfile.email}</span>}
                  <small>Updated {selectedProfile?.updatedAt ? new Date(selectedProfile.updatedAt).toLocaleDateString() : "recently"}</small>
                </div>
              </div>
              <div className="edit-grid admin-form">
                <label>
                  <span>Name</span>
                  <input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} />
                </label>
                <label>
                  <span>Location</span>
                  <input value={draft.location} onChange={(event) => updateDraft("location", event.target.value)} />
                </label>
                <p className="save-status">Ace level and XP are read-only here. They update from matches and rewarded actions.</p>
                <label>
                  <span>Racket</span>
                  <input value={draft.equipment.racket} onChange={(event) => updateEquipment("racket", event.target.value)} />
                </label>
                <label>
                  <span>Strings</span>
                  <input value={draft.equipment.strings} onChange={(event) => updateEquipment("strings", event.target.value)} />
                </label>
              </div>
              <p className="save-status">{status}</p>
              <div className="button-pair">
                <button className="hero-action compact" disabled={isSaving} onClick={saveAdminProfile}><ShieldCheck size={18} /> {isSaving ? "Saving..." : "Save user"}</button>
                <button className="ghost-button" onClick={() => selectedProfile && setDraft(stripAdminFields(selectedProfile))}>Reset edits</button>
              </div>
              <button className="danger-button admin-delete-user" disabled={isDeletingUser} onClick={deleteSelectedUser}>
                <Trash2 size={18} /> {isDeletingUser ? "Deleting..." : selectedProfile?.accountType === "managed" ? "Delete managed user" : "Delete app profile"}
              </button>
            </>
          ) : (
            <p className="admin-empty">{status}</p>
          )}
        </article>
      </div>
    </section>
  );
}

function AceTrackWordmark() {
  return (
    <div className="wordmark" aria-label="AceTrack">
      <span><TennisBall /></span>
      <strong>AceTrack</strong>
    </div>
  );
}

function InfoCard({ icon: Icon, title, value, onClick }: { icon: typeof Home; title: string; value: string; onClick?: () => void }) {
  return (
    <button className="info-card" onClick={onClick}>
      <span className="icon-orb"><Icon size={22} /></span>
      <span>{title}</span>
      <strong>{value}</strong>
      <ArrowRight size={20} />
    </button>
  );
}

function ChallengeInboxCard({
  action,
  count,
  onAccept,
  onDismiss
}: {
  action: SocialAction;
  count: number;
  onAccept: (action: SocialAction) => void | Promise<void>;
  onDismiss: (action: SocialAction) => void | Promise<void>;
}) {
  return (
    <article className="challenge-card">
      <div>
        <p className="eyebrow"><Trophy size={14} /> Challenge</p>
        <h2>{action.fromProfile.name} challenged you</h2>
        <span>{action.fromProfile.rating}{count > 1 ? ` · ${count - 1} more pending` : ""}</span>
      </div>
      <Portrait className={action.fromProfile.portrait} initials={action.fromProfile.avatar} />
      <div className="button-pair">
        <button className="hero-action compact" onClick={() => onAccept(action)}><Check size={17} /> Accept</button>
        <button className="ghost-button" onClick={() => onDismiss(action)}><X size={17} /> Dismiss</button>
      </div>
    </article>
  );
}

function ChallengeBanner({
  action,
  onAccept,
  onClose,
  onDismiss
}: {
  action: SocialAction;
  onAccept: (action: SocialAction) => void | Promise<void>;
  onClose: () => void;
  onDismiss: (action: SocialAction) => void | Promise<void>;
}) {
  return (
    <aside className="challenge-banner" role="dialog" aria-label="Incoming challenge">
      <Portrait className={action.fromProfile.portrait} initials={action.fromProfile.avatar} />
      <div>
        <strong>{action.fromProfile.name} challenged you</strong>
        <span>{action.fromProfile.rating}</span>
      </div>
      <button onClick={() => onAccept(action)}><Check size={16} /> Accept</button>
      <button className="quiet" onClick={() => onDismiss(action)}><X size={16} /> No</button>
      <button className="close" aria-label="Close challenge banner" onClick={onClose}><MoreHorizontal size={18} /></button>
    </aside>
  );
}

function EmptyState({
  actionLabel,
  icon: Icon,
  message,
  title,
  onAction
}: {
  actionLabel?: string;
  icon: typeof Home;
  message: string;
  title: string;
  onAction?: () => void;
}) {
  return (
    <article className="empty-state">
      <span><Icon size={22} /></span>
      <strong>{title}</strong>
      <p>{message}</p>
      {actionLabel && onAction && <button className="ghost-button" onClick={onAction}>{actionLabel}</button>}
    </article>
  );
}

function TennisCourtMapCard({
  courts,
  isLoading,
  origin,
  radiusKm,
  status,
  onRefresh
}: {
  courts: TennisCourt[];
  isLoading: boolean;
  origin?: GpsPoint;
  radiusKm: number;
  status: string;
  onRefresh: () => void | Promise<void>;
}) {
  const markers = origin ? createCourtMapMarkers(origin, courts, radiusKm) : [];
  const mapTiles = origin ? createOsmTileGrid(origin, radiusKm) : [];
  const visibleCourts = courts.slice(0, 6);

  return (
    <article className="tennis-court-card">
      <div className="section-row">
        <div>
          <p className="eyebrow">Tennis courts</p>
          <h2>Courts in your area</h2>
        </div>
        <button className="text-button" disabled={isLoading} onClick={onRefresh}>{isLoading ? "Searching..." : courts.length ? "Refresh" : "Find courts"}</button>
      </div>
      <p className="court-map-status">{status}</p>
      <div className={origin ? "court-map-shell" : "court-map-shell empty"}>
        {origin ? (
          <>
            {mapTiles.map((tile) => (
              <img
                alt=""
                aria-hidden="true"
                className="court-map-tile"
                key={tile.key}
                src={tile.url}
                style={{ left: tile.left, top: tile.top }}
              />
            ))}
            <span className="court-marker self" style={{ left: "50%", top: "50%" }}><MapPin size={15} /></span>
            {markers.map((marker) => (
              <a
                aria-label={`${marker.name} on map`}
                className="court-marker"
                href={getMapsUrl(marker)}
                key={marker.id}
                rel="noreferrer"
                style={{ left: marker.left, top: marker.top }}
                target="_blank"
                title={marker.name}
              >
                <MapPin size={15} />
              </a>
            ))}
            <span className="map-attribution">OpenStreetMap</span>
          </>
        ) : (
          <div className="court-map-empty">
            <MapPin size={22} />
            <strong>Share GPS to load nearby courts</strong>
          </div>
        )}
      </div>
      <div className="court-list">
        {visibleCourts.map((court) => (
          <a className="court-row" href={getMapsUrl(court)} key={court.id} rel="noreferrer" target="_blank">
            <span><MapPin size={17} /></span>
            <div>
              <strong>{court.name}</strong>
              <small>{court.distance}{court.details ? ` · ${court.details}` : ""}</small>
            </div>
            <ArrowRight size={17} />
          </a>
        ))}
        {!visibleCourts.length && (
          <div className="court-empty-row">
            <strong>{origin ? "No courts found in this radius" : "No court search yet"}</strong>
            <span>{origin ? "Try a wider distance or refresh GPS." : "Tap Find courts to search OpenStreetMap near you."}</span>
          </div>
        )}
      </div>
    </article>
  );
}

function MiniMatchScore({ record }: { record: MatchRecord }) {
  const displaySets = record.sets.filter((set) => set.games[0] > 0 || set.games[1] > 0 || set.winner !== undefined).slice(0, 3);
  const sets = displaySets.length ? displaySets : [{ games: [0, 0] as [number, number] }];

  return (
    <div className="mini-score">
      <span>SET</span>{sets.map((_, index) => <b key={`h-${index}`}>{index + 1}</b>)}
      {sets.map((set, index) => <strong className={set.winner === 0 ? "won" : ""} key={`a-${index}`}>{set.games[0]}</strong>)}
      {sets.map((set, index) => <strong className={set.winner === 1 ? "won" : ""} key={`b-${index}`}>{set.games[1]}</strong>)}
    </div>
  );
}

function PlayerScore({
  name,
  meta,
  avatar,
  photoDataUrl,
  portrait,
  score
}: {
  name: string;
  meta: string;
  avatar: string;
  photoDataUrl?: string;
  portrait: string;
  score: string;
}) {
  return (
    <div className="player-score">
      <Portrait className={portrait} initials={avatar} photoDataUrl={photoDataUrl} />
      <div>
        <h2>{name}</h2>
        <p>{meta}</p>
      </div>
      <strong>{score}</strong>
    </div>
  );
}

function StatBalance({ label, values }: { label: string; values: [number, number] }) {
  const total = values[0] + values[1];
  const balance = total ? Math.round((values[0] / total) * 100) : 50;

  return (
    <div className="stat-balance">
      <strong>{values[0]}</strong>
      <div>
        <span>{label}</span>
        <i><b style={{ width: `${balance}%` }} /></i>
      </div>
      <strong>{values[1]}</strong>
    </div>
  );
}

function FeedbackCard({
  feedback,
  showSkillValue = true,
  skills,
  subtitle,
  summary,
  title,
  onChange
}: {
  feedback: SkillFeedback;
  showSkillValue?: boolean;
  skills: Array<[string, number]>;
  subtitle: string;
  summary: MatchFeedbackInput;
  title: string;
  onChange: (skill: string, value: -1 | 0 | 1 | undefined) => void;
}) {
  return (
    <article className="feedback-card">
      <div className="section-row">
        <div>
          <p className="eyebrow">Skill feedback</p>
          <h2>{title}</h2>
        </div>
        <span>{summary.tokensUsed}/5 votes · +{summary.bonusPercent}%</span>
      </div>
      <p>{subtitle}</p>
      <div className="feedback-skill-grid">
        {skills.map(([skill, value]) => (
          <div className="feedback-skill-row" key={skill}>
            <span>{skill}</span>
            <strong>{showSkillValue ? (getAdjustedSkillValue(value, feedback[skill]) / 10).toFixed(1) : getVoteLabel(feedback[skill])}</strong>
            <button className={feedback[skill] === -1 ? "active negative" : ""} aria-label={`Decrease ${skill}`} onClick={() => onChange(skill, feedback[skill] === -1 ? undefined : -1)}><Minus size={16} /></button>
            <button className={feedback[skill] === 0 ? "active neutral" : ""} aria-label={`Keep ${skill}`} onClick={() => onChange(skill, feedback[skill] === 0 ? undefined : 0)}>0</button>
            <button className={feedback[skill] === 1 ? "active positive" : ""} aria-label={`Increase ${skill}`} onClick={() => onChange(skill, feedback[skill] === 1 ? undefined : 1)}><Plus size={16} /></button>
          </div>
        ))}
      </div>
    </article>
  );
}

function SetTable({
  profile = user,
  playerNames,
  sets,
  full = false,
  title = "Set"
}: {
  profile?: UserProfile;
  playerNames?: [string, string];
  sets: ReturnType<typeof getCompletedSets>;
  full?: boolean;
  title?: string;
}) {
  const displaySets = sets.length ? sets : [{ games: [0, 0] as [number, number] }];
  const paddedSets = full ? [...displaySets, ...Array.from({ length: Math.max(0, 5 - displaySets.length) }, () => undefined)] : displaySets;
  const rowNames = playerNames ? playerNames.map(getCompactSideName) : [profile.shortName, opponent.shortName];
  return (
    <table className="set-table">
      <thead>
        <tr><th>{title}</th>{paddedSets.map((_, index) => <th key={index}>{index + 1}</th>)}</tr>
      </thead>
      <tbody>
        {[[rowNames[0], 0], [rowNames[1], 1]].map(([name, playerIndex]) => (
          <tr key={name}>
            <td>{name}</td>
            {paddedSets.map((set, index) => <td key={index}>{set ? set.games[playerIndex as 0 | 1] : "-"}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Metric({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong>{delta && <em>{delta}</em>}</div>;
}

function BottomNav({ active, isAdmin, onNavigate }: { active: Screen; isAdmin: boolean; onNavigate: (screen: Screen) => void }) {
  const visibleItems = isAdmin
    ? [...navItems, { screen: "admin" as Screen, label: "Admin", icon: ShieldCheck }]
    : navItems;

  return (
    <nav className="bottom-nav" style={{ gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))` }}>
      {visibleItems.map(({ screen, label, icon: Icon }) => (
        <button className={active === screen ? "active" : ""} key={screen} onClick={() => onNavigate(screen)}>
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function MenuIcon() {
  return <span className="menu-lines" aria-hidden="true"><i /><i /><i /></span>;
}

function getRemoteRouteParams(): RemoteRouteParams | undefined {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("remote");
  const token = params.get("token");
  if (!sessionId || !token) return undefined;

  return {
    players: [params.get("a") || "Player 1", params.get("b") || "Player 2"],
    sessionId,
    token
  };
}

function getRemoteScoringUrl(session: MatchRemoteSession) {
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  url.searchParams.set("remote", session.id);
  url.searchParams.set("token", session.token);
  url.searchParams.set("a", session.players[0]);
  url.searchParams.set("b", session.players[1]);
  return url.toString();
}

function normalizeMatchOptions(options: MatchOptions, fallbackName: string): MatchOptions {
  const normalized: MatchOptions = {
    ...defaultMatchOptions,
    ...options,
    sideA: [
      options.sideA?.[0]?.trim() || fallbackName || defaultMatchOptions.sideA[0],
      options.sideA?.[1]?.trim() || defaultMatchOptions.sideA[1]
    ],
    sideB: [
      options.sideB?.[0]?.trim() || defaultMatchOptions.sideB[0],
      options.sideB?.[1]?.trim() || defaultMatchOptions.sideB[1]
    ]
  };

  return normalized.singles
    ? { ...normalized, server: normalized.server >= 2 ? 2 : 0 }
    : normalized;
}

function getSideDisplay(options: MatchOptions, side: 0 | 1) {
  const names = side === 0 ? options.sideA : options.sideB;
  return options.singles ? names[0] : `${names[0]} / ${names[1]}`;
}

function getMatchSideNames(options: MatchOptions): [string, string] {
  return [getSideDisplay(options, 0), getSideDisplay(options, 1)];
}

function getInitialServerSide(options: MatchOptions): 0 | 1 {
  return options.server < 2 ? 0 : 1;
}

function getCompactSideName(name: string) {
  return name
    .split("/")
    .map((part) => part.trim().split(" ")[0])
    .filter(Boolean)
    .join(" / ");
}

function getSpeechRecognitionConstructor() {
  const browserWindow = window as typeof window & {
    SpeechRecognition?: new () => {
      start: () => void;
      stop: () => void;
      abort?: () => void;
      continuous?: boolean;
      interimResults?: boolean;
      lang?: string;
      onend: (() => void) | null;
      onerror: ((event: unknown) => void) | null;
      onresult: ((event: unknown) => void) | null;
    };
    webkitSpeechRecognition?: new () => {
      start: () => void;
      stop: () => void;
      abort?: () => void;
      continuous?: boolean;
      interimResults?: boolean;
      lang?: string;
      onend: (() => void) | null;
      onerror: ((event: unknown) => void) | null;
      onresult: ((event: unknown) => void) | null;
    };
  };

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
}

function getSpeechTranscript(event: unknown) {
  const resultEvent = event as {
    results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
    resultIndex?: number;
  };
  const index = resultEvent.resultIndex ?? 0;
  return resultEvent.results?.[index]?.[0]?.transcript?.trim() ?? "";
}

function playUiSound(kind: "end" | "opponent" | "point" | "start" | "tap" | "undo", enabled: boolean) {
  if (!enabled) return;

  try {
    const AudioContextConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const frequencies = {
      end: 240,
      opponent: 360,
      point: 620,
      start: 520,
      tap: 300,
      undo: 260
    };

    oscillator.type = kind === "point" || kind === "start" ? "sine" : "triangle";
    oscillator.frequency.value = frequencies[kind];
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.18);
  } catch {
    // Sound is a progressive enhancement.
  }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 12000
    });
  });
}

function toGpsPoint(coords: GeolocationCoordinates): GpsPoint {
  return {
    accuracy: Math.round(coords.accuracy),
    latitude: coords.latitude,
    longitude: coords.longitude
  };
}

async function fetchNearbyTennisCourts(origin: GpsPoint, radiusKm: number): Promise<TennisCourt[]> {
  const radiusMeters = Math.round(radiusKm * 1000);
  const query = `
    [out:json][timeout:18];
    (
      nwr["sport"~"(^|;|,)tennis(;|,|$)"](around:${radiusMeters},${origin.latitude},${origin.longitude});
      nwr["leisure"="pitch"]["sport"="tennis"](around:${radiusMeters},${origin.latitude},${origin.longitude});
      nwr["leisure"="sports_centre"]["sport"~"tennis"](around:${radiusMeters},${origin.latitude},${origin.longitude});
    );
    out center tags 40;
  `;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    body: new URLSearchParams({ data: query }).toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Could not load tennis courts from OpenStreetMap");
  }

  const payload = await response.json() as {
    elements?: Array<{
      center?: { lat?: number; lon?: number };
      id: number;
      lat?: number;
      lon?: number;
      tags?: Record<string, string>;
      type: string;
    }>;
  };

  const courts = (payload.elements ?? []).flatMap((element) => {
    const lat = typeof element.lat === "number" ? element.lat : element.center?.lat;
    const lng = typeof element.lon === "number" ? element.lon : element.center?.lon;
    if (typeof lat !== "number" || typeof lng !== "number") return [];

    const distanceKm = getDistanceKm(origin.latitude, origin.longitude, lat, lng);
    if (distanceKm > radiusKm) return [];

    const tags = element.tags ?? {};
    const name = getCourtName(tags);
    const details = getCourtDetails(tags);

    return [{
      details,
      distance: `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`,
      distanceKm,
      id: `${element.type}-${element.id}`,
      lat,
      lng,
      name
    }];
  });

  return dedupeTennisCourts(courts)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 20);
}

function getCourtLookupRadiusKm(radiusKm: number) {
  return Math.max(1, Math.min(25, Math.round(radiusKm)));
}

function getCourtName(tags: Record<string, string>) {
  return tags.name?.trim() || tags.operator?.trim() || tags.club?.trim() || "Tennis court";
}

function getCourtDetails(tags: Record<string, string>) {
  return [
    tags.surface,
    tags.access && tags.access !== "yes" ? tags.access : undefined,
    tags.indoor === "yes" ? "indoor" : undefined,
    tags.lit === "yes" ? "lights" : undefined
  ].filter(Boolean).join(" · ") || undefined;
}

function dedupeTennisCourts(courts: TennisCourt[]) {
  const seen = new Map<string, TennisCourt>();
  for (const court of courts) {
    const locationKey = `${court.name.toLowerCase()}-${court.lat.toFixed(5)}-${court.lng.toFixed(5)}`;
    const existing = seen.get(locationKey);
    if (!existing || court.details && !existing.details) {
      seen.set(locationKey, court);
    }
  }
  return [...seen.values()];
}

function createCourtMapMarkers(origin: GpsPoint, courts: TennisCourt[], radiusKm: number) {
  const latRadius = Math.max(0.01, radiusKm / 111);
  const lngRadius = Math.max(0.01, radiusKm / (111 * Math.max(0.2, Math.cos(toRadians(origin.latitude)))));

  return courts.slice(0, 12).map((court) => ({
    ...court,
    left: `${clampMapPercent(50 + ((court.lng - origin.longitude) / (lngRadius * 2)) * 100)}%`,
    top: `${clampMapPercent(50 - ((court.lat - origin.latitude) / (latRadius * 2)) * 100)}%`
  }));
}

function createOsmTileGrid(origin: GpsPoint, radiusKm: number) {
  const zoom = radiusKm <= 3 ? 14 : radiusKm <= 8 ? 13 : radiusKm <= 15 ? 12 : 11;
  const tileCount = 2 ** zoom;
  const centerX = Math.floor(lonToTileX(origin.longitude, zoom));
  const centerY = Math.floor(latToTileY(origin.latitude, zoom));
  const tiles: Array<{ key: string; left: string; top: string; url: string }> = [];

  for (let y = -1; y <= 1; y += 1) {
    for (let x = -1; x <= 1; x += 1) {
      const tileX = modulo(centerX + x, tileCount);
      const tileY = Math.max(0, Math.min(tileCount - 1, centerY + y));
      tiles.push({
        key: `${zoom}-${tileX}-${tileY}`,
        left: `${(x + 1) * 33.3333}%`,
        top: `${(y + 1) * 33.3333}%`,
        url: `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`
      });
    }
  }

  return tiles;
}

function lonToTileX(lng: number, zoom: number) {
  return ((lng + 180) / 360) * 2 ** zoom;
}

function latToTileY(lat: number, zoom: number) {
  const radians = toRadians(lat);
  return ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * 2 ** zoom;
}

function clampMapPercent(value: number) {
  return Math.max(6, Math.min(94, value));
}

function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function getMapsUrl(point: Pick<TennisCourt, "lat" | "lng" | "name">) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.name} ${point.lat},${point.lng}`)}`;
}

function getDistanceKm(latA: number, lngA: number, latB: number, lngB: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(latB - latA);
  const dLng = toRadians(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}

function createPrivateHomeArea(coords: GeolocationCoordinates): NonNullable<UserProfile["homeArea"]> {
  const lat = roundPrivateCoordinate(coords.latitude);
  const lng = roundPrivateCoordinate(coords.longitude);
  return {
    accuracy: Math.round(coords.accuracy),
    label: `Home area ${lat.toFixed(2)}, ${lng.toFixed(2)}`,
    lat,
    lng,
    savedAt: new Date().toISOString()
  };
}

function roundPrivateCoordinate(value: number) {
  return Math.round(value * 100) / 100;
}

function isPlaceholderLocation(location: string) {
  return !location.trim() || ["add your club or city", "local club"].includes(location.trim().toLowerCase());
}

function rankNearbyPlayers(players: NearbyPlayer[]) {
  return [...players]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map((player, index) => ({ ...player, rank: index + 1 }));
}

function nearbyPlayerToSocialProfile(player: NearbyPlayer): SocialProfileSnapshot {
  return {
    avatar: player.avatar,
    level: player.level,
    name: player.name,
    points: player.points,
    portrait: player.portrait,
    rating: player.rating ?? `${player.points} pts`
  };
}

function directoryProfileToSocialProfile(player: PlayerDirectoryProfile): SocialProfileSnapshot {
  return {
    avatar: player.avatar,
    level: player.level,
    name: player.name,
    points: player.points,
    portrait: player.portrait,
    rating: player.rating
  };
}

function getKnownFriendSearchResults(
  term: string,
  currentUserId: string | undefined,
  friendships: Friendship[],
  incomingRequests: FriendRequest[],
  sentRequests: FriendRequest[],
  actions: SocialAction[]
) {
  const normalizedTerm = normalizeFriendSearchTerm(term);
  const profiles = new Map<string, SocialProfileSnapshot>();

  function addProfile(userId: string, socialProfile: SocialProfileSnapshot) {
    if (!userId || userId === currentUserId) return;
    if (!normalizeFriendSearchTerm(socialProfile.name).includes(normalizedTerm)) return;
    profiles.set(userId, socialProfile);
  }

  friendships.forEach((friendship) => {
    const friendId = getFriendId(friendship, currentUserId);
    const friendProfile = friendId ? friendship.profiles[friendId] : undefined;
    if (friendId && friendProfile) addProfile(friendId, friendProfile);
  });

  incomingRequests.forEach((request) => addProfile(request.fromUserId, request.fromProfile));
  sentRequests.forEach((request) => addProfile(request.toUserId, request.toProfile));
  actions.forEach((action) => addProfile(action.fromUserId, action.fromProfile));

  return Array.from(profiles.entries()).map(([userId, socialProfile]) => socialProfileToFriendSearchResult(userId, socialProfile));
}

function mergeFriendSearchResults(directoryProfiles: PlayerDirectoryProfile[], knownProfiles: FriendSearchResult[]) {
  const merged = new Map<string, FriendSearchResult>();
  directoryProfiles.forEach((player) => merged.set(player.id, { ...player, source: "directory" }));
  knownProfiles.forEach((player) => {
    if (!merged.has(player.id)) merged.set(player.id, player);
  });

  return Array.from(merged.values()).slice(0, 8);
}

function socialProfileToFriendSearchResult(userId: string, profile: SocialProfileSnapshot): FriendSearchResult {
  return {
    avatar: profile.avatar,
    id: userId,
    level: profile.level,
    location: "",
    name: profile.name,
    points: profile.points,
    portrait: profile.portrait,
    rating: profile.rating,
    searchName: normalizeFriendSearchTerm(profile.name),
    source: "known",
    updatedAt: ""
  };
}

function normalizeFriendSearchTerm(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isFriend(friendships: Friendship[], playerId: string) {
  return friendships.some((friendship) => friendship.userIds.includes(playerId));
}

function upsertFriendRequest(requests: FriendRequest[], request: FriendRequest) {
  return [request, ...requests.filter((item) => item.id !== request.id)];
}

function upsertFriendship(friendships: Friendship[], friendship: Friendship) {
  return [friendship, ...friendships.filter((item) => item.id !== friendship.id)];
}

function getNearbyFriendshipStatus(
  friendships: Friendship[],
  incomingRequests: FriendRequest[],
  sentRequests: FriendRequest[],
  playerId: string,
  currentUserId?: string
): { kind: "add" | "friend" | "incoming" | "sent"; label: string; request?: FriendRequest } {
  if (isFriend(friendships, playerId)) return { kind: "friend", label: "Friend" };

  const incoming = incomingRequests.find((request) => (
    request.status === "pending" &&
    request.fromUserId === playerId &&
    (!currentUserId || request.toUserId === currentUserId)
  ));
  if (incoming) return { kind: "incoming", label: "Accept", request: incoming };

  const sent = sentRequests.find((request) => (
    request.status === "pending" &&
    request.toUserId === playerId &&
    (!currentUserId || request.fromUserId === currentUserId)
  ));
  if (sent) return { kind: "sent", label: "Pending", request: sent };

  return { kind: "add", label: "Add" };
}

function getFriendId(friendship: Friendship, currentUserId?: string) {
  return friendship.userIds.find((userId) => userId !== currentUserId);
}

function getFriendProfile(friendship: Friendship, currentUserId?: string) {
  const friendId = getFriendId(friendship, currentUserId);
  return friendId ? friendship.profiles[friendId] : undefined;
}

function formatMessageTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getFriendInviteUrl(profile: UserProfile, userId?: string) {
  const url = new URL(window.location.origin);
  url.searchParams.set("invite", "friend");
  url.searchParams.set("fromName", profile.name);
  if (userId) url.searchParams.set("from", userId);
  return url.toString();
}

function getSmsInviteHref(playerName: string, inviteUrl = window.location.origin) {
  const body = `Join me on AceTrack for a tennis match. I am ${playerName}. ${inviteUrl}`;
  return `sms:&body=${encodeURIComponent(body)}`;
}

function getFamousPlayerProfile(name: string) {
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) return undefined;
  return famousTennisPlayerProfiles.find((player) => player.name.toLowerCase() === normalizedName);
}

function useElapsedTime(startedAt: number | undefined, running: boolean) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!startedAt || !running) {
      setNow(Date.now());
      return;
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [running, startedAt]);

  return formatDuration(startedAt ? Math.max(0, now - startedAt) : 0);
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function resizeProfilePhoto(file: File) {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Choose an image file"));
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read profile photo"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not prepare profile photo"));
      image.onload = () => {
        const size = 480;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not prepare profile photo"));
          return;
        }

        const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
        const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
        const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
        canvas.width = size;
        canvas.height = size;
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result ?? "");
    };
    reader.readAsDataURL(file);
  });
}

function incrementPair(pair: [number, number], player: 0 | 1): [number, number] {
  return player === 0 ? [pair[0] + 1, pair[1]] : [pair[0], pair[1] + 1];
}

function decrementPair(pair: [number, number], player: 0 | 1): [number, number] {
  return player === 0 ? [Math.max(0, pair[0] - 1), pair[1]] : [pair[0], Math.max(0, pair[1] - 1)];
}

function hasTrackedStats(stats: MatchStatsInput) {
  return [...stats.aces, ...stats.winners, ...stats.unforcedErrors].some((value) => value > 0);
}

function normalizeVoiceText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveVoicePlayer(command: string, players: [string, string]): 0 | 1 | undefined {
  if (isVoicePlayerOne(command)) return 0;
  if (isVoicePlayerTwo(command)) return 1;
  if (commandMatchesSide(command, players[0])) return 0;
  if (commandMatchesSide(command, players[1])) return 1;
  return undefined;
}

function isVoicePlayerOne(command: string) {
  return [
    /\b(player|side|team|person|number)\s*(1|one|a)\b/,
    /\b(p1|first player|first side|left side|server one)\b/,
    /\b(point|score|ace|winner|error|for)\s*(1|one)\b/,
    /\b(me|my point|my side|mine|us|we)\b/
  ].some((pattern) => pattern.test(command)) || /^(1|one|player one|player 1)$/.test(command);
}

function isVoicePlayerTwo(command: string) {
  return [
    /\b(player|side|team|person|number)\s*(2|two|b)\b/,
    /\b(p2|second player|second side|right side|server two)\b/,
    /\b(point|score|ace|winner|error|for)\s*(2|two)\b/,
    /\b(opponent|other side|their point|their side|them|they)\b/
  ].some((pattern) => pattern.test(command)) || /^(2|two|player two|player 2)$/.test(command);
}

function hasExplicitVoiceScoringAction(command: string) {
  return /\b(point|score|ace|winner|error|mistake|double fault)\b/.test(command);
}

function getVoiceShotTag(command: string) {
  if (/\b(backhand)\b/.test(command)) return "Backhand";
  if (/\b(forehand)\b/.test(command)) return "Forehand";
  if (/\b(slice|sliced)\b/.test(command)) return "Slice";
  if (/\b(volley)\b/.test(command)) return "Volley";
  if (/\b(lob)\b/.test(command)) return "Lob";
  if (/\b(drop shot|dropshot)\b/.test(command)) return "Drop shot";
  if (/\b(serve)\b/.test(command)) return "Serve";
  if (/\b(rally)\b/.test(command)) return "Rally";
  return undefined;
}

function getDisplayScoreForSide(sets: ReturnType<typeof getCompletedSets>, side: 0 | 1) {
  const meaningfulSets = sets.filter((set) => set.games[0] > 0 || set.games[1] > 0 || set.winner !== undefined);
  const latestSet = meaningfulSets.at(-1);
  if (!latestSet) return "0";
  return String(latestSet.games[side]);
}

function getLiveScoreSummary(match: MatchState) {
  const sets = getCompletedSets(match).filter((set) => set.games[0] > 0 || set.games[1] > 0 || set.winner !== undefined);
  if (!sets.length) return "0-0";
  return sets.map((set) => `${set.games[0]}-${set.games[1]}`).join(", ");
}

function createUnsavedMatchPreview(match: MatchState): MatchRecord {
  return {
    id: "current-match",
    userId: "current",
    createdAt: new Date().toISOString(),
    players: match.players,
    winner: match.winner === undefined ? undefined : match.players[match.winner],
    finalScore: getFinalScore(match) || getLiveScoreSummary(match),
    durationLabel: "Draft",
    sets: getCompletedSets(match),
    scoringState: match,
    stats: emptyMatchStats
  };
}

function getUserMatchSummary(records: MatchRecord[]) {
  const played = records.length;
  const wins = records.filter((record) => record.winner === record.players[0]).length;
  const gamesWon = records.reduce((sum, record) => (
    sum + record.sets.reduce((setSum, set) => setSum + set.games[0], 0)
  ), 0);
  const winRate = played ? Math.round((wins / played) * 100) : 0;

  return { gamesWon, played, winRate };
}

function getPlayerProgression(records: MatchRecord[], engagement: UserProfile["engagement"]): MatchProgression {
  const totals = records.reduce(
    (summary, record) => {
      const gamesWon = record.sets.reduce((sum, set) => sum + set.games[0], 0);
      const gamesLost = record.sets.reduce((sum, set) => sum + set.games[1], 0);
      const won = record.winner === record.players[0];
      const matchPoints = calculateMatchPoints(record);

      return {
        gamesLost: summary.gamesLost + gamesLost,
        gamesWon: summary.gamesWon + gamesWon,
        losses: summary.losses + (record.winner && !won ? 1 : 0),
        points: summary.points + Math.max(0, matchPoints),
        wins: summary.wins + (won ? 1 : 0)
      };
    },
    { gamesLost: 0, gamesWon: 0, losses: 0, points: 0, wins: 0 }
  );
  const matchPoints = totals.points;
  const engagementPoints = getEngagementPoints(engagement);
  const points = matchPoints + engagementPoints;
  const levelProgress = getLevelProgress(points);
  const xpText = points
    ? `${points} Ace XP · ${levelProgress.remaining} to level ${levelProgress.level + 1}`
    : "0 Ace XP · play, share, or connect to start";

  return { ...totals, engagementPoints, level: levelProgress.level, matchPoints, nextLevelPoints: levelProgress.cost, points, xp: levelProgress.xp, xpText };
}

function createEngagementReward(type: EngagementReward["type"], points: number, label: string): EngagementReward {
  return {
    earnedAt: new Date().toISOString(),
    label,
    points,
    type
  };
}

function addEngagementReward(profile: UserProfile, id: string, reward: EngagementReward) {
  const rewards = profile.engagement?.rewards ?? {};
  if (rewards[id]) return { awarded: false, profile };

  return {
    awarded: true,
    profile: {
      ...profile,
      engagement: {
        rewards: {
          ...rewards,
          [id]: reward
        }
      }
    }
  };
}

function getEngagementPoints(engagement: UserProfile["engagement"]) {
  return Object.values(engagement?.rewards ?? {}).reduce((sum, reward) => sum + Math.max(0, Number(reward.points) || 0), 0);
}

function getRecentEngagementRewards(engagement: UserProfile["engagement"]) {
  return Object.values(engagement?.rewards ?? {})
    .sort((a, b) => Date.parse(b.earnedAt) - Date.parse(a.earnedAt))
    .slice(0, 3);
}

function getLevelProgress(totalPoints: number) {
  let level = 0;
  let remainingPoints = Math.max(0, totalPoints);
  let cost = getLevelCost(level);

  while (remainingPoints >= cost) {
    remainingPoints -= cost;
    level += 1;
    cost = getLevelCost(level);
  }

  return {
    cost,
    level,
    remaining: cost - remainingPoints,
    xp: cost ? Math.round((remainingPoints / cost) * 100) : 0
  };
}

function getLevelCost(level: number) {
  return Math.round(80 + level * 35 + Math.pow(level, 1.65) * 12);
}

function calculateMatchPoints(record: MatchRecord) {
  return calculateMatchPointsFromData(
    record.sets,
    record.winner === record.players[0] ? 0 : record.winner === record.players[1] ? 1 : undefined,
    record.stats,
    record.feedback
  );
}

function calculateMatchPointsFromData(
  sets: ReturnType<typeof getCompletedSets>,
  winnerSide: 0 | 1 | undefined,
  stats: MatchStatsInput,
  feedback?: MatchFeedbackInput
) {
  const gamesWon = sets.reduce((sum, set) => sum + set.games[0], 0);
  const gamesLost = sets.reduce((sum, set) => sum + set.games[1], 0);
  const margin = gamesWon - gamesLost;
  const resultBonus = winnerSide === 0 ? 40 : winnerSide === 1 ? 8 : 0;
  const dominanceBonus = Math.max(0, margin) * 6;
  const closeLossBonus = winnerSide === 1 && Math.abs(margin) <= 3 ? 10 : 0;
  const aceBonus = (stats.aces?.[0] ?? 0) * 2;
  const basePoints = Math.max(0, 8 + gamesWon * 5 + dominanceBonus + closeLossBonus + aceBonus + resultBonus);
  const bonusMultiplier = 1 + Math.min(5, Math.max(0, feedback?.bonusPercent ?? 0)) / 100;

  return Math.round(basePoints * bonusMultiplier);
}

function createFeedbackSummary(feedback: SkillFeedback): MatchFeedbackInput {
  const adjustments = Object.fromEntries(
    Object.entries(feedback).filter(([, value]) => value === -1 || value === 0 || value === 1)
  ) as Record<string, -1 | 0 | 1>;
  const tokensUsed = getFeedbackTokensUsed(adjustments);

  return {
    adjustments,
    bonusPercent: Math.min(5, tokensUsed),
    tokensUsed
  };
}

function getFeedbackTokensUsed(feedback: SkillFeedback) {
  return Object.values(feedback).filter((value) => value === -1 || value === 0 || value === 1).length;
}

function applySkillFeedback(profile: UserProfile, feedback: SkillFeedback): UserProfile {
  return {
    ...profile,
    skillVotes: updateSkillVotes(profile.skillVotes, feedback),
    skills: profile.skills.map(([label, value]) => [label, getAdjustedSkillValue(value, feedback[label])] as [string, number])
  };
}

function getAdjustedSkillValue(value: number, adjustment?: -1 | 0 | 1) {
  return Math.max(0, Math.min(100, value + (adjustment ?? 0) * 10));
}

function updateSkillVotes(currentVotes: UserProfile["skillVotes"] = {}, feedback: SkillFeedback): UserProfile["skillVotes"] {
  return Object.entries(feedback).reduce<UserProfile["skillVotes"]>((nextVotes, [skill, vote]) => {
    if (vote !== -1 && vote !== 0 && vote !== 1) return nextVotes;

    const current = nextVotes?.[skill] ?? { negative: 0, neutral: 0, positive: 0, score: 0, total: 0 };
    nextVotes![skill] = {
      negative: current.negative + (vote === -1 ? 1 : 0),
      neutral: current.neutral + (vote === 0 ? 1 : 0),
      positive: current.positive + (vote === 1 ? 1 : 0),
      score: current.score + vote,
      total: current.total + 1
    };
    return nextVotes;
  }, { ...currentVotes });
}

function getVoteLabel(vote?: -1 | 0 | 1) {
  if (vote === -1) return "-1";
  if (vote === 0) return "0";
  if (vote === 1) return "+1";
  return "-";
}

function applyMatchProgression(profile: UserProfile, progression: MatchProgression): UserProfile {
  return {
    ...profile,
    level: progression.level,
    rating: `${progression.points} Ace XP`,
    xp: progression.xp,
    xpText: progression.xpText
  };
}

function formatMatchDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved match";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function getMatchFilterOptions(records: MatchRecord[]) {
  const options = [
    { id: "All", label: "All" },
    { id: "Wins", label: "Wins" },
    { id: "Losses", label: "Losses" },
    { id: "Dominant", label: "Dominant" },
    { id: "Close", label: "Close" },
    { id: "This Week", label: "This Week" }
  ];

  return options.map((option) => ({
    ...option,
    count: records.filter((record) => recordMatchesFilter(record, option.id)).length
  }));
}

function recordMatchesFilter(record: MatchRecord, filter: string) {
  if (filter === "Wins") return record.winner === record.players[0];
  if (filter === "Losses") return record.winner === record.players[1];
  if (filter === "Dominant") return record.winner === record.players[0] && getRecordMargin(record) >= 6;
  if (filter === "Close") return Math.abs(getRecordMargin(record)) <= 3;
  if (filter === "This Week") return Date.now() - Date.parse(record.createdAt) <= 7 * 24 * 60 * 60 * 1000;
  return true;
}

function getRecordMargin(record: MatchRecord) {
  return record.sets.reduce((sum, set) => sum + set.games[0] - set.games[1], 0);
}

function commandMatchesSide(command: string, sideName: string) {
  const normalizedCommand = normalizeVoiceText(command);
  return normalizeVoiceText(sideName)
    .split("/")
    .flatMap((part) => part.trim().split(/\s+/))
    .filter((part) => part.length > 2)
    .some((part) => normalizedCommand.includes(part));
}

function getLocationErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? Number((error as { code?: unknown }).code) : 0;
  if (code === 1) return "GPS permission was blocked";
  if (code === 2) return "GPS position is unavailable";
  if (code === 3) return "GPS timed out. Try again outside";
  return error instanceof Error ? error.message : "Could not update nearby players";
}

const demoNames = new Set([
  "alex morgan",
  "jamie carter",
  "ethan brooks",
  "olivia martinez",
  "lucas green",
  "maya patel",
  "noah kim",
  "nora kim",
  "carlos alcaraz",
  "serena",
  "venus"
]);

function sanitizeProfile(profile: UserProfile, appUser?: AppUser) {
  const favoritePro = profile.favoritePro || "";
  const hasLegacyRating = profile.rating.toLowerCase().includes("ntrp");
  if (!isDemoName(profile.name) && !favoritePro.toLowerCase().includes("demo") && !hasLegacyRating) return profile;

  const name = getNameFromEmail(appUser?.email ?? undefined) || (isDemoName(profile.name) ? user.name : profile.name);
  return normalizeProfileDraft({
    ...profile,
    avatar: getInitials(name),
    equipment: isDemoName(profile.name) ? user.equipment : profile.equipment,
    favoritePro: favoritePro.toLowerCase().includes("demo") ? "" : favoritePro,
    hand: profile.hand || user.hand,
    level: isDemoName(profile.name) || hasLegacyRating ? user.level : profile.level,
    location: isDemoLocation(profile.location) ? user.location : profile.location,
    name,
    portrait: profile.portrait || user.portrait,
    rating: isDemoName(profile.name) || hasLegacyRating ? user.rating : profile.rating,
    shortName: getShortName(name),
    skills: isDemoName(profile.name) ? user.skills : profile.skills,
    xp: isDemoName(profile.name) || hasLegacyRating ? user.xp : profile.xp,
    xpText: isDemoName(profile.name) || hasLegacyRating ? user.xpText : profile.xpText
  });
}

function sanitizeMatchOptions(options: MatchOptions, profileName: string) {
  const sideA: [string, string] = [
    isDemoName(options.sideA[0]) || !options.sideA[0].trim() ? profileName : options.sideA[0],
    isDemoName(options.sideA[1]) || !options.sideA[1].trim() ? "Partner" : options.sideA[1]
  ];
  const sideB: [string, string] = [
    isDemoName(options.sideB[0]) || !options.sideB[0].trim() ? opponent.name : options.sideB[0],
    isDemoName(options.sideB[1]) || !options.sideB[1].trim() ? "Partner" : options.sideB[1]
  ];

  if (
    sideA[0] === options.sideA[0] &&
    sideA[1] === options.sideA[1] &&
    sideB[0] === options.sideB[0] &&
    sideB[1] === options.sideB[1]
  ) {
    return options;
  }

  return { ...options, sideA, sideB };
}

function sanitizeMatchState(match: MatchState, profileName: string) {
  const players: [string, string] = [
    isDemoName(match.players[0]) || !match.players[0].trim() ? profileName : match.players[0],
    isDemoName(match.players[1]) || !match.players[1].trim() ? opponent.name : match.players[1]
  ];

  if (players[0] === match.players[0] && players[1] === match.players[1]) return match;
  return { ...match, players };
}

function isDemoName(name: string) {
  return demoNames.has(name.trim().toLowerCase());
}

function isDemoLocation(location: string) {
  return ["san diego, ca", "local club"].includes(location.trim().toLowerCase());
}

function getNameFromEmail(email?: string) {
  if (!email) return "";
  const localPart = email.split("@")[0]?.trim();
  if (!localPart) return "";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ") || "";
}

function getMatchRecordsErrorMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error ?? "");
  if (detail.includes("permission-denied") || detail.includes("Missing or insufficient permissions")) {
    return "Saved matches need Firebase permission. Sign out, sign in, and try again.";
  }
  return detail || "Could not load saved matches.";
}

function getSocialErrorMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error ?? "");
  if (detail.includes("permission-denied") || detail.includes("Missing or insufficient permissions")) {
    return "Social permissions need the latest Firebase rules. Try again after the deploy finishes.";
  }
  return detail || "Could not load social activity.";
}

function getRemoteErrorMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error ?? "");
  if (detail.includes("permission-denied") || detail.includes("Missing or insufficient permissions")) {
    return "Watch remote needs the latest Firebase rules. Deploy, reopen the match, and try again.";
  }
  if (detail.includes("unavailable") || detail.includes("network")) {
    return "Watch remote needs internet on the phone and watch.";
  }
  return detail || "Watch remote is unavailable.";
}

function getAdminLoadErrorMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error ?? "");
  if (detail.includes("permission-denied") || detail.includes("Missing or insufficient permissions")) {
    return "Admin permissions are not live yet. Deploy Firestore rules, sign out, then sign in again with gorodscyflavio@gmail.com.";
  }
  if (detail.includes("failed-precondition") || detail.includes("index")) {
    return "Firestore needs an index for this admin lookup. Check Firebase console index prompts.";
  }
  return detail || "Could not load user profiles from Firebase.";
}

function formatAccountStatus(appUser: AppUser) {
  if (appUser.mode === "local") return "Local guest account";
  if (appUser.email) return appUser.email;
  return appUser.isAnonymous ? "Firebase guest account" : "Firebase account";
}

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  const detail = `${code} ${message}`;

  if (detail.includes("auth/email-already-in-use")) return "That email already has an account. Use Sign in or Forgot password.";
  if (detail.includes("auth/credential-already-in-use")) return "That email is already linked to another account. Sign out, then sign in with that email.";
  if (detail.includes("auth/invalid-email")) return "Use a valid email address.";
  if (detail.includes("auth/weak-password")) return "Use a stronger password with at least 6 characters.";
  if (detail.includes("auth/user-not-found")) return "No account exists for this email. Use Create account first.";
  if (detail.includes("auth/wrong-password")) return "Wrong password. Try Forgot password.";
  if (detail.includes("auth/invalid-credential")) return "Email or password is incorrect. If this was created before, try Forgot password.";
  if (detail.includes("auth/too-many-requests")) return "Too many attempts. Wait a bit, then try again or reset your password.";
  if (detail.includes("auth/operation-not-allowed")) return "Email login is not enabled yet in Firebase.";
  if (detail.includes("auth/unauthorized-domain")) return "This app domain is not authorized in Firebase Auth.";
  if (detail.includes("auth/user-disabled")) return "This account is disabled.";
  if (detail.includes("auth/timeout")) return "Firebase did not answer. Check your connection, close and reopen the app, then try again.";
  if (detail.includes("auth/network-request-failed")) return "Network error. Check your connection and try again.";
  if (message.toLowerCase().includes("taking too long")) return message;

  return message || "Account action failed. Try again.";
}

function withFriendlyTimeout<T>(promise: Promise<T>, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(timeoutMessage)), AUTH_ACTION_TIMEOUT_MS);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "AT";
}

function getShortName(name: string) {
  const [first = "Player", last] = name.trim().split(/\s+/);
  return last ? `${first[0]}. ${last}` : first;
}

function getSkillCode(label: string) {
  const code = label.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
  return code || "SKL";
}

function formatSkillVoteSummary(vote?: NonNullable<UserProfile["skillVotes"]>[string]) {
  if (!vote?.total) return "No votes yet";
  const score = vote.score > 0 ? `+${vote.score}` : String(vote.score);
  return `${vote.total} vote${vote.total === 1 ? "" : "s"} · ${score}`;
}

function stripAdminFields(profile: AdminUserProfile): UserProfile {
  const { accountType: _accountType, email: _email, userId: _userId, updatedAt: _updatedAt, ...userProfile } = profile;
  return userProfile;
}

function createBlankManagedProfile(): UserProfile {
  return {
    ...user,
    name: "New Player",
    shortName: "New Player",
    avatar: "NP",
    photoDataUrl: undefined,
    portrait: "portrait-three",
    location: "Local club",
    rating: "0 Ace XP",
    level: 0,
    xp: 0,
    xpText: "0 Ace XP",
    engagement: { rewards: {} }
  };
}

function normalizeProfileDraft(profile: UserProfile): UserProfile {
  return {
    ...profile,
    avatar: getInitials(profile.name),
    engagement: { rewards: profile.engagement?.rewards ?? {} },
    shortName: getShortName(profile.name),
    xp: Math.max(0, Math.min(100, Number(profile.xp) || 0)),
    level: Math.max(0, Number(profile.level) || 0)
  };
}

function createShareCardSvg(profile: UserProfile, record: MatchRecord) {
  const safeName = escapeSvg(record.players[0]);
  const safeOpponent = escapeSvg(record.players[1]);
  const safeRating = escapeSvg(profile.rating);
  const safeInitials = escapeSvg(record.players[0] === profile.name ? profile.avatar : getInitials(record.players[0]));
  const safeOpponentInitials = escapeSvg(getInitials(record.players[1]));
  const safeLocation = escapeSvg(profile.location);
  const safeFinalScore = escapeSvg(record.finalScore);
  const safeWinner = escapeSvg(record.winner || "Saved match");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fffef8"/>
      <stop offset="62%" stop-color="#f5fad8"/>
      <stop offset="100%" stop-color="#eef8c7"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="28" flood-color="#465337" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="1080" height="1350" rx="72" fill="url(#bg)"/>
  <path d="M94 960 C330 840 620 820 996 900" stroke="#9fc63a" stroke-opacity="0.28" stroke-width="3" fill="none"/>
  <path d="M104 1030 L910 820 M168 1110 L980 920 M250 1188 L1030 1006" stroke="#9fc63a" stroke-opacity="0.18" stroke-width="2"/>
  <text x="92" y="126" fill="#9fc63a" font-family="Inter, Arial" font-size="34" font-weight="800" letter-spacing="8">ACETRACK</text>
  <text x="92" y="218" fill="#161b16" font-family="Inter, Arial" font-size="78" font-weight="900">Match Card</text>
  <text x="92" y="282" fill="#697365" font-family="Inter, Arial" font-size="34">${safeLocation}</text>
  <g filter="url(#shadow)">
    <rect x="92" y="380" width="896" height="472" rx="44" fill="rgba(255,255,255,0.84)"/>
    <circle cx="310" cy="542" r="92" fill="#eef8c7"/>
    <text x="310" y="564" fill="#536b16" text-anchor="middle" font-family="Inter, Arial" font-size="48" font-weight="900">${safeInitials}</text>
    <circle cx="770" cy="542" r="92" fill="#f1f3ea"/>
    <text x="770" y="564" fill="#697365" text-anchor="middle" font-family="Inter, Arial" font-size="48" font-weight="900">${safeOpponentInitials}</text>
    <circle cx="540" cy="548" r="44" fill="#fbfde9"/>
    <text x="540" y="562" fill="#161b16" text-anchor="middle" font-family="Inter, Arial" font-size="28" font-weight="900">VS</text>
    <text x="310" y="700" fill="#161b16" text-anchor="middle" font-family="Inter, Arial" font-size="42" font-weight="900">${safeName}</text>
    <text x="310" y="752" fill="#697365" text-anchor="middle" font-family="Inter, Arial" font-size="28">${safeRating}</text>
    <text x="770" y="700" fill="#161b16" text-anchor="middle" font-family="Inter, Arial" font-size="42" font-weight="900">${safeOpponent}</text>
    <text x="770" y="752" fill="#697365" text-anchor="middle" font-family="Inter, Arial" font-size="28">Opponent</text>
  </g>
  <text x="92" y="990" fill="#697365" font-family="Inter, Arial" font-size="30" font-weight="800">FINAL SCORE</text>
  <text x="92" y="1080" fill="#161b16" font-family="Inter, Arial" font-size="72" font-weight="900">${safeFinalScore}</text>
  <rect x="676" y="996" width="236" height="72" rx="36" fill="#cdea5f"/>
  <text x="794" y="1044" fill="#1e2b11" text-anchor="middle" font-family="Inter, Arial" font-size="26" font-weight="900">${safeWinner}</text>
  <text x="92" y="1240" fill="#697365" font-family="Inter, Arial" font-size="28">Generated by AceTrack</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function shareMatchCard(card: string, onAction: (message: string) => void) {
  try {
    const blob = await (await fetch(card)).blob();
    const file = new File([blob], "acetrack-match-card.svg", { type: "image/svg+xml" });
    const shareNavigator = navigator as Navigator & {
      canShare?: (data: { files?: File[] }) => boolean;
      share?: (data: { files?: File[]; text?: string; title?: string }) => Promise<void>;
    };

    if (shareNavigator.share && (!shareNavigator.canShare || shareNavigator.canShare({ files: [file] }))) {
      await shareNavigator.share({ files: [file], title: "AceTrack Match Card", text: "My AceTrack match card" });
      onAction("Share sheet opened");
      return;
    }

    await navigator.clipboard.writeText(card);
    onAction("Share card copied");
  } catch {
    onAction("Download the share card instead");
  }
}

function escapeSvg(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function CourtLines() {
  return <div className="court-lines" aria-hidden="true"><span /><span /><span /></div>;
}

function Portrait({
  initials,
  className = "",
  photoDataUrl
}: {
  initials: string;
  className?: string;
  photoDataUrl?: string;
}) {
  return (
    <div className={`portrait ${photoDataUrl ? "has-photo" : ""} ${className}`}>
      {photoDataUrl ? <img alt="" src={photoDataUrl} /> : <span>{initials}</span>}
    </div>
  );
}

function TennisBall() {
  return <div className="tennis-ball" aria-hidden="true" />;
}

function formatEquipmentLabel(label: string) {
  return label.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
