import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { formatBytes } from '../utils/compress';

export default function Gallery() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/user/uploads');
      setUploads(data);
    } catch (err) {
      setError('Failed to load your uploads. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8 text-muted">Loading your gallery...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  if (uploads.length === 0) {
    return (
      <div className="text-center p-8 text-muted border border-dashed border-gray-700 rounded-lg mt-8">
        No uploads yet. Upload an image to see it here!
      </div>
    );
  }

  return (
    <div className="gallery-container mt-8">
      <h2 className="text-xl font-bold mb-4">My Uploads</h2>
      <div className="gallery-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: '1rem' 
      }}>
        {uploads.map(item => (
          <a 
            key={item.code} 
            href={item.shortUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="gallery-item"
            style={{
              display: 'block',
              background: 'var(--color-bg-elevated)',
              borderRadius: '8px',
              overflow: 'hidden',
              textDecoration: 'none',
              color: 'inherit',
              border: '1px solid var(--color-border)',
              transition: 'transform 0.2s',
            }}
          >
            <div style={{ aspectRatio: '1', width: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={item.thumbUrl || item.viewUrl} 
                alt={item.originalName} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
            </div>
            <div style={{ padding: '0.75rem' }}>
              <div style={{ fontWeight: '500', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.originalName}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {formatBytes(item.size)} &middot; {new Date(item.uploadedAt).toLocaleDateString()}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
