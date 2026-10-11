import { useEffect, useRef, useState } from 'react'
import VideoGenWait from './VideoGenWait.jsx'
import { apiAiJob, apiCreateAiVideo } from '../lib/api.js'

const cleanTag = (s) => s.replace(/^#+/, '').trim().slice(0, 20)

// KI-Video: Formular (Titel, Hashtags, optional Thumbnail, Prompt – keine Datei)
// -> Generieren -> Wartebild mit Server-Phasen -> Auto-Upload als Short.
export default function AiVideoModal({ notify, onDone, onClose }) {
  const toast = (msg) => notify?.(msg)
  const [title, setTitle] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  const [tags, setTags] = useState([])
  const [prompt, setPrompt] = useState('')
  const [thumb, setThumb] = useState(null) // { url, file }
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  // Laufender Job
  const [job, setJob] = useState(null) // { id, status, message }
  const [jobError, setJobError] = useState('')
  const [finishing, setFinishing] = useState(false)
  const fileRef = useRef(null)
  const waitRef = useRef(null)
  const pollRef = useRef(null)
  const phaseRef = useRef('')

  const stopPoll = () => {
    clearInterval(pollRef.current)
    pollRef.current = null
  }

  useEffect(() => stopPoll, [])

  useEffect(() => {
    if (!job || jobError || finishing) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        // Job läuft serverseitig weiter – Modal darf zu (Short kommt trotzdem).
        onClose?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [job, jobError, finishing, onClose])

  const drivePhase = (status) => {
    if (status === phaseRef.current) return
    phaseRef.current = status
    if (status === 'schneidet') waitRef.current?.goTo('cut')
    else if (status === 'musik') waitRef.current?.goTo('music')
  }

  const poll = (id) => {
    stopPoll()
    pollRef.current = setInterval(async () => {
      try {
        const j = await apiAiJob(id)
        setJob(j)
        drivePhase(j.status)
        if (j.status === 'fertig') {
          stopPoll()
          waitRef.current?.finish()
          setFinishing(true)
          // Kurz "Fertig" zeigen, dann Short übernehmen.
          setTimeout(() => {
            onDone?.()
          }, 2500)
        } else if (j.status === 'fehler') {
          stopPoll()
          setJobError(j.message || 'Generierung fehlgeschlagen.')
        }
      } catch (e) {
        stopPoll()
        setJobError(e.message || 'Status-Abfrage fehlgeschlagen.')
      }
    }, 3000)
  }

  const commitTag = () => {
    const t = cleanTag(tagDraft)
    if (t && !tags.includes(t) && tags.length < 5) setTags((l) => [...l, t])
    setTagDraft('')
  }

  const onTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault()
      commitTag()
    } else if (e.key === 'Backspace' && !tagDraft && tags.length) {
      setTags((l) => l.slice(0, -1))
    }
  }

  const pickThumb = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setError('Das Thumbnail muss ein Bild sein.')
      return
    }
    if (thumb?.url?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(thumb.url)
      } catch {
        /* egal */
      }
    }
    setThumb({ url: URL.createObjectURL(f), file: f })
  }

  const generate = async (e) => {
    e.preventDefault()
    if (starting) return
    setError('')
    if (!title.trim()) return setError('Bitte einen Titel eingeben.')
    if (!prompt.trim()) return setError('Bitte einen Prompt eingeben.')
    setStarting(true)
    try {
      const created = await apiCreateAiVideo({
        title: title.trim(),
        tags,
        prompt: prompt.trim(),
        thumbFile: thumb?.file || null,
      })
      phaseRef.current = ''
      setJob(created)
      poll(created.id)
    } catch (err) {
      setError(/eingeloggt/i.test(err.message || '') ? 'Bitte zuerst einloggen.' : (err.message || 'Start fehlgeschlagen.'))
    } finally {
      setStarting(false)
    }
  }

  const retry = () => {
    stopPoll()
    setJob(null)
    setJobError('')
    setFinishing(false)
    phaseRef.current = ''
  }

  // ---- Warte-Ansicht (läuft) ----
  if (job && !jobError) {
    return (
      <>
        <div className="sheet-head">
          <strong className="sheet-title">KI-Video wird erstellt</strong>
          <button type="button" className="sheet-x" aria-label="Schließen (läuft weiter)" title="Schließen (läuft weiter)" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="sheet-body">
          <VideoGenWait ref={waitRef} />
          <p className="ai-status" role="status">
            <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />{' '}
            {finishing ? 'Fertig! Dein Video ist bereit.' : (job.message || 'Generierung läuft …')}
          </p>
          <p className="feed-hint">Das dauert ca. 4–6 Minuten. Du kannst das Fenster schließen – der Short landet automatisch in deiner Liste.</p>
        </div>
      </>
    )
  }

  // ---- Fehler-Ansicht ----
  if (jobError) {
    return (
      <>
        <div className="sheet-head"><strong className="sheet-title">KI-Video fehlgeschlagen</strong></div>
        <div className="sheet-body">
          <p className="formerror" role="alert">
            <i className="fa-solid fa-circle-exclamation" /> {jobError}
          </p>
        </div>
        <div className="sheet-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Schließen</button>
          <button type="button" className="btn btn-brand" onClick={retry}>
            <i className="fa-solid fa-rotate-right" /> Erneut versuchen
          </button>
        </div>
      </>
    )
  }

  // ---- Formular ----
  return (
    <form onSubmit={generate} noValidate>
      <div className="sheet-head">
        <strong className="sheet-title">AI Video</strong>
        <button type="button" className="sheet-x" aria-label="Schließen" onClick={onClose}>
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
      <div className="sheet-body">
        <label className="field nomargin">
          <span>Titel</span>
          <input
            type="text"
            placeholder="z. B. Nebel über dem Fjord"
            value={title}
            maxLength={100}
            autoComplete="off"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="field nomargin">
          <span>Hashtags</span>
          <div className="tagrow">
            <i className="fa-solid fa-hashtag tag-ic" aria-hidden="true" />
            {tags.map((t) => (
              <span className="tag-pill edit" key={t}>
                #{t}
                <button type="button" aria-label={`Tag ${t} entfernen`} onClick={() => setTags((l) => l.filter((x) => x !== t))}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </span>
            ))}
            {tags.length < 5 && (
              <input
                className="tag-input"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={onTagKey}
                onBlur={commitTag}
                placeholder={tags.length ? '' : '#gaming #clip …'}
                aria-label="Hashtag hinzufügen"
                maxLength={22}
              />
            )}
          </div>
        </div>
        <label className="field nomargin">
          <span>Prompt – dein Video-Wunsch</span>
          <textarea
            placeholder='z. B. "Ruhiges Herbstvideo mit Blättertanz und Klaviermusik"'
            value={prompt}
            rows={4}
            maxLength={500}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>
        <div className="create-label">Thumbnail (optional)</div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          aria-hidden="true"
          tabIndex={-1}
          onChange={pickThumb}
        />
        {thumb ? (
          <div className="pic-prev">
            <img src={thumb.url} alt="Gewähltes Thumbnail" />
            <span>Thumbnail gewählt.</span>
            <button type="button" className="comment-btn" onClick={() => setThumb(null)} aria-label="Thumbnail entfernen">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => fileRef.current?.click()}>
            <i className="fa-solid fa-upload" /> Thumbnail wählen (optional)
          </button>
        )}
        {error && (
          <p className="formerror nomargin" role="alert">
            <i className="fa-solid fa-circle-exclamation" /> {error}
          </p>
        )}
      </div>
      <div className="sheet-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
        <button type="submit" className="btn btn-brand" disabled={starting}>
          {starting
            ? <><i className="fa-solid fa-circle-notch fa-spin" /> Starten …</>
            : <><i className="fa-solid fa-wand-magic-sparkles" /> Generieren</>}
        </button>
      </div>
    </form>
  )
}
