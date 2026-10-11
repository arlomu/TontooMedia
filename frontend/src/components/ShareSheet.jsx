// Teilen-Menü wie bei Shorts (eigenes Modal statt Browser-Dialog):
// Titel links oben, Link-Box in der Mitte, Abbrechen links / Fertig rechts.
export default function ShareSheet({ title = 'Teilen', sub, url, copied, onCopy, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <strong className="sheet-title">{title}</strong>
        </div>
        <div className="sheet-body">
          {sub && <p className="sheet-sub">{sub}</p>}
          <div className="sheet-url">
            <span className="sheet-urltext">{url}</span>
            <button type="button" className="btn btn-brand btn-sm" onClick={onCopy}>
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} />
              {copied ? 'Kopiert!' : 'Kopieren'}
            </button>
          </div>
        </div>
        <div className="sheet-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button type="button" className="btn btn-brand" onClick={onClose}>Fertig</button>
        </div>
      </div>
    </div>
  )
}
