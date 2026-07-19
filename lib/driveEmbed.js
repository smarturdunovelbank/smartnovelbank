export function getDriveId(url) {
  if (!url || typeof url !== 'string') return null;
  
  // Pattern 1: /file/d/ID/...
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];
  
  // Pattern 2: ?id=ID or &id=ID
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];
  
  return null;
}

export function getDriveEmbedUrl(url) {
  const id = getDriveId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

export function getDriveDownloadUrl(url) {
  if (!url || typeof url !== 'string') return "#";
  const id = getDriveId(url);
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : url;
}
