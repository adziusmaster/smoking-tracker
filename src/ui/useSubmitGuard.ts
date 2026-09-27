import { useCallback, useRef, useState } from 'react';

/**
 * Double-tap-safe async submit. The ref is the correctness guard: it is checked and set
 * synchronously before any await, so two taps in the same tick cannot both run the task (two
 * slip rows would restart the fast clocks twice and charge savings twice). `submitting` only
 * drives the disabled styling and may lag a render behind the ref.
 */
export function useSubmitGuard(): { submitting: boolean; run: (task: () => Promise<void>) => Promise<void> } {
  const busy = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const run = useCallback(async (task: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    try {
      await task();
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }, []);

  return { submitting, run };
}
