"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ---------------- TYPES ---------------- */

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
  events: Event[]; // ✅ RELATION NAME
};

type PickMap = Record<string, string>;
type AllPicksMap = Record<string, Record<string, string[]>>;

/* ---------------- PAGE ---------------- */

export default function PicksPage() {
  const [user, setUser] = useState<any>(null);
  const [fights, setFights] = useState<Fight[]>([]);
  const [picks, setPicks] = useState<PickMap>({});
  const [allPicks, setAllPicks] = useState<AllPicksMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        setLoading(false);
        return;
      }
      setUser(auth.user);

      /* ✅ THIS QUERY NOW MATCHES YOUR DB */
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
        console.error("Fight load error:", error);
      }

      setFights(fightsData ?? []);

      /* USER PICKS */
      const { data: userPicks } = await supabase
        .from("picks")
        .select("fight_id, picked_fighter")
        .eq("user_id", auth.user.id);

      if (userPicks) {
        const map: PickMap = {};
        userPicks.forEach(p => (map[p.fight_id] = p.picked_fighter));
        setPicks(map);
      }

      /* ALL PICKS */
      const { data: all } = await supabase
        .from("picks")
        .select("fight_id, picked_fighter, profiles(username)");

      if (all) {
        const grouped: AllPicksMap = {};
        all.forEach((p: any) => {
          if (!grouped[p.fight_id]) grouped[p.fight_id] = {};
          if (!grouped[p.fight_id][p.picked_fighter]) {
            grouped[p.fight_id][p.picked_fighter] = [];
          }
          if (p.profiles?.username) {
            grouped[p.fight_id][p.picked_fighter].push(p.profiles.username);
          }
        });
        setAllPicks(grouped);
      }

      setLoading(false);
    }

    load();
  }, []);

  async function handlePick(fightId: string, fighter: string) {
    if (!user) return;

    setPicks(prev => ({ ...prev, [fightId]: fighter }));

    await supabase.from("picks").upsert(
      {
        user_id: user.id,
        fight_id: fightId,
        picked_fighter: fighter,
      },
      { onConflict: "user_id,fight_id" }
    );
  }

  if (loading) return <main style={{ padding: 40 }}>Loading…</main>;
  if (!user) return <main style={{ padding: 40 }}>Please sign in</main>;

  /* GROUP BY EVENT */
  const fightsByEvent = fights.reduce<
    Record<string, { event: Event; fights: Fight[] }>
  >((acc, fight) => {
    const event = fight.events?.[0];
    if (!event) return acc;

    if (!acc[event.id]) {
      acc[event.id] = { event, fights: [] };
    }

    acc[event.id].fights.push(fight);
    return acc;
  }, {});

  return (
    <main style={{ padding: 40 }}>
      <h1>Fight Card</h1>

      {Object.values(fightsByEvent).map(({ event, fights }) => (
        <details
          key={event.id}
          open={!event.is_locked}
          style={{
            border: "2px solid #555",
            borderRadius: 8,
            marginBottom: 20,
            padding: 12,
          }}
        >
          <summary style={{ fontWeight: "bold", fontSize: 18 }}>
            {event.name}
          </summary>

          {fights.map(fight => (
            <div key={fight.id} style={{ marginTop: 12 }}>
              <strong>
                {fight.fighter_red} vs {fight.fighter_blue}
              </strong>

              <div>
                <button
                  disabled={event.is_locked}
                  onClick={() => handlePick(fight.id, fight.fighter_red)}
                >
                  Pick {fight.fighter_red}
                </button>

                <button
                  disabled={event.is_locked}
                  onClick={() => handlePick(fight.id, fight.fighter_blue)}
                >
                  Pick {fight.fighter_blue}
                </button>
              </div>
            </div>
          ))}
        </details>
      ))}
    </main>
  );
}

