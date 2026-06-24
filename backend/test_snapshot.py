import asyncio
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.websocket.helpers import build_queue_snapshot

db = SessionLocal()
snapshot = build_queue_snapshot("5c84d62b-e1b7-4c48-8df0-3f416e94de80", db) # DSD queue Id
print("serving_details:", snapshot.get("serving_details"))
print("current_serving:", snapshot.get("current_serving"))
print("starting_sequence:", snapshot.get("starting_sequence"))
