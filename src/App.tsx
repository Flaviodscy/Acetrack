import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Apple,
  ArrowRight,
  Bell,
  Bookmark,
  Calendar,
  Camera,
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
  Play,
  Plus,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Video,
  Zap
} from "lucide-react";
import { highlights, nearbyPlayers, opponent, recapStats, recentMatches, user } from "./data/mockData";
import { createMatchRecord } from "./backend/createMatchRecord";
import {
  createEmailAccount,
  getCurrentAppUser,
  getSignedInAppUser,
  sendPasswordReset,
  signInWithEmail,
  signOutAppUser,
  type AppUser
} from "./backend/authRepository";
import { getBackendMode, saveMatchRecord } from "./backend/matchRepository";
import { loadUserProfile, saveUserProfile } from "./backend/profileRepository";
import { usePersistentState } from "./hooks/usePersistentState";
import { createMatch, getCompletedSets, getFinalScore, getPointDisplay, scorePoint, undoPoint } from "./lib/tennisScoring";
import type { UserProfile } from "./types/domain";
import "./styles.css";

type Screen = "home" | "live" | "complete" | "highlights" | "social" | "profile" | "account";
type AuthPhase = "loading" | "signed-out" | "signed-in";

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
  const [activeFilter, setActiveFilter] = usePersistentState("acetrack:highlight-filter", "All");
  const [socialTab, setSocialTab] = usePersistentState("acetrack:social-tab", "Nearby");
  const [saveStatus, setSaveStatus] = useState("");
  const [profileSaveStatus, setProfileSaveStatus] = useState("");
  const [appMessage, setAppMessage] = useState("");
  const [accountStatus, setAccountStatus] = useState("Checking account...");
  const [authPhase, setAuthPhase] = useState<AuthPhase>("loading");
  const [appUser, setAppUser] = useState<AppUser | undefined>();

  const pointDisplay = getPointDisplay(match);
  const sets = getCompletedSets(match);
  const winnerName = match.winner !== undefined ? (match.winner === 0 ? profile.name : opponent.name) : profile.name;
  const finalScore = getFinalScore(match) || "6-4, 6-3";

  const visibleHighlights = useMemo(() => {
    if (activeFilter === "All") return highlights;
    return highlights.filter((item) => item.tag === activeFilter);
  }, [activeFilter]);

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

  function showMessage(message: string) {
    setAppMessage(message);
    window.setTimeout(() => setAppMessage(""), 2400);
  }

  async function hydrateProfile(appUser: AppUser) {
    setProfileSaveStatus("Loading profile...");
    const result = await loadUserProfile(appUser.id);

    if (result.profile) {
      setProfile(result.profile);
      setProfileSaveStatus(result.mode === "firebase" ? "Profile loaded from cloud" : "Profile loaded locally");
      return result.profile;
    }

    const saveResult = await saveUserProfile(appUser.id, profile);
    setProfileSaveStatus(saveResult.mode === "firebase" ? "Profile saved to cloud" : "Profile saved locally");
    return profile;
  }

  function addPoint(player: 0 | 1) {
    const next = scorePoint(match, player);
    setMatch(next);
    if (next.winner !== undefined) setScreen("complete");
  }

  async function saveCurrentMatch() {
    setSaveStatus("Saving...");
    const appUser = await getCurrentAppUser();
    setAppUser(appUser);
    setAccountStatus(formatAccountStatus(appUser));
    const result = await saveMatchRecord(createMatchRecord(match, appUser.id));
    setSaveStatus(result.mode === "firebase" ? "Saved to Firebase" : "Saved locally");
  }

  async function signInAccount(email: string, password: string) {
    setAccountStatus("Signing in...");
    const appUser = await signInWithEmail(email, password);
    setAppUser(appUser);
    setAccountStatus(formatAccountStatus(appUser));
    await hydrateProfile(appUser);
    setAuthPhase("signed-in");
    setScreen("home");
    showMessage("Signed in");
  }

  async function createAccount(email: string, password: string) {
    setAccountStatus("Creating account...");
    const appUser = await createEmailAccount(email, password);
    setAppUser(appUser);
    setAccountStatus(formatAccountStatus(appUser));
    await hydrateProfile(appUser);
    setAuthPhase("signed-in");
    setScreen("home");
    showMessage("Account created");
  }

  async function resetPassword(email: string) {
    await sendPasswordReset(email);
    showMessage("Password reset email sent");
  }

  async function continueAnonymously() {
    setAccountStatus("Starting guest session...");
    const appUser = await getCurrentAppUser();
    setAppUser(appUser);
    setAccountStatus(formatAccountStatus(appUser));
    await hydrateProfile(appUser);
    setAuthPhase("signed-in");
    setScreen("home");
    showMessage("Guest session ready");
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
        {screen === "home" && <HomeScreen profile={profile} onAction={showMessage} onNavigate={setScreen} />}
        {screen === "live" && (
          <LiveMatchScreen
            matchWinner={match.winner}
            pointDisplay={pointDisplay}
            profile={profile}
            sets={sets}
            onAction={showMessage}
            onPoint={addPoint}
            onUndo={() => setMatch(undoPoint(match))}
            onComplete={() => setScreen("complete")}
            onEndMatch={() => setScreen("complete")}
            onExit={() => setScreen("home")}
          />
        )}
        {screen === "complete" && (
          <CompleteScreen
            backendMode={getBackendMode()}
            finalScore={finalScore}
            profile={profile}
            saveStatus={saveStatus}
            sets={sets}
            winnerName={winnerName}
            onNavigate={setScreen}
            onSave={saveCurrentMatch}
          />
        )}
        {screen === "highlights" && (
          <HighlightsScreen
            activeFilter={activeFilter}
            highlights={visibleHighlights}
            profile={profile}
            onAction={showMessage}
            onFilter={setActiveFilter}
          />
        )}
        {screen === "social" && <SocialScreen activeTab={socialTab} onAction={showMessage} onTab={setSocialTab} />}
        {screen === "profile" && (
          <ProfileScreen
            accountStatus={accountStatus}
            profile={profile}
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
        <BottomNav active={screen} onNavigate={setScreen} />
        {appMessage && <div className="toast">{appMessage}</div>}
      </div>
    </main>
  );
}

function HomeScreen({
  profile,
  onAction,
  onNavigate
}: {
  profile: UserProfile;
  onAction: (message: string) => void;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <section className="screen content home-screen">
      <header className="topbar">
        <div>
          <p className="eyebrow"><span className="status-dot" /> Live</p>
          <h1>Play smarter. Every point counts.</h1>
          <p className="hero-copy">Connect, compete, and improve your game.</p>
        </div>
        <button className="icon-button" aria-label="Notifications" onClick={() => onAction("No new notifications")}><Bell size={21} /></button>
      </header>

      <h2 className="section-title">Get started</h2>
      <div className="start-grid">
        <InfoCard icon={Play} title="Start Match" value="Begin scoring" onClick={() => onNavigate("live")} />
        <InfoCard icon={Users} title="Quick Challenge" value="Find players" onClick={() => onNavigate("social")} />
        <InfoCard icon={Apple} title="Watch Connected" value="Ready" onClick={() => onAction("Watch companion is ready")} />
      </div>

      <article className="recent-match-card">
        <div className="section-row">
          <h2>Recent Match</h2>
          <button onClick={() => onNavigate("highlights")}>View all</button>
        </div>
        <div className="recent-match-grid">
          <div className="mini-player">
            <Portrait className={profile.portrait} initials={profile.avatar} photoDataUrl={profile.photoDataUrl} />
            <div><strong>{profile.name}</strong><span>{profile.rating}</span></div>
          </div>
          <div className="mini-score">
            <span>SET</span><b>1</b><b>2</b><b>3</b>
            <strong>6</strong><strong className="won">6</strong><em>-</em>
            <strong>3</strong><strong>4</strong><em>-</em>
          </div>
          <div className="mini-player">
            <Portrait className={opponent.portrait} initials={opponent.avatar} />
            <div><strong>{opponent.name}</strong><span>{opponent.rating}</span></div>
          </div>
          <div className="winner-mark">Winner</div>
        </div>
      </article>

      <article className="progress-card">
        <Metric label="Matches Played" value="4" delta="+2" />
        <div className="progress-ring">75%</div>
        <Metric label="Points Won" value="256" delta="+18" />
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

function LiveMatchScreen({
  pointDisplay,
  profile,
  sets,
  matchWinner,
  onAction,
  onPoint,
  onUndo,
  onComplete,
  onEndMatch,
  onExit
}: {
  pointDisplay: [string, string];
  profile: UserProfile;
  sets: ReturnType<typeof getCompletedSets>;
  matchWinner?: 0 | 1;
  onAction: (message: string) => void;
  onPoint: (player: 0 | 1) => void;
  onUndo: () => void;
  onComplete: () => void;
  onEndMatch: () => void;
  onExit: () => void;
}) {
  return (
    <section className="screen content live-screen">
      <div className="match-status">
        <div>
          <p><span className="status-dot" /> Live</p>
          <strong>Singles Match</strong>
        </div>
        <div className="live-top-actions">
          <span><Apple size={16} /> Watch Connected</span>
          <button onClick={onExit}>Exit</button>
          <button className="danger" onClick={onEndMatch}>End Match</button>
        </div>
      </div>

      <div className="score-card">
        <PlayerScore name={profile.name} meta={profile.rating} avatar={profile.avatar} photoDataUrl={profile.photoDataUrl} portrait={profile.portrait} score={pointDisplay[0]} />
        <div className="divider">vs</div>
        <PlayerScore name={opponent.name} meta={opponent.rating} avatar={opponent.avatar} portrait={opponent.portrait} score={pointDisplay[1]} />
      </div>

      <SetTable profile={profile} sets={sets} full />

      <div className="timer-row">
        <span>Match time</span>
        <strong><Clock3 size={16} /> 00:36</strong>
      </div>

      <div className="point-actions">
        <button className="match-action primary" onClick={() => onPoint(0)}>
          <span className="action-icon"><Plus size={26} /></span>
          <span className="action-label">+ Point</span>
        </button>
        <button className="match-action primary" onClick={() => onPoint(1)}>
          <span className="action-icon"><Minus size={26} /></span>
          <span className="action-label">Opponent</span>
        </button>
        <button className="match-action" onClick={() => onPoint(0)}>
          <span className="action-icon"><Zap size={24} /></span>
          <span className="action-label">Ace</span>
        </button>
        <button className="match-action" onClick={onUndo}>
          <span className="action-icon"><RotateCcw size={24} /></span>
          <span className="action-label">Undo</span>
        </button>
        <button className="match-action" onClick={() => onAction("Voice tag saved")}>
          <span className="action-icon"><Mic size={24} /></span>
          <span className="action-label">Voice</span>
        </button>
      </div>

      {matchWinner !== undefined && <button className="ghost-button" onClick={onComplete}>View recap</button>}
    </section>
  );
}

function CompleteScreen({
  backendMode,
  winnerName,
  finalScore,
  profile,
  sets,
  saveStatus,
  onNavigate,
  onSave
}: {
  backendMode: "local" | "firebase";
  winnerName: string;
  finalScore: string;
  profile: UserProfile;
  sets: ReturnType<typeof getCompletedSets>;
  saveStatus: string;
  onNavigate: (screen: Screen) => void;
  onSave: () => void;
}) {
  return (
    <section className="screen content complete-screen">
      <div className="celebration">
        <p className="eyebrow"><span className="status-dot" /> Match Complete</p>
        <h1>Great Match!</h1>
        <p>Here's how it all went down.</p>
      </div>

      <div className="complete-score">
        <PlayerScore name={profile.name} meta={profile.rating} avatar={profile.avatar} photoDataUrl={profile.photoDataUrl} portrait={profile.portrait} score="6" />
        <div className="divider">vs</div>
        <PlayerScore name={opponent.name} meta={opponent.rating} avatar={opponent.avatar} portrait={opponent.portrait} score="3" />
      </div>

      <SetTable profile={profile} sets={sets} full title="Set by set" />

      <div className="match-stats">
        <div className="section-row">
          <p className="eyebrow">Match stats</p>
          <span>Match time 01:42</span>
        </div>
        {recapStats.map(([label, userValue, opponentValue, balance]) => (
          <div className="stat-balance" key={label}>
            <strong>{userValue}</strong>
            <div>
              <span>{label}</span>
              <i><b style={{ width: `${balance}%` }} /></i>
            </div>
            <strong>{opponentValue}</strong>
          </div>
        ))}
      </div>

      <div className="achievement-row">
        {[
          [Star, "Clutch Performer", "Won 83% of tiebreak points"],
          [Target, "Baseline Boss", "68% of points won from the baseline"],
          [Zap, "Momentum Maker", "Won 5 of the last 6 games"]
        ].map(([Icon, title, copy]) => (
          <article className="achievement-card" key={String(title)}>
            <Icon size={20} />
            <strong>{String(title)}</strong>
            <p>{String(copy)}</p>
          </article>
        ))}
      </div>

      <div className="stack">
        <button className="hero-action compact" onClick={onSave}><Bookmark size={20} /> Save Match</button>
        <p className="save-status">{saveStatus || `Backend: ${backendMode === "firebase" ? "Firebase" : "local mock"}`}</p>
        <div className="button-pair">
          <button className="ghost-button" onClick={() => onNavigate("highlights")}><Share2 size={18} /> Create Share Card</button>
          <button className="ghost-button" onClick={() => onNavigate("highlights")}><Play size={18} /> View Highlights</button>
        </div>
      </div>
    </section>
  );
}

function HighlightsScreen({
  activeFilter,
  highlights,
  profile,
  onAction,
  onFilter
}: {
  activeFilter: string;
  highlights: typeof import("./data/mockData").highlights;
  profile: UserProfile;
  onAction: (message: string) => void;
  onFilter: (filter: string) => void;
}) {
  const [shareCard, setShareCard] = useState("");

  function generateShareCard() {
    const card = createShareCardSvg(profile);
    setShareCard(card);
    onAction("Share card generated");
  }

  return (
    <section className="screen content highlights-screen">
      <header className="simple-header">
        <h1>Highlights</h1>
        <p>Your best moments from the match.</p>
      </header>
      <article className="feature-card">
        <div>
          <p className="eyebrow">Share your match</p>
          <h2>Create a match card or versus poster.</h2>
          <p>Share your win. Inspire your game.</p>
        </div>
        <div className="share-preview">
          <Portrait className={profile.portrait} initials={profile.avatar} photoDataUrl={profile.photoDataUrl} />
          <span>vs</span>
          <Portrait className={opponent.portrait} initials={opponent.avatar} />
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
            <button className="hero-action compact" onClick={() => copyShareCardLink(shareCard, onAction)}><Share2 size={18} /> Copy Card</button>
          </div>
        </article>
      )}
      <div className="section-row">
        <h2>Highlights</h2>
        <button className="text-button" onClick={() => onAction("Select mode enabled")}>Select</button>
      </div>
      <div className="filter-row">
        {["All", "Ace", "Rally", "Winner", "Match Point"].map((filter) => (
          <button className={filter === activeFilter ? "active" : ""} key={filter} onClick={() => onFilter(filter)}>
            {filter}
          </button>
        ))}
        <button className="filter-icon" aria-label="Highlight filters" onClick={() => onAction("Highlight filters ready")}><SlidersHorizontal size={20} /></button>
      </div>
      <div className="highlight-grid">
        {highlights.map((item) => (
          <article className="highlight-card" key={item.id}>
            <div className={`thumb ${item.tone}`}>
              <span><Play size={16} /> {item.duration}</span>
              <b>{item.tag}</b>
            </div>
            <div>
              <h3>{item.title}</h3>
              <p>{item.score}</p>
            </div>
            <div className="card-icons">
              <button aria-label={`Favorite ${item.title}`} onClick={() => onAction(`${item.title} favorited`)}><Heart size={18} /></button>
              <button aria-label={`Options for ${item.title}`} onClick={() => onAction(`Options opened for ${item.title}`)}><MoreHorizontal size={18} /></button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SocialScreen({
  activeTab,
  onAction,
  onTab
}: {
  activeTab: string;
  onAction: (message: string) => void;
  onTab: (tab: string) => void;
}) {
  return (
    <section className="screen content social-screen">
      <header className="simple-header">
        <p className="eyebrow">Social</p>
        <h1>Play together. Get better.</h1>
      </header>
      <div className="tabs">
        {["Nearby", "Friends", "Requests"].map((tab) => (
          <button className={tab === activeTab ? "active" : ""} onClick={() => onTab(tab)} key={tab}>
            {tab}{tab === "Requests" && <span className="badge">2</span>}
          </button>
        ))}
      </div>
      <div className="section-row">
        <button className="distance-pill" onClick={() => onAction("Distance set to 10 miles")}><MapPin size={18} /> Within 10 miles <ChevronRight size={16} /></button>
        <button className="icon-button" aria-label="Player filters" onClick={() => onAction("Player filters ready")}><SlidersHorizontal size={20} /></button>
      </div>
      <p className="list-label">Nearby players</p>
      <div className="player-list">
        {nearbyPlayers.map((player) => (
          <article className="player-row" key={player.name}>
            <strong className={player.rank <= 3 ? "rank active" : "rank"}>{player.rank}</strong>
            <Portrait className={player.portrait} initials={player.avatar} />
            <div>
              <h3>{player.name}</h3>
              <p>Level <b>{player.level}</b></p>
              <p><MapPin size={13} /> {player.distance} away</p>
            </div>
            <span className="streak"><Flame size={16} /> {player.streak} day streak</span>
            <div className="points"><strong>{player.points.toLocaleString()}</strong><span>PTS</span></div>
            <button onClick={() => onAction(`Challenge sent to ${player.name}`)}>Challenge</button>
          </article>
        ))}
      </div>
      <p className="list-label">Local ladder</p>
      <article className="ladder-card">
        <div><span>Your Rank</span><strong>23 <small>of 148</small></strong><b>2,750 PTS</b></div>
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
  profileSaveStatus,
  onAction,
  onNavigate,
  onSaveProfile
}: {
  accountStatus: string;
  profile: UserProfile;
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
      xp: Math.max(0, Math.min(100, Number(draft.xp) || 0)),
      level: Math.max(1, Number(draft.level) || 1)
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
              <span>Rating</span>
              <select value={draft.rating} onChange={(event) => updateDraft("rating", event.target.value)}>
                {["NTRP 2.5", "NTRP 3.0", "NTRP 3.5", "NTRP 4.0", "NTRP 4.5", "NTRP 5.0"].map((rating) => <option key={rating}>{rating}</option>)}
              </select>
            </label>
            <label>
              <span>Level</span>
              <input min="1" max="99" type="number" value={draft.level} onChange={(event) => updateDraft("level", Number(event.target.value))} />
            </label>
            <label>
              <span>XP progress</span>
              <input min="0" max="100" type="number" value={draft.xp} onChange={(event) => updateDraft("xp", Number(event.target.value))} />
            </label>
            <label>
              <span>XP text</span>
              <input value={draft.xpText} onChange={(event) => updateDraft("xpText", event.target.value)} />
            </label>
            <label>
              <span>Racket</span>
              <input value={draft.equipment.racket} onChange={(event) => updateEquipment("racket", event.target.value)} />
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
        <div><span>Level</span><strong>{profile.level}</strong></div>
        <div>
          <p>{profile.xpText}</p>
          <div className="xp-track"><span style={{ width: `${profile.xp}%` }} /></div>
        </div>
      </div>

      <article className="flat-section">
        <div className="section-row">
          <h2>Skills</h2>
          <button className="text-button" onClick={() => onAction("Full skills view coming next")}>View all</button>
        </div>
        <div className="skill-list">
          {profile.skills.map(([skill, value]) => (
            <div className="skill" key={skill}>
              <Dumbbell size={20} />
              <span>{skill}</span>
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
          <button className="text-button" onClick={() => onAction("Pro comparison opened")}>View all</button>
        </div>
        <div className="pro-content">
          <Portrait className="portrait-pro" initials="CA" />
          <div><strong>Carlos Alcaraz</strong><span>Demo profile</span></div>
          <div className="pro-bars">
            {["FH", "BH", "SRV", "VOL", "SLI", "MOV"].map((label, index) => (
              <span key={label}><b>{label}</b><i style={{ height: `${58 + index * 5}%` }} /></span>
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
  const isGuest = appUser?.mode === "firebase" && appUser.isAnonymous;
  const isRegistered = Boolean(appUser?.email);
  const createLabel = isGuest ? "Upgrade guest account" : "Create account";
  const statusLabel = isRegistered ? appUser?.email : accountStatus;

  async function runAuth(action: "sign-in" | "create") {
    if (!email || password.length < 6) {
      setFormStatus("Use an email and a password with 6+ characters.");
      return;
    }

    try {
      setFormStatus(action === "sign-in" ? "Signing in..." : "Creating account...");
      if (action === "sign-in") await onSignIn(email, password);
      else await onCreate(email, password);
      setFormStatus("Account ready.");
    } catch (error) {
      setFormStatus(getAuthErrorMessage(error));
    }
  }

  async function runPasswordReset() {
    if (!email) {
      setFormStatus("Enter your email first.");
      return;
    }

    try {
      setFormStatus("Sending reset email...");
      await onResetPassword(email);
      setFormStatus("Password reset email sent.");
    } catch (error) {
      setFormStatus(getAuthErrorMessage(error));
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
          <button className="hero-action compact" onClick={() => runAuth("sign-in")}><LogIn size={18} /> Sign in</button>
          <button className="ghost-button" onClick={() => runAuth("create")}>{createLabel}</button>
          <button className="ghost-button" onClick={runPasswordReset}>Forgot password</button>
          <button className="ghost-button" onClick={onAnonymous}>Continue as guest</button>
          {!isEntry && <button className="ghost-button quiet" onClick={onSignOut}><LogOut size={18} /> Sign out</button>}
        </div>
        <p className="save-status">{formStatus}</p>
      </article>

      {!isEntry && <button className="ghost-button" onClick={() => onNavigate("profile")}>Back to profile</button>}
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

function SetTable({
  profile = user,
  sets,
  full = false,
  title = "Set"
}: {
  profile?: UserProfile;
  sets: ReturnType<typeof getCompletedSets>;
  full?: boolean;
  title?: string;
}) {
  const displaySets = sets.length ? sets : [{ games: [0, 0] as [number, number] }];
  const paddedSets = full ? [...displaySets, ...Array.from({ length: Math.max(0, 5 - displaySets.length) }, () => undefined)] : displaySets;
  return (
    <table className="set-table">
      <thead>
        <tr><th>{title}</th>{paddedSets.map((_, index) => <th key={index}>{index + 1}</th>)}</tr>
      </thead>
      <tbody>
        {[[profile.shortName, 0], [opponent.shortName, 1]].map(([name, playerIndex]) => (
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

function BottomNav({ active, onNavigate }: { active: Screen; onNavigate: (screen: Screen) => void }) {
  return (
    <nav className="bottom-nav">
      {navItems.map(({ screen, label, icon: Icon }) => (
        <button className={active === screen ? "active" : ""} key={screen} onClick={() => onNavigate(screen)}>
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function formatAccountStatus(appUser: AppUser) {
  if (appUser.mode === "local") return "Local guest account";
  if (appUser.email) return appUser.email;
  return appUser.isAnonymous ? "Firebase guest account" : "Firebase account";
}

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("auth/email-already-in-use")) return "That email already has an account. Try signing in.";
  if (message.includes("auth/invalid-email")) return "Use a valid email address.";
  if (message.includes("auth/weak-password")) return "Use a stronger password with at least 6 characters.";
  if (message.includes("auth/wrong-password") || message.includes("auth/invalid-credential")) return "Email or password is incorrect.";
  if (message.includes("auth/operation-not-allowed")) return "Email login is not enabled yet in Firebase.";
  if (message.includes("auth/network-request-failed")) return "Network error. Check your connection and try again.";

  return message || "Account action failed. Try again.";
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

function createShareCardSvg(profile: UserProfile) {
  const safeName = escapeSvg(profile.name);
  const safeOpponent = escapeSvg(opponent.name);
  const safeRating = escapeSvg(profile.rating);
  const safeInitials = escapeSvg(profile.avatar);
  const safeOpponentInitials = escapeSvg(opponent.avatar);
  const safeLocation = escapeSvg(profile.location);

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
    <text x="770" y="752" fill="#697365" text-anchor="middle" font-family="Inter, Arial" font-size="28">${escapeSvg(opponent.rating)}</text>
  </g>
  <text x="92" y="990" fill="#697365" font-family="Inter, Arial" font-size="30" font-weight="800">FINAL SCORE</text>
  <text x="92" y="1080" fill="#161b16" font-family="Inter, Arial" font-size="92" font-weight="900">6 - 3</text>
  <rect x="676" y="996" width="236" height="72" rx="36" fill="#cdea5f"/>
  <text x="794" y="1044" fill="#1e2b11" text-anchor="middle" font-family="Inter, Arial" font-size="30" font-weight="900">WINNER</text>
  <text x="92" y="1240" fill="#697365" font-family="Inter, Arial" font-size="28">Generated by AceTrack</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function copyShareCardLink(card: string, onAction: (message: string) => void) {
  try {
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
