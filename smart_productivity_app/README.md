
# Smart Productivity App 📋

> Collaborative task lists with **instant sharing via 6-character code** — no email or account needed.

---

## Why This App?

Most todo apps require email invitations to share lists.  
This app uses a **6-character code** instead:

```
User A creates list → gets code "AB3X7K"
         ↓
  Shares code on WhatsApp
         ↓
User B enters "AB3X7K" → instantly joins
         ↓
  Both see real-time updates
```

No email. No account. No friction.

---

## Features

- Create & manage task lists
- Share lists via 6-char code (WhatsApp-friendly)
- Real-time sync across all members
- Task progress bar
- Swipe to delete tasks
- Dark mode support
- Arabic & English UI
- Habits tracker (coming soon)
- Goals tracker (coming soon)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Flutter 3 |
| Language | Dart |
| State Management | Riverpod 2 |
| Database | Cloud Firestore |
| Auth | Firebase Anonymous Auth |
| Navigation | go_router |
| Architecture | Feature-first Clean Architecture |

---

## Project Structure

```
lib/
├── main.dart
├── app/
│   ├── router.dart       # go_router navigation
│   └── theme.dart        # Material 3 theme
├── core/
│   └── providers.dart    # Global providers
└── features/
    ├── auth/             # Anonymous authentication
    ├── lists/            # Lists CRUD + share code generation
    ├── tasks/            # Task management
    ├── sharing/          # Join by code screen
    ├── habits/           # Coming soon
    └── goals/            # Coming soon
```

---

## Setup & Run

```bash
# 1. Clone
git clone https://github.com/HussamFaisalFadul/smart_productivity_app.git
cd smart_productivity_app

# 2. Add Firebase config (excluded from repo for security)
#    - Add google-services.json → android/app/
#    - Add lib/core/firebase_options.dart from Firebase Console

# 3. Enable Anonymous Auth in Firebase Console

# 4. Add Firestore index:
#    Collection: lists | Fields: members (Array) + createdAt (Desc)

# 5. Run
flutter pub get
flutter run
```

---

## Security

- Firestore rules: only list members can read/write their data
- Firebase API keys excluded from repo (see `.gitignore`)
- Full security rules in `firestore.rules`

---

## License

© 2025 Hussam Faisal. All rights reserved.  
This code is shared for portfolio purposes only.  
Copying or redistribution without permission is prohibited.
