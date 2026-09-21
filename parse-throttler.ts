// "Fix: incremental parse throttle + encode once at stream end."
// A throttler for JSON parse: skip parsing if the previous chunk was parsed recently or wait until the end.
