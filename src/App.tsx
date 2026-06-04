import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
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
  Mic,
  Minus,
  MoreHorizontal,
  Shuffle,
  Play,
  Plus,
  Radio,
  RotateCcw,
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
  getSignedInAppUser,
  sendPasswordReset,
  signInWithEmail,
  signOutAppUser,
  type AppUser
} from "./backend/authRepository";
import { getBackendMode, listUserMatchRecords, saveMatchRecord } from "./backend/matchRepository";
import { listPlayerLocations, savePlayerLocation, toNearbyPlayers } from "./backend/nearbyRepository";
import { createManagedUserProfile, deleteUserProfile, listUserProfiles, loadUserProfile, saveUserProfile } from "./backend/profileRepository";
import {
  acceptFriendRequest,
  declineFriendRequest,
  listFriendRequests,
  listFriendships,
  listIncomingSocialActions,
  sendFriendRequest,
  sendSocialAction,
  toSocialProfile,
  updateSocialActionStatus,
  type FriendRequest,
  type Friendship,
  type SocialAction,
  type SocialProfileSnapshot
} from "./backend/socialRepository";
import { usePersistentState } from "./hooks/usePersistentState";
import { createMatch, getCompletedSets, getFinalScore, getPointDisplay, scorePoint, undoPoint, type MatchState } from "./lib/tennisScoring";
import type { AdminUserProfile, MatchRecord, NearbyPlayer, UserProfile } from "./types/domain";
import "./styles.css";

