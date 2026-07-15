import os
from urllib.parse import quote_plus
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import Generator

# load .env located at myapp/.env (three levels up from this file)
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))
load_dotenv(env_path)

DB_USER = os.getenv("MYSQL_USER", "root")
DB_PASS = os.getenv("MYSQL_PASSWORD", "")
DB_HOST = os.getenv("MYSQL_HOST", "localhost")
DB_PORT = os.getenv("MYSQL_PORT", "3306")
DB_NAME = os.getenv("MYSQL_DATABASE", "bookkeepprodb")

# URL-encode password to handle special characters like @
DB_PASS_ENCODED = quote_plus(DB_PASS)
DATABASE_URL = os.getenv("DATABASE_URL") or f"mysql+pymysql://{DB_USER}:{DB_PASS_ENCODED}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Engine and session — explicit pool config for production stability
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # detect stale connections before use
    pool_size=10,         # persistent connections in pool
    max_overflow=20,      # extra connections allowed under peak load
    pool_recycle=3600,    # recycle connections after 1 hour (avoids MySQL wait_timeout drops)
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
