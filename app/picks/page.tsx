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
  event: Event[]; // 👈 MUST be singular + array
};

type PickMap = Record<string, string>;
type AllPicksMap = Record<string, Record<string, string[]>>;

/* ================= PAGE ================= */

export default function PicksPage() {
  const [user, setUser] = useState<any>(null);
  const [fights, setFights] = useState<Fight[]>([]);
  const [picks, setPicks] = useState<PickMap>({});
  const [allPicks, setAllPicks] = useState<AllPicksMap>({});
  const [loading, setLoading] = useState(true);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      /* ✅ FIGHTS + EVENT (CORRECT RELATION NAME) */
      const { data: fightsData, error } = await supabase
        .from("fights")
        .select(`
          id,
          fighter_red,
          fighter_blue,
          fight_order,
          event (
            id,
            name,
            is_locked
          )
        `)
        .order("fight_order", { ascending: true });

      if (error) {
        console.error("Fight load error:", error);
      }

      setFights((fightsData ?? []) as Fight[]);

      /* ✅ USER PICKS */
      const { data: userPicks } = await supabase
        .from("picks")
        .select("fight_id, picked_fighter")
        .eq("user_id", user.id);

      if (userPicks) {
        const map: PickMap = {};
        userPicks.forEach((p) => (map[p.fight_id] = p.picked_fighter));
        setPicks(map);
      }

      /* ✅ ALL PICKS */
      const { data: allPicksData } = await supabase
        .from("picks")
        .select("fight_id, picked_fighter, profiles(username)");

      if (allPicksData) {
        const grouped: AllPicksMap = {};

        allPicksData.forEach((p: any) => {
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

  /* ================= PICK HANDLER ================= */

  async function handlePick(fightId: string, fighter: string) {
    if (!user) return;

    setPicks((prev) => ({ ...prev, [fightId]: fighter }));

    await supabase.from("picks").upsert(
      {
        user_id: user.id,
        fight_id: fightId,
        picked_fighter: fighter,
      },
      { onConflict: "user_id,fight_id" }
    );
  }

  /* ================= STATES ================= */

  if (loading) return <main style={{ padding: 40 }}>Loading…</main>;
  if (!user) return <main style={{ padding: 40 }}>Please sign in</main>;

  /* ================= GROUP BY EVENT ================= */

  const fightsByEvent = fights.reduce<Record<string, Fight[]>>((acc, fight) => {
    const event = fight.event?.[0];
    const name = event?.name ?? "Unknown Event";

    if (!acc[name]) acc[name] = [];
    acc[name].push(fight);

    return acc;
  }, {});

  /* ================= UI ================= */

  return (
    <main style={{ padding: 40 }}>
      <h1>Fight Card</h1>

      {Object.entries(fightsByEvent).map(([eventName, eventFights]) => {
        const locked = eventFights[0]?.event?.[0]?.is_locked ?? false;

        return (
          <details key={eventName} open={!locked} style={{ marginBottom: 20 }}>
            <summary style={{ fontSize: 18, fontWeight: "bold" }}>
              {eventName} {locked && "🔒"}
            </summary>

            {eventFights.map((fight) => (
              <div key={fight.id} style={{ marginTop: 12 }}>
                <strong>
                  {fight.fighter_red} vs {fight.fighter_blue}
                </strong>

                <div>
                  <button
                    disabled={locked}
                    onClick={() =>
                      handlePick(fight.id, fight.fighter_red)
                    }
                  >
                    Pick {fight.fighter_red}
                  </button>

                  <button
                    disabled={locked}
                    onClick={() =>
                      handlePick(fight.id, fight.fighter_blue)
                    }
                  >
                    Pick {fight.fighter_blue}
                  </button>
                </div>
              </div>
            ))}
          </details>
        );
      })}
    </main>
  );
}
