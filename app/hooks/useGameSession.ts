import { useState, useEffect, useCallback, useRef } from "react";
import { ROOM_STATE_VERSION, type Room, type Session, NETWORK_POLL_MS } from "@/lib/game-types";

type ApiResult = { room?: Room; notice?: string; error?: string; session?: Session; latency?: number };

async function readApiResult(response: Response): Promise<ApiResult> {
  const data = (await response.json()) as ApiResult;
  if (!response.ok) throw new Error(data.error || "Trail request failed");
  return data;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Trail request failed";
}

function assertCompatibleRoom(room: Room) {
  if (room.stateVersion !== ROOM_STATE_VERSION) {
    throw new Error("This trail room needs a refresh before it can be safely synchronized");
  }
  return room;
}

export function useGameSession() {
  const [state, setState] = useState<Room | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [connState, setConnState] = useState("disconnected");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const sessionRef = useRef<Session | null>(null);

  const action = useCallback(async (type: string, payload?: unknown) => {
    if (!sessionRef.current) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/trails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          payload,
          session: sessionRef.current
        }),
      });
      const data = await readApiResult(res);
      if (data.room) setState(assertCompatibleRoom(data.room));
      if (data.notice) setNotice(data.notice);
      if (data.error) setError(data.error);
      return data;
    } catch (error: unknown) {
      setError(messageOf(error));
      throw error;
    } finally {
      setBusy(false);
    }
  }, []);

  const enter = async (mode: "create" | "join", payload: { name: string; code: string; avatar: number }) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/trails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode === "create" ? "create" : "join",
          payload,
        }),
      });
      const { session, room } = await readApiResult(res);
      if (!session || !room) throw new Error("Trail room response was incomplete");
      sessionRef.current = session;
      setSession(session);
      localStorage.setItem("tandem-session", JSON.stringify(session));
      setState(assertCompatibleRoom(room));
    } catch (error: unknown) {
      setError(messageOf(error));
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    try {
      await fetch(`/api/trails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "leave",
          session: sessionRef.current,
        }),
      });
      sessionRef.current = null;
      setSession(null);
      localStorage.removeItem("tandem-session");
      setState(null);
    } catch (error: unknown) {
      setError(messageOf(error));
      throw error;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const poll = async () => {
      if (!sessionRef.current) return;
      const startedAt = performance.now();
      try {
        const res = await fetch(`/api/trails`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "poll",
            session: sessionRef.current,
          }),
        });
        const { room } = await readApiResult(res);
        if (!room) throw new Error("Trail room response was incomplete");
        setState(assertCompatibleRoom(room));
        setLatencyMs(Math.round(performance.now() - startedAt));
        setConnState("connected");
      } catch {
        setConnState("reconnecting");
      }
    };
    const timer = setInterval(poll, NETWORK_POLL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedSession = localStorage.getItem("tandem-session");
    if (savedSession) {
      sessionRef.current = JSON.parse(savedSession);
      setSession(sessionRef.current);
      void action("poll");
    }
  }, [action]);

  return {
    state,
    setState,
    busy,
    error,
    setError,
    notice,
    setNotice,
    connState,
    latencyMs,
    session,
    action,
    enter,
    leave
  };
}
