from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory

from app.config import Settings

PROJECT_ROOT = Path(__file__).resolve().parents[1]
INITIAL_REVISION = "46428c30ea02"


class TestSchemaManagement:
    def test_production_default_does_not_auto_create(self):
        """AUTO_CREATE_TABLES defaults to False: create_all is opt-in only."""
        settings = Settings(_env_file=None, JWT_SECRET_KEY="j" * 32)
        assert settings.AUTO_CREATE_TABLES is False

    def test_alembic_migrations_present_single_head(self):
        cfg = Config(str(PROJECT_ROOT / "alembic.ini"))
        script = ScriptDirectory.from_config(cfg)
        heads = script.get_heads()
        assert heads == [INITIAL_REVISION]
        assert script.get_revision(INITIAL_REVISION) is not None