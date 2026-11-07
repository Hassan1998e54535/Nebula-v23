# Local repository preparation

## Scope

The completed preparation was **local only**. The user approved preparing and saving the
project, not uploading it to GitHub, publishing an application, or starting paid
build services. No branches or tags were pushed as part of that preparation.

The baseline source is preserved in the local saved history and the
`local-preparation-baseline-20261107` tag. Application source, design, databases,
uploads and runtime data must not be replaced with an older project snapshot.

## Subsequent Windows-build authorization

The user subsequently approved uploading a sanitized build source and running
the Windows build **only without paid usage**. This is not permission to publish
the project publicly, upload unresolved credentials or historical user data, or
start paid services. Verify repository privacy and free-usage safeguards,
including artifact storage, before uploading or triggering workflows.

The GitHub API preflight remains blocked: the attached integration is authorized,
but did not provide a runtime connection for the repository-metadata request.
The saved OAuth status was healthy and inline reconnection was unavailable.
Repository privacy, build control and billing settings could not be verified
through that API. Do not treat working Git reads as proof of those capabilities
or hunt for raw credentials. No upload or Windows build was started.

A subsequent Git push dry-run using the already-remote empty source revision
succeeded. It sent no application source and created no branch. This verifies
that the transport can negotiate a proposed push; it does not verify repository
privacy, workflow permissions, billing safeguards or a successful Windows build.

## What is retained

- The web, API, desktop, mobile integration, shared packages and their lockfiles.
- Existing first-party images already saved under
  `attached_assets/generated_images`.
- The static application under `deploy/self-hosting/app-static`. It is mounted
  directly by the self-hosted application service; it is not disposable output
  until a tested replacement build path is provided.
- Original GitHub build and repository configuration recovered from the saved
  pre-connection project snapshot. Recovery is limited to the missing `.github`
  directory; application source is not rolled back. All 41 recovered files,
  including 30 workflow definitions, match the saved original bytes.
- TLS certificates and keys in the desktop test-fixture directories. These are
  test inputs, not a substitute for production certificates.

## Local-only material

Project rules now explicitly exclude local Agent state, runtime data, database
dumps, dependencies, generated tooling/build output and private environment files.
Example environment files remain available as source.

Uploaded screenshots and pasted chat files remain on disk. The project now
expresses the same upload exclusion that this workspace already applied globally,
so a fresh clone does not accidentally save those files. Existing first-party
generated images remain included.

These exclusions do **not** delete files, free disk space, back up a database or
make ignored runtime assets available to a fresh GitHub clone.

## Checks

Run the source/local-data boundary check:

```sh
python3 tools/replit/check-repository-boundary.py
```

It checks filenames, project ignore rules and required source paths. It does not
read secret values, test application behavior, or approve publication.

The saved history was scanned with Gitleaks 8.26.0 with full redaction. Reports are
kept only under the ignored `generated-artifacts` directory. The initial scan
reported 98 detections, including test/example/code matches and four detections
in `config/env/development.env`. A detection is not proof of a live credential;
these results have **not** all been cleared. Keep publication blocked until the
development configuration and other findings have been reviewed securely.

The staged preparation changes were scanned separately with full redaction and
produced zero detections. That result does not clear the pre-existing findings.

Do not remove broad groups of source or test fixtures simply to silence the
scanner. Do not rewrite saved history or claim credentials were never present.

## Remaining build/distribution requirements

- Both original profile-media ZIP uploads were recovered locally from their
  saved history. Their original Git object hashes and ZIP CRC checks passed,
  and the existing media preparer successfully prepared all 225 asset entries.
  The ZIPs remain ignored and were not added to the new main branch. Do not
  delete the originals or their generated cache. A durable, authorized source
  for these assets is still required for rebuilding on another computer.
- The restored private Windows workflow historically retrieved media from older
  repository history. Restoring its YAML does not put that history into the new
  GitHub repository. Resolve asset sourcing before running it there.
- Restoring CI files is not a successful Windows/iOS build, signed installer,
  working external server, or verification of voice and screen sharing.
- A source checkpoint does not back up the running database or local runtime
  folders. Arrange those backups separately before any migration or removal.

The Windows installer and local server distribution remain separate, unfinished
deliverables. Do not present this source preparation as a downloadable app.
