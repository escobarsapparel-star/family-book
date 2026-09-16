# Family Book backend checkpoint — 2026-09-16 20:00 SAST

This checkpoint is paired with Git commit `58fbe4bb4c1e8ae4fb56fa58c9aa1325540246e6` on branch `checkpoint-ui-backend-2026-09-16-2000`.

## Supabase project
- Project: Family Book
- Project ref: `tuxfbyzeyocfbrtwizdq`
- Region: `eu-central-1`
- Database: PostgreSQL 17.6.1.166
- Status when captured: ACTIVE_HEALTHY
- Snapshot captured at: 2026-09-16T18:07:12Z

## Public database tables
All public tables had Row Level Security enabled at capture time.

| Table | Approx rows |
|---|---:|
| album_media | 0 |
| album_memories | 0 |
| albums | 0 |
| comments | 0 |
| event_participants | 0 |
| events | 1 |
| families | 2 |
| family_inspiration | 0 |
| family_invites | 3 |
| family_memberships | 3 |
| hidden_comments | 0 |
| history_notes | 0 |
| memories | 6 |
| memory_media | 6 |
| memory_tags | 1 |
| notification_preferences | 3 |
| notifications | 17 |
| person_birth_years | 4 |
| person_covers | 1 |
| person_emails | 1 |
| person_phones | 2 |
| persons | 11 |
| privacy_settings | 3 |
| reactions | 2 |
| relationships | 18 |
| wall_posts | 3 |

Row counts are planner/statistics estimates and are included only as a quick checkpoint signal, not as an exported data backup.

## Public RPC/functions present
`add_family_album_media`, `add_family_comment`, `add_family_history_note`, `clear_current_family_inspiration`, `create_family_for_current_user`, `create_family_invite`, `delete_family_album`, `delete_family_album_media`, `delete_family_comment`, `delete_family_event`, `delete_family_history_note`, `delete_family_memory`, `delete_family_person`, `delete_wall_post`, `family_book_health_check`, `get_current_family_context`, `get_current_family_inspiration`, `get_family_history_notes`, `get_family_memories_bundle`, `get_family_organizer_bundle`, `get_family_people_bundle`, `get_family_social_bundle`, `get_family_story_settings`, `get_my_notification_preferences`, `get_my_notifications`, `get_relationship_marriage_dates`, `join_family_with_invite`, `mark_all_notifications_read`, `mark_notification_read`, `preview_family_invite`, `refresh_my_reminder_notifications`, `remove_family_access`, `remove_memory_person_tag`, `replace_family_relationships`, `revoke_family_invite`, `save_current_family_inspiration`, `save_family_album`, `save_family_event`, `save_family_memory`, `save_family_story_cover`, `save_family_story_settings`, `save_my_notification_preferences`, `save_wall_post`, `set_family_comment_hidden`, `set_family_member_role`, `set_family_reaction`, `set_relationship_marriage_dates`, `update_my_privacy_settings`, `upsert_family_person`.

## Important triggers present
Updated-at triggers are present for albums, comments, events, families, family_memberships, history_notes, memories, notification_preferences, person_birth_years, person_emails, person_phones, persons, privacy_settings, and wall_posts.

Family Book notification/cleanup triggers present include:
- new/update/delete event notifications
- new memory notifications
- memory tag notifications
- new wall post notifications
- cleanup before deleting memories, persons, events, and wall posts
- story-cover and album-link cleanup before memory deletion

## RLS checkpoint
Policies were present for family-scoped reads across Family Book data, plus owner/admin or own-membership rules where applicable. Specific protected areas include:
- family memberships and invites
- private phone/email/birth-year visibility
- person covers
- notifications and notification preferences
- privacy settings
- memories/media/tags
- albums/media
- events/participants
- wall posts/comments/reactions
- hidden comments
- history notes

No private family row contents, invite codes/hashes, auth credentials, API secrets, B2 credentials, or Supabase keys are stored in this Git checkpoint.

## Edge Functions
Captured source copies are stored next to this manifest:
- `edge-functions/b2-media-sign/index.ts` — production function version 9; `verify_jwt=false` because the function performs its own Supabase user authentication/context validation.
- `edge-functions/tmdb-search/index.ts` — production function version 1; `verify_jwt=true`.
- `edge-functions/music-search/index.ts` — production function version 1; `verify_jwt=true`.

## What this checkpoint means
- **UI/code:** exact restorable Git snapshot via the checkpoint branch.
- **Backend code/schema state:** documented here, with Edge Function source preserved on the checkpoint branch.
- **Production family data:** remains in Supabase/Backblaze and is intentionally not copied into GitHub because it contains private family information.

Use this branch as the known-good recovery point before later UI/backend changes.