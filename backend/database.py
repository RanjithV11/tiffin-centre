"""
database.py - Supabase connection with automatic local/demo fallback for Tiffin Center
"""

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# ---------------------------------------------------------------------------
# In-memory Local Database Mock (used when Supabase is not configured or offline)
# ---------------------------------------------------------------------------

class MockQuery:
    def __init__(self, data: List[Dict[str, Any]]):
        self._data = [dict(d) for d in data]

    def select(self, columns: str = "*"):
        return self

    def eq(self, column: str, value: Any):
        self._data = [d for d in self._data if str(d.get(column)) == str(value)]
        return self

    def in_(self, column: str, values: List[Any]):
        str_vals = [str(v) for v in values]
        self._data = [d for d in self._data if str(d.get(column)) in str_vals]
        return self

    def gte(self, column: str, value: Any):
        self._data = [d for d in self._data if str(d.get(column, "")) >= str(value)]
        return self

    def lte(self, column: str, value: Any):
        self._data = [d for d in self._data if str(d.get(column, "")) <= str(value)]
        return self

    def lt(self, column: str, value: Any):
        self._data = [d for d in self._data if str(d.get(column, "")) < str(value)]
        return self

    def order(self, column: str, desc: bool = False):
        self._data.sort(key=lambda x: x.get(column) or "", reverse=desc)
        return self

    def range(self, start: int, end: int):
        self._data = self._data[start : end + 1]
        return self

    def execute(self):
        class Result:
            def __init__(self, data):
                self.data = data
        return Result(self._data)


class MockTable:
    def __init__(self, store: List[Dict[str, Any]]):
        self._store = store

    def select(self, columns: str = "*"):
        return MockQuery(self._store).select(columns)

    def insert(self, payload: Any):
        items = payload if isinstance(payload, list) else [payload]
        inserted = []
        for item in items:
            row = dict(item)
            if "id" not in row:
                row["id"] = str(uuid.uuid4())
            if "created_at" not in row:
                row["created_at"] = datetime.now(timezone.utc).isoformat()
            self._store.append(row)
            inserted.append(row)

        class Result:
            def __init__(self, data):
                self.data = data
        return Result(inserted)

    def update(self, payload: Dict[str, Any]):
        class UpdateQuery(MockQuery):
            def __init__(outer_self, store):
                super().__init__(store)
                outer_self._store_ref = store

            def execute(outer_self):
                updated = []
                for row in outer_self._data:
                    for s in outer_self._store_ref:
                        if s.get("id") == row.get("id"):
                            s.update(payload)
                            updated.append(s)
                class Result:
                    def __init__(self, data):
                        self.data = data
                return Result(updated)
        return UpdateQuery(self._store)

    def delete(self):
        class DeleteQuery(MockQuery):
            def __init__(outer_self, store):
                super().__init__(store)
                outer_self._store_ref = store

            def execute(outer_self):
                deleted = []
                delete_ids = {d.get("id") for d in outer_self._data}
                keep = []
                for s in outer_self._store_ref:
                    if s.get("id") in delete_ids:
                        deleted.append(s)
                    else:
                        keep.append(s)
                outer_self._store_ref.clear()
                outer_self._store_ref.extend(keep)
                class Result:
                    def __init__(self, data):
                        self.data = data
                return Result(deleted)
        return DeleteQuery(self._store)


