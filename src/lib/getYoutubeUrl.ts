import yts from 'yt-search';

export async function getYoutubeUrl(trackName: string, artistName: string): Promise<{ url: string, thumbnail: string }> {
  const searchTerm = `${trackName} ${artistName}`;
  const r = await yts(searchTerm);
  const video = r.videos[0];
  if (!video) throw new Error('Não foi possível encontrar vídeo no YouTube');
  return { url: video.url, thumbnail: video.thumbnail };
}
