import { useEffect, useRef, useState } from 'react'
import { mediaSrc } from '../lib/api.js'

const MAX_IMAGES = 2
const MAX_TAGS = 5

const cleanTag = (s) => s.replace(/^#+/, '').trim().slice(0, 20)

// Reddit-artiger Post-Editor (Demo, kein Backend):
// Community-Picker mit Suche, Titel, #-Tags, Markdown-Toolbar,
// Bilder (bis 2, auch per Strg+V), Abbrechen / Posten im Footer.
// onSubmit darf ein No-Op sein (Demo-Button ohne Funktion).
export default function PostEditor({
  communities = [],
  communityId,
  onCommunity,
  fixedCommunity = null,
  initialTitle = '',
  initialText = '',
  initialTags = [],
  initialImages = [],
  submitLabel = 'Posten',
  onSubmit,
  onCancel,
}) {
  // Demo-Communities haben id, echte aus der DB slug.
  const cidOf = (c) => c?.slug || c?.id
  const [commId, setCommId] = useState(
    () => communityId || cidOf(fixedCommunity) || cidOf(communities[0])
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState(initialTitle)
  const [text, setText] = useState(initialText)
  const [tags, setTags] = useState(initialTags)
  const [tagDraft, setTagDraft] = useState('')
  const [images, setImages] = useState(initialImages)
  const taRef = useRef(null)
  const imgRef = useRef(null)

  const comm = fixedCommunity
    || communities.find((c) => cidOf(c) === commId)
    || communities[0]

  const pick = (id) => {
    setCommId(id)
    onCommunity?.(id)
    setPickerOpen(false)
    setSearch('')
  }

  // Escape schließt nur den Picker (Sheet schließt die Seite)
  useEffect(() => {
    if (!pickerOpen) return
    const onKey = (e) => e.key === 'Escape' && setPickerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pickerOpen])

  // Markdown um die Auswahl legen (oder Platzhalter einfügen)
  const wrap = (before, after = '', placeholder = 'Text') => {
    const el = taRef.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value } = el
    const sel = value.slice(s, e) || placeholder
    const next = value.slice(0, s) + before + sel + after + value.slice(e)
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + before.length, s + before.length + sel.length)
    })
  }

  const prefixLines = (prefix, placeholder = 'Punkt') => {
    const el = taRef.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value } = el
    const sel = value.slice(s, e) || placeholder
    const lined = sel.split('\n').map((l) => `${prefix}${l}`).join('\n')
    const next = value.slice(0, s) + lined + value.slice(e)
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s, s + lined.length)
    })
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

  const addImages = (files) => {
    const imgs = [...files].filter((f) => f.type.startsWith('image/')).slice(0, MAX_IMAGES - images.length)
    if (!imgs.length) return
    setImages((l) => [...l, ...imgs.map((f) => URL.createObjectURL(f))])
  }

  const removeImage = (url) => {
    if (url.startsWith('blob:')) {
      try { URL.revokeObjectURL(url) } catch { /* egal */ }
    }
    setImages((l) => l.filter((u) => u !== url))
  }

  const onPaste = (e) => {
    const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'))
    if (files.length) {
      e.preventDefault()
      addImages(files)
    }
  }

  const q = search.trim().toLowerCase()
  const commList = q
    ? communities.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.desc || '').toLowerCase().includes(q)
      )
    : communities

  const avatarOf = (c, cls = 'comm-ic') => {
    const img = c.imageUrl ? mediaSrc(c.imageUrl) : (c.pic || null)
    return img ? (
      <img className={`${cls} as-img`} src={img} alt="" />
    ) : (
      <span className={cls} aria-hidden="true">
        <i className={`fa-solid ${c.icon || 'fa-users'} ${c.color || ''}`} />
      </span>
    )
  }

  const submit = () => {
    if (!title.trim()) return
    onSubmit?.({ title: title.trim(), text, tags, images, commId: comm?.id })
  }

  return (
    <>
      <div className="sheet-body">
        <div className="editor">
          {/* Community wählen oder fix anzeigen */}
          {fixedCommunity ? (
            <span className="chipbtn static" title="Community ist hier fest">
              {avatarOf(fixedCommunity, 'mini-ava')}
              t/{fixedCommunity.name}
            </span>
          ) : (
            <button type="button" className="chipbtn" onClick={() => setPickerOpen(true)}>
              {comm ? (
                <>{avatarOf(comm, 'mini-ava')} t/{comm.name}</>
              ) : (
                'Community auswählen'
              )}
              <i className="fa-solid fa-chevron-down caret" aria-hidden="true" />
            </button>
          )}

          {/* Titel */}
          <input
            className="editor-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel"
            aria-label="Titel"
            maxLength={120}
          />

          {/* #-Tags */}
          <div className="tagrow">
            <i className="fa-solid fa-tag tag-ic" aria-hidden="true" />
            {tags.map((t) => (
              <span className="tag-pill edit" key={t}>
                #{t}
                <button
                  type="button"
                  aria-label={`Tag ${t} entfernen`}
                  onClick={() => setTags((l) => l.filter((x) => x !== t))}
                >
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
                placeholder={tags.length ? '' : 'Kennzeichnungen hinzufügen'}
                aria-label="Kennzeichnung hinzufügen"
                maxLength={22}
              />
            )}
          </div>

          {/* Text mit Markdown + Bild-Paste */}
          <textarea
            ref={taRef}
            className="editor-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={onPaste}
            placeholder="Text (Markdown geht, Bilder per Strg+V, max. 2)"
            aria-label="Text"
            rows={5}
            maxLength={4000}
          />

          {/* Bilder-Vorschau */}
          {images.length > 0 && (
            <div className="img-previews">
              {images.map((u) => (
                <span className="img-prev" key={u}>
                  <img src={u} alt="Angehängtes Bild" />
                  <button type="button" aria-label="Bild entfernen" onClick={() => removeImage(u)}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                </span>
              ))}
              <span className="img-count">{images.length}/{MAX_IMAGES}</span>
            </div>
          )}

          {/* Markdown-Toolbar */}
          <div className="mtoolbar" role="toolbar" aria-label="Formatierung">
            <button type="button" className="tbtn" title="Fett" aria-label="Fett" onClick={() => wrap('**', '**')}>
              <i className="fa-solid fa-bold" />
            </button>
            <button type="button" className="tbtn" title="Kursiv" aria-label="Kursiv" onClick={() => wrap('*', '*')}>
              <i className="fa-solid fa-italic" />
            </button>
            <button type="button" className="tbtn" title="Durchgestrichen" aria-label="Durchgestrichen" onClick={() => wrap('~~', '~~')}>
              <i className="fa-solid fa-strikethrough" />
            </button>
            <button type="button" className="tbtn" title="Code" aria-label="Code" onClick={() => wrap('`', '`', 'Code')}>
              <i className="fa-solid fa-code" />
            </button>
            <button type="button" className="tbtn" title="Link" aria-label="Link" onClick={() => wrap('[', '](https://)', 'Text')}>
              <i className="fa-solid fa-link" />
            </button>
            <button type="button" className="tbtn" title="Liste" aria-label="Liste" onClick={() => prefixLines('- ')}>
              <i className="fa-solid fa-list-ul" />
            </button>
            <button type="button" className="tbtn" title="Zitat" aria-label="Zitat" onClick={() => prefixLines('> ', 'Zitat')}>
              <i className="fa-solid fa-quote-left" />
            </button>
            <span className="tool-spacer" />
            <button type="button" className="tbtn" title="Bild anhängen (max. 2)" aria-label="Bild anhängen" onClick={() => imgRef.current?.click()}>
              <i className="fa-regular fa-image" />
            </button>
            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              multiple
              className="file-hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(e) => { addImages(e.target.files); e.target.value = '' }}
            />
          </div>
        </div>
      </div>
      <div className="sheet-foot">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Abbrechen</button>
        <button type="button" className="btn btn-brand" disabled={!title.trim()} onClick={submit}>
          <i className="fa-solid fa-paper-plane" /> {submitLabel}
        </button>
      </div>

      {/* Community-Picker wie bei Reddit */}
      {pickerOpen && (
        <div className="picker-backdrop" onClick={() => setPickerOpen(false)}>
          <div
            className="sheet picker"
            role="dialog"
            aria-modal="true"
            aria-label="Community wählen"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-head picker-head">
              <strong className="sheet-title">Community wählen</strong>
              <button type="button" className="iconbtn sm" aria-label="Schließen" onClick={() => setPickerOpen(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="sheet-body">
              <label className="mini-search picker-search">
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suchen"
                  aria-label="Community suchen"
                  autoFocus
                />
              </label>
              <div className="picker-list">
                {commList.map((c) => (
                  <button
                    key={cidOf(c)}
                    type="button"
                    className={`picker-row${cidOf(c) === commId ? ' active' : ''}`}
                    onClick={() => pick(cidOf(c))}
                  >
                    {avatarOf(c)}
                    <span className="trend-main">
                      <strong>t/{c.name}</strong>
                      <small>{typeof c.members === 'number' ? `${c.members} Mitglieder · ` : (c.members ? `${c.members} · ` : '')}{(c.desc || '').slice(0, 80)}</small>
                    </span>
                    {cidOf(c) === commId && <i className="fa-solid fa-check ic-teal" aria-hidden="true" />}
                  </button>
                ))}
                {commList.length === 0 && (
                  <p className="feed-hint">Nichts gefunden – anders suchen.</p>
                )}
              </div>
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setPickerOpen(false)}>Abbrechen</button>
              <button type="button" className="btn btn-brand" onClick={() => setPickerOpen(false)}>Fertig</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
