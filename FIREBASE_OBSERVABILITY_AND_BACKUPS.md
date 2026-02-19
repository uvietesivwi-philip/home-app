# Firebase observability + Firestore resilience runbook

This runbook completes production-readiness work for:
- Crash/exception observability
- Analytics for key product journeys
- Firebase Performance Monitoring traces
- Firestore PITR
- Scheduled Firestore exports to Cloud Storage
- Alerting policies for auth failures, Firestore errors, and crash spikes

## 1) Client observability integration

### Crash capture
Crashlytics is not available for a plain web app. For this web MVP, crash-like issues are captured as `app_exception` Analytics events from:
- `window.onerror`
- `window.unhandledrejection`

If a native mobile app is introduced later (iOS/Android/Flutter/React Native), wire Firebase Crashlytics there and keep these web events for browser incidents.

### Key journey analytics events
The app now emits Analytics events for core user journeys:
- `journey_category_selected`
- `journey_subcategory_selected`
- `journey_content_viewed`
- `journey_content_saved`
- `journey_progress_updated`
- `journey_search_used`
- `journey_sort_changed`
- `journey_request_created`
- `journey_request_updated`
- `login`
- `logout`
- `screen_view`

### Performance traces
Custom traces are wrapped around key operations:
- `content_list_trace`
- `save_content_trace`
- `progress_update_trace`
- `request_list_trace`
- `request_create_trace`
- `request_update_trace`

## 2) Enable Firestore PITR in production

> Run once per production database.

```bash
gcloud firestore databases update \
  --project=PROJECT_ID \
  --database='(default)' \
  --enable-point-in-time-recovery
```

Verify:

```bash
gcloud firestore databases describe \
  --project=PROJECT_ID \
  --database='(default)' \
  --format='value(pointInTimeRecoveryEnablement)'
```

Expected value: `POINT_IN_TIME_RECOVERY_ENABLED`.

## 3) Schedule periodic Firestore exports to Cloud Storage

### Bucket setup (one-time)

```bash
gsutil mb -p PROJECT_ID -l REGION gs://PROJECT_ID-firestore-backups
gsutil lifecycle set firestore-backup-lifecycle.json gs://PROJECT_ID-firestore-backups
```

Create `firestore-backup-lifecycle.json` (example: retain 35 days):

```json
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": { "age": 35 }
    }
  ]
}
```

### Daily export schedule
Use Cloud Scheduler to call a secured export Cloud Run/Function job at off-peak hours (e.g., 02:00 UTC daily).

Recommended command executed by the job:

```bash
gcloud firestore export gs://PROJECT_ID-firestore-backups/$(date -u +%F-%H%M%S) \
  --project=PROJECT_ID \
  --database='(default)'
```

### Backup drill (monthly)
- Restore latest export into staging and run smoke tests.
- Validate restore time objective (RTO) and data freshness objective.
- Record drill result in incident/resilience log.

## 4) Alerting thresholds

Create Cloud Monitoring alert policies with these starting thresholds:

### Auth failures (warning + critical)
- Metric: failed Firebase Authentication attempts (from auth logs/metrics).
- Warning: `> 25 failures / 5 min`
- Critical: `> 60 failures / 5 min`

### Firestore error rate
- Metric: Firestore request error count / error ratio.
- Warning: `error ratio > 2% for 10 min`
- Critical: `error ratio > 5% for 10 min`

### Crash spike (web exception proxy)
- Metric: count of `app_exception` analytics events.
- Warning: `> 15 events / 10 min`
- Critical: `> 40 events / 10 min`

### Notification channels
- Pager/on-call: critical only
- Slack/email: warning + critical
- Include links to dashboard panels and runbooks in each policy

## 5) Production checklist

- [ ] `APP_CONFIG.USE_MOCK_DATA = false`
- [ ] Firebase config values populated including `measurementId`
- [ ] Analytics and Performance enabled in Firebase project
- [ ] PITR enabled and verified
- [ ] Daily export job deployed and monitored
- [ ] Alert policies + notification channels configured
- [ ] Monthly restore drill scheduled
