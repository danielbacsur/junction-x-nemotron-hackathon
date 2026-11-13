'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Aperture,
  ChevronRight,
  Clapperboard,
  ScanLine,
  Upload,
} from 'lucide-react';
import { recordings } from '@agent/lib/catalog';
const time = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, '0')}:${(n % 60).toFixed(1).padStart(4, '0')}`;
export default function Home() {
  const [source, setSource] = useState(recordings[0].src),
    [title, setTitle] = useState(recordings[0].title),
    [connected, setConnected] = useState(false),
    [position, setPosition] = useState(0),
    [duration, setDuration] = useState(0);
  const video = useRef<HTMLVideoElement>(null),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((h) => setConnected(h.connected));
  }, []);
  useEffect(() => {
    const v = video.current;
    if (v && v.readyState >= 1) setDuration(v.duration);
  }, [source]);
  function choose(src: string, name: string) {
    setPosition(0);
    setSource(src);
    setTitle(name);
  }
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
                onDurationChange={(e) => setDuration(e.currentTarget.duration)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              />
              <div className="video-corner">
                <ScanLine size={14} />
                RECORDED <span>{time(position)}</span>
              </div>
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
                  onClick={() => choose(r.src, r.title)}
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
          <footer>
            <span>LOOKOUT / JUNCTION 2026</span>
            <span>Observe carefully. Act with evidence.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
