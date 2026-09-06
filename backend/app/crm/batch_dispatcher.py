"""
Background Batch WhatsApp Dispatcher with Live State & Database Persistence
Allows starting, pausing, resuming, and stopping automated campaign sequences.
Guarantees that every dispatched lead is immediately updated in the database.
"""
import asyncio
import os
import httpx
from typing import Dict, Any, Optional
from ..database.crm_db import get_leads_by_campaign, mark_lead_whatsapp_sent, get_campaigns_list

GATEWAY_URL = os.getenv("WHATSAPP_GATEWAY_URL", "http://127.0.0.1:3001")

class CampaignBatchManager:
    def __init__(self):
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.state: Dict[str, Dict[str, Any]] = {}
        self.pause_events: Dict[str, asyncio.Event] = {}
        self.stop_flags: Dict[str, bool] = {}

    def get_status(self, campaign_id: str) -> Dict[str, Any]:
        if campaign_id not in self.state:
            leads = get_leads_by_campaign(campaign_id)
            sent = sum(1 for l in leads if l.get("whatsapp_status") == "sent")
            return {
                "campaign_id": campaign_id,
                "status": "idle",
                "total": len(leads),
                "sent": sent,
                "failed": 0,
                "pending": len(leads) - sent,
                "current_index": 0,
                "current_lead_name": "",
                "current_lead_phone": "",
                "delay_seconds": 10,
                "error": None
            }
        return self.state[campaign_id]

    async def start_campaign_batch(self, campaign_id: str, delay_seconds: int = 10, image_path: Optional[str] = None):
        """Starts or restarts the sequential dispatch for a campaign."""
        # Stop existing if running
        if campaign_id in self.active_tasks and not self.active_tasks[campaign_id].done():
            self.stop_flags[campaign_id] = True
            await asyncio.sleep(0.5)

        self.pause_events[campaign_id] = asyncio.Event()
        self.pause_events[campaign_id].set() # Initially running
        self.stop_flags[campaign_id] = False

        leads = get_leads_by_campaign(campaign_id)
        # Filter only pending leads
        pending_leads = [l for l in leads if l.get("whatsapp_status") != "sent"]
        already_sent = len(leads) - len(pending_leads)

        self.state[campaign_id] = {
            "campaign_id": campaign_id,
            "status": "running",
            "total": len(leads),
            "sent": already_sent,
            "failed": 0,
            "pending": len(pending_leads),
            "current_index": already_sent,
            "current_lead_name": "",
            "current_lead_phone": "",
            "delay_seconds": max(3, delay_seconds),
            "error": None
        }

        task = asyncio.create_task(self._run_loop(campaign_id, pending_leads, image_path, delay_seconds))
        self.active_tasks[campaign_id] = task
        return self.state[campaign_id]

    async def _run_loop(self, campaign_id: str, pending_leads: list, image_path: Optional[str], delay_seconds: int):
        print(f"[Batch Dispatcher] Starting batch for {campaign_id}: {len(pending_leads)} leads to send...")

        async with httpx.AsyncClient(timeout=25.0) as client:
            for idx, lead in enumerate(pending_leads):
                # Check stop flag
                if self.stop_flags.get(campaign_id):
                    print(f"[Batch Dispatcher] Campaign {campaign_id} stopped by user.")
                    self.state[campaign_id]["status"] = "stopped"
                    return

                # Check pause event
                if not self.pause_events[campaign_id].is_set():
                    self.state[campaign_id]["status"] = "paused"
                    print(f"[Batch Dispatcher] Campaign {campaign_id} paused. Waiting...")
                    await self.pause_events[campaign_id].wait()
                    self.state[campaign_id]["status"] = "running"
                    print(f"[Batch Dispatcher] Campaign {campaign_id} resumed.")

                lead_id = lead["id"]
                name = lead.get("name", "Inversor")
                phone = lead.get("phone", "")
                message = lead.get("personalized_message") or "Hola, te contacto desde nuestro equipo de inversiones en Dubai."

                # Update live state
                self.state[campaign_id]["current_index"] += 1
                self.state[campaign_id]["current_lead_name"] = name
                self.state[campaign_id]["current_lead_phone"] = phone

                # Flyer check: if flyer not specified, check default for campaign
                effective_image = image_path
                if not effective_image:
                    if "spain" in campaign_id.lower() or "madrid" in campaign_id.lower():
                        effective_image = "/app/whatsapp-gateway/uploads/dubai_madrid_event.jpg"
                    elif "miami" in campaign_id.lower():
                        effective_image = "/app/whatsapp-gateway/uploads/dubai_miami_event.jpg"

                payload = {
                    "to": phone,
                    "message": message,
                    "image_path": effective_image if effective_image and os.path.exists(effective_image) else None
                }

                try:
                    r = await client.post(f"{GATEWAY_URL}/send", json=payload)
                    data = r.json()
                    if data.get("success"):
                        # Permanently mark as sent in database
                        mark_lead_whatsapp_sent(lead_id, sent_type="auto")
                        self.state[campaign_id]["sent"] += 1
                        self.state[campaign_id]["pending"] = max(0, self.state[campaign_id]["pending"] - 1)
                        print(f"[Batch Dispatcher] ✅ [{idx+1}/{len(pending_leads)}] Sent to {name} ({phone})")
                    else:
                        self.state[campaign_id]["failed"] += 1
                        self.state[campaign_id]["error"] = data.get("error", "Gateway error")
                        print(f"[Batch Dispatcher] ⚠️ [{idx+1}/{len(pending_leads)}] Failed for {name}: {data.get('error')}")
                except Exception as e:
                    self.state[campaign_id]["failed"] += 1
                    self.state[campaign_id]["error"] = str(e)
                    print(f"[Batch Dispatcher] ❌ Network error for {name}: {e}")

                # Delay before next lead
                if idx < len(pending_leads) - 1:
                    await asyncio.sleep(delay_seconds)

        self.state[campaign_id]["status"] = "completed"
        self.state[campaign_id]["current_lead_name"] = "Completado"
        self.state[campaign_id]["current_lead_phone"] = ""
        print(f"[Batch Dispatcher] Sequence completed for campaign {campaign_id}!")

    def pause(self, campaign_id: str):
        if campaign_id in self.pause_events:
            self.pause_events[campaign_id].clear()
            if campaign_id in self.state:
                self.state[campaign_id]["status"] = "paused"
            return True
        return False

    def resume(self, campaign_id: str):
        if campaign_id in self.pause_events:
            self.pause_events[campaign_id].set()
            if campaign_id in self.state:
                self.state[campaign_id]["status"] = "running"
            return True
        return False

    def stop(self, campaign_id: str):
        self.stop_flags[campaign_id] = True
        if campaign_id in self.pause_events:
            self.pause_events[campaign_id].set() # Unpause to exit loop
        if campaign_id in self.state:
            self.state[campaign_id]["status"] = "stopped"
        return True

# Global instance
batch_manager = CampaignBatchManager()