class LocalMockDatabase:
    """In-memory database preloaded with Warangal Tiffin Center sample data."""
    def __init__(self):
        now = datetime.now(timezone.utc)
        
        # 1. Menu items
        self._menu_items = [
            {"id": "m1", "name_telugu": "దోస", "name_english": "Dosa", "price": 30.0, "category": "breakfast", "is_available": True},
            {"id": "m2", "name_telugu": "ఇడ్లి", "name_english": "Idli", "price": 20.0, "category": "breakfast", "is_available": True},
            {"id": "m3", "name_telugu": "పూరి", "name_english": "Poori", "price": 35.0, "category": "breakfast", "is_available": True},
            {"id": "m4", "name_telugu": "సాంబార్ రైస్", "name_english": "Sambar Rice", "price": 50.0, "category": "lunch", "is_available": True},
            {"id": "m5", "name_telugu": "ఉప్మా", "name_english": "Upma", "price": 25.0, "category": "breakfast", "is_available": True},
            {"id": "m6", "name_telugu": "వడ", "name_english": "Vada", "price": 15.0, "category": "breakfast", "is_available": True},
            {"id": "m7", "name_telugu": "పులిహోర", "name_english": "Pulihora", "price": 45.0, "category": "lunch", "is_available": True},
            {"id": "m8", "name_telugu": "చాయ్", "name_english": "Chai", "price": 10.0, "category": "drinks", "is_available": True},
            {"id": "m9", "name_telugu": "కాఫీ", "name_english": "Filter Coffee", "price": 15.0, "category": "drinks", "is_available": True},
        ]
        
        # 2. Customers
        self._customers = [
            {"id": "c1", "phone_number": "+919848012345", "name": "రమేష్ గారు", "preferred_language": "te", "loyalty_points": 45, "last_visit": (now - timedelta(days=1)).isoformat(), "created_at": (now - timedelta(days=20)).isoformat()},
            {"id": "c2", "phone_number": "+919989023456", "name": "సురేష్", "preferred_language": "te", "loyalty_points": 30, "last_visit": (now - timedelta(days=2)).isoformat(), "created_at": (now - timedelta(days=15)).isoformat()},
            {"id": "c3", "phone_number": "+919440034567", "name": "లక్ష్మి గారు", "preferred_language": "te", "loyalty_points": 70, "last_visit": (now - timedelta(days=9)).isoformat(), "created_at": (now - timedelta(days=30)).isoformat()},
            {"id": "c4", "phone_number": "+919701045678", "name": "వెంకటేశ్వర్లు", "preferred_language": "te", "loyalty_points": 15, "last_visit": (now - timedelta(days=16)).isoformat(), "created_at": (now - timedelta(days=40)).isoformat()},
            {"id": "c5", "phone_number": "+919618056789", "name": "అనిత", "preferred_language": "te", "loyalty_points": 25, "last_visit": now.isoformat(), "created_at": (now - timedelta(days=3)).isoformat()},
        ]
        
        # 3. Orders & Order Items
        self._orders = [
            {"id": "o1", "customer_id": "c1", "ordered_at": now.isoformat(), "total_amount": 95.0, "source": "whatsapp"},
            {"id": "o2", "customer_id": "c2", "ordered_at": (now - timedelta(hours=2)).isoformat(), "total_amount": 60.0, "source": "table_qr"},
            {"id": "o3", "customer_id": "c5", "ordered_at": (now - timedelta(hours=4)).isoformat(), "total_amount": 75.0, "source": "whatsapp"},
        ]
        
        self._order_items = [
            {"id": "oi1", "order_id": "o1", "menu_item_id": "m1", "quantity": 2, "price_at_time": 30.0},
            {"id": "oi2", "order_id": "o1", "menu_item_id": "m3", "quantity": 1, "price_at_time": 35.0},
            {"id": "oi3", "order_id": "o2", "menu_item_id": "m2", "quantity": 3, "price_at_time": 20.0},
            {"id": "oi4", "order_id": "o3", "menu_item_id": "m1", "quantity": 1, "price_at_time": 30.0},
            {"id": "oi5", "order_id": "o3", "menu_item_id": "m7", "quantity": 1, "price_at_time": 45.0},
        ]
        
        # 4. Feedback
        self._feedback = [
            {"id": "f1", "customer_id": "c1", "rating": 5, "comment_original": "దోస చాలా క్రిస్పీగా బాగుంది! చట్నీ సూపర్.", "sentiment": "positive", "created_at": (now - timedelta(hours=1)).isoformat()},
            {"id": "f2", "customer_id": "c2", "rating": 5, "comment_original": "ఇడ్లి మెత్తగా ఉంది. సాంబార్ అద్భుతం.", "sentiment": "positive", "created_at": (now - timedelta(hours=2)).isoformat()},
            {"id": "f3", "customer_id": "c5", "rating": 4, "comment_original": "పులిహోర బాగుంది, కొంచెం కారం ఎక్కువ.", "sentiment": "neutral", "created_at": (now - timedelta(hours=3)).isoformat()},
            {"id": "f4", "customer_id": "c3", "rating": 4, "comment_original": "మంచి సర్వీస్, ఎప్పుడూ ఇక్కడే తింటాను.", "sentiment": "positive", "created_at": (now - timedelta(days=9)).isoformat()},
            {"id": "f5", "customer_id": "c4", "rating": 3, "comment_original": "చాయ్ కొంచెం వేడిగా ఉండాలి.", "sentiment": "neutral", "created_at": (now - timedelta(days=16)).isoformat()},
        ]

    def table(self, name: str):
        mapping = {
            "menu_items": self._menu_items,
            "customers": self._customers,
            "orders": self._orders,
            "order_items": self._order_items,
            "feedback": self._feedback,
        }
        if name not in mapping:
            mapping[name] = []
        return MockTable(mapping[name])


# ---------------------------------------------------------------------------
# Resilient Database Wrapper (Supabase + Automatic Local Fallback)
# ---------------------------------------------------------------------------

