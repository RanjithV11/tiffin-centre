"""
main.py - FastAPI application entry point for Sri Lakshmi Tiffin Center
"""

from __future__ import annotations

import logging
import os
import sys

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from analytics import (
    get_at_risk_customers,
    get_customer_retention_stats,
    get_dashboard_stats,
    get_feedback_entries,
    get_feedback_summary,
    get_today_revenue,
    get_top_selling_items,
)
from database import get_db
from models import (
    CustomerResponse,
    FeedbackCreate,
    MenuItemCreate,
    MenuItemResponse,
    MenuItemUpdate,
    OrderCreate,
    OrderResponse,
    WhatsAppMessage,
)
from qr_generator import generate_qr_base64, generate_table_qr
from whatsapp_bot import process_message, send_whatsapp_message

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

VERIFY_TOKEN = os.getenv("VERIFY_TOKEN", "tiffin_verify_token")
WHATSAPP_NUMBER = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Tiffin Center API",
    description="Backend API for Sri Lakshmi Tiffin Center, Warangal",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("Tiffin Center API started successfully")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/", tags=["Health"])
async def health_check() -> Dict[str, str]:
    return {"status": "ok", "app": "Tiffin Center API - Warangal"}


# ---------------------------------------------------------------------------
# WhatsApp Webhook
# ---------------------------------------------------------------------------


@app.get("/webhook/whatsapp", tags=["WhatsApp"])
async def whatsapp_verify(request: Request) -> Response:
    """Meta webhook verification handshake."""
    params = dict(request.query_params)
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        logger.info("WhatsApp webhook verified successfully.")
        return Response(content=challenge, media_type="text/plain")

    logger.warning("WhatsApp webhook verification failed. token=%s", token)
    raise HTTPException(status_code=403, detail="Verification failed")


