"""
App configuration settings.

FUNCTIONALITY:
    Central place where the backend reads its runtime configuration from
    environment variables (optionally placed in backend/.env, see env.example):

      DATABASE_URL  - SQLAlchemy connection string. Default is a local SQLite
                      file (created + demo-seeded on first boot) so a fresh
                      checkout needs ZERO database setup. To use MySQL instead,
                      set DATABASE_URL to
                      mysql+pymysql://user:password@localhost:3306/hr_ticketing?charset=utf8mb4
                      and uncomment PyMySQL/cryptography in requirements.txt.
      CORS_ORIGINS  - comma separated list of browser origins allowed to call
                      the API (the Vite dev server runs on http://localhost:5173)
      BACKEND_PORT  - default port used by app/main.py when run as a module

    Every value has a sensible default, so a fresh checkout works with
    zero configuration for local development.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ folder — resolves sqlite:// URLs against it so the .db file always
# lands next to the code, no matter which directory uvicorn was started from.
_BACKEND_DIR = Path(__file__).resolve().parents[2]


def resolve_database_url(url: str) -> str:
    """
    Make relative sqlite:// URLs absolute (anchored to the backend folder).

    `sqlite:///hr_ticketing.db` is relative; SQLite/pip would otherwise create
    the file relative to the *current working directory*, so starting uvicorn
    from the repo root instead of backend/ would silently create a second,
    empty database. Anchoring to backend/ removes that trap.
    """
    if url.startswith("sqlite:///") and not url.startswith("sqlite:////"):
        # strip the scheme, anchor the file path if it is relative
        file_part = url[len("sqlite:///"):]
        if not Path(file_part).is_absolute():
            # split off query args (e.g. ?check_same_thread=false), re-add after
            path_part, _, query = file_part.partition("?")
            anchored = (_BACKEND_DIR / path_part).resolve()
            return f"sqlite:///{anchored}{'?' + query if query else ''}"
        return url
    return url


class Settings(BaseSettings):
    # Default: a plain local file next to backend/ — created and demo-seeded
    # automatically on startup (see app/core/database.py). Nothing to install.
    DATABASE_URL: str = "sqlite:///./hr_ticketing.db"

    # Browser origins permitted by CORS. The React app (vite.config.js) runs
    # on http://localhost:5173 during development; localhost and 127.0.0.1 are
    # both listed so opening the app either way never produces CORS errors.
    # Override with CORS_ORIGINS in backend/.env (comma separated) elsewhere.
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"

    # Default HTTP port for `python -m app.main`. Overridden by the env var.
    BACKEND_PORT: int = 8000

    model_config = SettingsConfigDict(
        # Anchor .env to this project's backend folder so the file is found
        # no matter which directory uvicorn was started from (backend/, the
        # repo root, wherever). Missing file? The defaults above kick in.
        env_file=_BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        """DATABASE_URL with relative sqlite paths anchored to backend/."""
        return resolve_database_url(self.DATABASE_URL)

    @property
    def cors_origins(self) -> list[str]:
        """CORS_ORIGINS as a clean list of origins for CORSMiddleware."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cache the settings object so .env is parsed only once per process."""
    return Settings()