class ResilientQuery:
    def __init__(self, remote_query: Any, local_query: Any):
        self._remote = remote_query
        self._local = local_query

    def select(self, *args, **kwargs):
        if self._remote:
            try:
                self._remote = self._remote.select(*args, **kwargs)
            except Exception:
                self._remote = None
        self._local = self._local.select(*args, **kwargs)
        return self

    def eq(self, *args, **kwargs):
        if self._remote:
            try:
                self._remote = self._remote.eq(*args, **kwargs)
            except Exception:
                self._remote = None
        self._local = self._local.eq(*args, **kwargs)
        return self

    def in_(self, *args, **kwargs):
        if self._remote:
            try:
                self._remote = self._remote.in_(*args, **kwargs)
            except Exception:
                self._remote = None
        self._local = self._local.in_(*args, **kwargs)
        return self

    def gte(self, *args, **kwargs):
        if self._remote:
            try:
                self._remote = self._remote.gte(*args, **kwargs)
            except Exception:
                self._remote = None
        self._local = self._local.gte(*args, **kwargs)
        return self

    def lte(self, *args, **kwargs):
        if self._remote:
            try:
                self._remote = self._remote.lte(*args, **kwargs)
            except Exception:
                self._remote = None
        self._local = self._local.lte(*args, **kwargs)
        return self

    def lt(self, *args, **kwargs):
        if self._remote:
            try:
                self._remote = self._remote.lt(*args, **kwargs)
            except Exception:
                self._remote = None
        self._local = self._local.lt(*args, **kwargs)
        return self

    def order(self, *args, **kwargs):
        if self._remote:
            try:
                self._remote = self._remote.order(*args, **kwargs)
            except Exception:
                self._remote = None
        self._local = self._local.order(*args, **kwargs)
        return self

    def range(self, *args, **kwargs):
        if self._remote:
            try:
                self._remote = self._remote.range(*args, **kwargs)
            except Exception:
                self._remote = None
        self._local = self._local.range(*args, **kwargs)
        return self

    def execute(self):
        if self._remote:
            try:
                res = self._remote.execute()
                if res and hasattr(res, "data") and res.data is not None:
                    return res
            except Exception as exc:
                logger.warning("Supabase query failed (%s); seamlessly using local store", exc)
        return self._local.execute()


class ResilientTable:
    def __init__(self, remote_table: Any, local_table: Any):
        self._remote = remote_table
        self._local = local_table

    def select(self, columns: str = "*"):
        remote_q = None
        if self._remote:
            try:
                remote_q = self._remote.select(columns)
            except Exception:
                remote_q = None
        local_q = self._local.select(columns)
        return ResilientQuery(remote_q, local_q)

    def insert(self, payload: Any):
        # Try inserting to remote
        if self._remote:
            try:
                res = self._remote.insert(payload).execute()
                if res and hasattr(res, "data"):
                    # Sync into local store too
                    self._local.insert(payload)
                    return res
            except Exception as exc:
                logger.warning("Supabase insert failed (%s); saving locally", exc)
        return self._local.insert(payload)

    def update(self, payload: Dict[str, Any]):
        remote_q = None
        if self._remote:
            try:
                remote_q = self._remote.update(payload)
            except Exception:
                remote_q = None
        local_q = self._local.update(payload)
        return ResilientQuery(remote_q, local_q)

    def delete(self):
        remote_q = None
        if self._remote:
            try:
                remote_q = self._remote.delete()
            except Exception:
                remote_q = None
        local_q = self._local.delete()
        return ResilientQuery(remote_q, local_q)


class ResilientClient:
    def __init__(self, raw_supabase: Any, local_db: LocalMockDatabase):
        self._supabase = raw_supabase
        self._local = local_db

    def table(self, name: str):
        remote_t = None
        if self._supabase:
            try:
                remote_t = self._supabase.table(name)
            except Exception:
                remote_t = None
        local_t = self._local.table(name)
        return ResilientTable(remote_t, local_t)


# ---------------------------------------------------------------------------
# Database Client Provider
# ---------------------------------------------------------------------------

_resilient_db = None
_local_db = None

def get_db():
    """
    Return resilient database client that queries Supabase when available
    and falls back to local storage on network errors, ensuring zero crashes.
    """
    global _resilient_db, _local_db

    if _resilient_db is not None:
        return _resilient_db

    if _local_db is None:
        _local_db = LocalMockDatabase()

    raw_supabase = None
    is_placeholder = (
        not SUPABASE_URL
        or not SUPABASE_KEY
        or "your-project" in SUPABASE_URL
        or "your-anon-key" in SUPABASE_KEY
    )

    if not is_placeholder:
        try:
            from supabase import create_client
            raw_supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as exc:
            logger.warning("Failed to initialize Supabase client: %s", exc)

    _resilient_db = ResilientClient(raw_supabase, _local_db)
    return _resilient_db


# ---------------------------------------------------------------------------
# SQL to create all required tables – run once in the Supabase SQL editor.
# ---------------------------------------------------------------------------
create_tables_sql = """
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS customers (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number       TEXT UNIQUE NOT NULL,
    name               TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'te',
    loyalty_points     INTEGER NOT NULL DEFAULT 0,
    last_visit         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_telugu    TEXT NOT NULL,
    name_english   TEXT NOT NULL,
    price          NUMERIC(10, 2) NOT NULL,
    category       TEXT NOT NULL,
    is_available   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id  UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    ordered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    source       TEXT NOT NULL DEFAULT 'whatsapp'
);

CREATE TABLE IF NOT EXISTS order_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    menu_item_id   UUID NOT NULL REFERENCES menu_items (id) ON DELETE RESTRICT,
    quantity       INTEGER NOT NULL DEFAULT 1,
    price_at_time  NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id      UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    rating           INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment_original TEXT,
    sentiment        TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id  ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_ordered_at   ON orders (ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_feedback_customer   ON feedback (customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone     ON customers (phone_number);
"""
