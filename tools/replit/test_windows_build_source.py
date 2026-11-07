import unittest
from prepare_windows_build_source import include_path


class WindowsBuildSourceTests(unittest.TestCase):
    def test_development_configuration_and_local_data_never_enter_snapshot(self):
        for path in (
            "config/env/development.env", ".env", "nexus_api/.env.production",
            ".nexus/data/cache.db", ".local/session.json", "dumps/database.sql",
            ".agents/memory/MEMORY.md", "attached_assets/IMG_owner.png",
            "generated-artifacts/profile-media/large.webm",
        ):
            with self.subTest(path=path):
                self.assertFalse(include_path(path))

    def test_source_license_examples_and_the_intended_workflow_are_preserved(self):
        for path in (
            "LICENSE", "pnpm-workspace.yaml", "Cargo.lock",
            "nexus_app/src/features/auth/flow/AuthLoginLayout.tsx",
            "nexus_desktop/electron-builder.config.cjs",
            "deploy/self-hosting/.env.example",
            ".github/workflows/windows-private-test.yaml",
        ):
            with self.subTest(path=path):
                self.assertTrue(include_path(path))

    def test_other_automatic_workflows_are_not_accidentally_started(self):
        self.assertFalse(include_path(".github/workflows/ci.yaml"))
        self.assertFalse(include_path(".github/workflows/windows-build-preflight.yml"))

    def test_client_snapshot_does_not_copy_legacy_generated_server_tree(self):
        self.assertFalse(include_path("deploy/self-hosting/app-static/assets/old.js"))
        self.assertTrue(include_path("deploy/self-hosting/docker-compose.yml"))


if __name__ == "__main__":
    unittest.main()
