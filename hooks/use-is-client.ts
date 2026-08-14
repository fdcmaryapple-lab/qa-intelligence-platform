import { useSyncExternalStore } from "react";

// A store that never changes and never needs to notify subscribers — we're
// not tracking a real external value, just asking React "is this the
// server render/hydration pass, or a real client render?" React answers
// that question itself by comparing getServerSnapshot (used during SSR and
// the hydration pass) against getSnapshot (used on every render after).
//
// This replaces the common `useState(false) + useEffect(() => setState(true))`
// pattern for the same purpose. That pattern calls setState synchronously
// inside an effect body, which is flagged by the react-hooks/set-state-in-effect
// rule (it causes an extra, avoidable render pass). useSyncExternalStore
// achieves the identical result — false during SSR/hydration, true after —
// without an effect or a setState call at all.
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/** True once the component has hydrated on the client; false during SSR and the hydration pass. */
export function useIsClient() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
