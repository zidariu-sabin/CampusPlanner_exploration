import React from 'react';

export function ScreenShell({ children }) {
  return <div className="screen-shell">{children}</div>;
}

export function Panel({ title, subtitle, action, onAction, children }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        {action && (
          <button className="secondary-action" type="button" onClick={onAction}>
            {action}
          </button>
        )}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function Metric({ label, value, tone = 'neutral' }) {
  return (
    <article className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Task({ title, label, urgent }) {
  return (
    <article className="task">
      <span>{title}</span>
      <Badge tone={urgent ? 'warn' : 'neutral'}>{label}</Badge>
    </article>
  );
}

export function RouteStep({ number, children }) {
  return (
    <div className="route-step">
      <span>{number}</span>
      <p>{children}</p>
    </div>
  );
}
