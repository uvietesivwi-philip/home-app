# Release Checklist and Rollback Playbook

## Release checklist

1. Confirm CI is green for lint/typecheck, tests, and artifact build on the release commit.
2. Review `dist/home-app-release.tgz` artifact contents from the `build_artifacts` job.
3. Ensure GitHub Action variables/secrets are configured:
   - `vars.FIREBASE_PROJECT_ID_STAGING`
   - `vars.FIREBASE_PROJECT_ID_PROD`
   - `secrets.FIREBASE_TOKEN`
4. Merge to `main` and verify `deploy_staging` succeeds.
5. Smoke test staging:
   - `web/` loads.
   - `web/admin.html` loads.
   - Core content and request flows function.
6. Approve `deploy_prod` environment gate in GitHub Actions.
7. Verify production deployment succeeded for Firestore rules, indexes, and Hosting.
8. Run post-deploy checks in production (home page, admin page, and key app flows).
9. Tag the release commit in git and record release notes.

## Rollback playbook

If a production deployment introduces a regression:

1. Identify the last known good commit.
2. Re-run deployment from that commit using the same versioned config (`firebase.json`, `firestore.rules`, `firestore.indexes.json`) by triggering the workflow on the commit SHA.
3. If a rapid rollback is needed, run locally with authenticated CLI:
   ```bash
   FIREBASE_TOKEN=*** \
   FIREBASE_PROJECT_ID_PROD=<prod-project-id> \
   bash scripts/deploy.sh prod
   ```
4. Validate production behavior after rollback (UI smoke tests and critical user actions).
5. Create an incident summary and follow-up fix PR before next release.

## Notes on approval gate

The `deploy_prod` job uses the `production` GitHub environment. Configure required reviewers in repository settings so production deployment pauses for explicit approval after successful staging deployment.
