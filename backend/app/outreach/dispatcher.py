import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from ..models.schemas import OutreachCampaign, ProspectProfile, TriageRequest, TriageResponse, DossierResponse

SAMPLE_CAMPAIGNS: List[OutreachCampaign] = []

def create_outreach_campaign(prospect: ProspectProfile, dossier: DossierResponse) -> OutreachCampaign:
    campaign_id = f"cmp-{uuid.uuid4().hex[:8]}"
    
    # Subject line oriented towards wealth structuring and liquidity mitigation
    subject = f"Confidential: Fiscal Arbitrage & Golden Visa Allocation model for {prospect.name}"
    
    # Body written from the perspective of an institutional family office partner
    body = f"""Dear {prospect.name},

Congratulations on the recent milestone with {prospect.company_name}. 

Given the recent fiscal developments and capital gains exposure in {prospect.country}, we have structured a private, confidential Capital Preservation & Tax Arbitrage Model specifically for your liquidity profile.

Key takeaways from your custom model:
• Estimated 5-Year Fiscal Drag Mitigation: ${dossier.tax_analysis.five_year_savings_usd:,.0f} USD
• 10-Year Renewable UAE Golden Visa Qualification (+2M AED allocation)
• Target Net Rental Yields: 7.8% - 8.9% in DLD Escrow-backed trophy developments

You can review your confidential analysis and interactive projections here:
https://dubai-capital-radar.onrender.com/dossier/{dossier.slug}

We would be pleased to coordinate a brief, 15-minute executive briefing with our DIFC structuring team at your convenience.

Best regards,

Private Client Advisory
Dubai Capital Radar | DIFC Asset Management
"""

    # LinkedIn InMail copy (High status, brief, executive)
    linkedin_copy = (
        f"Hi {prospect.name.split()[0]}, congratulations on the recent milestone with {prospect.company_name}. "
        f"Following the fiscal shifts in {prospect.country}, we prepared a private 5-year tax arbitrage model "
        f"showing an estimated ${dossier.tax_analysis.five_year_savings_usd:,.0f} USD in capital preservation "
        f"via DLD escrow-backed Tier-1 assets and a 10-year UAE Golden Visa. "
        f"You can review your private portal here: https://dubai-capital-radar.onrender.com/dossier/{dossier.slug} - Best regards."
    )

    # WhatsApp Direct message (Conversational, VIP direct)
    whatsapp_copy = (
        f"Hello {prospect.name}, hope you are having a productive week. "
        f"Regarding your liquidity milestone at {prospect.company_name}, we structured a confidential "
        f"Dubai Real Estate & Golden Visa allocation portfolio for you (0% capital gains tax + 8.8% net rental yields). "
        f"Here is your private interactive model: https://dubai-capital-radar.onrender.com/dossier/{dossier.slug}"
    )

    campaign = OutreachCampaign(
        id=campaign_id,
        name=f"Multi-Channel Arbitrage Outreach - {prospect.name}",
        prospect_id=prospect.id,
        prospect_name=prospect.name,
        prospect_email=prospect.email,
        channel="multi-channel",
        subject_line=subject,
        body_content=body,
        linkedin_message=linkedin_copy,
        whatsapp_message=whatsapp_copy,
        status="sent",
        dossier_slug=dossier.slug,
        sent_at=datetime.now(),
        last_response=None,
        ai_sentiment=None
    )
    SAMPLE_CAMPAIGNS.insert(0, campaign)
    return campaign

def triage_incoming_response(request: TriageRequest) -> TriageResponse:
    """
    Classifies the sentiment of an incoming lead response and crafts an institutional counter-reply.
    Uses Gemini API if available, or high-accuracy rule-based NLP.
    """
    text_lower = request.message.lower()
    
    gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if gemini_api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_api_key)
            model = genai.GenerativeModel("gemini-3.6-flash")
            prompt = f"""
            You are a senior real estate structuring advisor in Dubai.
            Analyze this message from prospect '{request.sender_name}':
            "{request.message}"

            Return a brief response in JSON format with:
            1. sentiment (positive, objection, interested_in_residency, price_concern, negative)
            2. action_required (schedule_call, send_escrow_proof, clarify_taxes)
            3. priority_level (URGENT, HIGH, MEDIUM, LOW)
            4. suggested_reply (A polite, ultra-professional 3-sentence reply addressing their exact point and proposing a Zoom call or WhatsApp conversation).
            """
            result = model.generate_content(prompt)
            if result and result.text:
                import json
                cleaned = result.text.strip().replace("```json", "").replace("```", "").strip()
                parsed = json.loads(cleaned)
                return TriageResponse(
                    sentiment=parsed.get("sentiment", "positive"),
                    suggested_reply=parsed.get("suggested_reply", ""),
                    action_required=parsed.get("action_required", "schedule_call"),
                    priority_level=parsed.get("priority_level", "HIGH")
                )
        except Exception:
            pass

    # High-accuracy fallback NLP classifier
    if any(w in text_lower for w in ["call", "meet", "schedule", "zoom", "tomorrow", "tuesday", "monday", "discuss", "interested"]):
        sentiment = "positive"
        action = "schedule_call"
        priority = "URGENT"
        suggested = (
            f"Thank you for your response, {request.sender_name}. I would be delighted to walk you through the numbers "
            f"and the specific DLD escrow allocations. Would tomorrow at 3:00 PM GMT or 5:00 PM GMT work best for a brief 15-minute video call? "
            f"Alternatively, feel free to book directly on my calendar: {DossierResponse.__fields__['calendly_link'].default or 'https://calendly.com'}."
        )
    elif any(w in text_lower for w in ["visa", "residency", "passport", "family", "relocate", "relocation"]):
        sentiment = "interested_in_residency"
        action = "clarify_taxes"
        priority = "HIGH"
        suggested = (
            f"Thank you for highlighting that, {request.sender_name}. The 10-Year UAE Golden Visa is granted directly upon "
            f"the registration of your property title or off-plan Oqood contract (minimum 2,000,000 AED / $545,000 USD). "
            f"This extends full residency, 100% foreign business ownership, and zero personal taxation to you and your immediate family. "
            f"Shall I send over the step-by-step DIFC residency compliance checklist?"
        )
    elif any(w in text_lower for w in ["risk", "escrow", "safe", "market", "bubble", "guarantee"]):
        sentiment = "objection"
        action = "send_escrow_proof"
        priority = "HIGH"
        suggested = (
            f"Understood completely, {request.sender_name}. Risk mitigation is our first priority. In Dubai, 100% of investor funds "
            f"are held in official Dubai Land Department (DLD) escrow trust accounts and released strictly upon verified construction milestones. "
            f"I have compiled the official escrow audit certificates for our recommended projects so you can review the sovereign guarantees."
        )
    else:
        sentiment = "positive"
        action = "schedule_call"
        priority = "MEDIUM"
        suggested = (
            f"Thank you for getting in touch, {request.sender_name}. We have updated your financial model with the latest developer pricing "
            f"and payment structures. Let's schedule a brief 10-minute briefing to review your personalized portfolio allocation."
        )

    return TriageResponse(
        sentiment=sentiment,
        suggested_reply=suggested,
        action_required=action,
        priority_level=priority
    )

def get_all_campaigns() -> List[OutreachCampaign]:
    return SAMPLE_CAMPAIGNS
