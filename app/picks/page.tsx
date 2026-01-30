"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ---------------- TYPES ---------------- */

type Profile = {
  username: string;
};

type Pick = {
  picked_fighter: string;
  profiles: Profile[]; // Supabase returns arrays
};

type Fight = {
  id: string;
  fighter_red: string;
  fighter_blue: string;
  fight_order: number;
  fight_date: string;
  is_final: boolean;
  picks: Pick[];
};

type Event = {
  id: string;
  name: string;
  event_date: string;
  is_active: boolean;
  fights: Fight[];
};

type FightPickMap = Record<string, Record<string, string[]>>;

/* ---------------- PAGE ---------------- */

export default function PicksPage() {
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [allPicks, setAllPicks] = useState<FightPickMap>({});
  const [loading, setLoading] = useState(true);

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    async function loadPage() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      /* ✅ EVENTS → FIGHTS → PICKS */
      const { data: eventsData, error } = await supabase
        .from("events")
        .select(`
          id,
          name,
          event_date,
          is_active,
          fights (
            id,
            fighter_red,
            fighter_blue,
            fight_order,
            fight_date,
            is_final,
            picks (
              picked_fighter,
              profiles ( username )
            )
          )
        `)
        .order("event_date", { ascending: false })
        .order("fight_order", { foreignTable: "fights", ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setEvents(eventsData ?? []);

      /* ✅ USER PICKS */
      const { data: picksData } = await supabase
        .from("picks")
        .select("fight_id, picked_fighter")
        .eq("user_id", user.id);

      if (picksData) {
        const map: Record<string, string> = {};
        picksData.forEach((p) => {
          map[p.fight_id] = p.picked_fighter;
        });
        setPicks(map);
      }

      /* ✅ AGGREGATE ALL PICKS */
      const grouped: FightPickMap = {};

      eventsData?.forEach((event) => {
        event.fights.forEach((fight) => {
          fight.picks.forEach((pick) => {
            if (!grouped[fight.id]) grouped[fight.id] = {};
            if (!grouped[fight.id][pick.picked_fighter]) {
              grouped[fight.id][pick.picked_fighter] = [];
            }

            pick.profiles.forEach((profile) => {
              grouped[fight.id][pick.picked_fighter].push(profile.username);
            });
          });
        });
      });

      setAllPicks(grouped);
      setLoading(false);
    }

    loadPage();
  }, []);

  /* ---------------- PICK HANDLER ---------------- */

  async function handlePick(fightId: string, fighter: string) {
    if (!user) return;

    setPicks((prev) => ({
      ...prev,
      [fightId]: fighter,
    }));

    await supabase.from("picks").upsert(
      {
        user_id: user.id,
        fight_id: fightId,
        picked_fighter: fighter,
      },
      { onConflict: "user_id,fight_id" }
    );
  }

  /* ---------------- STATES ---------------- */

  if (loading) return <main style={{ padding: 40 }}>Loading…</main>;
  if (!user) return <main style={{ padding: 40 }}>Please sign in</main>;

  /* ---------------- UI ---------------- */

  return (
    <main style={{ padding: 40 }}>
      <h1>Fight Card</h1>

      {events.map((event) => (
        <details
          key={event.id}
          open={event.is_active}
          style={{
            border: "2px solid #666",
            borderRadius: 8,
            marginBottom: 20,
            padding: 12,
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: 18,
              listStyle: "none",
            }}
          >
            {event.name}
            {!event.is_active && (
              <span style={{ marginLeft: 10, color: "#aaa" }}>
                (Past Event)
              </span>
            )}
          </summary>

          <div style={{ marginTop: 12 }}>
            {event.fights.map((fight) => {
              const locked =
                fight.is_final ||
                new Date(fight.fight_date) <= new Date();

              return (
                <div
                  key={fight.id}
                  style={{
                    border: "1px solid #444",
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  <p>
                    <strong>{fight.fighter_red}</strong> vs{" "}
                    <strong>{fight.fighter_blue}</strong>
                  </p>

                  {/* RED */}
                  <button
                    onClick={() =>
                      handlePick(fight.id, fight.fighter_red)
                    }
                    disabled={locked}
                    style={{
                      marginRight: 10,
                      padding: "8px 12px",
                      background:
                        picks[fight.id] === fight.fighter_red
                          ? "green"
                          : "#222",
                      color: "white",
                      border: "none",
                      cursor: locked ? "not-allowed" : "pointer",
                      opacity: locked ? 0.5 : 1,
                    }}
                  >
                    Pick {fight.fighter_red}
                  </button>

                  {allPicks[fight.id]?.[fight.fighter_red]?.length > 0 && (
                    <div style={{ fontSize: 12, color: "#aaa" }}>
                      Picked by:{" "}
                      {allPicks[fight.id][fight.fighter_red].join(", ")}
                    </div>
                  )}

                  {/* BLUE */}
                  <button
                    onClick={() =>
                      handlePick(fight.id, fight.fighter_blue)
                    }
                    disabled={locked}
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      background:
                        picks[fight.id] === fight.fighter_blue
                          ? "green"
                          : "#222",
                      color: "white",
                      border: "none",
                      cursor: locked ? "not-allowed" : "pointer",
                      opacity: locked ? 0.5 : 1,
                    }}
                  >
                    Pick {fight.fighter_blue}
                  </button>

                  {allPicks[fight.id]?.[fight.fighter_blue]?.length > 0 && (
                    <div style={{ fontSize: 12, color: "#aaa" }}>
                      Picked by:{" "}
                      {allPicks[fight.id][fight.fighter_blue].join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </main>
  );
}

