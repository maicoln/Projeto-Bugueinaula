/*"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { QueueItem, User } from "../lib/types";

export default function HomePage() {
  const [link, setLink] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user as User | null);

      const { data: queueData } = await supabase
        .from<QueueItem>("queue")
        .select("*")
        .order("created_at", { ascending: true });
      setQueue(queueData || []);
    };

    init();

    const channel = supabase
      .channel("queue-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, async () => {
        const { data } = await supabase
          .from<QueueItem>("queue")
          .select("*")
          .order("created_at", { ascending: true });
        setQueue(data || []);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const login = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  const addSong = async () => {
    setError("");
    if (!user) return setError("Você precisa estar logado.");

    const { data: recent } = await supabase
      .from<QueueItem>("queue")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (recent && recent.length > 0) {
      const last = new Date(recent[0].created_at);
      const diff = (Date.now() - last.getTime()) / 1000 / 60;
      if (diff < 10) return setError(`Você só pode enviar outra música em ${Math.ceil(10 - diff)} min`);
    }

    await supabase.from<QueueItem>("queue").insert({ url: link, user_id: user.id });
    setLink("");
  };

  return (
    <div className="p-4">
      {!user ? (
        <button onClick={login} className="bg-blue-500 text-white px-4 py-2 rounded">
          Entrar com Google
        </button>
      ) : (
        <>
          <h1 className="text-xl mb-2">Adicionar música</h1>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Cole o link do YouTube"
            className="border px-2 py-1 mr-2"
          />
          <button onClick={addSong} className="bg-green-500 text-white px-4 py-1 rounded">
            Adicionar
          </button>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </>
      )}

      <h2 className="text-lg mt-4">Fila:</h2>
      <ul>
        {queue.map((q) => (
          <li key={q.id}>
            {q.url} — enviado por {q.user_id}
          </li>
        ))}
      </ul>
    </div>
  );
}
*/