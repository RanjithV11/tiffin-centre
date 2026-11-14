"""
qr_generator.py - WhatsApp QR code generator for table ordering
"""

from __future__ import annotations

import base64
import io
import os
import tempfile
from urllib.parse import quote

try:
    import qrcode
    from PIL import Image, ImageDraw, ImageFont
    QR_AVAILABLE = True
except ImportError:
    QR_AVAILABLE = False


def generate_table_qr(
    table_number: int,
    whatsapp_number: str,
    business_name: str = "Sri Lakshmi Tiffin",
) -> str:
    """
    Generate a QR code PNG that opens WhatsApp with a pre-filled Telugu greeting.
    Saves to a cross-platform temp directory and returns the file path.
    """
    if not QR_AVAILABLE:
        raise RuntimeError(
            "qrcode and Pillow packages are required. "
            "Install them with: pip install qrcode[pil] Pillow"
        )

    # Telugu pre-filled message
    telugu_message = f"నమస్కారం! Table {table_number} నుండి వస్తున్నాను."
    encoded_message = quote(telugu_message)

    # Sanitise phone number (remove + and spaces)
    clean_number = whatsapp_number.lstrip("+").replace(" ", "").replace("-", "")
    if not clean_number:
        clean_number = "917097760912"
    whatsapp_url = f"https://wa.me/{clean_number}?text={encoded_message}"

    # --- Generate QR code ---
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(whatsapp_url)
    qr.make(fit=True)

    qr_img: Image.Image = qr.make_image(fill_color="#075E54", back_color="white").convert("RGB")

    # --- Add banner label ---
    banner_height = 60
    total_width = qr_img.width
    total_height = qr_img.height + banner_height

    final_img = Image.new("RGB", (total_width, total_height), color="white")
    final_img.paste(qr_img, (0, 0))

    draw = ImageDraw.Draw(final_img)

    # Font detection
    font_large = None
    font_small = None
    font_paths = [
        "C:\\Windows\\Fonts\\arialbd.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                from PIL import ImageFont as _IF
                font_large = _IF.truetype(fp, 18)
                font_small = _IF.truetype(fp, 12)
                break
            except Exception:
                pass

    # Title line
    title = f"{business_name} - Warangal"
    table_label = f"Table {table_number}  |  Scan to Chat via WhatsApp"

    banner_y = qr_img.height + 6
    if font_large:
        draw.text((total_width // 2, banner_y), title, fill="#075E54", font=font_large, anchor="mt")
        draw.text((total_width // 2, banner_y + 24), table_label, fill="#333333", font=font_small, anchor="mt")
    else:
        draw.text((10, banner_y), title, fill="#075E54")
        draw.text((10, banner_y + 20), table_label, fill="#333333")

    # --- Cross-platform save ---
    output_dir = os.path.join(tempfile.gettempdir(), "tiffin_qr")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"qr_table_{table_number}.png")
    final_img.save(output_path, format="PNG", optimize=True)
    return output_path


def generate_qr_base64(table_number: int, whatsapp_number: str) -> str:
    """Generate QR and return as data:image/png;base64 string for direct browser rendering."""
    file_path = generate_table_qr(table_number, whatsapp_number)
    with open(file_path, "rb") as f:
        data = f.read()
    b64 = base64.b64encode(data).decode("utf-8")
    return f"data:image/png;base64,{b64}"
