declare module 'react-player' {
  import * as React from 'react';

  export interface YouTubeConfig {
    playerVars?: Record<string, unknown>;
  }

  export interface Config {
    youtube?: YouTubeConfig;
    vimeo?: Record<string, unknown>;
    file?: Record<string, unknown>;
    // adicione outras plataformas se necessário
  }

  export interface ReactPlayerProps {
    url: string | string[];
    playing?: boolean;
    controls?: boolean;
    width?: string | number;
    height?: string | number;
    config?: Config;
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    onError?: (error: unknown) => void; // agora existe
    onReady?: () => void;               // agora existe
  }

  const ReactPlayer: React.FC<ReactPlayerProps>;
  export default ReactPlayer;
}