@app.post("/webhook/whatsapp", tags=["WhatsApp"])
async def whatsapp_webhook(request: Request, db: Any = Depends(get_db)) -> Dict[str, str]:
    """Receive and process incoming WhatsApp messages."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    try:
        payload = WhatsAppMessage(**body)
    except Exception as exc:
        logger.warning("Malformed webhook payload: %s", exc)
        return {"status": "ignored"}

    if not payload.entry:
        return {"status": "no_entry"}

    for entry in payload.entry:
        for change in entry.changes or []:
            value = change.get("value", {})
            messages = value.get("messages", [])
            for msg in messages:
                phone = msg.get("from", "")
                msg_type = msg.get("type", "")
                text = ""
                if msg_type == "text":
                    text = msg.get("text", {}).get("body", "").strip()
                elif msg_type == "interactive":
                    reply = msg.get("interactive", {})
                    text = (
                        reply.get("button_reply", {}).get("title", "")
                        or reply.get("list_reply", {}).get("title", "")
                    )

                if phone and text:
                    reply_text = process_message(phone, text, db)
                    await send_whatsapp_message(phone, reply_text)

    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Menu endpoints
# ---------------------------------------------------------------------------


def _format_menu_item(item: Dict[str, Any]) -> Dict[str, Any]:
    avail = item.get("available") if item.get("available") is not None else item.get("is_available", True)
    return {
        "id": str(item.get("id")),
        "name_telugu": item.get("name_telugu", ""),
        "name_english": item.get("name_english", ""),
        "price": float(item.get("price", 0)),
        "category": item.get("category", "General"),
        "available": bool(avail),
        "is_available": bool(avail),
        "description": item.get("description", ""),
    }


@app.post("/api/menu", tags=["Menu"])
async def create_menu_item(item: Dict[str, Any], db: Any = Depends(get_db)) -> Any:
    payload = {
        "name_telugu": item.get("name_telugu", ""),
        "name_english": item.get("name_english", ""),
        "price": float(item.get("price", 0)),
        "category": item.get("category", "breakfast"),
        "is_available": item.get("available", item.get("is_available", True)),
    }
    result = db.table("menu_items").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create menu item")
    return _format_menu_item(result.data[0])


@app.get("/api/menu", tags=["Menu"])
async def list_menu_items(
    category: Optional[str] = None,
    available_only: bool = False,
    db: Any = Depends(get_db),
) -> Any:
    query = db.table("menu_items").select("*").order("category").order("name_english")
    if category:
        query = query.eq("category", category)
    if available_only:
        query = query.eq("is_available", True)
    result = query.execute()
    items = result.data or []
    return [_format_menu_item(i) for i in items]


@app.put("/api/menu/{item_id}", tags=["Menu"])
async def update_menu_item(
    item_id: str, request: Request, db: Any = Depends(get_db)
) -> Any:
    try:
        body = await request.json()
    except Exception:
        body = {}

    data: Dict[str, Any] = {}
    if "name_telugu" in body and body["name_telugu"]:
        data["name_telugu"] = body["name_telugu"]
    if "name_english" in body and body["name_english"]:
        data["name_english"] = body["name_english"]
    if "price" in body and body["price"] is not None:
        data["price"] = float(body["price"])
    if "category" in body and body["category"]:
        data["category"] = body["category"]
    if "available" in body:
        data["is_available"] = bool(body["available"])
    elif "is_available" in body:
        data["is_available"] = bool(body["is_available"])

    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = db.table("menu_items").update(data).eq("id", str(item_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return _format_menu_item(result.data[0])


@app.delete("/api/menu/{item_id}", tags=["Menu"])
async def delete_menu_item(item_id: str, db: Any = Depends(get_db)) -> Dict[str, str]:
    result = db.table("menu_items").delete().eq("id", str(item_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"status": "deleted", "id": str(item_id)}


# ---------------------------------------------------------------------------
# Order endpoints
# ---------------------------------------------------------------------------


@app.post("/api/orders", tags=["Orders"])
async def create_order(request: Request, db: Any = Depends(get_db)) -> Any:
    body = await request.json()
    customer_id = body.get("customer_id")
    customer_name = body.get("customer_name")
    customer_phone = body.get("customer_phone")
    items = body.get("items", [])

    if not items:
        raise HTTPException(status_code=400, detail="Order items cannot be empty")

    # If customer not specified by ID, try finding or creating by phone
    if not customer_id and customer_phone:
        res = db.table("customers").select("id").eq("phone_number", customer_phone).execute()
        if res.data:
            customer_id = res.data[0]["id"]
        else:
            new_cust = db.table("customers").insert({
                "phone_number": customer_phone,
                "name": customer_name or "Walk-in",
                "loyalty_points": 10,
            }).execute()
            customer_id = new_cust.data[0]["id"] if new_cust.data else None

    # Calculate total
    total = 0.0
    for item in items:
        qty = int(item.get("quantity", 1))
        price = float(item.get("price", 0))
        if price == 0 and "menu_item_id" in item:
            m_res = db.table("menu_items").select("price").eq("id", str(item["menu_item_id"])).execute()
            if m_res.data:
                price = float(m_res.data[0]["price"])
        total += price * qty

    # Insert order
    now_iso = datetime.now(timezone.utc).isoformat()
    ord_res = db.table("orders").insert({
        "customer_id": str(customer_id) if customer_id else "walk-in",
        "total_amount": total,
        "source": body.get("source", "dashboard"),
        "ordered_at": now_iso,
    }).execute()
    new_order = ord_res.data[0] if ord_res.data else {"id": "ord_1", "total_amount": total}

    # Insert order items
    items_payload = [
        {
            "order_id": str(new_order.get("id")),
            "menu_item_id": str(oi.get("menu_item_id")),
            "quantity": int(oi.get("quantity", 1)),
            "price_at_time": float(oi.get("price", 20.0)),
        }
        for oi in items
    ]
    db.table("order_items").insert(items_payload).execute()

    return {
        **new_order,
        "customer_name": customer_name or "Walk-in",
        "items": items_payload,
        "total": total,
        "created_at": now_iso,
    }


@app.get("/api/orders", tags=["Orders"])
async def list_orders(
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD"),
    db: Any = Depends(get_db),
) -> Any:
    query = db.table("orders").select("*").order("ordered_at", desc=True)
    if date:
        try:
            day_start = f"{date}T00:00:00+00:00"
            day_end = f"{date}T23:59:59+00:00"
            query = query.gte("ordered_at", day_start).lte("ordered_at", day_end)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    orders = query.execute().data or []

    result = []
    for o in orders:
        oi_res = db.table("order_items").select("*").eq("order_id", o["id"]).execute()
        result.append({
            **o,
            "total": float(o.get("total_amount", 0)),
            "items": oi_res.data or [],
        })
    return result


# ---------------------------------------------------------------------------
# Analytics endpoints
# ---------------------------------------------------------------------------


@app.get("/api/analytics/stats", tags=["Analytics"])
async def dashboard_stats(db: Any = Depends(get_db)) -> Any:
    """Consolidated KPI stats for top dashboard cards."""
    return get_dashboard_stats(db)


@app.get("/api/analytics/top-items", tags=["Analytics"])
async def top_items(days: int = 30, db: Any = Depends(get_db)) -> Any:
    """Top selling items for charts and insights."""
    return get_top_selling_items(db, days=days)


@app.get("/api/analytics/retention", tags=["Analytics"])
async def retention(db: Any = Depends(get_db)) -> Any:
    """Customer retention breakdown (New vs Returning vs At-Risk)."""
    return get_customer_retention_stats(db)


@app.get("/api/analytics/feedback", tags=["Analytics"])
async def feedback_list(days: int = 30, db: Any = Depends(get_db)) -> Any:
    """List of customer feedback entries with sentiment."""
    return get_feedback_entries(db, days=days)


@app.get("/api/analytics/feedback/summary", tags=["Analytics"])
async def feedback_summary(days: int = 30, db: Any = Depends(get_db)) -> Any:
    """Summary metrics of customer feedback."""
    return get_feedback_summary(db, days=days)


@app.get("/api/analytics/revenue", tags=["Analytics"])
async def today_revenue_api(days: int = 30, db: Any = Depends(get_db)) -> Any:
    """Today's revenue summary."""
    revenue = get_today_revenue(db)
    return {"today_revenue": float(revenue), "currency": "INR"}


