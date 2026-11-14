"""
whatsapp_bot.py - Telugu/English conversation state machine for Tiffin Center
"""

from __future__ import annotations

import logging
import os
from typing import Optional
from urllib.parse import quote

import httpx
from supabase import Client

logger = logging.getLogger(__name__)

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")

# ---------------------------------------------------------------------------
# Conversation states
# ---------------------------------------------------------------------------

STATE_WELCOME = "WELCOME"
STATE_ASK_NAME = "ASK_NAME"
STATE_ASK_RATING = "ASK_RATING"
STATE_ASK_ITEM_FEEDBACK = "ASK_ITEM_FEEDBACK"
STATE_CONFIRM_LOYALTY = "CONFIRM_LOYALTY"
STATE_ORDER_MENU = "ORDER_MENU"
STATE_ORDER_SELECT = "ORDER_SELECT"
STATE_ORDER_CONFIRM = "ORDER_CONFIRM"

# ---------------------------------------------------------------------------
# In-memory session store  (phone -> state dict)
# Replace with Redis / DB for production multi-instance deployments.
# ---------------------------------------------------------------------------
_sessions: dict[str, dict] = {}


def _get_session(phone: str) -> dict:
    if phone not in _sessions:
        _sessions[phone] = {"state": STATE_WELCOME, "data": {}}
    return _sessions[phone]


def _set_state(phone: str, state: str) -> None:
    _sessions.setdefault(phone, {"state": STATE_WELCOME, "data": {}})["state"] = state


def _get_state(phone: str) -> str:
    return _sessions.get(phone, {}).get("state", STATE_WELCOME)


def _store_data(phone: str, **kwargs) -> None:
    sess = _sessions.setdefault(phone, {"state": STATE_WELCOME, "data": {}})
    sess["data"].update(kwargs)


def _get_data(phone: str) -> dict:
    return _sessions.get(phone, {}).get("data", {})


# ---------------------------------------------------------------------------
# Telugu + English message templates
# ---------------------------------------------------------------------------

TELUGU_MESSAGES = {
    "welcome": "నమస్కారం! 🙏 మా తిఫిన్ సెంటర్‌కి స్వాగతం! మీ పేరు చెప్పండి:",
    "returning_welcome": "నమస్కారం {name} గారు! 🙏 మళ్ళీ స్వాగతం! మీకు {points} loyalty points ఉన్నాయి.",
    "ask_rating": "భోజనం ఎలా ఉంది? 1-5 లో రేటింగ్ ఇవ్వండి (1=అస్సలు బాగాలేదు, 5=చాలా బాగుంది):",
    "invalid_rating": "దయచేసి 1 నుండి 5 వరకు నంబర్ ఇవ్వండి.",
    "ask_item_feedback": "ఏ item గురించి feedback ఇవ్వాలనుకుంటున్నారు? (ఉదా: idli, dosa, లేదా skip అని టైప్ చేయండి):",
    "loyalty_earned": "మీకు {points} loyalty points వచ్చాయి! 🎁 50 points కి free idli!",
    "total_loyalty": "మొత్తం {total} points ఉన్నాయి. {remaining} points తర్వాత free idli!",
    "menu_header": "🍽️ మా Menu:\n",
    "menu_footer": "\nఏ item కావాలో నంబర్ టైప్ చేయండి (లేదా 'exit' అని చేయండి):",
    "invalid_choice": "సరైన నంబర్ ఎంచుకోండి.",
    "order_confirm": "{item} ({qty}x ₹{price}) - మీ order confirm చేయాలా? (yes/no):",
    "order_placed": "✅ Order placed! మీ total: ₹{total}. ధన్యవాదాలు! 🙏",
    "order_cancelled": "Order cancel చేయబడింది.",
    "thanks_feedback": "మీ feedback కి ధన్యవాదాలు! 🙏",
    "help": "సహాయం కోసం: menu - Menu చూడటానికి | rate - Review ఇవ్వడానికి | points - Loyalty points చూడటానికి",
    "unknown": "అర్థం కాలేదు. 'menu' లేదా 'help' అని టైప్ చేయండి.",
    "points_check": "మీకు {points} loyalty points ఉన్నాయి! 🎁",
    "exit": "ధన్యవాదాలు! మళ్ళీ రండి! 🙏",
}

