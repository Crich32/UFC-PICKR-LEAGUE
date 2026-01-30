"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ================= TYPES ================= */

type Event = {
  id: string;
  name: string;
  is_locked: boolean;
};

type Fight = {
  id: string;
  fighter_red: string;
  fighter_blue: string;
  fight_order: number;
  events: Event[]; // ✅ REAL RELATION NAME
};

type FightPickMap = Record<string, Record<string, string[]>>;

/* ================= PAGE ================= */

export default function PicksPage() {
  const [user, setUser] = useState<any>(null);
  const [fights, setFights] = useState<Fight[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [allPicks, setAllPicks] = useState<FightPickMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPage() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        setLoading(false);
        return;
      }

      setUser(auth.user);

      /* ✅ FIXED QUERY */
      const { data: fightsData, error } = await supabase
        .from("fights")
        .select(`
          id,
          fighter_red,
          fighter_blue,
          fight_order,
          events (
            id,
            name,
            is_locked
          )
        `)
        .order("fight_order", { ascending: true });

      if (error) {
        console.error("Fights error:", error);
      }

      setFights(fightsData ?? []);

      const { data: picksData } = await supabase
        .from("picks")
        .select("fight_id, picked_fighter")
        .eq("user_id", auth.user.id);

      if (picksData) {
        const map: Record<string, string> = {};
        picksData.forEach((p: any) => (map[p.fight_id] = p.picked_fighter));
        setPicks(map);
      }

      const { data: allPicksData } = await supabase
        .from("picks")
        .select("fight_id, picked_fighter, profiles(username)");

      if (allPicksData) {
        const grouped: FightPickMap = {};
        allPicksData.forEach((pick: any) => {
          if (!grouped[pick.fight_id]) grouped[pick.fight_id] = {};
          if (!grouped[pick.fight_id][pick.picked_fighter]) {
            grouped[pick.fight_id][pick.picked_fighter] = [];
          }
          if (pick.profiles?.username) {
            grouped[pick.fight_id][pick.picked_fighter].push(
              pick.profiles.username
            );
          }
        });
        setAllPicks(grouped);
      }

      setLoading(false);
    }

    loadPage();
  }, []);

  if (loading) return <main style={{ padding: 40 }}>Loading…</main>;
  if (!user) return <main style={{ padding: 40 }}>Please sign in</main>;

  /* ================= GROUP BY EVENT ================= */

  const fightsByEvent = fights.reduce<
    Record<string, { event: Event; fights: Fight[] }>
  >((acc, fight) => {
    const event = fight.events?.[0];
    if (!event) return acc;

    if (!acc[event.name]) {
      acc[event.name] = { event, fights: [] };
    }

    acc[event.name].fights.push(fight);
    return acc;
  }, {});

  return (
    <main style={{ padding: 40 }}>
      <h1>Fight Card</h1>

      {Object.entries(fightsByEvent).map(([name, data]) => (
        <details
          key={name}
          open={!data.event.is_locked}
          style={{
            border: "2px solid #666",
            borderRadius: 8,
            marginBottom: 20,
            padding: 12,
          }}
        >
          <summary style={{ fontWeight: "bold", fontSize: 18 }}>
            {name}
          </summary>

          {data.fights.map((fight) => (
            <div key={fight.id} style={{ marginTop: 12 }}>
              <strong>{fight.fighter_red}</strong> vs{" "}
              <strong>{fight.fighter_blue}</strong>
            </div>
          ))}
        </details>
      ))}
    </main>
  );
}

