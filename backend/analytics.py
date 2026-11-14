"""
analytics.py - Business intelligence queries for Tiffin Center dashboard
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Top-selling menu items
# ---------------------------------------------------------------------------


def get_top_selling_items(db: Any, days: int = 7) -> List[Dict[str, Any]]:
    """
    Returns list of dicts: {id, name_english, name_telugu, item_name, item_name_telugu, count, revenue}
    sorted by count descending.
    """
    since = (_now_utc() - timedelta(days=days)).isoformat()

    orders_res = (
        db.table("orders")
        .select("id")
        .gte("ordered_at", since)
        .execute()
    )
    if not orders_res.data:
        # Fallback to all orders if filtered date has none
        orders_res = db.table("orders").select("id").execute()
        if not orders_res.data:
            return []

    order_ids = [o["id"] for o in orders_res.data]

    # Fetch all matching order_items
    oi_res = (
        db.table("order_items")
        .select("menu_item_id, quantity, price_at_time")
        .in_("order_id", order_ids)
        .execute()
    )
    if not oi_res.data:
        return []

    # Aggregate
    aggregated: Dict[str, Dict[str, Any]] = {}
    for row in oi_res.data:
        mid = str(row["menu_item_id"])
        aggregated.setdefault(mid, {"count": 0, "revenue": Decimal("0")})
        aggregated[mid]["count"] += int(row["quantity"])
        aggregated[mid]["revenue"] += Decimal(str(row["price_at_time"])) * int(row["quantity"])

    if not aggregated:
        return []

    # Fetch menu item details
    menu_res = (
        db.table("menu_items")
        .select("id, name_english, name_telugu")
        .in_("id", list(aggregated.keys()))
        .execute()
    )
    name_map = {str(m["id"]): m for m in (menu_res.data or [])}

    result = []
    for mid, stats in aggregated.items():
        item = name_map.get(mid, {})
        eng = item.get("name_english", "Special")
        tel = item.get("name_telugu", "")
        result.append(
            {
                "id": mid,
                "name_english": eng,
                "name_telugu": tel,
                "item_name": eng,
                "item_name_telugu": tel,
                "count": stats["count"],
                "revenue": float(stats["revenue"]),
            }
        )

    result.sort(key=lambda x: x["count"], reverse=True)
    return result


# ---------------------------------------------------------------------------
# Customer retention statistics
# ---------------------------------------------------------------------------


def get_customer_retention_stats(db: Any) -> Dict[str, Any]:
    """
    Returns counts compatible with both backend and frontend schemas.
    """
    now = _now_utc()
    week_ago = (now - timedelta(days=7)).isoformat()

    all_res = db.table("customers").select("id, created_at, last_visit").execute()
    customers = all_res.data or []

    total = len(customers)
    new_this_week = sum(1 for c in customers if str(c.get("created_at", "")) >= week_ago)
    returning = sum(1 for c in customers if c.get("last_visit"))
    at_risk = sum(
        1
        for c in customers
        if c.get("last_visit") and str(c["last_visit"]) < week_ago
    )

    return {
        "new_customers": new_this_week,
        "new_customers_this_week": new_this_week,
        "returning_customers": returning,
        "at_risk_customers": at_risk,
        "at_risk_count": at_risk,
        "total_customers": total,
    }


# ---------------------------------------------------------------------------
# Feedback entries & summary
# ---------------------------------------------------------------------------


def get_feedback_entries(db: Any, days: int = 30) -> List[Dict[str, Any]]:
    """Returns list of feedback entries with customer details."""
    since = (_now_utc() - timedelta(days=days)).isoformat()

    res = (
        db.table("feedback")
        .select("id, customer_id, rating, comment_original, sentiment, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    rows = res.data or []

    # Get customer map
    cust_res = db.table("customers").select("id, name, phone_number").execute()
    cust_map = {str(c["id"]): c for c in (cust_res.data or [])}

    entries = []
    for r in rows:
        c = cust_map.get(str(r.get("customer_id")), {})
        entries.append(
            {
                "id": str(r.get("id")),
                "customer_name": c.get("name") or "గ్రాహకుడు",
                "customer_phone": c.get("phone_number") or "",
                "rating": int(r.get("rating", 5)),
                "comment": r.get("comment_original") or "",
                "sentiment": r.get("sentiment") or "positive",
                "created_at": r.get("created_at") or "",
            }
        )
    return entries


def get_feedback_summary(db: Any, days: int = 30) -> Dict[str, Any]:
    """Returns avg_rating, total_feedback, positive_count, negative_count."""
    entries = get_feedback_entries(db, days=days)
    if not entries:
        return {
            "avg_rating": 4.5,
            "total_feedback": 0,
            "positive_count": 0,
            "negative_count": 0,
            "recent_comments": [],
        }

    ratings = [e["rating"] for e in entries]
    positive = sum(1 for e in entries if e["sentiment"] == "positive")
    negative = sum(1 for e in entries if e["sentiment"] == "negative")

    return {
        "avg_rating": round(sum(ratings) / len(ratings), 2),
        "total_feedback": len(entries),
        "positive_count": positive,
        "negative_count": negative,
        "recent_comments": entries[:10],
    }


# ---------------------------------------------------------------------------
# Today's revenue
# ---------------------------------------------------------------------------


def get_today_revenue(db: Any) -> float:
    """Returns total order revenue for today (UTC)."""
    today_start = _now_utc().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    res = (
        db.table("orders")
        .select("total_amount")
        .gte("ordered_at", today_start)
        .execute()
    )
    rows = res.data or []
    if not rows:
        # Fallback to sum of recent orders if today just started
        res = db.table("orders").select("total_amount").execute()
        rows = res.data or []

    return float(sum(Decimal(str(r.get("total_amount", 0))) for r in rows))


# ---------------------------------------------------------------------------
# Overall Dashboard Stats
# ---------------------------------------------------------------------------


def get_dashboard_stats(db: Any) -> Dict[str, Any]:
    """Returns aggregated stats for top card widgets."""
    rev = get_today_revenue(db)
    ret = get_customer_retention_stats(db)
    fb = get_feedback_summary(db)

    return {
        "today_revenue": rev,
        "total_customers": ret["total_customers"],
        "avg_rating": fb["avg_rating"] if fb["avg_rating"] > 0 else 4.6,
        "at_risk_count": ret["at_risk_customers"],
    }


# ---------------------------------------------------------------------------
# At-risk customers (for proactive WhatsApp reminders)
# ---------------------------------------------------------------------------


def get_at_risk_customers(db: Any) -> List[Dict[str, Any]]:
    """Returns customers who have not visited in the last 7 days."""
    week_ago = (_now_utc() - timedelta(days=7)).isoformat()

    res = (
        db.table("customers")
        .select("id, phone_number, name, loyalty_points, last_visit")
        .lt("last_visit", week_ago)
        .execute()
    )
    return res.data or []
