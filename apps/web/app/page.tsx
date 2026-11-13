'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Aperture,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clapperboard,
  Clock,
  Eye,
  Loader2,
  Play,
  ScanLine,
  Upload,
  X,
} from 'lucide-react';
import { MODELS, type Analysis, type Frame } from '@agent/lib/contracts';
import { recordings } from '@agent/lib/catalog';
import { extractFrames } from '@/lib/video';
type Skill = { id: string; name: string; markdown: string };
const time = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, '0')}:${(n % 60).toFixed(1).padStart(4, '0')}`;
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
    [position, setPosition] = useState(0),
    [duration, setDuration] = useState(0);
  const video = useRef<HTMLVideoElement>(null),
    input = useRef<HTMLInputElement>(null),
    generation = useRef(0),
    running = useRef(false);
  useEffect(() => {
    fetch('/api/skills')
      .then((r) => r.json())
      .then((s: Skill[]) => {
        setSkills(s);
        setSkill(s.find((x) => x.id === 'pack')?.markdown || s[0].markdown);
      });
    fetch('/api/health')
      .then((r) => r.json())
      .then((h) => setConnected(h.connected));
  }, []);
  useEffect(() => {
    const v = video.current;
    if (v && v.readyState >= 1) setDuration(v.duration);
  }, [source]);
  const steps = skill
    .split('\n')
    .filter((l) => /^- [\w-]+:/.test(l))
    .map((l) => ({
      id: l.slice(2, l.indexOf(':')),
      label: l.slice(l.indexOf(':') + 1).trim(),
    }));
  function clear() {
    generation.current++;
    setResult(null);
    setFrames([]);
    setError('');
    setPosition(0);
  }
  function choose(src: string, name: string, id?: string) {
    clear();
    setSource(src);
    setTitle(name);
    if (id) {
      setSkillId(id);
      setSkill(skills.find((s) => s.id === id)?.markdown || '');
    }
  }
  async function send(fs: Frame[], text: string, m: string) {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frames: fs, skill: text, model: m }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Analysis failed');
    return data as Analysis;
  }
  async function analyze() {
    if (running.current || !skill) return;
    running.current = true;
    setBusy(true);
    setError('');
    const g = generation.current;
    const text = skill,
      m = model;
    try {
      setPhase('Sampling the recording');
      const fs = await extractFrames(source, 0, undefined, 20);
      if (g !== generation.current) return;
      setFrames(fs);
      setPhase('Observing the procedure');
      const r = await send(fs, text, m);
      if (g !== generation.current) return;
      setResult(r);
      setPhase('Observation complete');
    } catch (e) {
      if (g === generation.current)
        setError(e instanceof Error ? e.message : 'Unable to analyze');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  function seek(t: number) {
    if (video.current) {
      video.current.currentTime = t;
      setPosition(t);
    }
  }
  const verified =
    result?.verdict.steps.filter((s) => s.status === 'verified').length || 0;
  return (
    <div className="shell">
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
          <button className="active">
            <ScanLine size={17} />
            Observation studio
          </button>
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
            Workspace <ChevronRight size={13} /> <span>Observation studio</span>
          </div>
          <span className="version">
            PRIVATE PREVIEW <span>0.1</span>
          </span>
        </header>
        <div className="content">
          <div className="page-heading">
            <div className="eyebrow">SEE. UNDERSTAND. FOLLOW THROUGH.</div>
            <h1>Give your camera a job.</h1>
            <p>Turn everyday footage into actions you can verify.</p>
          </div>
          <div className="studio-toolbar">
            <div className="toolbar-actions">
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
          <div className="studio-grid">
            <section className="visual-panel">
              <div className="panel-top">
                <span>
                  <i className="dot green" />
                  REPLAY SOURCE
                </span>
                <span className="mono">{title}</span>
              </div>
              <div className="video-wrap">
                <video
                  ref={video}
                  poster={
                    source.startsWith('/recordings/')
                      ? source.replace('.mp4', '.jpg')
                      : undefined
                  }
                  src={source}
                  controls
                  muted
                  playsInline
                  onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
                  onLoadedData={(e) => setDuration(e.currentTarget.duration)}
                  onDurationChange={(e) =>
                    setDuration(e.currentTarget.duration)
                  }
                  onLoadedMetadata={(e) =>
                    setDuration(e.currentTarget.duration)
                  }
                />
                <div className="video-corner">
                  <ScanLine size={14} />
                  RECORDED <span>{time(position)}</span>
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
                  {duration ? duration.toFixed(1) : '—'} seconds · original
                  footage
                </span>
                <span>Evidence stays linked to time</span>
              </div>
              <div className="recording-list">
                {recordings.map((r, i) => (
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
              </div>
            </section>
            <section className="agent-panel">
              <div className="panel-top">
                <span>
                  <Aperture size={16} /> AGENT
                </span>
                <span className="badge">
                  {busy ? 'Observing' : result ? 'Review ready' : 'Ready'}
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
                      skills.find((s) => s.id === e.target.value)?.markdown ||
                        '',
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
                      : 'What the agent will look for'}
                  </span>
                </div>
                <div className="steps">
                  {steps.map((s, i) => {
                    const v = result?.verdict.steps.find((v) => v.id === s.id);
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
                    disabled={busy}
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
                    Model run ·{' '}
                    {MODELS.find((m) => m.id === result.model)?.name}
                  </span>
                  <span>
                    <Clock size={12} />
                    {(result.latencyMs / 1000).toFixed(1)}s
                  </span>
                  <span>{result.frames.length} frames</span>
                  <span>~${result.cost.toFixed(4)}</span>
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
                          i % Math.max(1, Math.floor(frames.length / 8)) === 0,
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
                  The agent links its findings to the moments that support them.
                </span>
              </div>
            )}
          </section>
          <footer>
            <span>LOOKOUT / JUNCTION 2026</span>
            <span>Observe carefully. Act with evidence.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
