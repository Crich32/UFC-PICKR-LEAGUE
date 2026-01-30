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
  event_id: string;
};

type FightWithEvent = Fight & {
  event: Event;
};

type PicksMap = Record<string, string>;
type AllPicksMap = Record<string, Record<string, string[]>>;

/* ================= PAGE ================= */

export default function PicksPage() {
  const [user, setUser] = useState<any>(null);
  const [fights, setFights] = useState<FightWithEvent[]>([]);
  const [picks, setPicks] = useState<PicksMap>({});
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

      /* ✅ LOAD EVENTS */
      const { data: events } = await supabase
        .from("events")
        .select("id, name, is_locked");

      if (!events) {
        setLoading(false);
        return;
      }

      const eventsMap = Object.fromEntries(
        events.map((e) => [e.id, e])
      );

      /* ✅ LOAD FIGHTS */
      const { data: fightsData } = await supabase
        .from("fights")
        .select("id, fighter_red, fighter_blue, fight_order, event_id")
        .order("fight_order", { ascending: true });

      if (!fightsData) {
        setLoading(false);
        return;
      }

      /* ✅ MANUAL JOIN */
      const merged: FightWithEvent[] = fightsData
        .filter((f) => eventsMap[f.event_id])
        .map((f) => ({
          ...f,
          event: eventsMap[f.event_id],
        }));

      setFights(merged);

      /* ✅ USER PICKS */
      const { data: userPicks } = await supabase
        .from("picks")
        .select("fight_id, picked_fighter")
        .eq("user_id", user.id);

      if (userPicks) {
        const map: PicksMap = {};
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

  const fightsByEvent = fights.reduce<Record<string, FightWithEvent[]>>(
    (acc, fight) => {
      const name = fight.event.name;
      if (!acc[name]) acc[name] = [];
      acc[name].push(fight);
      return acc;
    },
    {}
  );

  /* ================= UI ================= */

  return (
    <main style={{ padding: 40 }}>
      <h1>Fight Card</h1>

      {Object.entries(fightsByEvent).map(([eventName, eventFights]) => {
        const locked = eventFights[0].event.is_locked;

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

