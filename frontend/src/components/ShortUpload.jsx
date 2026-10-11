import { useEffect, useRef, useState } from 'react'
import { apiUploadShort } from '../lib/api.js'

const MAX_TAGS = 8
const MAX_DUR = 90 // 1:30 – länger geht nicht

const cleanTag = (s) => s.replace(/^#+/, '').trim().slice(0, 20)
const fmtSize = (b) => (b / 1048576 >= 1 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
const fmtDur = (s) => {
  if (!isFinite(s) || s < 0) return '–'
  const m = Math.floor(s / 60)
  const rest = Math.floor(s % 60)
  return `${m}:${String(rest).padStart(2, '0')}`
}

// Metadaten aus der Videodatei lesen (Dauer, Auflösung)
const probeVideo = (url) => new Promise((resolve) => {
  try {
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.preload = 'metadata'
    v.src = url
    const timer = setTimeout(() => resolve(null), 8000)
    v.addEventListener('loadedmetadata', () => {
      clearTimeout(timer)
      resolve({ dur: v.duration, w: v.videoWidth, h: v.videoHeight })
    })
    v.addEventListener('error', () => { clearTimeout(timer); resolve(null) })
  } catch {
    resolve(null)
  }
})

// Mittleren Frame als Thumbnail fischen (Demo, läuft lokal im Browser)
const captureMiddleFrame = (url, duration) => new Promise((resolve) => {
  try {
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    v.src = url
    const timer = setTimeout(() => { cleanup(); resolve('') }, 9000)
    const cleanup = () => { v.removeAttribute('src'); v.load() }
    v.addEventListener('loadedmetadata', () => {
      const at = Math.min(Math.max(((duration || v.duration) || 1) / 2, 0.1), Math.max((v.duration || 1) - 0.1, 0.1))
      try { v.currentTime = at } catch { clearTimeout(timer); cleanup(); resolve('') }
    })
    v.addEventListener('seeked', () => {
      try {
        const scale = Math.min(1, 480 / (v.videoWidth || 480))
        const c = document.createElement('canvas')
        c.width = Math.max(2, Math.round((v.videoWidth || 480) * scale))
        c.height = Math.max(2, Math.round((v.videoHeight || 848) * scale))
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
        clearTimeout(timer)
        cleanup()
        resolve(c.toDataURL('image/jpeg', 0.72))
      } catch {
        clearTimeout(timer)
        cleanup()
        resolve('')
      }
    })
    v.addEventListener('error', () => { clearTimeout(timer); cleanup(); resolve('') })
  } catch {
    resolve('')
  }
})

// Short-Upload als Wizard (echt, Backend auf Port 3001):
// Schritt 1 fragt nur nach dem Video (max. 1:30, 9:16-Vorschau wie bei YT Shorts) –
// erst danach kommt Schritt 2 (Titel, #Tags, Öffentlich/Privat, Kommentare
// an/aus, Thumbnail: custom oder automatisch mittlerer Frame).
// onDone bekommt den echten Short vom Server für die Studio-Liste.
export default function ShortUpload({ onDone, onCancel }) {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [fileUrl, setFileUrl] = useState('')
  const [meta, setMeta] = useState(null) // { dur, w, h }
  const [fileError, setFileError] = useState('')
  const [autoThumb, setAutoThumb] = useState('')
  const [dragging, setDragging] = useState(false)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState([])
  const [tagDraft, setTagDraft] = useState('')
  const [visibility, setVisibility] = useState('Öffentlich')
  const [commentsOn, setCommentsOn] = useState(true)
  const [thumb, setThumb] = useState('')
  const [thumbFile, setThumbFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)
  const thumbRef = useRef(null)

  useEffect(() => () => {
    if (fileUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(fileUrl) } catch { /* egal */ }
    }
  }, [fileUrl])

  const clearFile = () => {
    if (fileUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(fileUrl) } catch { /* egal */ }
    }
    setFile(null)
    setFileUrl('')
    setMeta(null)
    setAutoThumb('')
    setFileError('')
  }

  const takeFile = async (files) => {
    const f = [...(files || [])].find((x) => x.type.startsWith('video/'))
    if (!f) return
    clearFile()
    const url = URL.createObjectURL(f)
    setFile(f)
    setFileUrl(url)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
    const info = await probeVideo(url)
    if (!info || !isFinite(info.dur)) {
      setFileError('Video konnte nicht gelesen werden – andere Datei wählen.')
      return
    }
    if (info.dur > MAX_DUR) {
      clearFile()
      setFileError(`Zu lang (${fmtDur(info.dur)}) – Shorts dürfen höchstens 1:30 sein.`)
      return
    }
    setMeta(info)
    setFileError('')
    captureMiddleFrame(url, info.dur).then((u) => u && setAutoThumb(u))
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
    setThumbFile(f)
    setThumb(URL.createObjectURL(f))
  }

  const clearThumb = () => {
    if (thumb.startsWith('blob:')) {
      try { URL.revokeObjectURL(thumb) } catch { /* egal */ }
    }
    setThumbFile(null)
    setThumb('')
  }

  const shownThumb = thumb || autoThumb

  // dataURL (Auto-Thumb) -> File, damit es als Multipart-Teil mit kann
  const dataUrlToFile = async (dataUrl, name) => {
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      if (!blob.size) return null
      return new File([blob], name, { type: blob.type || 'image/jpeg' })
    } catch {
      return null
    }
  }

  const upload = async () => {
    if (!file || !title.trim() || uploading) return
    setUploading(true)
    setProgress(0)
    setUploadError('')
    try {
      const sendThumb = thumbFile || (autoThumb ? await dataUrlToFile(autoThumb, 'thumb.jpg') : null)
      const short = await apiUploadShort({
        file,
        thumbFile: sendThumb,
        title: title.trim(),
        tags,
        visibility,
        commentsOff: !commentsOn,
        onProgress: (p) => setProgress(Math.round(p * 100)),
      })
      onDone?.(short)
    } catch (e) {
      setUploadError(e.message || 'Upload fehlgeschlagen.')
      setUploading(false)
    }
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
              <small>MP4, MOV, max. 1:30 – wird als Short verarbeitet (HD / 60fps)</small>
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
            {fileError && (
              <p className="formerror" role="alert">
                <i className="fa-solid fa-circle-exclamation" /> {fileError}
              </p>
            )}
            {file && (
              <div className="file-row">
                <i className="fa-solid fa-file-video ic-violet" aria-hidden="true" />
                <span className="file-meta">
                  <strong>{file.name}</strong>
                  <small>{fmtSize(file.size)}{meta ? ` · ${fmtDur(meta.dur)} · ${meta.w}×${meta.h}` : ''}</small>
                </span>
                <button
                  type="button"
                  className="iconbtn sm"
                  aria-label="Video entfernen"
                  onClick={clearFile}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            )}
            {fileUrl && (
              <div className="wiz-center">
                {/* 9:16-Vorschau wie bei YT Shorts */}
                <video className="wiz-video" src={fileUrl} controls playsInline preload="metadata" />
                <p className="spec-row">
                  <i className="fa-solid fa-mobile-screen" /> 9:16 Short-Format · Ziel: HD / 60fps (automatisch)
                </p>
              </div>
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
                  {shownThumb ? <img src={shownThumb} alt="" /> : <i className="fa-regular fa-image" />}
                </span>
                <span className="thumb-meta">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => thumbRef.current?.click()}>
                    <i className="fa-solid fa-upload" /> {thumb ? 'Anderes wählen' : 'Bild wählen'}
                  </button>
                  {thumb ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={clearThumb}>
                      <i className="fa-solid fa-rotate-left" /> Auto (mittlerer Frame)
                    </button>
                  ) : (
                    <small>Leer lassen = mittlerer Frame automatisch</small>
                  )}
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
            <button type="button" className="btn btn-brand" disabled={!file || !meta} onClick={() => setStep(2)}>
              Weiter <i className="fa-solid fa-arrow-right" />
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ghost" disabled={uploading} onClick={() => setStep(1)}>
              <i className="fa-solid fa-arrow-left" /> Zurück
            </button>
            <button type="button" className="btn btn-brand" disabled={!title.trim() || uploading} onClick={upload}>
              {uploading
                ? <><i className="fa-solid fa-circle-notch fa-spin" /> {progress} %</>
                : <><i className="fa-solid fa-cloud-arrow-up" /> Upload</>}
            </button>
          </>
        )}
      </div>
      {uploading && (
        <div className="upload-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      {uploadError && (
        <p className="formerror sheet-error" role="alert">
          <i className="fa-solid fa-circle-exclamation" /> {uploadError}
        </p>
      )}
    </>
  )
}
