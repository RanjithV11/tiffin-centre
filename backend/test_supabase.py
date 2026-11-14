"""
test_supabase.py - Diagnostic tool to verify Supabase connection and tables
"""

import os
import sys
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()

print("=" * 60)
print("🔍 SUPABASE CONNECTION DIAGNOSTIC")
print("=" * 60)

print(f"1. SUPABASE_URL: {SUPABASE_URL if SUPABASE_URL else '❌ NOT SET'}")
if SUPABASE_KEY:
    masked_key = SUPABASE_KEY[:10] + "..." + SUPABASE_KEY[-6:] if len(SUPABASE_KEY) > 20 else "***"
    print(f"2. SUPABASE_KEY: {masked_key} (length: {len(SUPABASE_KEY)})")
else:
    print("2. SUPABASE_KEY: ❌ NOT SET")

is_placeholder = (
    not SUPABASE_URL
    or not SUPABASE_KEY
    or "your-project" in SUPABASE_URL
    or "your-anon-key" in SUPABASE_KEY
)

if is_placeholder:
    print("\n⚠️ WARNING: Your backend/.env still has placeholder values!")
    print("   Please edit C:\\Users\\ranji\\.gemini\\antigravity\\scratch\\tiffin-center\\backend\\.env")
    print("   and replace 'https://your-project.supabase.co' with your real Supabase URL.")
    sys.exit(0)

print("\n3. Testing connection to Supabase...")
try:
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("   ✅ Supabase client initialized successfully!")
except Exception as e:
    print(f"   ❌ Failed to create Supabase client: {e}")
    sys.exit(1)

# Check required tables
tables = ["menu_items", "customers", "orders", "order_items", "feedback"]
print("\n4. Checking required database tables in Supabase:")

missing_tables = []
for table in tables:
    try:
        res = client.table(table).select("*").limit(1).execute()
        print(f"   ✅ Table '{table}' exists! (rows: {len(res.data or [])})")
    except Exception as e:
        print(f"   ❌ Table '{table}' NOT FOUND or inaccessible: {e}")
        missing_tables.append(table)

if missing_tables:
    print("\n⚠️ ACTION REQUIRED: Missing tables in Supabase!")
    print(f"   The following tables need to be created: {', '.join(missing_tables)}")
    print("   👉 Go to your Supabase Dashboard: https://supabase.com")
    print("   👉 Click 'SQL Editor' on the left menu")
    print("   👉 Copy & paste the SQL code from 'database.create_tables_sql' and click 'RUN'")
else:
    print("\n🎉 ALL CHECKS PASSED! Supabase is fully configured and connected.")
