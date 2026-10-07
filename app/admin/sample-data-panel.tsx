"use client";

import { useActionState, useState } from "react";
import {
  addSampleData,
  removeSampleData,
  type SampleDataState,
} from "./actions";
import styles from "./page.module.css";

/**
 * Loads a demo set so the admin can be shown to someone without waiting for
 * real bookings. Everything it writes sits on example.com, and removing it
 * only deletes rows carrying that domain.
 */
export function SampleDataPanel({ loaded }: { loaded: boolean }) {
  const [addState, add, adding] = useActionState<SampleDataState, FormData>(
    addSampleData,
    {},
  );
  const [removeState, remove, removing] = useActionState<
    SampleDataState,
    FormData
  >(removeSampleData, {});
  const [confirming, setConfirming] = useState(false);

  const state = addState.done || addState.error ? addState : removeState;

  return (
    <div className={styles.sample}>
      <div>
        <p className={styles.sampleTitle}>Sample data</p>
        <p className={styles.sampleBody}>
          Six made-up clients with past visits, upcoming appointments and
          signed forms, for showing someone how this works. They all use
          example.com addresses, so they stand out from real clients and
          removing them can&apos;t touch anybody real.
        </p>
      </div>

      {state.error && (
        <div className="notice notice-error" role="alert">
          {state.error}
        </div>
      )}
      {state.done && (
        <div className="notice notice-success" role="status">
          {state.done}
        </div>
      )}

      <div className={styles.sampleActions}>
        {!loaded && (
          <form action={add}>
            <input type="hidden" name="confirm" value="add" />
            <button type="submit" className="btn btn-sm" disabled={adding}>
              {adding ? "Adding…" : "Add Sample Data"}
            </button>
          </form>
        )}

        {loaded && !confirming && (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setConfirming(true)}
          >
            Remove Sample Data
          </button>
        )}

        {loaded && confirming && (
          <>
            <span className={styles.sampleBody}>
              Remove every sample client, their appointments and their forms?
            </span>
            <form action={remove}>
              <input type="hidden" name="confirm" value="remove" />
              <button
                type="submit"
                className="btn btn-danger-solid btn-sm"
                disabled={removing}
                onClick={() => setConfirming(false)}
              >
                {removing ? "Removing…" : "Yes, remove it"}
              </button>
            </form>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirming(false)}
            >
              Keep it
            </button>
          </>
        )}
      </div>
    </div>
  );
}
