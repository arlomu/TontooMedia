export default function App() {
  const noop = (e) => {
    // Absichtlich ohne Funktion (Basis-Version)
    e?.preventDefault?.()
  }

  return (
    <div className="page">
      <div className="bg-glow" aria-hidden="true" />

      <header className="nav">
        <div className="nav-inner">
          <a className="brand" href="/" onClick={noop}>
            <span className="brand-mark">T</span>
            <span className="brand-name">TontooMedia</span>
            <span className="brand-badge">beta</span>
          </a>

          <nav className="nav-links">
            <a href="#was-ist" onClick={noop}>Was ist das?</a>
            <a href="#features" onClick={noop}>Features</a>
            <a href="#vision" onClick={noop}>Vision</a>
          </nav>

          <div className="nav-actions">
            <button type="button" className="btn btn-ghost" onClick={noop}>
              Login
            </button>
            <button type="button" className="btn btn-primary" onClick={noop}>
              Registrieren
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-pill">✨ Die neue Social-Plattform im Aufbau</div>
          <h1>
            Teile Momente.
            <br />
            <span className="gradient-text">Finde deine Community.</span>
          </h1>
          <p className="hero-sub">
            <strong>TontooMedia</strong> ist eine Social-Media-artige Webapp:
            Poste Beiträge, folge Freunden, entdecke Themen und chatte –
            alles an einem Ort, modern und schnell.
          </p>
          <div className="hero-cta">
            <button type="button" className="btn btn-primary btn-lg" onClick={noop}>
              Jetzt registrieren
            </button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={noop}>
              Mehr erfahren
            </button>
          </div>
          <p className="hero-hint">Buttons sind in dieser Basis-Version noch ohne Funktion.</p>

          <div className="mock-feed">
            <div className="mock-card">
              <div className="mock-head">
                <div className="avatar a1">M</div>
                <div>
                  <div className="mock-name">mia.postet</div>
                  <div className="mock-time">vor 2 Min · 🌍</div>
                </div>
              </div>
              <p>Mein erster Post auf TontooMedia! Wer ist auch hier? 👋</p>
              <div className="mock-actions">
                <span>♡ 128</span><span>💬 24</span><span>↗ Teilen</span>
              </div>
            </div>
            <div className="mock-card">
              <div className="mock-head">
                <div className="avatar a2">T</div>
                <div>
                  <div className="mock-name">tontoo.official</div>
                  <div className="mock-time">vor 1 Std · 📌</div>
                </div>
              </div>
              <p>Willkommen bei TontooMedia – Feed, Communities und Messages kommen bald. 🚀</p>
              <div className="mock-actions">
                <span>♡ 512</span><span>💬 89</span><span>↗ Teilen</span>
              </div>
            </div>
            <div className="mock-card">
              <div className="mock-head">
                <div className="avatar a3">J</div>
                <div>
                  <div className="mock-name">jonas.fotos</div>
                  <div className="mock-time">vor 3 Std · 📸</div>
                </div>
              </div>
              <p>Sunset shots gehen hier hoffentlich viral. 🌅 #fotografie</p>
              <div className="mock-actions">
                <span>♡ 76</span><span>💬 11</span><span>↗ Teilen</span>
              </div>
            </div>
          </div>
        </section>

        <section id="was-ist" className="section">
          <h2>Was ist TontooMedia?</h2>
          <p className="section-sub">
            Eine Social-Media-Plattform zum Posten, Entdecken und Vernetzen –
            gerade entsteht hier die Basis. Diese Startseite zeigt nur die Idee.
          </p>
        </section>

        <section id="features" className="grid">
          <div className="card">
            <div className="icon">📰</div>
            <h3>Persönlicher Feed</h3>
            <p>Beiträge, Fotos und kurze Updates von Freunden und Themen, die dich interessieren.</p>
          </div>
          <div className="card">
            <div className="icon">👥</div>
            <h3>Communities</h3>
            <p>Finde Gruppen für Hobbys, Gaming, Musik, Sport oder starte deine eigene Community.</p>
          </div>
          <div className="card">
            <div className="icon">💬</div>
            <h3>Messages</h3>
            <p>Direktnachrichten und Gruppenchats – schnell, modern und direkt in der App.</p>
          </div>
        </section>

        <section id="vision" className="vision">
          <h2>Unsere Vision</h2>
          <p>
            Weniger Doomscrolling, mehr echte Verbindung. TontooMedia soll einfach,
            schnell und fair sein – gebaut für Menschen, nicht für Algorithmen.
          </p>
        </section>
      </main>

      <footer className="footer">
        <span>© 2026 TontooMedia · Basis-Version</span>
        <span className="footer-dot">·</span>
        <span>Feed · Communities · Messages (bald)</span>
      </footer>
    </div>
  )
}