ENGLISH_MESSAGES = {
    "welcome": "Hello! 🙏 Welcome to our Tiffin Center! Please tell us your name:",
    "returning_welcome": "Hello {name}! 🙏 Welcome back! You have {points} loyalty points.",
    "ask_rating": "How was your meal? Rate us 1-5 (1=Very bad, 5=Excellent):",
    "invalid_rating": "Please enter a number between 1 and 5.",
    "ask_item_feedback": "Which item would you like to give feedback on? (e.g. idli, dosa, or type skip):",
    "loyalty_earned": "You earned {points} loyalty points! 🎁 50 points = free idli!",
    "total_loyalty": "Total {total} points. {remaining} more for a free idli!",
    "menu_header": "🍽️ Our Menu:\n",
    "menu_footer": "\nType the item number to order (or 'exit' to cancel):",
    "invalid_choice": "Please choose a valid number.",
    "order_confirm": "{item} ({qty}x ₹{price}) - Confirm your order? (yes/no):",
    "order_placed": "✅ Order placed! Your total: ₹{total}. Thank you! 🙏",
    "order_cancelled": "Order cancelled.",
    "thanks_feedback": "Thank you for your feedback! 🙏",
    "help": "Commands: menu - View menu | rate - Leave a review | points - Check loyalty points",
    "unknown": "I didn't understand. Type 'menu' or 'help'.",
    "points_check": "You have {points} loyalty points! 🎁",
    "exit": "Thank you! Visit again! 🙏",
}


def _msgs(lang: str) -> dict:
    return TELUGU_MESSAGES if lang == "te" else ENGLISH_MESSAGES


# ---------------------------------------------------------------------------
# Supabase helper functions
# ---------------------------------------------------------------------------


def get_or_create_customer(phone: str, db: Client) -> dict:
    """Fetch existing customer or insert a new one."""
    result = db.table("customers").select("*").eq("phone_number", phone).execute()
    if result.data:
        return result.data[0]
    new = (
        db.table("customers")
        .insert({"phone_number": phone, "preferred_language": "te"})
        .execute()
    )
    return new.data[0]


def _update_last_visit(customer_id: str, db: Client) -> None:
    from datetime import datetime, timezone

    db.table("customers").update(
        {"last_visit": datetime.now(timezone.utc).isoformat()}
    ).eq("id", customer_id).execute()


def _add_loyalty_points(customer_id: str, points: int, db: Client) -> int:
    result = db.table("customers").select("loyalty_points").eq("id", customer_id).execute()
    current = result.data[0]["loyalty_points"] if result.data else 0
    new_total = current + points
    db.table("customers").update({"loyalty_points": new_total}).eq("id", customer_id).execute()
    return new_total


def _get_available_menu(db: Client) -> list:
    result = (
        db.table("menu_items")
        .select("*")
        .eq("is_available", True)
        .order("category")
        .execute()
    )
    return result.data or []


def _save_feedback(customer_id: str, rating: int, comment: Optional[str], db: Client) -> None:
    sentiment = "positive" if rating >= 4 else ("neutral" if rating == 3 else "negative")
    db.table("feedback").insert(
        {
            "customer_id": customer_id,
            "rating": rating,
            "comment_original": comment,
            "sentiment": sentiment,
        }
    ).execute()


def _place_order(customer_id: str, item: dict, qty: int, db: Client) -> dict:
    total = float(item["price"]) * qty
    order_res = (
        db.table("orders")
        .insert(
            {
                "customer_id": customer_id,
                "total_amount": total,
                "source": "whatsapp",
            }
        )
        .execute()
    )
    order = order_res.data[0]
    db.table("order_items").insert(
        {
            "order_id": order["id"],
            "menu_item_id": item["id"],
            "quantity": qty,
            "price_at_time": float(item["price"]),
        }
    ).execute()
    return order


# ---------------------------------------------------------------------------
# Core state machine
# ---------------------------------------------------------------------------