type Screen = "home" | "live" | "complete" | "highlights" | "social" | "profile" | "account" | "admin";
type AuthPhase = "loading" | "signed-out" | "signed-in";
type MatchMode = "setup" | "playing";
type MatchProgression = {
  gamesLost: number;
  gamesWon: number;
  level: number;
  losses: number;
  points: number;
  wins: number;
  xp: number;
  xpText: string;
};
type SkillFeedback = Record<string, -1 | 0 | 1 | undefined>;
type MatchOptions = {
  customNames: boolean;
  scorer: 0 | 1;
  server: 0 | 1 | 2 | 3;
  sideA: [string, string];
  sideB: [string, string];
  singles: boolean;
  soundEnabled: boolean;
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

const navItems: Array<{ screen: Screen; label: string; icon: typeof Home }> = [
  { screen: "home", label: "Play", icon: Home },
  { screen: "live", label: "Match", icon: Activity },
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
  const voiceRecognitionRef = useRef<{ start: () => void; stop: () => void; abort?: () => void; onend: (() => void) | null; onerror: ((event: unknown) => void) | null; onresult: ((event: unknown) => void) | null; continuous?: boolean; interimResults?: boolean; lang?: string } | undefined>(undefined);

  const progression = useMemo(() => getMatchProgression(matchRecords), [matchRecords]);
  const displayProfile = useMemo(() => applyMatchProgression(profile, progression), [profile, progression]);
  const pointDisplay = getPointDisplay(match);
  const sets = getCompletedSets(match);
  const elapsedMatchTime = useElapsedTime(matchStartedAt, matchMode === "playing");
  const winnerName = match.winner !== undefined ? match.players[match.winner] : "";
  const finalScore = getFinalScore(match) || getLiveScoreSummary(match);
  const isAdmin = appUser?.email?.toLowerCase() === ADMIN_EMAIL;
  const incomingChallenges = incomingActions.filter((action) => action.type === "challenge");

  useEffect(() => {
    let isMounted = true;
    const loadingTimeout = window.setTimeout(() => {
      if (!isMounted) return;
      setAccountStatus("Not signed in");
      setAuthPhase("signed-out");
    }, 2200);

    getSignedInAppUser()
      .then((appUser) => {
        if (!isMounted) return;
        window.clearTimeout(loadingTimeout);
        if (appUser) {
          setAppUser(appUser);
          setAccountStatus(formatAccountStatus(appUser));
          hydrateProfile(appUser);
          setAuthPhase("signed-in");
        } else {
          setAppUser(undefined);
          setAccountStatus("Not signed in");
          setAuthPhase("signed-out");
        }
      })
      .catch(() => {
        if (!isMounted) return;
        window.clearTimeout(loadingTimeout);
        setAppUser(undefined);
        setAccountStatus("Account unavailable");
        setAuthPhase("signed-out");
      });

    return () => {
      isMounted = false;
      window.clearTimeout(loadingTimeout);
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

  async function hydrateProfile(appUser: AppUser) {
    setProfileSaveStatus("Loading profile...");
    const result = await loadUserProfile(appUser.id);

    if (result.profile) {
      const nextProfile = sanitizeProfile(result.profile, appUser);
      setProfile(nextProfile);
      setProfileSaveStatus(result.mode === "firebase" ? "Profile loaded from cloud" : "Profile loaded locally");
      if (nextProfile !== result.profile) {
        await saveUserProfile(appUser.id, nextProfile);
        setProfileSaveStatus("Profile cleaned and saved");
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

  function addPoint(player: 0 | 1, pointType: "ace" | "point" = "point") {
    const next = scorePoint(match, player);
    setMatch(next);
    if (pointType === "ace") {
      setMatchStats((current) => ({ ...current, aces: incrementPair(current.aces, player) }));
    }
    playUiSound(player === 0 ? "point" : "opponent", matchOptions.soundEnabled);
    if (next.winner !== undefined) setScreen("complete");
  }

  function startNewMatch() {
    setMatchMode("setup");
    setSaveStatus("");
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
    setMatchOptions(normalizedOptions);
    setMatch(nextMatch);
    setMatchStartedAt(Date.now());
    setMatchStats(emptyMatchStats);
    setSkillFeedback({});
    setOpponentSkillFeedback({});
    setMatchMode("playing");
    setSaveStatus("");
    setScreen("live");
    playUiSound("start", normalizedOptions.soundEnabled);
    showMessage("Match started");
  }

  function toggleSound() {
    setMatchOptions((current) => {
      const next = { ...current, soundEnabled: !current.soundEnabled };
      playUiSound(next.soundEnabled ? "start" : "tap", next.soundEnabled);
      return next;
    });
  }

  function toggleVoiceCommands() {
    if (isVoiceListening) {
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
      setIsVoiceListening(false);
      setVoiceStatus("Voice needs permission");
    };
    recognition.onend = () => {
      setIsVoiceListening(false);
    };
    voiceRecognitionRef.current = recognition;
    try {
      recognition.start();
      setIsVoiceListening(true);
      setVoiceStatus("Listening for commands");
    } catch {
      setIsVoiceListening(false);
      setVoiceStatus("Mic blocked. Use command buttons");
    }
  }

  function handleVoiceCommand(transcript: string) {
    const command = transcript.toLowerCase();
    if (command.includes("undo") || command.includes("back")) {
      setMatch((current) => undoPoint(current));
      playUiSound("undo", matchOptions.soundEnabled);
      return;
    }
    if (command.includes("end match") || command.includes("finish match")) {
      playUiSound("end", matchOptions.soundEnabled);
      setScreen("complete");
      return;
    }
    if (command.includes("new match") || command.includes("reset match")) {
      startNewMatch();
      return;
    }
    if (command.includes("ace")) {
      if (command.includes("opponent") || command.includes("player two") || command.includes("their") || command.includes("them") || commandMatchesSide(command, match.players[1])) {
        addPoint(1, "ace");
        return;
      }
      if (command.includes("me") || command.includes("player one") || commandMatchesSide(command, match.players[0])) {
        addPoint(0, "ace");
        return;
      }
      addPoint(match.server, "ace");
      return;
    }
    if (command.includes("opponent") || command.includes("player two") || command.includes("their") || command.includes("them") || commandMatchesSide(command, match.players[1])) {
      addPoint(1);
      return;
    }
    if (command.includes("point") || command.includes("score") || command.includes("player one") || command.includes("me") || commandMatchesSide(command, match.players[0])) {
      addPoint(0);
    }
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
    const nextProfile = applyMatchProgression(profileWithFeedback, getMatchProgression(nextRecords));
    setProfile(nextProfile);
    await saveUserProfile(appUser.id, nextProfile).catch((error) => {
      console.warn("Could not persist earned match points.", error);
    });
    setMatchRecordsStatus("Match saved");
    setSkillFeedback({});
    setOpponentSkillFeedback({});
    setSaveStatus(result.mode === "firebase" ? `Saved to Firebase · +${calculateMatchPoints(record)} pts` : `Saved locally · +${calculateMatchPoints(record)} pts`);
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
      setAppUser(appUser);
      setAccountStatus(formatAccountStatus(appUser));
      setAuthPhase("signed-in");
      setScreen("home");
      startProfileHydration(appUser);
      showMessage("Signed in");
    } catch (error) {
      setAccountStatus("Sign in failed");
      throw error;
    }
  }

  async function createAccount(email: string, password: string) {
    setAccountStatus("Creating account...");
    try {
      const appUser = await createEmailAccount(email, password);
      setAppUser(appUser);
      setAccountStatus(formatAccountStatus(appUser));
      setAuthPhase("signed-in");
      setScreen("home");
      startProfileHydration(appUser);
      showMessage("Account created");
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
      setAppUser(appUser);
      setAccountStatus(formatAccountStatus(appUser));
      setAuthPhase("signed-in");
      setScreen("home");
      startProfileHydration(appUser);
      showMessage("Guest session ready");
    } catch (error) {
      setAccountStatus("Guest session failed");
      throw error;
    }
  }

  async function signOutAccount() {
    await signOutAppUser();
    setAppUser(undefined);
    setAccountStatus("Signed out");
    setProfileSaveStatus("");
    setAuthPhase("signed-out");
    setScreen("home");
    showMessage("Signed out");
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
    <main className="app-shell">
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
            pointDisplay={pointDisplay}
            profile={displayProfile}
            server={match.server}
            sets={sets}
            elapsedTime={elapsedMatchTime}
            onAction={showMessage}
            onPoint={addPoint}
            onAce={(player) => addPoint(player, "ace")}
            onSoundToggle={toggleSound}
            onUndo={() => {
              setMatch(undoPoint(match));
              playUiSound("undo", matchOptions.soundEnabled);
            }}
            onComplete={() => setScreen("complete")}
            onEndMatch={() => {
              playUiSound("end", matchOptions.soundEnabled);
              setScreen("complete");
            }}
            onExit={() => setScreen("home")}
            onNewMatch={startNewMatch}
            onVoiceCommand={handleVoiceCommand}
            onVoiceToggle={toggleVoiceCommands}
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
            onFilter={setActiveFilter}
          />
        )}
        {screen === "social" && (
          <SocialScreen
            activeTab={socialTab}
            appUser={appUser}
            profile={displayProfile}
            onAction={showMessage}
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
              setProfile(nextProfile);
              setProfileSaveStatus("Saving profile...");
              const activeUser = appUser ?? await getCurrentAppUser();
              setAppUser(activeUser);
              const result = await saveUserProfile(activeUser.id, nextProfile);
              setProfileSaveStatus(result.mode === "firebase" ? "Profile saved to cloud" : "Profile saved locally");
              showMessage(result.mode === "firebase" ? "Profile saved" : "Profile saved locally");
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
        <BottomNav active={screen} isAdmin={isAdmin} onNavigate={setScreen} />
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

function MatchSetupScreen({
  options,
  profileName,
  onAction,
  onStart,
  onUpdate
}: {
  options: MatchOptions;
  profileName: string;
  onAction: (message: string) => void;
  onStart: (options: MatchOptions) => void;
  onUpdate: (options: MatchOptions) => void;
}) {
  const currentOptions = normalizeMatchOptions(options, profileName);
  const playerChoices = getSetupPlayerChoices(currentOptions);

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

  return (
    <section className="screen content match-setup-screen">
      <header className="match-setup-hero">
        <p className="eyebrow"><span className="status-dot" /> New Match</p>
        <h1>Set the court.</h1>
      </header>

      <div className="setup-name-grid">
        {currentOptions.sideA.map((name, index) => (
          <label className="setup-name-card" key={`a-${index}`}>
            <input
              aria-label={`Team one player ${index + 1}`}
              disabled={!currentOptions.customNames || (currentOptions.singles && index === 1)}
              value={currentOptions.singles && index === 1 ? "" : name}
              onChange={(event) => updateSide("sideA", index as 0 | 1, event.target.value)}
              placeholder={index === 0 ? "Player 1" : "Partner"}
            />
            <MenuIcon />
          </label>
        ))}
        <button className="swap-sides-button" aria-label="Swap sides" onClick={swapSides}><Shuffle size={24} /></button>
        {currentOptions.sideB.map((name, index) => (
          <label className="setup-name-card" key={`b-${index}`}>
            <input
              aria-label={`Team two player ${index + 1}`}
              disabled={!currentOptions.customNames || (currentOptions.singles && index === 1)}
              value={currentOptions.singles && index === 1 ? "" : name}
              onChange={(event) => updateSide("sideB", index as 0 | 1, event.target.value)}
              placeholder={index === 0 ? "Opponent" : "Partner"}
            />
            <MenuIcon />
          </label>
        ))}
      </div>

      <div className="setup-toggle-row">
        <label><input checked={currentOptions.customNames} onChange={(event) => onUpdate({ ...currentOptions, customNames: event.target.checked })} type="checkbox" /> Custom Names</label>
        <label><input checked={currentOptions.singles} onChange={(event) => onUpdate({ ...currentOptions, singles: event.target.checked })} type="checkbox" /> Singles</label>
        <button className="sound-pill" onClick={() => onUpdate({ ...currentOptions, soundEnabled: !currentOptions.soundEnabled })}>
          {currentOptions.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />} Sound
        </button>
      </div>

      <section className="setup-choice-section">
        <h2>Who keeps score?</h2>
        <div className="choice-grid two">
          {[0, 1].map((side) => (
            <button className={currentOptions.scorer === side ? "choice-card active" : "choice-card"} key={side} onClick={() => onUpdate({ ...currentOptions, scorer: side as 0 | 1 })}>
              {getSideDisplay(currentOptions, side as 0 | 1)}
            </button>
          ))}
        </div>
      </section>

      <section className="setup-choice-section">
        <h2>Who serves first?</h2>
        <div className="choice-grid two">
          {[0, 1].map((side) => (
            <button
              className={Math.floor(currentOptions.server / 2) === side ? "choice-card active compact" : "choice-card compact"}
              key={side}
              onClick={() => onUpdate({ ...currentOptions, server: (side * 2) as 0 | 2 })}
            >
              {playerChoices.slice(side * 2, side * 2 + 2).map((choice) => (
                <span key={choice.index}><b>{choice.index + 1}</b> {choice.name}</span>
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
  pointDisplay,
  profile,
  server,
  sets,
  elapsedTime,
  matchWinner,
  onAction,
  onAce,
  onPoint,
  onSoundToggle,
  onUndo,
  onComplete,
  onEndMatch,
  onExit,
  onNewMatch,
  onVoiceCommand,
  onVoiceToggle,
  voiceStatus
}: {
  isVoiceListening: boolean;
  options: MatchOptions;
  playerNames: [string, string];
  pointDisplay: [string, string];
  profile: UserProfile;
  server: 0 | 1;
  sets: ReturnType<typeof getCompletedSets>;
  elapsedTime: string;
  matchWinner?: 0 | 1;
  onAction: (message: string) => void;
  onAce: (player: 0 | 1) => void;
  onPoint: (player: 0 | 1) => void;
  onSoundToggle: () => void;
  onUndo: () => void;
  onComplete: () => void;
  onEndMatch: () => void;
  onExit: () => void;
  onNewMatch: () => void;
  onVoiceCommand: (command: string) => void;
  onVoiceToggle: () => void;
  voiceStatus: string;
}) {
  const sideLabels = playerNames;
  const compactSideLabels = sideLabels.map(getCompactSideName) as [string, string];

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
        <div className="stage-score">{pointDisplay[0]}</div>
        <div className="stage-score">{pointDisplay[1]}</div>
        <div className="mini-set-floating">
          <SetTable playerNames={playerNames} profile={profile} sets={sets} />
        </div>
      </div>

      <SetTable playerNames={playerNames} profile={profile} sets={sets} full />

      <div className="timer-row live-remote-row">
        <span><Radio size={16} /> {voiceStatus}</span>
        <strong><Clock3 size={16} /> {elapsedTime}</strong>
      </div>
      <div className="voice-command-panel">
        {[
          ["Me point", "point me"],
          ["Opponent", "opponent point"],
          ["Undo", "undo"],
          ["End", "end match"]
        ].map(([label, command]) => (
          <button key={command} onClick={() => onVoiceCommand(command)}>{label}</button>
        ))}
      </div>

      <div className="point-actions">
        <button className="match-action primary" onClick={() => onPoint(0)}>
          <span className="action-icon"><Plus size={26} /></span>
          <span className="action-label">Point {compactSideLabels[0]}</span>
        </button>
        <button className="match-action opponent" onClick={() => onPoint(1)}>
          <span className="action-icon"><Minus size={26} /></span>
          <span className="action-label">Point {compactSideLabels[1]}</span>
        </button>
        <button className="match-action ace" onClick={() => onAce(0)}>
          <span className="action-icon"><Zap size={24} /></span>
          <span className="action-label">Ace {compactSideLabels[0]}</span>
        </button>
        <button className="match-action ace opponent" onClick={() => onAce(1)}>
          <span className="action-icon"><Zap size={24} /></span>
          <span className="action-label">Ace {compactSideLabels[1]}</span>
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
          <p className="save-status">Only scored points were tracked. Use Ace during the match to record ace stats.</p>
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
  onFilter
}: {
  activeFilter: string;
  currentMatch: MatchState;
  matchRecords: MatchRecord[];
  matchRecordsStatus: string;
  profile: UserProfile;
  onAction: (message: string) => void;
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
  }

  return (
    <section className="screen content highlights-screen">
      <header className="simple-header">
        <h1>Match Cards</h1>
        <p>Saved matches and share cards from real scoring data.</p>
      </header>
      <article className="feature-card">
        <div>
          <p className="eyebrow">Share your match</p>
          <h2>Create a match card.</h2>
          <p>{shareRecord.finalScore === "In progress" ? "Score a match first, or generate a draft from the current board." : shareRecord.finalScore}</p>
        </div>
        <div className="share-preview">
          <Portrait className={profile.portrait} initials={profile.avatar} photoDataUrl={profile.photoDataUrl} />
          <span>vs</span>
          <Portrait className={opponent.portrait} initials={getInitials(shareRecord.players[1])} />
        </div>
        <button onClick={generateShareCard}>Generate Share Card <ArrowRight size={17} /></button>
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
            <button className="hero-action compact" onClick={() => shareMatchCard(shareCard, onAction)}><Share2 size={18} /> Share Card</button>
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
              <button aria-label={`Share ${record.players[0]} vs ${record.players[1]}`} onClick={() => { setShareCard(createShareCardSvg(profile, record)); onAction("Share card generated"); }}><Share2 size={18} /></button>
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
  onStartChallenge,
  onSocialChanged,
  onTab
}: {
  activeTab: string;
  appUser?: AppUser;
  profile: UserProfile;
  onAction: (message: string) => void;
  onStartChallenge: (playerName: string) => void;
  onSocialChanged: () => void;
  onTab: (tab: string) => void;
}) {
  const [nearbyStatus, setNearbyStatus] = useState("Share GPS to find friends nearby");
  const [nearbyList, setNearbyList] = useState<NearbyPlayer[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [socialActions, setSocialActions] = useState<SocialAction[]>([]);
  const [socialStatus, setSocialStatus] = useState("Connect with real players nearby.");
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAlwaysOn, setGpsAlwaysOn] = usePersistentState("acetrack:gps-always-on", false);
  const [radiusKm, setRadiusKm] = usePersistentState("acetrack:gps-radius-km", 15);
  const currentUserId = appUser?.id;

  useEffect(() => {
    setNearbyList((current) => rankNearbyPlayers(current));
  }, [radiusKm]);

  useEffect(() => {
    if (!currentUserId) {
      setFriendRequests([]);
      setFriends([]);
      setSocialActions([]);
      setSocialStatus("Sign in to add friends and send challenges.");
      return;
    }

    loadSocialConnections(currentUserId);
  }, [currentUserId]);

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

  async function syncNearbyPosition(position: GeolocationPosition, announce: boolean) {
    const activeUser = appUser ?? await getCurrentAppUser();
    await savePlayerLocation(activeUser.id, profile, position.coords);
    const liveLocations = await listPlayerLocations();
    const livePlayers = toNearbyPlayers(liveLocations, position.coords, activeUser.id);
    const combined = rankNearbyPlayers(livePlayers);
    setNearbyList(combined);
    setNearbyStatus(livePlayers.length ? `${livePlayers.length} live players found nearby` : "GPS is on. Waiting for friends nearby");
    if (announce) onAction("Nearby players updated");
  }

  async function loadSocialConnections(userId = currentUserId) {
    if (!userId) return;
    setSocialStatus("Loading social activity...");
    try {
      const [requests, friendships, actions] = await Promise.all([
        listFriendRequests(userId),
        listFriendships(userId),
        listIncomingSocialActions(userId)
      ]);
      setFriendRequests(requests);
      setFriends(friendships);
      setSocialActions(actions);
      setSocialStatus(friendships.length ? `${friendships.length} friend${friendships.length === 1 ? "" : "s"} connected` : "No friends yet. Add real players from Nearby.");
    } catch (error) {
      setSocialStatus(getSocialErrorMessage(error));
    }
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

  const visibleNearbyPlayers = nearbyList.filter((player) => player.distanceKm <= radiusKm);
  const requestCount = friendRequests.length + socialActions.length;

  function updateRadius(value: number) {
    setRadiusKm(Math.max(1, Math.min(250, Math.round(value) || 1)));
  }

  async function addFriend(player: NearbyPlayer) {
    const activeUser = appUser ?? await getCurrentAppUser();
    await sendFriendRequest(activeUser.id, profile, player.id, nearbyPlayerToSocialProfile(player));
    onAction(`Friend request sent to ${player.name}`);
    onSocialChanged();
  }

  async function challengePlayer(player: NearbyPlayer | SocialProfileSnapshot, playerId: string) {
    const activeUser = appUser ?? await getCurrentAppUser();
    await sendSocialAction("challenge", activeUser.id, profile, playerId, "distance" in player ? nearbyPlayerToSocialProfile(player) : player);
    onAction(`Challenge sent to ${player.name}`);
    onSocialChanged();
  }

  async function pokePlayer(player: SocialProfileSnapshot, playerId: string) {
    const activeUser = appUser ?? await getCurrentAppUser();
    await sendSocialAction("poke", activeUser.id, profile, playerId, player);
    onAction(`Poked ${player.name}`);
    onSocialChanged();
  }

  async function acceptRequest(request: FriendRequest) {
    await acceptFriendRequest(request, profile);
    onAction(`${request.fromProfile.name} added`);
    await loadSocialConnections();
    onSocialChanged();
  }

  async function declineRequest(request: FriendRequest) {
    await declineFriendRequest(request);
    onAction(`${request.fromProfile.name} declined`);
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
          <p className="list-label">Nearby players</p>
          <div className="player-list">
            {visibleNearbyPlayers.map((player) => (
              <article className={player.isLive ? "player-row live-player" : "player-row"} key={player.id}>
                <strong className={player.rank <= 3 ? "rank active" : "rank"}>{player.rank}</strong>
                <Portrait className={player.portrait} initials={player.avatar} />
                <div>
                  <h3>{player.name}{player.isLive && <span className="live-chip">GPS</span>}</h3>
                  <p>Match level <b>{player.level}</b>{player.rating && <span> · {player.rating}</span>}</p>
                  <p><MapPin size={13} /> {player.distance} away</p>
                </div>
                <span className="streak"><Flame size={16} /> {player.streak} day streak</span>
                <div className="points"><strong>{player.points.toLocaleString()}</strong><span>PTS</span></div>
                <div className="player-actions">
                  <button disabled={isFriend(friends, player.id)} onClick={() => addFriend(player)}>{isFriend(friends, player.id) ? "Friend" : "Add"}</button>
                  <button onClick={() => challengePlayer(player, player.id)}>Challenge</button>
                </div>
              </article>
            ))}
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
          <p className="social-status">{socialStatus}</p>
          {friends.map((friendship) => {
            const friend = getFriendProfile(friendship, currentUserId);
            const friendId = getFriendId(friendship, currentUserId);
            if (!friend || !friendId) return null;
            return (
            <article className="request-row friend-row" key={friendship.id}>
              <Portrait className={friend.portrait} initials={friend.avatar} />
              <div><h3>{friend.name}</h3><p>{friend.rating} · You: {profile.rating}</p></div>
              <div className="request-actions">
                <button onClick={() => pokePlayer(friend, friendId)}>Poke</button>
                <button onClick={() => challengePlayer(friend, friendId)}>Challenge</button>
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

  function updatePhoto(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        const photoDataUrl = reader.result;
        setDraft((current) => ({ ...current, photoDataUrl }));
      }
    });
    reader.readAsDataURL(file);
  }

  async function saveProfile() {
    const nextProfile = {
      ...draft,
      avatar: getInitials(draft.name),
      shortName: getShortName(draft.name),
      level: progression.level,
      rating: `${progression.points} pts`,
      xp: progression.xp,
      xpText: progression.xpText
    };
    setIsSaving(true);
    await onSaveProfile(nextProfile);
    setIsSaving(false);
    setIsEditing(false);
  }

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
            <label>
              <span>Goals / style</span>
              <input value={draft.favoritePro} onChange={(event) => updateDraft("favoritePro", event.target.value)} placeholder="Baseline, serve + volley, fitness..." />
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
        <div><span>Match Level</span><strong>{profile.level}</strong></div>
        <div>
          <p>{profile.xpText}</p>
          <div className="xp-track"><span style={{ width: `${profile.xp}%` }} /></div>
        </div>
      </div>

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
          <h2>Performance profile</h2>
          <button className="text-button" onClick={() => setIsEditing(true)}>Edit</button>
        </div>
        <div className="pro-content">
          <Portrait className={profile.portrait} initials={profile.avatar} photoDataUrl={profile.photoDataUrl} />
          <div><strong>{profile.hand}</strong><span>{profile.favoritePro || "Add your goals and style"}</span></div>
          <div className="pro-bars">
            {profile.skills.slice(0, 6).map(([label, value]) => (
              <span key={label}><b>{getSkillCode(label)}</b><i style={{ height: `${Math.max(8, value)}%` }} /></span>
            ))}
          </div>
        </div>
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
        <Metric label="Avg Match Level" value={String(averageLevel)} />
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
                <p className="save-status">Match level and points are read-only here. They update from saved matches.</p>
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
    <nav className="bottom-nav">
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
    ? { ...normalized, server: normalized.server > 1 ? 0 : normalized.server }
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

function getSetupPlayerChoices(options: MatchOptions) {
  return [...options.sideA, ...options.sideB].map((name, index) => ({
    index,
    name: options.singles && (index === 1 || index === 3) ? "Partner" : name
  }));
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

function isFriend(friendships: Friendship[], playerId: string) {
  return friendships.some((friendship) => friendship.userIds.includes(playerId));
}

function getFriendId(friendship: Friendship, currentUserId?: string) {
  return friendship.userIds.find((userId) => userId !== currentUserId);
}

function getFriendProfile(friendship: Friendship, currentUserId?: string) {
  const friendId = getFriendId(friendship, currentUserId);
  return friendId ? friendship.profiles[friendId] : undefined;
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

function incrementPair(pair: [number, number], player: 0 | 1): [number, number] {
  return player === 0 ? [pair[0] + 1, pair[1]] : [pair[0], pair[1] + 1];
}

function hasTrackedStats(stats: MatchStatsInput) {
  return [...stats.aces, ...stats.winners, ...stats.unforcedErrors].some((value) => value > 0);
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

function getMatchProgression(records: MatchRecord[]): MatchProgression {
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
  const level = Math.floor(totals.points / 100);
  const xp = totals.points % 100;
  const xpText = totals.points
    ? `${totals.points} match pts · ${100 - xp} to level ${level + 1}`
    : "0 match pts · play a match to start";

  return { ...totals, level, xp, xpText };
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
    rating: `${progression.points} pts`,
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
  return sideName
    .toLowerCase()
    .split("/")
    .flatMap((part) => part.trim().split(/\s+/))
    .filter((part) => part.length > 2)
    .some((part) => command.includes(part));
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
  if (detail.includes("auth/invalid-email")) return "Use a valid email address.";
  if (detail.includes("auth/weak-password")) return "Use a stronger password with at least 6 characters.";
  if (detail.includes("auth/user-not-found")) return "No account exists for this email. Use Create account first.";
  if (detail.includes("auth/wrong-password")) return "Wrong password. Try Forgot password.";
  if (detail.includes("auth/invalid-credential")) return "Email or password is incorrect. If this was created before, try Forgot password.";
  if (detail.includes("auth/too-many-requests")) return "Too many attempts. Wait a bit, then try again or reset your password.";
  if (detail.includes("auth/operation-not-allowed")) return "Email login is not enabled yet in Firebase.";
  if (detail.includes("auth/network-request-failed")) return "Network error. Check your connection and try again.";

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
    rating: "0 pts",
    level: 0,
    xp: 0,
    xpText: "0 match pts"
  };
}

function normalizeProfileDraft(profile: UserProfile): UserProfile {
  return {
    ...profile,
    avatar: getInitials(profile.name),
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
    <div className={`portrait ${className}`}>
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
