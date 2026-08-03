"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import styles from "./page.module.css";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <p className="eyebrow">Studio admin</p>
        <h1 className={styles.loginTitle}>Sign in</h1>
        <p className={styles.loginHint}>
          This area is for managing bookings. Clients never see it.
        </p>

        {state.error && (
          <div className="notice notice-error" role="alert">
            {state.error}
          </div>
        )}

        <form action={action} className={styles.loginForm}>
          <label className="field">
            <span className="label">Password</span>
            <input
              className="input"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>
          <button
            type="submit"
            className="btn btn-block"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
