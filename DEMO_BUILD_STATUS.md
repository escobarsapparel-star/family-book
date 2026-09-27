# Family Book Guest Demo build

Branch: `guest-demo-replica`

The demo now boots the production Family Book stylesheet/component stack and loads `js/demo-mode.js` before `js/app.js`. Demo data is fictional and the demo does not load Supabase configuration/auth.

Next QA: verify which production data modules assume Supabase globals, then shim/disable those modules as required before merging `/demo` to main.
