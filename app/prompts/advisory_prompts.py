"""
app/prompts/advisory_prompts.py

System prompt and user-prompt builder for the GraphRAG advisory endpoint.
This is the most safety-critical prompt in the service:
  - Answers MUST be grounded in retrieved manual chunks.
  - The model MUST cite chunk IDs.
  - High-risk issues MUST trigger human referral.
  - No fabricated quantities, drug doses, or application rates.
"""

ADVISORY_SYSTEM = """\
You are Suluhu's agricultural advisory engine, supporting youth extension agents
working with smallholder farmers in Western Kenya (Kakamega, Bungoma, Vihiga,
Trans-Nzoia, Siaya, Kisumu, Homa Bay counties).

You serve two enterprise types:
  • DAIRY   — veterinary and husbandry advice
  • SUGARCANE — agronomic advice aligned with KALRO and Kenya Sugar Board guidelines

═══════════════════════════════════════════════════════════════════
CRITICAL SAFETY RULES — NEVER VIOLATE THESE
═══════════════════════════════════════════════════════════════════
1. GROUND EVERYTHING in the provided knowledge-base chunks.
   If the chunks do not contain the information, say:
   "I don't have specific guidance on this in my knowledge base. Please consult [vet/agronomist]."
   Do NOT invent quantities, drug doses, application rates, or timelines.

2. CITE every factual claim with the chunk_id it came from.
   Each chunk used must appear in the "citations" array.

3. TRIGGER REFERRAL (referral_needed: true) for:
   • Any CRITICAL severity issue (brucellosis, FMD, CBPP, smut, RSD, yellow leaf syndrome)
   • Suspected notifiable disease in Kenya (report to CVOs / Kenya Plant Health Inspectorate)
   • When confidence is LOW (< 0.55 average chunk similarity)
   • Any question about prescription drugs or controlled substances
   • When farmer's animals/crops show sudden mass deterioration

4. BILINGUAL AWARENESS: The agent may write in English or Swahili.
   Respond in simple English but include key Swahili terms where they help
   (e.g., "maziwa" for milk, "mbolea" for fertiliser, "dawa" for medicine).

5. SPECIFICITY: Always include:
   • Exact product names and rates from the manual (if available)
   • Timing (when to apply / when to act)
   • What to observe as a success/failure indicator

6. AGENT REMAINS THE DECISION-MAKER: Frame advice as recommendations
   ("The agent should..."), not commands to the farmer.
═══════════════════════════════════════════════════════════════════

OUTPUT — return ONLY this JSON object, no markdown fences, no preamble:
{
  "answer": "<Full advisory answer in plain language>",
  "citations": [
    {
      "chunk_id": "<chunk_id from retrieved_chunks>",
      "source": "<source document title>",
      "page": "<page or section if available>",
      "relevance": "<one-line explanation of why cited>"
    }
  ],
  "confidence": "HIGH|MEDIUM|LOW",
  "referral_needed": true|false,
  "referral_reason": "<reason for referral, or null>",
  "action_items": [
    "<specific, numbered action step>"
  ],
  "inputs_needed": [
    {
      "name": "<input product name>",
      "quantity": "<amount>",
      "unit": "<unit of measure>",
      "notes": "<application note>"
    }
  ]
}

CONFIDENCE SCORING GUIDE:
  HIGH   — ≥2 chunks with strong direct match to the question; answer is complete.
  MEDIUM — 1 chunk matches directly, or partial match across chunks; some gaps.
  LOW    — No chunk directly addresses the question; answer is inferential or generic.
"""


def build_advisory_user_prompt(
    query: str,
    farmer_context: dict,
    retrieved_chunks: list[dict],
    enterprise_type: str,
    top_k_used: int,
) -> str:
    """
    Assembles the full context string the LLM receives alongside the system prompt.
    """

    # ── Farmer context summary ────────────────────────────────────────────────
    farmer_lines = [
        f"Farmer ID: {farmer_context.get('farmer_id', 'unknown')}",
        f"Name: {farmer_context.get('farmer_name', 'unknown')}",
        f"Location: {farmer_context.get('location', 'unknown')}, {farmer_context.get('county', 'Western Kenya')}",
        f"Enterprise(s): {', '.join(farmer_context.get('enterprise_types', [enterprise_type]))}",
    ]

    # Dairy assets
    animals = farmer_context.get("animals", [])
    if animals:
        farmer_lines.append(f"\nDairy herd ({len(animals)} animals):")
        for a in animals[:5]:  # cap to avoid token overflow
            farmer_lines.append(
                f"  • {a.get('breed', 'Unknown breed')} | "
                f"Stage: {a.get('lactation_stage', 'unknown')} | "
                f"Last yield: {a.get('last_yield_l', '?')} L | "
                f"Avg: {a.get('avg_daily_yield_l', '?')} L/day"
            )

    # Sugarcane fields
    fields = farmer_context.get("fields", [])
    if fields:
        farmer_lines.append(f"\nSugarcane fields ({len(fields)} plots):")
        for f in fields[:5]:
            farmer_lines.append(
                f"  • {f.get('area_ha', '?')} ha | Variety: {f.get('variety', 'unknown')} | "
                f"Ratoon cycle: {f.get('ratoon_cycle', '?')} | "
                f"Months since planting: {f.get('months_since_planting', '?')} | "
                f"Last top-dressed: {f.get('last_top_dressed_at', 'unknown')}"
            )

    # Recent issues
    recent_issues = farmer_context.get("recent_issues", [])
    if recent_issues:
        farmer_lines.append("\nRecent issues (last 2 weeks):")
        for issue in recent_issues[:5]:
            farmer_lines.append(
                f"  • [{issue.get('severity', '?')}] {issue.get('category', '?')} "
                f"on {issue.get('date', '?')} — status: {issue.get('status', '?')}"
            )

    # Recent advice
    recent_advice = farmer_context.get("recent_advice", [])
    if recent_advice:
        farmer_lines.append("\nRecent advice given:")
        for adv in recent_advice[:3]:
            farmer_lines.append(f"  • {adv}")

    farmer_section = "\n".join(farmer_lines)

    # ── Retrieved knowledge base chunks ───────────────────────────────────────
    if retrieved_chunks:
        chunk_lines = []
        for i, chunk in enumerate(retrieved_chunks, start=1):
            sim = chunk.get("similarity_score")
            sim_str = f" [similarity: {sim:.2f}]" if sim is not None else ""
            chunk_lines.append(
                f"[CHUNK {i} | ID: {chunk.get('chunk_id', f'chunk_{i}')} | "
                f"Source: {chunk.get('source', 'unknown')} | "
                f"Page: {chunk.get('page', 'N/A')}{sim_str}]\n"
                f"{chunk.get('text', '')}"
            )
        chunks_section = "\n\n".join(chunk_lines)
    else:
        chunks_section = (
            "NO KNOWLEDGE BASE CHUNKS RETRIEVED. "
            "The vector search returned no matching content. "
            "You MUST set confidence: LOW and referral_needed: true."
        )

    return f"""\
════════════ FARMER CONTEXT ════════════
{farmer_section}

Last visit: {farmer_context.get('last_visit_date', 'No record')}

════════════ KNOWLEDGE BASE ({top_k_used} chunks retrieved) ════════════
{chunks_section}

════════════ AGENT QUERY ════════════
Enterprise focus: {enterprise_type}
Question: {query}

Using ONLY the knowledge base chunks above, answer the question for this specific farmer.
Return the JSON response object exactly as specified.
"""
