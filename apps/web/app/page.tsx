'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Aperture,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clapperboard,
  Clock,
  Download,
  Eye,
  FileCode2,
  Film,
  FlaskConical,
  Loader2,
  Play,
  Radio,
  ScanLine,
  Settings2,
  Siren,
  Square,
  Upload,
  X,
} from 'lucide-react';
import { MODELS, type Analysis, type Frame } from '@agent/lib/contracts';
import { recordings } from '@agent/lib/catalog';
import { reviewInterval } from '@agent/tools/review-footage';
import { alertName, raisedAlert } from '@agent/tools/raise-alert';
import { extractFrames, cameraFrame } from '@/lib/video';
type Skill = { id: string; name: string; markdown: string };
type Saved = Analysis & { source: string; skillText: string };
type Clip = {
  id: string;
  title: string;
  description: string;
  src: string;
  skill?: string;
  duration: number;
};
type Alarm = {
  name: string;
  source: string;
  at: number;
  // 'live' alerts clear themselves; 'quiet' ones (a reopened run) do not flash.
  mode: 'live' | 'recorded' | 'quiet';
  evidence: { key: string; step: string; time: number; image?: string }[];
};
const time = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, '0')}:${(n % 60).toFixed(1).padStart(4, '0')}`;
// What the live observer sends: the last nine seconds densely, because a quick
// action fits between two sparse frames, and the minute before them thinly.
const recent = (frames: Frame[]) => {
  const older = frames.slice(0, -20);
  const step = Math.max(1, Math.ceil(older.length / 8));
  return [...older.filter((_, i) => i % step === 0), ...frames.slice(-20)];
};
// Up to three items spread across a list, so the frames an alert shows cover
// the whole action rather than only its start.
const spread = <T,>(items: T[]) =>
  items.length <= 3
    ? items
    : [items[0], items[Math.floor(items.length / 2)], items.at(-1)!];
export default function Home() {
  const [skills, setSkills] = useState<Skill[]>([]),
    [skillId, setSkillId] = useState('pack'),
    [skill, setSkill] = useState(''),
    [source, setSource] = useState(recordings[0].src),
    [title, setTitle] = useState(recordings[0].title);
  const [model, setModel] = useState<string>(MODELS[0].id),
    [result, setResult] = useState<Analysis | null>(null),
    [frames, setFrames] = useState<Frame[]>([]),
    [busy, setBusy] = useState(false),
    [phase, setPhase] = useState(''),
    [error, setError] = useState(''),
    [connected, setConnected] = useState(false),
    [tab, setTab] = useState<'observe' | 'skills' | 'runs' | 'evals'>(
      'observe',
    ),
    [runs, setRuns] = useState<Saved[]>([]),
    [live, setLive] = useState(false),
    [watch, setWatch] = useState(false),
    [mode, setMode] = useState<'recordings' | 'camera' | 'observer'>(
      'recordings',
    ),
    [position, setPosition] = useState(0),
    [duration, setDuration] = useState(0),
    [savedLabel, setSavedLabel] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [captures, setCaptures] = useState<Clip[]>([]);
  const video = useRef<HTMLVideoElement>(null),
    input = useRef<HTMLInputElement>(null),
    stream = useRef<MediaStream | null>(null),
    recorder = useRef<MediaRecorder | null>(null),
    generation = useRef(0),
    running = useRef(false),
    liveFrames = useRef<Frame[]>([]),
    started = useRef(0),
    watchRef = useRef(false),
    audio = useRef<AudioContext | null>(null),
    alerted = useRef(-Infinity),
    captured = useRef(0),
    latest = useRef({ skill, model });
  latest.current = { skill, model };
  watchRef.current = watch;
  useEffect(() => {
    fetch('/evaluations.json')
      .then((r) => r.json())
      .then(setEvaluation);
    fetch('/api/skills')
      .then((r) => r.json())
      .then((s) => {
        const custom = JSON.parse(
          localStorage.getItem('lookout-skills') || '[]',
        );
        const merged = [
          ...s.filter((x: Skill) => !custom.some((c: Skill) => c.id === x.id)),
          ...custom,
        ];
        setSkills(merged);
        setSkill(
          merged.find((x: Skill) => x.id === 'pack')?.markdown ||
            merged[0].markdown,
        );
      });
    fetch('/api/health')
      .then((r) => r.json())
      .then((h) => setConnected(h.connected));
    try {
      setRuns(JSON.parse(localStorage.getItem('lookout-runs') || '[]'));
    } catch {}
    return () => stream.current?.getTracks().forEach((t) => t.stop());
  }, []);
  useEffect(() => {
    const v = video.current;
    if (v && v.readyState >= 1) setDuration(v.duration);
  }, [source, tab]);
  const steps = skill
    .split('\n')
    .filter((l) => /^- [\w-]+:/.test(l))
    .map((l) => ({
      id: l.slice(2, l.indexOf(':')),
      label: l.slice(l.indexOf(':') + 1).trim(),
    }));
  function remember(r: Analysis, src: string, text: string) {
    setRuns((old) => {
      const next = [{ ...r, source: src, skillText: text }, ...old].slice(
        0,
        30,
      );
      localStorage.setItem('lookout-runs', JSON.stringify(next));
      return next;
    });
  }
  // An alert stays up until it is dismissed or the footage or skill changes,
  // so a live camera keeps it after the moment has left the rolling window.
  // Browsers only allow sound after a click, so the context is made on one.
  function armSound() {
    audio.current ??= new AudioContext();
    if (audio.current.state === 'suspended') audio.current.resume();
  }
  function siren() {
    const ctx = audio.current;
    if (!ctx) return;
    [0, 0.26, 0.52].forEach((delay, i) => {
      const tone = ctx.createOscillator(),
        gain = ctx.createGain(),
        at = ctx.currentTime + delay;
      tone.type = 'square';
      tone.frequency.value = i % 2 ? 660 : 880;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      tone.connect(gain).connect(ctx.destination);
      tone.start(at);
      tone.stop(at + 0.24);
    });
  }
  function raise(
    r: Analysis,
    text: string,
    fs: Frame[],
    from: string,
    mode: Alarm['mode'],
  ) {
    const alert = raisedAlert(text, r.verdict);
    if (!alert) return;
    const when = (id: string) => r.frames.find((f) => f.id === id)?.time ?? 0;
    if (mode === 'live') {
      // The rolling window shows the same moment to several looks in a row.
      // It may raise one alert, and the next can fire ten seconds later.
      const now = fs.at(-1)?.time ?? 0;
      const latest = Math.max(
        ...alert.steps.flatMap((s) => s.evidence.map(when)),
      );
      if (now < alerted.current + 10 || latest <= alerted.current) return;
      alerted.current = now;
    }
    if (mode !== 'quiet') siren();
    setAlarm({
      name: alert.name,
      source: from,
      at: Date.now(),
      mode,
      evidence: alert.steps.flatMap((s) =>
        spread(s.evidence).map((id) => ({
          key: `${s.id}-${id}`,
          step: s.id,
          time: when(id),
          image: fs.find((f) => f.id === id)?.image,
        })),
      ),
    });
  }
  useEffect(() => {
    if (alarm?.mode !== 'live') return;
    const timer = setTimeout(() => setAlarm(null), 9000);
    return () => clearTimeout(timer);
  }, [alarm]);
  function clear() {
    generation.current++;
    setResult(null);
    setAlarm(null);
    setFrames([]);
    setError('');
    setSavedLabel(false);
    setPosition(0);
  }
  function choose(src: string, name: string, id?: string) {
    stopCamera(true);
    clear();
    setSource(src);
    setTitle(name);
    if (id) {
      setSkillId(id);
      setSkill(skills.find((s) => s.id === id)?.markdown || '');
    }
    setTab('observe');
  }
  async function send(
    fs: Frame[],
    text: string,
    m: string,
    previous?: Analysis,
    reviewed = false,
  ) {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frames: fs,
        skill: text,
        model: m,
        previous: previous ? JSON.stringify(previous.verdict) : undefined,
        reviewed,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Analysis failed');
    return data as Analysis;
  }
  async function analyze() {
    if (running.current || !skill) return;
    armSound();
    running.current = true;
    setBusy(true);
    setError('');
    setSavedLabel(false);
    const g = generation.current;
    const text = skill,
      m = model;
    try {
      setPhase('Sampling the recording');
      const fs = await extractFrames(source, 0, undefined, 20);
      if (g !== generation.current) return;
      setFrames(fs);
      setPhase('Observing the procedure');
      let r = await send(fs, text, m);
      if (g !== generation.current) return;
      setResult(r);
      let all = fs;
      if (r.verdict.request.needed) {
        setPhase('Reviewing an uncertain moment');
        const interval = reviewInterval(r.verdict.request, fs.at(-1)!.time);
        if (interval) {
          const dense = await extractFrames(
            source,
            interval.start,
            interval.end,
            12,
          );
          all = [
            ...new Map([...fs, ...dense].map((f) => [f.id, f])).values(),
          ].sort((a, b) => a.time - b.time);
          setFrames(all);
          const next = await send(all, text, m, r, true);
          next.cost += r.cost;
          next.latencyMs += r.latencyMs;
          next.inputTokens += r.inputTokens;
          next.outputTokens += r.outputTokens;
          r = next;
        }
      }
      if (g !== generation.current) return;
      setResult(r);
      remember(r, source, text);
      raise(r, text, all, title, 'recorded');
      setPhase('Observation complete');
    } catch (e) {
      if (g === generation.current)
        setError(e instanceof Error ? e.message : 'Unable to analyze');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  // The camera does one of two separate jobs. "Record now" captures a clip
  // that joins the recordings, where it is analyzed afterwards like any
  // other; no model sees it while it records. The observer watches the camera
  // as it happens and records nothing.
  async function startCamera(observe: boolean) {
    if (stream.current) stopCamera();
    armSound();
    alerted.current = -Infinity;
    clear();
    setError('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      stream.current = s;
      setLive(true);
      setMode(observe ? 'observer' : 'camera');
      setWatch(observe);
      started.current = performance.now();
      liveFrames.current = [];
      setTimeout(() => {
        if (video.current) {
          video.current.srcObject = s;
          video.current.play();
        }
      }, 0);
      if (!observe) {
        const chunks: Blob[] = [];
        const mime = ['video/mp4', 'video/webm;codecs=vp8'].find((m) =>
          MediaRecorder.isTypeSupported(m),
        );
        const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
        r.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        const began = performance.now();
        r.onstop = () => {
          if (!chunks.length) return;
          const clip: Clip = {
            id: `capture-${++captured.current}`,
            title: `Camera recording ${captured.current}`,
            description: 'Recorded with the camera in this session.',
            src: URL.createObjectURL(new Blob(chunks, { type: r.mimeType })),
            duration: (performance.now() - began) / 1000,
          };
          setCaptures((old) => [...old, clip]);
          // Show it right away, unless the observer has taken the camera.
          if (stream.current) return;
          setSource(clip.src);
          setTitle(clip.title);
          if (video.current) video.current.srcObject = null;
        };
        r.start(1000);
        recorder.current = r;
      }
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      setLive(false);
      setError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser, or upload a recording to continue.'
          : e instanceof Error
            ? e.message
            : 'Camera unavailable',
      );
    }
  }
  function stopCamera(discard = false) {
    generation.current++;
    setWatch(false);
    setLive(false);
    setMode('recordings');
    // What the observer saw does not belong to the recording shown next.
    setResult(null);
    setFrames([]);
    setAlarm(null);
    setPosition(0);
    if (recorder.current?.state === 'recording') {
      if (discard) recorder.current.onstop = null;
      recorder.current.stop();
    }
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(async () => {
      const v = video.current;
      if (!v?.videoWidth) return;
      const elapsed = (performance.now() - started.current) / 1000;
      // A recorded session is capped at two minutes; the observer is not.
      if (recorder.current?.state === 'recording' && elapsed >= 120) {
        stopCamera();
        return;
      }
      const f = cameraFrame(v, elapsed);
      liveFrames.current = [...liveFrames.current, f].slice(-120);
      setPosition(f.time);
      if (!watchRef.current || running.current || liveFrames.current.length < 4)
        return;
      running.current = true;
      setBusy(true);
      setPhase('Watching the current action');
      const g = generation.current;
      try {
        const fs = recent(liveFrames.current);
        const r = await send(fs, latest.current.skill, latest.current.model);
        if (g === generation.current && stream.current) {
          setFrames(fs);
          setResult(r);
          setError('');
          raise(r, latest.current.skill, fs, 'Observer', 'live');
        }
      } catch (e) {
        // One failed look is not worth a message: the next one follows in
        // seconds. Only a gateway that refuses is shown, and ends the watch.
        const message = e instanceof Error ? e.message : 'Observation failed';
        if (/Gateway|not connected/.test(message)) {
          setError(message);
          setWatch(false);
        }
      } finally {
        running.current = false;
        setBusy(false);
      }
    }, 450);
    return () => clearInterval(timer);
  }, [live]);
  function seek(t: number) {
    if (video.current && !live) {
      video.current.currentTime = t;
      setPosition(t);
    }
  }
  async function teach() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    setPhase('Learning from the demonstration');
    const g = generation.current;
    try {
      const fs = await extractFrames(source, 0, undefined, 24);
      const res = await fetch('/api/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: fs,
          model,
          skill: 'Discover the demonstrated procedure.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (g !== generation.current) return;
      const item = {
        id: 'learned-' + Date.now(),
        name: 'Learned procedure',
        markdown: data.markdown,
      };
      setSkills((old) => [...old, item]);
      setSkillId(item.id);
      setSkill(item.markdown);
      setResult(null);
      setAlarm(null);
      setTab('skills');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Teaching failed');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  function exportRun() {
    if (!result) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify({ ...result, skill, source }, null, 2)], {
        type: 'application/json',
      }),
    );
    a.download = 'lookout-evidence.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const verified =
    result?.verdict.steps.filter((s) => s.status === 'verified').length || 0;
  return (
    <div className="shell">
      {alarm && alarm.mode !== 'quiet' && (
        <div className="alert-flash" key={alarm.at} aria-hidden>
          <div>
            <Siren size={56} />
            <span>ALERT</span>
            <strong>{alarm.name}</strong>
            <small>
              {alarm.source} · {time(alarm.evidence.at(-1)?.time ?? 0)}
            </small>
          </div>
        </div>
      )}
      <aside className="sidebar">
        <a className="brand" href="/">
          <Aperture size={29} />
          <span>
            lookout<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">J</span>
          <div>
            Junction lab<small>Personal workspace</small>
          </div>
          <ChevronRight size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {[
            { id: 'observe', icon: ScanLine, label: 'Observation studio' },
            { id: 'skills', icon: FileCode2, label: 'Skills' },
            { id: 'runs', icon: Clock, label: 'Run history' },
            { id: 'evals', icon: FlaskConical, label: 'Evaluations' },
          ].map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? 'active' : ''}
              onClick={() => {
                if (live) stopCamera();
                setTab(n.id as typeof tab);
              }}
            >
              <n.icon size={17} />
              {n.label}
              {n.id === 'skills' && (
                <span className="nav-count">{skills.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="powered">
            <span className="green-square" /> NVIDIA NEMOTRON
          </div>
          <p>
            A camera that understands
            <br />
            what happens next.
          </p>
          <div className="gateway">
            <i className={connected ? 'dot green' : 'dot'} />
            {connected ? 'Gateway connected' : 'Gateway not connected'}
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumbs">
            Workspace <ChevronRight size={13} />{' '}
            <span>
              {tab === 'observe'
                ? 'Observation studio'
                : tab === 'skills'
                  ? 'Skills'
                  : tab === 'evals'
                    ? 'Evaluations'
                    : 'Run history'}
            </span>
          </div>
          <span className="version">
            PRIVATE PREVIEW <span>0.1</span>
          </span>
        </header>
        <div className="content">
          <div className="page-heading">
            <div className="eyebrow">SEE. UNDERSTAND. FOLLOW THROUGH.</div>
            <h1>
              {tab === 'observe'
                ? 'Give your camera a job.'
                : tab === 'skills'
                  ? 'Procedures, in plain language.'
                  : tab === 'evals'
                    ? 'Trust is something you test.'
                    : 'Every decision leaves evidence.'}
            </h1>
            <p>
              {tab === 'observe'
                ? 'Turn everyday footage into actions you can verify.'
                : tab === 'skills'
                  ? 'Define what to observe and what counts as done.'
                  : tab === 'evals'
                    ? 'The same footage. Different models. Observable results.'
                    : 'Revisit real model runs, their evidence, and their cost.'}
            </p>
          </div>
          {tab === 'observe' && (
            <>
              <div className="studio-toolbar">
                <div className="segmented">
                  <button
                    className={mode !== 'observer' ? 'selected' : ''}
                    onClick={() => mode === 'observer' && stopCamera()}
                  >
                    <Film size={15} /> Recordings
                  </button>
                  <button
                    className={mode === 'observer' ? 'selected' : ''}
                    onClick={() => mode !== 'observer' && startCamera(true)}
                  >
                    <Eye size={15} /> Observer
                  </button>
                </div>
                <div className="toolbar-actions">
                  {!live && (
                    <button
                      className="button subtle"
                      onClick={teach}
                      disabled={busy}
                    >
                      <FileCode2 size={15} /> Learn a skill
                    </button>
                  )}
                  <button
                    className="button subtle"
                    onClick={() => input.current?.click()}
                    disabled={busy}
                  >
                    <Upload size={15} /> Upload video
                  </button>
                </div>
                <input
                  ref={input}
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) choose(URL.createObjectURL(f), f.name);
                  }}
                />
              </div>
              {alarm && (
                <section
                  className={
                    alarm.mode === 'live' ? 'alert-card fading' : 'alert-card'
                  }
                  key={alarm.at}
                  role="alert"
                >
                  <div className="alert-top">
                    <span className="alert-label">
                      <Siren size={15} /> ALERT
                    </span>
                    <span>{alarm.source}</span>
                    <button
                      title="Dismiss alert"
                      onClick={() => setAlarm(null)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <h2>{alarm.name}</h2>
                  <p>Every step of this skill was verified. Open the proof:</p>
                  <div className="alert-evidence">
                    {alarm.evidence.map((e) => (
                      <button key={e.key} onClick={() => seek(e.time)}>
                        {e.image && (
                          <img
                            src={e.image}
                            alt={`Evidence at ${time(e.time)}`}
                          />
                        )}
                        <span>
                          <span className="event-time">{time(e.time)}</span>
                          <strong>{e.step}</strong>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <div className="studio-grid">
                <section className="visual-panel">
                  <div className="panel-top">
                    <span>
                      <i className={'dot ' + (live ? 'red' : 'green')} />
                      {mode === 'observer'
                        ? 'OBSERVER'
                        : mode === 'camera'
                          ? 'RECORDING NOW'
                          : 'REPLAY SOURCE'}
                    </span>
                    <span className="mono">
                      {live ? 'Browser camera' : title}
                    </span>
                  </div>
                  <div className="video-wrap">
                    <video
                      ref={video}
                      poster={
                        source.startsWith('/recordings/')
                          ? source.replace('.mp4', '.jpg')
                          : undefined
                      }
                      src={live ? undefined : source}
                      controls={!live}
                      muted
                      playsInline
                      onTimeUpdate={(e) =>
                        setPosition(e.currentTarget.currentTime)
                      }
                      onLoadedData={(e) =>
                        setDuration(e.currentTarget.duration)
                      }
                      onDurationChange={(e) =>
                        setDuration(e.currentTarget.duration)
                      }
                      onLoadedMetadata={(e) =>
                        setDuration(e.currentTarget.duration)
                      }
                    />
                    <div className="video-corner">
                      <ScanLine size={14} />
                      {mode === 'observer'
                        ? watch
                          ? 'WATCHING'
                          : 'PAUSED'
                        : mode === 'camera'
                          ? 'RECORDING'
                          : 'RECORDED'}{' '}
                      <span>{time(position)}</span>
                    </div>
                    {busy && (
                      <div className="analyzing">
                        <Loader2 size={15} className="spin" />
                        {phase}
                      </div>
                    )}
                  </div>
                  <div className="film-meta">
                    <span>
                      <Clapperboard size={16} />{' '}
                      {mode === 'observer'
                        ? 'Browser camera · watched as it happens, not recorded'
                        : mode === 'camera'
                          ? 'Browser camera · recording locally, not analyzed'
                          : `${duration ? duration.toFixed(1) : '—'} seconds · original footage`}
                    </span>
                    <span>Evidence stays linked to time</span>
                  </div>
                  {!live && (
                    <div className="recording-list">
                      {[...recordings, ...captures].map((r: Clip, i) => (
                        <button
                          className={
                            source === r.src
                              ? 'recording selected-recording'
                              : 'recording'
                          }
                          key={r.id}
                          onClick={() => choose(r.src, r.title, r.skill)}
                          disabled={busy}
                        >
                          <span className="recording-number">0{i + 1}</span>
                          <span>
                            <strong>{r.title}</strong>
                            <small>{r.description}</small>
                          </span>
                          <span className="clip-duration">
                            {r.duration.toFixed(0)}s
                          </span>
                          <ChevronRight size={14} />
                        </button>
                      ))}
                      <button
                        className="recording record-now"
                        onClick={() => startCamera(false)}
                        disabled={busy}
                      >
                        <span className="recording-number">
                          <Radio size={13} />
                        </span>
                        <span>
                          <strong>Record now</strong>
                          <small>
                            Capture a clip with the camera, then analyze it.
                          </small>
                        </span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                  {mode === 'camera' && (
                    <div className="camera-actions">
                      <button
                        className="button primary"
                        onClick={() => stopCamera()}
                      >
                        <Square size={15} /> Stop recording
                      </button>
                      <button
                        className="button"
                        onClick={() => stopCamera(true)}
                      >
                        Discard
                      </button>
                      <span>
                        Stopping adds the clip to your recordings, ready to
                        analyze.
                      </span>
                    </div>
                  )}
                  {mode === 'observer' && (
                    <div className="camera-actions">
                      <button
                        className="button primary"
                        onClick={() => setWatch(!watch)}
                      >
                        {watch ? <Square size={15} /> : <Eye size={15} />}{' '}
                        {watch ? 'Pause observer' : 'Resume observer'}
                      </button>
                      <span>
                        {watch
                          ? `Checking the camera against "${skills.find((s) => s.id === skillId)?.name ?? 'the skill'}" every few seconds.`
                          : 'Paused. Nothing is being sent.'}
                      </span>
                    </div>
                  )}
                </section>
                <section className="agent-panel">
                  <div className="panel-top">
                    <span>
                      <Aperture size={16} /> AGENT
                    </span>
                    <span className={alarm ? 'badge raised' : 'badge'}>
                      {busy
                        ? 'Observing'
                        : alarm
                          ? 'Alert raised'
                          : result
                            ? 'Review ready'
                            : 'Ready'}
                    </span>
                  </div>
                  <div className="agent-body">
                    <label className="field-label">PROCEDURE</label>
                    <select
                      value={skillId}
                      disabled={busy}
                      onChange={(e) => {
                        setSkillId(e.target.value);
                        setSkill(
                          skills.find((s) => s.id === e.target.value)
                            ?.markdown || '',
                        );
                        clear();
                      }}
                    >
                      {skills.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <div className="procedure-heading">
                      <span>
                        {result
                          ? `${verified} of ${steps.length} verified`
                          : alertName(skill)
                            ? 'Raises an alert if all of this is seen'
                            : 'What the agent will look for'}
                      </span>
                      <button
                        title="Edit skill"
                        onClick={() => setTab('skills')}
                      >
                        <Settings2 size={14} />
                      </button>
                    </div>
                    <div className="steps">
                      {steps.map((s, i) => {
                        const v = result?.verdict.steps.find(
                          (v) => v.id === s.id,
                        );
                        return (
                          <div
                            key={s.id}
                            className={'step ' + (v?.status || 'pending')}
                          >
                            <span className="step-icon">
                              {v?.status === 'verified' ? (
                                <Check size={13} />
                              ) : v?.status === 'contradicted' ? (
                                <X size={13} />
                              ) : (
                                i + 1
                              )}
                            </span>
                            <div>
                              <strong>{s.label.split('. ')[0]}</strong>
                              {v && (
                                <>
                                  <span className="step-status">
                                    {v.status.replace('_', ' ')}
                                  </span>
                                  <p>{v.observation}</p>
                                  <div className="evidence-links">
                                    {v.evidence.slice(0, 3).map((id) => {
                                      const f = result?.frames.find(
                                        (f) => f.id === id,
                                      );
                                      return (
                                        f && (
                                          <button
                                            key={id}
                                            onClick={() => seek(f.time)}
                                          >
                                            <Play size={10} />
                                            {time(f.time)}
                                          </button>
                                        )
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="model-field">
                      <label className="field-label">REASONING MODEL</label>
                      <select
                        value={model}
                        disabled={busy || watch}
                        onChange={(e) => {
                          setModel(e.target.value);
                          clear();
                        }}
                      >
                        {MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <small>
                        via Vercel AI Gateway ·{' '}
                        {model === MODELS[0].id
                          ? 'Challenge model'
                          : 'Experimental comparison'}
                      </small>
                    </div>
                    {!live && (
                      <button
                        className="button primary analyze-button"
                        onClick={analyze}
                        disabled={busy || !skill}
                      >
                        {busy ? (
                          <Loader2 size={16} className="spin" />
                        ) : (
                          <ScanLine size={16} />
                        )}{' '}
                        {busy ? phase : 'Analyze recording'}
                        {!busy && <ArrowUpRight size={16} />}
                      </button>
                    )}
                    <p className="privacy-note">
                      Only selected frames are sent for analysis.
                    </p>
                  </div>
                </section>
              </div>
              {error && (
                <div role="alert" className="error">
                  <X size={17} />
                  {error}
                </div>
              )}
              <section className="evidence-panel">
                <div className="evidence-heading">
                  <div>
                    <div className="eyebrow">THE EVIDENCE TRAIL</div>
                    <h2>
                      {result
                        ? 'A decision you can inspect.'
                        : 'Nothing marked done without evidence.'}
                    </h2>
                  </div>
                  {result && (
                    <button className="button subtle" onClick={exportRun}>
                      <Download size={15} /> Export run
                    </button>
                  )}
                </div>
                {result ? (
                  <>
                    <div className="result-summary">
                      <span className="insight-icon">
                        <Eye size={20} />
                      </span>
                      <div>
                        <strong>{result.verdict.summary}</strong>
                        <p>{result.verdict.guidance}</p>
                      </div>
                    </div>
                    <div className="run-meta">
                      <span>
                        {savedLabel ? 'Saved run' : 'Model run'} ·{' '}
                        {MODELS.find((m) => m.id === result.model)?.name}
                      </span>
                      <span>
                        <Clock size={12} />
                        {(result.latencyMs / 1000).toFixed(1)}s
                      </span>
                      <span>{result.frames.length} frames</span>
                      <span>~${result.cost.toFixed(4)}</span>
                      {result.reviewed && (
                        <span className="review-tag">Footage reviewed</span>
                      )}
                    </div>
                    <div className="events">
                      {result.verdict.events.map((e, i) => (
                        <button key={i} onClick={() => seek(e.time)}>
                          <span className="event-time">{time(e.time)}</span>
                          <strong>{e.label}</strong>
                          <p>{e.detail}</p>
                          <ArrowUpRight size={15} />
                        </button>
                      ))}
                    </div>
                    {frames.length > 0 && (
                      <div className="frame-strip">
                        {frames
                          .filter(
                            (_, i) =>
                              i % Math.max(1, Math.floor(frames.length / 8)) ===
                              0,
                          )
                          .map((f) => (
                            <button key={f.id} onClick={() => seek(f.time)}>
                              <img
                                src={f.image}
                                alt={`Evidence at ${time(f.time)}`}
                              />
                              <span>{time(f.time)}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-evidence">
                    <div className="empty-orbit">
                      <ScanLine size={27} />
                    </div>
                    <p>Choose a recording and run your first observation.</p>
                    <span>
                      The agent links its findings to the moments that support
                      them.
                    </span>
                  </div>
                )}
              </section>
            </>
          )}
          {tab === 'skills' && (
            <section className="skill-workspace">
              <aside>
                {skills.map((s) => (
                  <button
                    className={s.id === skillId ? 'active' : ''}
                    key={s.id}
                    onClick={() => {
                      setSkillId(s.id);
                      setSkill(s.markdown);
                      clear();
                    }}
                  >
                    <FileCode2 size={17} />
                    {s.name}
                  </button>
                ))}
              </aside>
              <div className="skill-editor">
                <div className="panel-top">
                  <span>SKILL.md</span>
                  <span>Editable procedure</span>
                </div>
                <textarea
                  aria-label="Skill instructions"
                  value={skill}
                  onChange={(e) => {
                    setSkill(e.target.value);
                    generation.current++;
                    setResult(null);
                    setAlarm(null);
                  }}
                  spellCheck={false}
                />
                <div className="editor-footer">
                  <span>
                    Format: - step-id: observable completion condition. Add an
                    "Alert: name" line to raise an alert.
                  </span>
                  <button
                    className="button primary"
                    onClick={() => {
                      setSkills((s) => {
                        const next = s.map((x) =>
                          x.id === skillId ? { ...x, markdown: skill } : x,
                        );
                        localStorage.setItem(
                          'lookout-skills',
                          JSON.stringify(next),
                        );
                        return next;
                      });
                      setTab('observe');
                    }}
                  >
                    Use this skill <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>
            </section>
          )}
          {tab === 'runs' && (
            <section className="history">
              <div className="panel-top">
                <span>RECENT OBSERVATIONS</span>
                <span>{runs.length} runs · stored in this browser</span>
              </div>
              {!runs.length ? (
                <div className="empty-evidence">
                  <FlaskConical size={30} />
                  <p>Your completed runs will appear here.</p>
                </div>
              ) : (
                runs.map((r) => (
                  <button
                    className="history-row"
                    key={r.id}
                    onClick={() => {
                      choose(r.source, 'Saved observation');
                      const existing = skills.find(
                        (s) => s.markdown === r.skillText,
                      );
                      const restored = existing || {
                        id: 'run-' + r.id,
                        name: 'Saved procedure',
                        markdown: r.skillText,
                      };
                      if (!existing) setSkills((old) => [...old, restored]);
                      setSkillId(restored.id);
                      setModel(r.model);
                      setSkill(r.skillText);
                      setResult(r);
                      setSavedLabel(true);
                      raise(r, r.skillText, [], 'Saved observation', 'quiet');
                    }}
                  >
                    <span className="history-icon">
                      <Eye size={18} />
                    </span>
                    <div>
                      <strong>{r.verdict.summary}</strong>
                      <small>
                        {MODELS.find((m) => m.id === r.model)?.name} ·{' '}
                        {new Date(r.createdAt).toLocaleString()}
                      </small>
                    </div>
                    <span>
                      {
                        r.verdict.steps.filter((s) => s.status === 'verified')
                          .length
                      }
                      /{r.verdict.steps.length} verified
                    </span>
                    {raisedAlert(r.skillText, r.verdict) && (
                      <span className="alert-tag">Alert</span>
                    )}
                    <span>${r.cost.toFixed(4)}</span>
                    <ChevronRight size={16} />
                  </button>
                ))
              )}
            </section>
          )}
          {tab === 'evals' && evaluation && (
            <section className="evaluation">
              <div className="eval-intro">
                <span className="badge">REAL GATEWAY RUNS</span>
                <p>{evaluation.note}</p>
              </div>
              <div className="eval-models">
                {evaluation.models.map((m: any) => (
                  <article key={m.model}>
                    <span className="field-label">
                      {m.model.startsWith('nvidia')
                        ? 'DEFAULT · CHALLENGE MODEL'
                        : m.model.startsWith('alibaba')
                          ? 'ECONOMY OPTION'
                          : 'EXPERIMENTAL'}
                    </span>
                    <h2>{MODELS.find((x) => x.id === m.model)?.name}</h2>
                    <div className="eval-score">
                      {m.positivePasses + m.negativePasses}
                      <span> / {m.positiveCount + m.negativeCount}</span>
                    </div>
                    <div className="score-track">
                      <i
                        style={{
                          width: `${(100 * (m.positivePasses + m.negativePasses)) / (m.positiveCount + m.negativeCount)}%`,
                        }}
                      />
                    </div>
                    <p>
                      Complete recordings: {m.positivePasses}/{m.positiveCount}{' '}
                      runs
                      <br />
                      No false completion: {m.negativePasses}/{m.negativeCount}{' '}
                      runs
                    </p>
                    <div className="eval-stats">
                      <span>
                        {m.averageSeconds}s <small>avg. response</small>
                      </span>
                      <span>
                        ${m.totalCost.toFixed(4)}{' '}
                        <small>{m.positiveCount} full-recording runs</small>
                      </span>
                    </div>
                    {m.cases.map((c: any) => (
                      <div className="eval-case" key={c.name}>
                        {c.passed ? <Check size={14} /> : <X size={14} />}
                        <span>
                          {c.name.replaceAll('-', ' ')}
                          {!c.passed && (
                            <small>
                              False completion: {c.falseAdvances.join(', ')}
                            </small>
                          )}
                        </span>
                      </div>
                    ))}
                  </article>
                ))}
              </div>
              <p className="eval-note">
                These tests assess step status on a small development set. They
                do not establish general accuracy or prove every evidence
                citation is correct. Nano VL was excluded after invalid output
                and incorrect evidence.
              </p>
            </section>
          )}
          <footer>
            <span>LOOKOUT / JUNCTION 2026</span>
            <span>Observe carefully. Act with evidence.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