# ---------------------------------------------------------------------------
# Feedback endpoints
# ---------------------------------------------------------------------------


@app.post("/api/feedback", tags=["Feedback"])
async def submit_customer_feedback(request: Request, db: Any = Depends(get_db)) -> Dict[str, Any]:
    """Submit customer rating and feedback, automatically awarding 10 loyalty points."""
    body = await request.json()
    phone = str(body.get("phone", "")).strip()
    name = str(body.get("name", "")).strip() or "గ్రాహకుడు"
    rating = int(body.get("rating", 5))
    comment = str(body.get("comment", "")).strip()

    customer_id = None
    points_total = 10
    if phone:
        clean_phone = phone if phone.startswith("+") else f"+91{phone.lstrip('0')}"
        c_res = db.table("customers").select("id, loyalty_points").eq("phone_number", clean_phone).execute()
        now_iso = datetime.now(timezone.utc).isoformat()
        if c_res.data:
            customer_id = c_res.data[0]["id"]
            current_pts = int(c_res.data[0].get("loyalty_points", 0))
            points_total = current_pts + 10
            db.table("customers").update({
                "loyalty_points": points_total,
                "last_visit": now_iso
            }).eq("id", customer_id).execute()
        else:
            new_c = db.table("customers").insert({
                "phone_number": clean_phone,
                "name": name,
                "loyalty_points": 10,
                "preferred_language": "te",
                "last_visit": now_iso,
            }).execute()
            if new_c.data:
                customer_id = new_c.data[0]["id"]

    sentiment = "positive" if rating >= 4 else ("neutral" if rating == 3 else "negative")
    db.table("feedback").insert({
        "customer_id": str(customer_id) if customer_id else "guest",
        "rating": rating,
        "comment_original": comment,
        "sentiment": sentiment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()

    return {
        "status": "success",
        "message": "ధన్యవాదాలు! మీ అభిప్రాయం రికార్డ్ అయింది. మీకు 10 Loyalty Points వచ్చాయి! 🎁",
        "loyalty_points_earned": 10,
        "total_points": points_total,
    }


# ---------------------------------------------------------------------------
# Customer endpoints
# ---------------------------------------------------------------------------


def _format_customer(c: Dict[str, Any]) -> Dict[str, Any]:
    last_visit = c.get("last_visit")
    days_since = 0
    if last_visit:
        try:
            lv_dt = datetime.fromisoformat(str(last_visit).replace("Z", "+00:00"))
            days_since = max(0, (datetime.now(timezone.utc) - lv_dt).days)
        except Exception:
            days_since = 3
    else:
        days_since = 14

    phone = str(c.get("phone_number", ""))
    points = int(c.get("loyalty_points", 0))

    return {
        "id": str(c.get("id")),
        "name": c.get("name") or "గ్రాహకుడు",
        "phone": phone,
        "phone_number": phone,
        "loyalty_points": points,
        "last_visit": last_visit or "",
        "days_since_visit": days_since,
        "total_visits": max(1, points // 10),
        "at_risk": days_since >= 7,
    }


@app.get("/api/customers", tags=["Customers"])
async def list_customers(
    limit: int = 50,
    offset: int = 0,
    db: Any = Depends(get_db),
) -> Any:
    result = (
        db.table("customers")
        .select("*")
        .order("loyalty_points", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    customers = result.data or []
    return [_format_customer(c) for c in customers]


@app.post("/api/customers/{customer_id}/send-reminder", tags=["Customers"])
async def send_reminder(customer_id: str, db: Any = Depends(get_db)) -> Dict[str, Any]:
    res = db.table("customers").select("*").eq("id", str(customer_id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer = res.data[0]
    phone = customer.get("phone_number", "")
    name = customer.get("name") or "మీరు"
    points = customer.get("loyalty_points", 0)

    message = (
        f"నమస్కారం {name} గారు! 🙏\n"
        f"మీరు చాలా రోజుల నుండి రాలేదు. మీకు miss అవుతున్నాం! ❤️\n"
        f"మీకు {points} loyalty points ఉన్నాయి.\n"
        f"ఈ రోజు వచ్చి special breakfast ట్రై చేయండి! 🍽️\n"
        f"- Sri Lakshmi Tiffin Center, Warangal"
    )
    success = await send_whatsapp_message(phone, message)
    return {"message": "Reminder sent successfully", "sent": success, "phone": phone, "customer_name": name}


# ---------------------------------------------------------------------------
# QR code endpoint
# ---------------------------------------------------------------------------


@app.get("/api/qr/{table_number}", tags=["QR"])
async def get_table_qr(table_number: int, db: Any = Depends(get_db)) -> FileResponse:
    if table_number < 1 or table_number > 999:
        raise HTTPException(status_code=400, detail="Table number must be between 1 and 999")

    wa_number = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "919848012345")
    try:
        file_path = generate_table_qr(
            table_number=table_number,
            whatsapp_number=wa_number,
            business_name="Sri Lakshmi Tiffin",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"QR generation failed: {exc}")

    return FileResponse(
        path=file_path,
        media_type="image/png",
        filename=f"table_{table_number}_qr.png",
    )


@app.get("/api/qr/{table_number}/preview", tags=["QR"])
async def preview_table_qr(table_number: int, db: Any = Depends(get_db)) -> Dict[str, Any]:
    """Return base64 data URI of QR code for instant browser preview and table URL."""
    if table_number < 1 or table_number > 999:
        raise HTTPException(status_code=400, detail="Table number must be between 1 and 999")

    wa_number = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "919848012345")
    clean_number = wa_number.lstrip("+").replace(" ", "").replace("-", "") or "919848012345"
    data_url = generate_qr_base64(table_number, clean_number)
    from urllib.parse import quote
    telugu_msg = f"నమస్కారం! Table {table_number} నుండి వస్తున్నాను."
    wa_link = f"https://wa.me/{clean_number}?text={quote(telugu_msg)}"

    return {
        "table_number": table_number,
        "data_url": data_url,
        "whatsapp_url": wa_link,
        "telugu_message": telugu_msg,
    }


# ---------------------------------------------------------------------------
# WhatsApp Bot Simulator (for owner testing & demo)
# ---------------------------------------------------------------------------


@app.post("/api/test-bot", tags=["WhatsApp"])
async def test_bot_message(request: Request, db: Any = Depends(get_db)) -> Dict[str, Any]:
    """
    Simulate a customer WhatsApp interaction in real time.
    Executes full Telugu state machine logic, records ratings/orders, and returns reply.
    """
    body = await request.json()
    phone = str(body.get("phone", "+919848012345"))
    message = str(body.get("message", "")).strip()

    if not message:
        message = "నమస్కారం"

    reply_text = process_message(phone, message, db)
    return {
        "phone": phone,
        "message": message,
        "reply": reply_text,
    }


# ---------------------------------------------------------------------------
# Seed default menu
# ---------------------------------------------------------------------------


DEFAULT_MENU_ITEMS = [
    {"name_english": "Idli",         "name_telugu": "ఇడ్లి",          "price": 20.0,  "category": "breakfast"},
    {"name_english": "Dosa",         "name_telugu": "దోస",            "price": 30.0,  "category": "breakfast"},
    {"name_english": "Upma",         "name_telugu": "ఉప్మా",          "price": 25.0,  "category": "breakfast"},
    {"name_english": "Poori",        "name_telugu": "పూరి",           "price": 35.0,  "category": "breakfast"},
    {"name_english": "Vada",         "name_telugu": "వడ",             "price": 15.0,  "category": "breakfast"},
    {"name_english": "Sambar Rice",  "name_telugu": "సాంబార్ రైస్",   "price": 50.0,  "category": "lunch"},
    {"name_english": "Curd Rice",    "name_telugu": "పెరుగు అన్నం",   "price": 40.0,  "category": "lunch"},
    {"name_english": "Pulihora",     "name_telugu": "పులిహోర",        "price": 45.0,  "category": "lunch"},
    {"name_english": "Chai",         "name_telugu": "చాయ్",           "price": 10.0,  "category": "drinks"},
    {"name_english": "Filter Coffee","name_telugu": "కాఫీ",           "price": 15.0,  "category": "drinks"},
]


@app.post("/api/seed-menu", tags=["Admin"])
async def seed_menu(db: Any = Depends(get_db)) -> Dict[str, Any]:
    """Seed the database with default Telugu tiffin menu items (skips duplicates)."""
    seeded = []
    skipped = []

    for item in DEFAULT_MENU_ITEMS:
        existing = (
            db.table("menu_items")
            .select("id")
            .eq("name_english", item["name_english"])
            .execute()
        )
        if existing.data:
            skipped.append(item["name_english"])
            continue
        result = db.table("menu_items").insert({**item, "is_available": True}).execute()
        if result.data:
            seeded.append(item["name_english"])

    return {
        "message": f"Successfully seeded {len(seeded)} menu items",
        "seeded": seeded,
        "skipped": skipped,
        "total_seeded": len(seeded),
        "total_skipped": len(skipped),
    }