def process_message(phone: str, message_text: str, db: Client) -> str:  # noqa: C901
    """
    Process an incoming WhatsApp message and return a reply string.
    State machine drives the conversation flow.
    """
    text = message_text.strip()
    text_lower = text.lower()

    customer = get_or_create_customer(phone, db)
    _update_last_visit(customer["id"], db)
    lang = customer.get("preferred_language", "te")
    msgs = _msgs(lang)
    state = _get_state(phone)

    # -------------------------------------------------------------------
    # Global commands (work from any state)
    # -------------------------------------------------------------------
    if text_lower in ("menu", "order"):
        menu_items = _get_available_menu(db)
        _store_data(phone, menu_items=menu_items)
        _set_state(phone, STATE_ORDER_MENU)
        return _build_menu_text(menu_items, msgs)

    if text_lower in ("rate", "review", "feedback"):
        _set_state(phone, STATE_ASK_RATING)
        return msgs["ask_rating"]

    if text_lower in ("points", "loyalty"):
        pts = customer.get("loyalty_points", 0)
        return msgs["points_check"].format(points=pts)

    if text_lower in ("help", "సహాయం"):
        return msgs["help"]

    if text_lower in ("exit", "cancel", "బయట"):
        _set_state(phone, STATE_WELCOME)
        return msgs["exit"]

    # -------------------------------------------------------------------
    # State: WELCOME — first ever contact
    # -------------------------------------------------------------------
    if state == STATE_WELCOME:
        if customer.get("name"):
            pts = customer.get("loyalty_points", 0)
            _set_state(phone, STATE_ASK_RATING)
            welcome = msgs["returning_welcome"].format(name=customer["name"], points=pts)
            return welcome + "\n\n" + msgs["ask_rating"]
        else:
            _set_state(phone, STATE_ASK_NAME)
            return msgs["welcome"]

    # -------------------------------------------------------------------
    # State: ASK_NAME
    # -------------------------------------------------------------------
    if state == STATE_ASK_NAME:
        name = text.strip()
        db.table("customers").update({"name": name}).eq("id", customer["id"]).execute()
        _store_data(phone, name=name)
        _set_state(phone, STATE_ASK_RATING)
        return msgs["ask_rating"]

    # -------------------------------------------------------------------
    # State: ASK_RATING
    # -------------------------------------------------------------------
    if state == STATE_ASK_RATING:
        if not text.isdigit() or not (1 <= int(text) <= 5):
            return msgs["invalid_rating"]
        rating = int(text)
        _store_data(phone, rating=rating)
        _set_state(phone, STATE_ASK_ITEM_FEEDBACK)
        return msgs["ask_item_feedback"]

    # -------------------------------------------------------------------
    # State: ASK_ITEM_FEEDBACK
    # -------------------------------------------------------------------
    if state == STATE_ASK_ITEM_FEEDBACK:
        data = _get_data(phone)
        rating = data.get("rating", 3)
        comment = None if text_lower == "skip" else text
        _save_feedback(customer["id"], rating, comment, db)
        # Award loyalty points (1 point per feedback)
        new_total = _add_loyalty_points(customer["id"], 1, db)
        _set_state(phone, STATE_WELCOME)
        response = msgs["thanks_feedback"] + "\n"
        response += msgs["loyalty_earned"].format(points=1)
        remaining = max(0, 50 - new_total)
        response += "\n" + msgs["total_loyalty"].format(total=new_total, remaining=remaining)
        return response

    # -------------------------------------------------------------------
    # State: ORDER_MENU
    # -------------------------------------------------------------------
    if state == STATE_ORDER_MENU:
        data = _get_data(phone)
        menu_items = data.get("menu_items", _get_available_menu(db))
        if text.isdigit():
            idx = int(text) - 1
            if 0 <= idx < len(menu_items):
                selected = menu_items[idx]
                _store_data(phone, selected_item=selected, qty=1)
                _set_state(phone, STATE_ORDER_CONFIRM)
                return msgs["order_confirm"].format(
                    item=selected["name_english"],
                    qty=1,
                    price=selected["price"],
                )
        return msgs["invalid_choice"] + "\n" + _build_menu_text(menu_items, msgs)

    # -------------------------------------------------------------------
    # State: ORDER_CONFIRM
    # -------------------------------------------------------------------
    if state == STATE_ORDER_CONFIRM:
        data = _get_data(phone)
        selected = data.get("selected_item")
        qty = data.get("qty", 1)
        if text_lower in ("yes", "y", "అవుని", "ok"):
            if selected:
                order = _place_order(customer["id"], selected, qty, db)
                total = float(selected["price"]) * qty
                # Award 1 loyalty point per order
                new_total = _add_loyalty_points(customer["id"], 1, db)
                _set_state(phone, STATE_WELCOME)
                response = msgs["order_placed"].format(total=f"{total:.2f}")
                response += "\n" + msgs["loyalty_earned"].format(points=1)
                remaining = max(0, 50 - new_total)
                response += "\n" + msgs["total_loyalty"].format(total=new_total, remaining=remaining)
                return response
        elif text_lower in ("no", "n", "కాదు"):
            _set_state(phone, STATE_WELCOME)
            return msgs["order_cancelled"]
        return msgs["order_confirm"].format(
            item=selected["name_english"] if selected else "?",
            qty=qty,
            price=selected["price"] if selected else 0,
        )

    # -------------------------------------------------------------------
    # Fallback
    # -------------------------------------------------------------------
    _set_state(phone, STATE_WELCOME)
    return msgs["unknown"]


def _build_menu_text(menu_items: list, msgs: dict) -> str:
    if not menu_items:
        return "Menu currently unavailable. Please visit us!"
    lines = [msgs["menu_header"]]
    current_category = None
    for idx, item in enumerate(menu_items, 1):
        if item["category"] != current_category:
            current_category = item["category"]
            lines.append(f"\n── {current_category.upper()} ──")
        lines.append(f"{idx}. {item['name_english']} ({item['name_telugu']}) - ₹{item['price']}")
    lines.append(msgs["menu_footer"])
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Meta WhatsApp Cloud API sender
# ---------------------------------------------------------------------------


async def send_whatsapp_message(phone: str, text: str) -> bool:
    """
    Send a text message via Meta WhatsApp Cloud API.
    Returns True on success, False otherwise.
    """
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        logger.warning("WhatsApp credentials not configured; message not sent.")
        return False

    url = f"https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone,
        "type": "text",
        "text": {"preview_url": False, "body": text},
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                return True
            logger.error("WhatsApp API error %s: %s", resp.status_code, resp.text)
            return False
    except Exception as exc:
        logger.exception("Failed to send WhatsApp message: %s", exc)
        return False
