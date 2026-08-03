# EOS Mobile App

React Native app built with **Expo + Expo Router**. This is a starter skeleton — folders and
placeholder screens for every planned page so multiple interns can build in parallel without
stepping on each other.

## Getting started

```bash
npm install
npx expo start
```

## Structure

```
app/                      # Expo Router routes ONLY - one thin file per screen, no logic here
  (auth)/login.tsx
  (tabs)/
    _layout.tsx            # bottom tab bar: Home, ERP, Amenity, Academics, My Bus
    home/                  # media team posts + comments
    erp/<role>/            # one folder per RBAC role
    amenity/{craveo,stationary}/
    academics/{timetable,lesson-plan,lms,placements/{drives,history}}/
    bus-tracking/

src/
  features/                # actual screen implementations, mirrors app/ 1:1
    auth/ home/ erp/<role>/ amenity/<module>/ academics/<module>/ bus-tracking/
  components/ui/           # shared buttons, cards, inputs, etc.
  components/layout/       # shared header, tab bar icons, empty/error states
  context/                 # AuthContext, etc.
  store/                   # zustand slices
  services/api/            # one file per backend module, thin axios wrappers
  navigation/rbac/         # role -> visible tabs/pages mapping
  hooks/ theme/ constants/ types/ utils/
```

Routes in `app/` should stay thin — they just import and render a component from
`src/features/...`. Put the actual UI, state, and API calls in `src/features/`. This keeps
routing centralized while each intern's real work lives in an isolated feature folder.

## Working in parallel

- **ERP**: each role (`student`, `parent`, `employee`, `admin`, `iqac`, `warden`, `hod`, `coe`,
  `placement`, `billing`, `hr-payroll`, `media-room`) has its own folder under
  `app/(tabs)/erp/<role>/` and `src/features/erp/<role>/` — pick a role, build inside it.
  **Only build read/view pages here.** Anything with complex operations (approvals, bulk edits,
  configuration) is web-app-only — don't port those screens to mobile.
- **Amenity**: `craveo` and `stationary` are already built as standalone modules elsewhere —
  drop their existing screens/components into `src/features/amenity/<module>/` and wire the
  route file in `app/(tabs)/amenity/<module>/index.tsx` to render them.
- **Academics**: split into Academics (`timetable`, `lesson-plan`, `lms`) and Placements
  (`drives`, `history`) — both under the same "Academics" tab.
- **Home**: media team post feed + comments (`src/features/home/`).
- **My Bus**: live bus location on the student's mapped route (`src/features/bus-tracking/`).

Shared pieces (auth, theme, API client, RBAC tab visibility) live in `src/` outside `features/`
— coordinate before changing those, everyone depends on them.
