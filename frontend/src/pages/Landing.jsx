import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <>
      <section className="hero reveal visible">
        <h1>
          Teile Momente.
          <br />
          <span className="hl">Finde deine Community.</span>
        </h1>
        <p className="hero-sub">
          <strong>TontooMedia</strong> ist eine Social-Media-artige Webapp: Poste Beiträge,
          folge Freunden, entdecke Themen und chatte – <em>alles an einem Ort</em>,
          modern und schnell.
        </p>
        <div className="hero-cta">
          <Link to="/register" className="btn btn-brand btn-lg">
            <i className="fa-solid fa-user-plus" /> Jetzt registrieren
          </Link>
        </div>
      </section>

      <section id="was-ist" className="section reveal visible">
        <div className="grid3">
          <div className="card">
            <i className="fa-solid fa-newspaper cardic ic-yellow" />
            <h3>Persönlicher Feed</h3>
            <p>Beiträge, Fotos und kurze Updates von Freunden und Themen, die dich interessieren.</p>
          </div>
          <div className="card">
            <i className="fa-solid fa-users cardic ic-teal" />
            <h3>Communities</h3>
            <p>Gruppen für Hobbys, Gaming, Musik oder Sport – oder starte deine eigene Community.</p>
          </div>
          <div className="card">
            <i className="fa-solid fa-comments cardic ic-violet" />
            <h3>Messages</h3>
            <p>Direktnachrichten und Gruppenchats – schnell, modern und direkt in der App.</p>
          </div>
        </div>
      </section>
    </>
  )
}
