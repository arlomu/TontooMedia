import { useEffect, useRef, useState } from 'react'

const MAX_TAGS = 8

const cleanTag = (s) => s.replace(/^#+/, '').trim().slice(0, 20)
const fmtSize = (b) => (b / 1048576 >= 1 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

// Short-Upload als Wizard (Demo, kein Backend):
// Schritt 1 fragt nur nach dem Video – erst danach kommt Schritt 2
// (Titel, #Tags, Öffentlich/Privat, Kommentare an/aus, optionales Thumbnail).
// onDone bekommt die Daten für die Studio-Liste.
export default function ShortUpload({ onDone, onCancel }) {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [fileUrl, setFileUrl] = useState('')
  const [dragging, setDragging] = useState(false)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState([])
  const [tagDraft, setTagDraft] = useState('')
  const [visibility, setVisibility] = useState('Öffentlich')
  const [commentsOn, setCommentsOn] = useState(true)
  const [thumb, setThumb] = useState('')
  const fileRef = useRef(null)
  const thumbRef = useRef(null)

  useEffect(() => () => {
    if (fileUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(fileUrl) } catch { /* egal */ }
    }
  }, [fileUrl])

  const takeFile = (files) => {
    const f = [...(files || [])].find((x) => x.type.startsWith('video/'))
    if (!f) return
    if (fileUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(fileUrl) } catch { /* egal */ }
    }
    setFile(f)
    setFileUrl(URL.createObjectURL(f))
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  const commitTag = () => {
    const t = cleanTag(tagDraft)
    if (t && !tags.includes(t) && tags.length < MAX_TAGS) setTags((l) => [...l, t])
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

  const takeThumb = (files) => {
    const f = [...(files || [])].find((x) => x.type.startsWith('image/'))
    if (!f) return
    if (thumb.startsWith('blob:')) {
      try { URL.revokeObjectURL(thumb) } catch { /* egal */ }
    }
    setThumb(URL.createObjectURL(f))
  }

  const upload = () => {
    if (!file || !title.trim()) return
    onDone?.({
      title: title.trim(),
      tags,
      visibility,
      commentsOff: !commentsOn,
      thumb,
      dur: '–',
    })
  }

  return (
    <>
      <div className="sheet-body">
        {/* Schritte */}
        <div className="steps" aria-hidden="true">
          <span className={`step${step > 1 ? ' done' : step === 1 ? ' active' : ''}`}>
            <span className="n">{step > 1 ? <i className="fa-solid fa-check" /> : '1'}</span> Video
          </span>
          <span className={`step${step === 2 ? ' active' : ''}`}>
            <span className="n">2</span> Details
          </span>
        </div>

        {step === 1 && (
          <div className="post-form">
            <button
              type="button"
              className={`videopick${dragging ? ' dragging' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); takeFile(e.dataTransfer.files) }}
            >
              <i className="fa-solid fa-cloud-arrow-up dropic ic-teal" />
              <strong>Video hierher ziehen oder klicken</strong>
              <small>MP4, MOV – nur Demo, nichts wird hochgeladen</small>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="file-hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(e) => { takeFile(e.target.files); e.target.value = '' }}
            />
            {file && (
              <div className="file-row">
                <i className="fa-solid fa-file-video ic-violet" aria-hidden="true" />
                <span className="file-meta">
                  <strong>{file.name}</strong>
                  <small>{fmtSize(file.size)}</small>
                </span>
                <button
                  type="button"
                  className="iconbtn sm"
                  aria-label="Video entfernen"
                  onClick={() => { setFile(null); setFileUrl('') }}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            )}
            {fileUrl && (
              <video className="wiz-video" src={fileUrl} controls playsInline preload="metadata" />
            )}
          </div>
        )}

        {step === 2 && (
          <div className="post-form">
            <label className="field"><span>Titel</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Wie heißt dein Short?"
                aria-label="Titel"
                autoFocus
              />
            </label>
            <div className="field"><span>Hashtags</span>
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
                {tags.length < MAX_TAGS && (
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
            <div className="field"><span>Typ</span>
              <div className="toolbar" role="radiogroup" aria-label="Sichtbarkeit">
                {['Öffentlich', 'Privat'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={visibility === v}
                    className={`toolbtn${visibility === v ? ' active' : ''}`}
                    onClick={() => setVisibility(v)}
                  >
                    <i className={`fa-solid ${v === 'Öffentlich' ? 'fa-earth-europe' : 'fa-lock'}`} /> {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="switch-row">
              <span>Kommentare<small>Zuschauer dürfen kommentieren (Standard an)</small></span>
              <button
                type="button"
                role="switch"
                aria-checked={commentsOn}
                aria-label="Kommentare"
                className={`switch${commentsOn ? ' on' : ''}`}
                onClick={() => setCommentsOn((v) => !v)}
              />
            </div>
            <div className="field"><span>Thumbnail (optional)</span>
              <div className="thumb-pick">
                <span className="thumb-frame" aria-hidden="true">
                  {thumb ? <img src={thumb} alt="" /> : <i className="fa-regular fa-image" />}
                </span>
                <span className="thumb-meta">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => thumbRef.current?.click()}>
                    <i className="fa-solid fa-upload" /> {thumb ? 'Anderes wählen' : 'Bild wählen'}
                  </button>
                  <small>Leer lassen = automatisch (später, wenn Logik da)</small>
                </span>
                <input
                  ref={thumbRef}
                  type="file"
                  accept="image/*"
                  className="file-hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={(e) => { takeThumb(e.target.files); e.target.value = '' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="sheet-foot">
        {step === 1 ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Abbrechen</button>
            <button type="button" className="btn btn-brand" disabled={!file} onClick={() => setStep(2)}>
              Weiter <i className="fa-solid fa-arrow-right" />
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
              <i className="fa-solid fa-arrow-left" /> Zurück
            </button>
            <button type="button" className="btn btn-brand" disabled={!title.trim()} onClick={upload}>
              <i className="fa-solid fa-cloud-arrow-up" /> Upload
            </button>
          </>
        )}
      </div>
    </>
  )
}
