import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Apple,
  ArrowRight,
  Bell,
  Bookmark,
  Calendar,
  ChevronRight,
  CircleUserRound,
  Clock3,
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
  signInWithEmail,
  signOutAppUser,
  type AppUser
} from "./backend/authRepository";
import { getBackendMode, saveMatchRecord } from "./backend/matchRepository";
import { usePersistentState } from "./hooks/usePersistentState";
import { createMatch, getCompletedSets, getFinalScore, getPointDisplay, scorePoint, undoPoint } from "./lib/tennisScoring";
import "./styles.css";

type Screen = "home" | "live" | "complete" | "highlights" | "social" | "profile" | "account";

const navItems: Array<{ screen: Screen; label: string; icon: typeof Home }> = [
  { screen: "home", label: "Play", icon: Home },
  { screen: "live", label: "Match", icon: Activity },
  { screen: "highlights", label: "Matches", icon: Calendar },
  { screen: "social", label: "Social", icon: Users },
  { screen: "profile", label: "Profile", icon: CircleUserRound }
];

export default function App() {
  const [screen, setScreen] = usePersistentState<Screen>("acetrack:screen", "home");
  const [match, setMatch] = usePersistentState("acetrack:live-match", createMatch([user.name, opponent.name]));
  const [activeFilter, setActiveFilter] = usePersistentState("acetrack:highlight-filter", "All");
  const [socialTab, setSocialTab] = usePersistentState("acetrack:social-tab", "Nearby");
  const [saveStatus, setSaveStatus] = useState("");
  const [appMessage, setAppMessage] = useState("");
  const [accountStatus, setAccountStatus] = useState("Checking account...");

  const pointDisplay = getPointDisplay(match);
  const sets = getCompletedSets(match);
  const winnerName = match.winner !== undefined ? match.players[match.winner] : user.name;
  const finalScore = getFinalScore(match) || "6-4, 6-3";

  const visibleHighlights = useMemo(() => {
    if (activeFilter === "All") return highlights;
    return highlights.filter((item) => item.tag === activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    getCurrentAppUser()
      .then((appUser) => setAccountStatus(formatAccountStatus(appUser)))
      .catch(() => setAccountStatus("Account unavailable"));
  }, []);

  function showMessage(message: string) {
    setAppMessage(message);
    window.setTimeout(() => setAppMessage(""), 2400);
  }

  function addPoint(player: 0 | 1) {
    const next = scorePoint(match, player);
    setMatch(next);
    if (next.winner !== undefined) setScreen("complete");
  }

  async function saveCurrentMatch() {
    setSaveStatus("Saving...");
    const appUser = await getCurrentAppUser();
    setAccountStatus(formatAccountStatus(appUser));
    const result = await saveMatchRecord(createMatchRecord(match, appUser.id));
    setSaveStatus(result.mode === "firebase" ? "Saved to Firebase" : "Saved locally");
  }

  async function signInAccount(email: string, password: string) {
    setAccountStatus("Signing in...");
    const appUser = await signInWithEmail(email, password);
    setAccountStatus(formatAccountStatus(appUser));
    showMessage("Signed in");
  }

  async function createAccount(email: string, password: string) {
    setAccountStatus("Creating account...");
    const appUser = await createEmailAccount(email, password);
    setAccountStatus(formatAccountStatus(appUser));
    showMessage("Account created");
  }

  async function continueAnonymously() {
    setAccountStatus("Starting guest session...");
    const appUser = await getCurrentAppUser();
    setAccountStatus(formatAccountStatus(appUser));
    showMessage("Guest session ready");
  }

  async function signOutAccount() {
    await signOutAppUser();
    setAccountStatus("Signed out");
    showMessage("Signed out");
  }

  return (
    <main className="app-shell">
      <div className={`phone-frame ${screen === "live" ? "is-live" : ""}`}>
        <CourtLines />
        {screen === "home" && <HomeScreen onAction={showMessage} onNavigate={setScreen} />}
        {screen === "live" && (
          <LiveMatchScreen
            matchWinner={match.winner}
            pointDisplay={pointDisplay}
            sets={sets}
            onAction={showMessage}
            onPoint={addPoint}
            onUndo={() => setMatch(undoPoint(match))}
            onComplete={() => setScreen("complete")}
          />
        )}
        {screen === "complete" && (
          <CompleteScreen
            backendMode={getBackendMode()}
            finalScore={finalScore}
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
            onAction={showMessage}
            onFilter={setActiveFilter}
          />
        )}
        {screen === "social" && <SocialScreen activeTab={socialTab} onAction={showMessage} onTab={setSocialTab} />}
        {screen === "profile" && (
          <ProfileScreen accountStatus={accountStatus} onAction={showMessage} onNavigate={setScreen} />
        )}
        {screen === "account" && (
          <AccountScreen
            accountStatus={accountStatus}
            onAnonymous={continueAnonymously}
            onCreate={createAccount}
            onNavigate={setScreen}
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

function HomeScreen({ onAction, onNavigate }: { onAction: (message: string) => void; onNavigate: (screen: Screen) => void }) {
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
            <Portrait className={user.portrait} initials={user.avatar} />
            <div><strong>{user.name}</strong><span>{user.rating}</span></div>
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

function LiveMatchScreen({
  pointDisplay,
  sets,
  matchWinner,
  onAction,
  onPoint,
  onUndo,
  onComplete
}: {
  pointDisplay: [string, string];
  sets: ReturnType<typeof getCompletedSets>;
  matchWinner?: 0 | 1;
  onAction: (message: string) => void;
  onPoint: (player: 0 | 1) => void;
  onUndo: () => void;
  onComplete: () => void;
}) {
  return (
    <section className="screen content live-screen">
      <div className="match-status">
        <div>
          <p><span className="status-dot" /> Live</p>
          <strong>Singles Match</strong>
        </div>
        <span><Apple size={16} /> Watch Connected</span>
      </div>

      <div className="score-card">
        <PlayerScore name={user.name} meta={user.rating} avatar={user.avatar} portrait={user.portrait} score={pointDisplay[0]} />
        <div className="divider">vs</div>
        <PlayerScore name={opponent.name} meta={opponent.rating} avatar={opponent.avatar} portrait={opponent.portrait} score={pointDisplay[1]} />
      </div>

      <SetTable sets={sets} full />

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
  sets,
  saveStatus,
  onNavigate,
  onSave
}: {
  backendMode: "local" | "firebase";
  winnerName: string;
  finalScore: string;
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
        <PlayerScore name={user.name} meta={user.rating} avatar={user.avatar} portrait={user.portrait} score="6" />
        <div className="divider">vs</div>
        <PlayerScore name={opponent.name} meta={opponent.rating} avatar={opponent.avatar} portrait={opponent.portrait} score="3" />
      </div>

      <SetTable sets={sets} full title="Set by set" />

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
  onAction,
  onFilter
}: {
  activeFilter: string;
  highlights: typeof import("./data/mockData").highlights;
  onAction: (message: string) => void;
  onFilter: (filter: string) => void;
}) {
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
          <Portrait className={user.portrait} initials={user.avatar} />
          <span>vs</span>
          <Portrait className={opponent.portrait} initials={opponent.avatar} />
        </div>
        <button onClick={() => onAction("Share card generated")}>Generate Share Card <ArrowRight size={17} /></button>
      </article>
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
  onAction,
  onNavigate
}: {
  accountStatus: string;
  onAction: (message: string) => void;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <section className="screen content profile-screen">
      <div className="profile-hero">
        <Portrait className={`${user.portrait} large`} initials={user.avatar} />
        <div>
          <h1>{user.name}</h1>
          <p><MapPin size={17} /> {user.location}</p>
          <span className="rating-pill">{user.rating}</span>
        </div>
        <button className="account-button" onClick={() => onNavigate("account")}><LogIn size={18} /> Account</button>
      </div>

      <article className="account-card">
        <div>
          <p className="eyebrow">Account</p>
          <strong>{accountStatus}</strong>
        </div>
        <button onClick={() => onNavigate("account")}>Manage</button>
      </article>

      <div className="level-row">
        <div><span>Level</span><strong>{user.level}</strong></div>
        <div>
          <p>{user.xpText}</p>
          <div className="xp-track"><span style={{ width: `${user.xp}%` }} /></div>
        </div>
      </div>

      <article className="flat-section">
        <div className="section-row">
          <h2>Skills</h2>
          <button className="text-button" onClick={() => onAction("Full skills view coming next")}>View all</button>
        </div>
        <div className="skill-list">
          {user.skills.map(([skill, value]) => (
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
          <button className="text-button" onClick={() => onAction("Equipment editor coming next")}>View all</button>
        </div>
        <div className="equipment-list">
          {Object.entries(user.equipment).map(([label, value]) => (
            <button className="equipment-row" key={label} onClick={() => onAction(`${formatEquipmentLabel(label)} selected`)}>
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
  onAnonymous,
  onCreate,
  onNavigate,
  onSignIn,
  onSignOut
}: {
  accountStatus: string;
  onAnonymous: () => Promise<void>;
  onCreate: (email: string, password: string) => Promise<void>;
  onNavigate: (screen: Screen) => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formStatus, setFormStatus] = useState("");

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
      setFormStatus(error instanceof Error ? error.message : "Account action failed.");
    }
  }

  return (
    <section className="screen content account-screen">
      <header className="simple-header">
        <p className="eyebrow">AceTrack account</p>
        <h1>Save every match.</h1>
        <p>{accountStatus}</p>
      </header>

      <article className="login-card">
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
          <button className="ghost-button" onClick={() => runAuth("create")}>Create account</button>
          <button className="ghost-button" onClick={onAnonymous}>Continue as guest</button>
          <button className="ghost-button quiet" onClick={onSignOut}><LogOut size={18} /> Sign out</button>
        </div>
        <p className="save-status">{formStatus}</p>
      </article>

      <button className="ghost-button" onClick={() => onNavigate("profile")}>Back to profile</button>
    </section>
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
  portrait,
  score
}: {
  name: string;
  meta: string;
  avatar: string;
  portrait: string;
  score: string;
}) {
  return (
    <div className="player-score">
      <Portrait className={portrait} initials={avatar} />
      <div>
        <h2>{name}</h2>
        <p>{meta}</p>
      </div>
      <strong>{score}</strong>
    </div>
  );
}

function SetTable({ sets, full = false, title = "Set" }: { sets: ReturnType<typeof getCompletedSets>; full?: boolean; title?: string }) {
  const displaySets = sets.length ? sets : [{ games: [0, 0] as [number, number] }];
  const paddedSets = full ? [...displaySets, ...Array.from({ length: Math.max(0, 5 - displaySets.length) }, () => undefined)] : displaySets;
  return (
    <table className="set-table">
      <thead>
        <tr><th>{title}</th>{paddedSets.map((_, index) => <th key={index}>{index + 1}</th>)}</tr>
      </thead>
      <tbody>
        {[[user.shortName, 0], [opponent.shortName, 1]].map(([name, playerIndex]) => (
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
  return appUser.isAnonymous ? "Firebase guest account" : "Firebase account";
}

function CourtLines() {
  return <div className="court-lines" aria-hidden="true"><span /><span /><span /></div>;
}

function Portrait({ initials, className = "" }: { initials: string; className?: string }) {
  return <div className={`portrait ${className}`}><span>{initials}</span></div>;
}

function TennisBall() {
  return <div className="tennis-ball" aria-hidden="true" />;
}

function formatEquipmentLabel(label: string) {
  return label.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
