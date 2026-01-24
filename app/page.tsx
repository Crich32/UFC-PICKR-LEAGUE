"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ------------------ PROFILE CREATION ------------------ */
async function ensureProfile(user: any) {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!data) {
    const defaultUsername = user.email.split("@")[0];
    await supabase.from("profiles").insert({
      id: user.id,
      username: defaultUsername,
    });
  }
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ------------------ AUTH LISTENER ------------------ */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await ensureProfile(currentUser);

          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", currentUser.id)
            .single();

          setUsername(profile?.username ?? null);
        } else {
          setUsername(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ------------------ LOGIN ------------------ */
  async function signIn() {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) alert(error.message);
  }

  /* ------------------ SIGN UP ------------------ */
  async function signUp() {
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) alert(error.message);
  }

  /* ------------------ PASSWORD RESET ------------------ */
  async function resetPassword() {
    if (!email) {
      alert("Please enter your email first.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Password reset email sent. Check your inbox.");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  /* ------------------ NOT LOGGED IN ------------------ */
  if (!user) {
    return (
      <main style={{ padding: 40, maxWidth: 420 }}>
        <h1>UFC Picks</h1>

        <p style={{ marginBottom: 20 }}>
          Log in or create an account to make picks and join the leaderboard.
        </p>

        <label style={{ display: "block", marginBottom: 6 }}>Email</label>
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: 10,
            marginBottom: 12,
            width: "100%",
            fontSize: 16,
          }}
        />

        <label style={{ display: "block", marginBottom: 6 }}>Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: 10,
            marginBottom: 20,
            width: "100%",
            fontSize: 16,
          }}
        />

        {/* PRIMARY LOGIN BUTTON */}
        <button
          onClick={signIn}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: 16,
            fontWeight: "bold",
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          Log In
        </button>

        {/* SIGN UP BUTTON */}
        <button
          onClick={signUp}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: 16,
            background: "#1f2937",
            color: "white",
            border: "1px solid #444",
            borderRadius: 6,
            cursor: "pointer",
            marginBottom: 16,
          }}
        >
          Create Account
        </button>

        {/* PASSWORD RESET */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={resetPassword}
            style={{
              background: "none",
              border: "none",
              color: "#4ea1ff",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Forgot your password?
          </button>
        </div>
      </main>
    );
  }

  /* ------------------ LOGGED IN ------------------ */
  return (
    <main style={{ padding: 40 }}>
      <h1>Welcome{username ? `, ${username}` : ""} 👊</h1>

      <p style={{ marginTop: 16 }}>
        👉 Go to the <strong>Picks</strong> tab to select fighters.
      </p>

      <button onClick={signOut} style={{ marginTop: 24 }}>
        Sign Out
      </button>
    </main>
  );
}

