/* "use client";

import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabaseClient'

export default function PlayerPage() {
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    const fetchQueue = async () => {
      const { data } = await supabase
        .from("queue")
        .select("*")
        .order("created_at", { ascending: true });
      setQueue(data || []);
    };

    fetchQueue();

    const channel = supabase
      .channel("queue-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, fetchQueue)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!queue.length) return;

    const videoId = new URL(queue[0].url).searchParams.get("v");
    if (!videoId) return;

    // Carregar script do YouTube API
    if (!document.getElementById("youtube-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    // Criar player quando API estiver pronta
    window.onYouTubeIframeAPIReady = () => {
      new YT.Player("player", {
        videoId,
        events: {
          onStateChange: async (event: YT.OnStateChangeEvent) => {
            if (event.data === YT.PlayerState.ENDED) {
              await supabase.from("queue").delete().eq("id", queue[0].id);
            }
          },
        },
      });
    };
  }, [queue]);

  return (
    <div className="p-4">
      <h1 className="text-xl mb-2">Player</h1>
      {queue[0] && <p>Agora tocando: {queue[0].url} — enviado por {queue[0].user_id}</p>}
      <div id="player"></div>
    </div>
  );
}*/
