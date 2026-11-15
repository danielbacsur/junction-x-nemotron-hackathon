'use client';
import { useEffect, useState } from 'react';
import { readAlerts, writeAlert, type AlertRecord } from '@/lib/alerts';
export default function Alerts() {
  const [items, setItems] = useState<AlertRecord[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    readAlerts()
      .then(setItems)
      .catch((e) => setError(String(e)));
  }, []);
  async function review(item: AlertRecord, status: AlertRecord['review']) {
    try {
      const next = { ...item, review: status };
      await writeAlert(next);
      setItems(await readAlerts());
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <main style={{ maxWidth: 1000, margin: '40px auto', padding: 24 }}>
      <a href="/">Back to studio</a>
      <h1>Alert evidence and human review</h1>
      <p>
        Stored on this device. Export reviewed cases before clearing browser
        data.
      </p>
      <button
        onClick={async () => {
          if ('Notification' in window) await Notification.requestPermission();
        }}
      >
        Enable system notifications
      </button>
      {error && <p role="alert">{error}</p>}
      {!items.length && <p>No saved alerts on this device.</p>}
      {items.map((item) => (
        <article
          key={item.id}
          style={{ padding: 24, border: '1px solid #ccc', marginTop: 20 }}
        >
          <h2>{item.analysis.alert?.name}</h2>
          <p>
            {item.createdAt} · {item.review}
          </p>
          <p>{item.analysis.verdict.summary}</p>
          <details>
            <summary>Skill and verdict</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {item.skill}
              {'\n'}
              {JSON.stringify(item.analysis.verdict, null, 2)}
            </pre>
          </details>
          <div style={{ display: 'flex', overflowX: 'auto' }}>
            {item.frames.map((f) => (
              <figure key={f.id}>
                <img
                  src={f.image}
                  width={240}
                  alt={'Evidence at ' + f.time + ' seconds'}
                />
                <figcaption>
                  {f.time.toFixed(2)}s · {f.id}
                </figcaption>
              </figure>
            ))}
          </div>
          <button onClick={() => review(item, 'confirmed')}>
            Confirm observation
          </button>
          <button onClick={() => review(item, 'dismissed')}>Dismiss</button>
          <button
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(item, null, 2)], {
                  type: 'application/json',
                }),
              );
              const a = document.createElement('a');
              a.href = url;
              a.download = 'review-' + item.id + '.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export evaluation case
          </button>
          <a
            href={
              '/?followup=' +
              encodeURIComponent(
                item.analysis.alert?.name ?? 'Review observation',
              )
            }
          >
            Research follow-up
          </a>
        </article>
      ))}
    </main>
  );
}
