import sqlite3
import os
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "usage.db"

PRICING = {
    "gemini-3-flash-preview": {"prompt": 0.075 / 1000000, "completion": 0.30 / 1000000},
    "gemini-1.5-flash": {"prompt": 0.075 / 1000000, "completion": 0.30 / 1000000},
    "gemini-1.5-pro": {"prompt": 1.25 / 1000000, "completion": 5.00 / 1000000},
    "llama-3.3-70b-versatile": {"prompt": 0.59 / 1000000, "completion": 0.79 / 1000000},
    "default": {"prompt": 0.10 / 1000000, "completion": 0.30 / 1000000}
}

MAX_BUDGET = 5.00 # $5 budget cap

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS api_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            model TEXT,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            cost REAL
        )
    ''')
    conn.commit()
    conn.close()

def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    rates = PRICING.get(model, PRICING["default"])
    return (prompt_tokens * rates["prompt"]) + (completion_tokens * rates["completion"])

def log_usage(model: str, prompt_tokens: int, completion_tokens: int):
    cost = calculate_cost(model, prompt_tokens, completion_tokens)
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''
        INSERT INTO api_usage (model, prompt_tokens, completion_tokens, cost)
        VALUES (?, ?, ?, ?)
    ''', (model, prompt_tokens, completion_tokens, cost))
    conn.commit()
    conn.close()

def get_total_cost() -> float:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT SUM(cost) FROM api_usage')
    result = cursor.fetchone()[0]
    conn.close()
    return result or 0.0

def get_usage_stats() -> dict:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT model, SUM(prompt_tokens), SUM(completion_tokens), SUM(cost) FROM api_usage GROUP BY model')
    rows = cursor.fetchall()
    
    breakdown = []
    total_cost = 0.0
    for row in rows:
        breakdown.append({
            "model": row[0],
            "prompt_tokens": row[1],
            "completion_tokens": row[2],
            "cost": row[3]
        })
        total_cost += row[3]
        
    conn.close()
    return {
        "total_cost": total_cost,
        "budget": MAX_BUDGET,
        "is_capped": total_cost >= MAX_BUDGET,
        "breakdown": breakdown
    }

def patch_groq_client():
    try:
        from groq.resources.chat.completions import Completions
        original_create = Completions.create
        
        def token_tracking_create(self, *args, **kwargs):
            if get_total_cost() >= MAX_BUDGET:
                raise ValueError(f"API Budget Limit Exceeded (${MAX_BUDGET}). No further calls allowed.")
                
            response = original_create(self, *args, **kwargs)
            try:
                if hasattr(response, 'usage') and response.usage is not None:
                    prompt_tokens = response.usage.prompt_tokens or 0
                    completion_tokens = response.usage.completion_tokens or 0
                    model_name = kwargs.get('model', 'groq-unknown')
                    log_usage(model_name, prompt_tokens, completion_tokens)
            except Exception as e:
                print(f"Error logging Groq usage: {e}")
            return response
            
        Completions.create = token_tracking_create # type: ignore
    except ImportError:
        pass

