import { Link } from 'react-router-dom'
import { renderMarkdown } from './markdown.js'

// Text (Markdown), #-Tags und Bilder eines Posts.
// Mit detailUrl verlinken Text und Bilder dorthin (Feed),
// ohne bleibt alles statisch (Detailansicht, dort größer).
export default function PostBody({ post, detailUrl, large }) {
  if (!post) return null
  const md = post.title ? (
    <div
      className="md posttext"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(post.text || '') }}
    />
  ) : null
  const textBlock = post.title && detailUrl ? (
    <Link to={detailUrl} className="post-textlink">{md}</Link>
  ) : (
    md
  )

  return (
    <>
      {textBlock}
      {!!post.tags?.length && (
        <div className="tagrow-show">
          {post.tags.map((t) => (
            <span key={t} className="tag-pill">#{t}</span>
          ))}
        </div>
      )}
      {!!post.images?.length && (
        <div className={`feed-imgs${large ? ' big' : ''}`}>
          {post.images.map((u) =>
            detailUrl ? (
              <Link key={u} to={detailUrl} aria-label="Post öffnen">
                <img src={u} alt="Angehängtes Bild" loading="lazy" />
              </Link>
            ) : (
              <img key={u} src={u} alt="Angehängtes Bild" />
            )
          )}
        </div>
      )}
    </>
  )
}
