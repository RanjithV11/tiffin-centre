"""
models.py - Pydantic models for Tiffin Center API
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Customer
# ---------------------------------------------------------------------------


class CustomerCreate(BaseModel):
    phone_number: str = Field(..., examples=["+919876543210"])
    name: Optional[str] = None
    preferred_language: str = Field(default="te", examples=["te", "en"])


class CustomerResponse(BaseModel):
    id: UUID
    phone_number: str
    name: Optional[str]
    preferred_language: str
    loyalty_points: int
    last_visit: Optional[datetime]
    created_at: datetime


# ---------------------------------------------------------------------------
# Menu Item
# ---------------------------------------------------------------------------


class MenuItemCreate(BaseModel):
    name_telugu: str = Field(..., examples=["ఇడ్లి"])
    name_english: str = Field(..., examples=["Idli"])
    price: Decimal = Field(..., gt=0, examples=[20.0])
    category: str = Field(..., examples=["breakfast", "lunch", "drinks"])
    is_available: bool = True


class MenuItemUpdate(BaseModel):
    name_telugu: Optional[str] = None
    name_english: Optional[str] = None
    price: Optional[Decimal] = None
    category: Optional[str] = None
    is_available: Optional[bool] = None


class MenuItemResponse(BaseModel):
    id: UUID
    name_telugu: str
    name_english: str
    price: Decimal
    category: str
    is_available: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Order
# ---------------------------------------------------------------------------


class OrderItemCreate(BaseModel):
    menu_item_id: UUID
    quantity: int = Field(..., gt=0, examples=[2])


class OrderCreate(BaseModel):
    customer_id: UUID
    items: List[OrderItemCreate] = Field(..., min_length=1)
    source: str = Field(default="dashboard", examples=["dashboard", "whatsapp"])


class OrderItemResponse(BaseModel):
    id: UUID
    menu_item_id: UUID
    quantity: int
    price_at_time: Decimal


class OrderResponse(BaseModel):
    id: UUID
    customer_id: UUID
    ordered_at: datetime
    total_amount: Decimal
    source: str
    items: List[OrderItemResponse] = []


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------


class FeedbackCreate(BaseModel):
    customer_id: UUID
    rating: int = Field(..., ge=1, le=5)
    comment_original: Optional[str] = None
    sentiment: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: UUID
    customer_id: UUID
    rating: int
    comment_original: Optional[str]
    sentiment: Optional[str]
    created_at: datetime


# ---------------------------------------------------------------------------
# WhatsApp webhook
# ---------------------------------------------------------------------------


class WhatsAppMessageValue(BaseModel):
    messaging_product: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    contacts: Optional[List[Dict[str, Any]]] = None
    messages: Optional[List[Dict[str, Any]]] = None
    statuses: Optional[List[Dict[str, Any]]] = None


class WhatsAppEntry(BaseModel):
    id: Optional[str] = None
    changes: Optional[List[Dict[str, Any]]] = None


class WhatsAppMessage(BaseModel):
    """Top-level structure posted by Meta WhatsApp Cloud API webhook."""

    object: Optional[str] = None
    entry: Optional[List[WhatsAppEntry]] = None


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------


class TopItemEntry(BaseModel):
    item_name: str
    item_name_telugu: str
    count: int
    revenue: Decimal


class AnalyticsResponse(BaseModel):
    top_items: List[TopItemEntry]
    retention_stats: Dict[str, Any]
    avg_rating: float
    total_customers: int
    today_revenue: Decimal
