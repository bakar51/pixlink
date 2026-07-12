/**
 * Generate a thumbnail from a file
 * @param {File} file - Original file
 * @param {number} maxWidth - Max width of the thumbnail
 * @param {number} maxHeight - Max height of the thumbnail
 * @returns {Promise<File>} - The generated thumbnail
 */
export async function generateThumbnail(file, maxWidth = 400, maxHeight = 400) {
  if (!file.type.startsWith('image/')) return null;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to WebP for better compression
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const thumbFile = new File([blob], 'thumb.webp', {
            type: 'image/webp',
          });
          resolve(thumbFile);
        },
        'image/webp',
        0.8 // quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.src = objectUrl;
  });
}
