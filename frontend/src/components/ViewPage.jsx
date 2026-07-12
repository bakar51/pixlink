import { useState, useEffect } from 'react';
import { apiUrl } from '../utils/api';

export default function ViewPage({ code }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchImage() {
      try {
        const res = await fetch(apiUrl(`/view/${code}`));
        if (res.status === 404) {
          setError('not_found');
        } else if (res.status === 410) {
          setError('expired');
        } else if (!res.ok) {
          throw new Error('Failed to load image');
        } else {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        setError('server_error');
      } finally {
        setLoading(false);
      }
    }
    fetchImage();
  }, [code]);

  if (loading) {
    return (
      <div className="view-page">
        <div className="view-card" style={{ padding: '3rem' }}>
          <p>Loading image...</p>
        </div>
      </div>
    );
  }

  if (error === 'not_found') {
    return (
      <div className="view-page">
        <div className="view-card">
          <h1>Link not found</h1>
          <p>
            No image was found at <code>/i/{code}</code>.
            The link may have been mistyped or was never created.
          </p>
        </div>
      </div>
    );
  }

  if (error === 'expired') {
    return (
      <div className="view-page">
        <div className="view-card">
          <h1>This link has expired</h1>
          <p>
            The image at <code>/i/{code}</code> was set to expire and is no longer available.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-page">
        <div className="view-card">
          <h1>Error loading image</h1>
          <p>There was a problem loading the image. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-page">
      <div className="view-image-container">
        <img 
          src={data.viewUrl} 
          alt={data.originalName || 'Shared image'} 
          className="view-image" 
        />
      </div>
    </div>
  );
}
