"""
Build the offline portfolio-demo fixture (FLASH-V2-F6).

What this does, all offline:

  1. Writes a synthetic 6-page PDF (fictional "Harbor Point Microgrid"
     operations brief, written for this fixture) with a 4-entry outline.
  2. Runs the *real* backend (flashcard_django, certified F5 SHA) in-process
     through its HTTP API with Django's test client:
       POST /analyze/   → page/word counts, TOC sections, recommendation
       POST /generate/  → template + cards (real pipeline: section text
                          slicing, page grounding, dedup, ordering, ordinals)
       GET  /hand/ and /toc/ → the exact response shapes the app studies from
  3. Writes src/demo/fixture/harbor-point-deck.json.

The language model is NOT called. Both model seams the backend tests patch
(templater.OpenAI and flashcard_gen.CLIENT) are replaced by ScriptedModel,
which answers with study notes and cards authored by hand for this fixture
(below). Real HTTP is blocked. So the card *text* is hand-written, while
every page number, section range, ordinal and the document order are
computed by the backend's own code.

Usage (Python 3.10–3.14, the backend's requirements installed):

    python docs/portfolio/fixture/build_fixture.py <path-to-flashcard_django checkout>

The checkout should be at 9b9239d2fe74232fc0e53a6f2b537ba4d955ba5c.
"""
from __future__ import annotations

import json
import os
import pathlib
import re
import sys
import tempfile
import threading
import types
from collections import defaultdict
from types import SimpleNamespace
from unittest import mock

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
PDF_OUT = HERE / "harbor-point-operations-brief.pdf"
JSON_OUT = REPO / "src" / "demo" / "fixture" / "harbor-point-deck.json"

# The upload's file name; the app's Upload screen sends its stem as deck_name
# (src/source/api.js deckNameFor), which becomes the template/deck title.
FILENAME = "Harbor Point Microgrid Operations Brief.pdf"
DECK_NAME = FILENAME[: -len(".pdf")]
# A fixed, obviously-demo public id in the backend's format (16–32 URL-safe
# characters), so the app's isValidDeckId accepts it. Real ids are random.
DEMO_DECK_ID = "demo-harbor-point-brief"
BACKEND_SHA = "9b9239d2fe74232fc0e53a6f2b537ba4d955ba5c"

# ── The synthetic source document ──────────────────────────────────────────
# Plain ASCII so the PDF's built-in font renders every character.
TITLE_LINE = "Harbor Point Microgrid: Operations Brief"
NOTICE_LINE = ("Fictional document written for the Flashcard Maker demo. "
               "Harbor Point, its operator and every figure below are invented.")

PAGES = [
    # page 1 (section 1)
    """1. Site and System Overview

Harbor Point is a waterfront district microgrid that serves a ferry terminal, a cold-storage warehouse and a residential block of fourteen buildings. It can run connected to the regional utility or as an island when the utility supply is lost.

Generation comes from 2.4 MW of rooftop and canopy solar arrays. Storage is a 4 MWh lithium iron phosphate battery housed in two containers beside the warehouse. Two 800 kW biodiesel generators provide backup when solar output and stored energy cannot cover the critical load.

All of these resources meet the utility at a single point of common coupling, where a motorised breaker and a protection relay decide whether the district is connected or islanded.""",
    # page 2 (section 1)
    """1.1 Control and Monitoring

A central microgrid controller schedules every resource. It runs an economic dispatch cycle every five minutes, using the latest solar forecast, the battery state of charge and the measured load.

Faster decisions are left to local devices. Protection relays and the battery inverter react within milliseconds, while the controller only sets their targets. Operating data is recorded by a SCADA historian at one-second resolution and retained for three years.

1.2 Load Tiers

Loads are grouped into three tiers so that the most important equipment is protected first. Tier 1 covers the ferry terminal emergency systems and the cold-storage compressors. Tier 2 covers the residential block's lifts, water pumps and corridor lighting. Tier 3 covers everything else, including electric-vehicle chargers and decorative lighting.""",
    # page 3 (section 2)
    """2. Storage and Dispatch

The battery is the microgrid's most flexible resource, so its limits are set conservatively. While grid-connected, the battery is kept between 20% and 90% state of charge to slow cell ageing.

During storm season, from 1 June to 30 September, the controller holds a reserve of at least 35% state of charge so that the district can island at short notice.

Peak shaving is the battery's main grid-connected task. When the district's import from the utility rises above 1.8 MW, the battery discharges to hold the import at that level.""",
    # page 4 (section 2)
    """2.1 Dispatch Order

When the district must serve its own load, the controller uses solar output before anything else. Stored energy covers the remaining shortfall, and the biodiesel generators are started only when the battery falls below 25% state of charge during an island.

The generators then run at a fixed set point and recharge the battery until it reaches 60%, after which they shut down to save fuel.

2.2 Battery Limits

The battery's measured round-trip efficiency is 88%. To protect its warranty, the controller limits use to one full equivalent cycle per day.""",
    # page 5 (section 3)
    """3. Islanding and Fault Response

The protection relay at the point of common coupling watches the utility supply continuously. It opens the breaker and islands the district if utility voltage stays outside 0.88 to 1.10 per unit for more than two seconds, or if frequency leaves the 59.3 to 60.5 Hz band.

When the breaker opens, the battery inverter switches to grid-forming mode within 200 milliseconds and sets the island's voltage and frequency.

If the available supply cannot carry the whole load, Tier 3 loads are shed first, then Tier 2. Tier 1 loads are never shed automatically.

Reconnection is never automatic. The controller resynchronises with the utility only after five minutes of stable utility voltage and an operator's confirmation.""",
    # page 6 (section 4)
    """4. Maintenance and Reporting

Each month, technicians run a thermal scan of every battery rack and record any cell that runs five degrees warmer than its neighbours.

Each quarter, both generators are tested on a load bank at 75% of rated output for two hours.

Once a year, the operator carries out a full islanding test, witnessed by the utility, and files the results with the regional regulator.

Any unplanned island, shed load or equipment fault must be written up as an incident report in the operations log within 48 hours.

The operator's headline performance target is 99.95% availability for Tier 1 loads, measured over a rolling twelve months.""",
]

# PDF outline (level, title, page): four top-level sections with uneven ranges.
OUTLINE = [
    [1, "Site and System Overview", 1],
    [1, "Storage and Dispatch", 3],
    [1, "Islanding and Fault Response", 5],
    [1, "Maintenance and Reporting", 6],
]

# The plan sent to /generate/ (the Upload screen's per-section allocation,
# edited up from the recommendation so the demo has 10 cards).
PLAN = {"Site and System Overview": 3, "Storage and Dispatch": 3,
        "Islanding and Fault Response": 2, "Maintenance and Reporting": 2}

# ── Scripted model answers (hand-written for this fixture) ─────────────────
TEMPLATE_NOTES = {
    "Site and System Overview": [
        ("What does Harbor Point serve?", "A ferry terminal, a cold-storage warehouse and a 14-building residential block."),
        ("How much solar generation is installed?", "2.4 MW of rooftop and canopy arrays."),
        ("What energy storage does the site use?", "A 4 MWh lithium iron phosphate battery."),
        ("What backup generation is installed?", "Two 800 kW biodiesel generators."),
        ("How often does the controller run economic dispatch?", "Every five minutes."),
        ("Which loads are Tier 1?", "The ferry terminal emergency systems and the cold-storage compressors."),
    ],
    "Storage and Dispatch": [
        ("What state-of-charge window applies while grid-connected?", "20% to 90%."),
        ("What reserve is held in storm season?", "At least 35%, from 1 June to 30 September."),
        ("When does peak shaving start?", "When utility import rises above 1.8 MW."),
        ("In what order are resources used in an island?", "Solar, then the battery, then the generators."),
        ("When do the generators start during an island?", "When the battery falls below 25% state of charge."),
        ("What daily cycling limit protects the warranty?", "One full equivalent cycle per day."),
    ],
    "Islanding and Fault Response": [
        ("What voltage condition islands the district?", "Voltage outside 0.88 to 1.10 per unit for more than two seconds."),
        ("What frequency band is allowed?", "59.3 to 60.5 Hz."),
        ("How fast does the inverter form the island?", "Within 200 milliseconds."),
        ("In what order are loads shed?", "Tier 3 first, then Tier 2; Tier 1 is never shed automatically."),
        ("When may the microgrid reconnect?", "After five minutes of stable utility voltage and an operator's confirmation."),
        ("What sets the island's voltage and frequency?", "The battery inverter in grid-forming mode."),
    ],
    "Maintenance and Reporting": [
        ("What is checked every month?", "A thermal scan of every battery rack."),
        ("How are the generators tested each quarter?", "On a load bank at 75% of rated output for two hours."),
        ("What happens once a year?", "A full islanding test witnessed by the utility."),
        ("How soon must an incident be reported?", "Within 48 hours, in the operations log."),
        ("What is the availability target?", "99.95% for Tier 1 loads over a rolling twelve months."),
    ],
}

# Excerpts are copied verbatim from the page text (so the backend grounds an
# exact page), except one deliberately paraphrased excerpt in a two-page
# section: the backend cannot ground it, so its page is honestly unknown.
CARDS = {
    "Site and System Overview": [
        dict(front="What energy storage does the Harbor Point microgrid use?",
             back="A 4 MWh lithium iron phosphate battery",
             excerpt="Storage is a 4 MWh lithium iron phosphate battery housed in two containers beside the warehouse.",
             distractors=["A 2.4 MWh lithium iron phosphate battery", "An 800 kWh vanadium flow battery",
                          "A 4 MWh nickel manganese cobalt battery"],
             context="concept"),
        dict(front="How often does the microgrid controller run economic dispatch?",
             back="Every five minutes",
             excerpt="It runs an economic dispatch cycle every five minutes, using the latest solar forecast, the battery state of charge and the measured load.",
             distractors=["Every second", "Every fifteen minutes", "Once an hour"],
             context="process"),
        dict(front="Which loads are classed as Tier 1?",
             back="The ferry terminal emergency systems and the cold-storage compressors",
             excerpt="Tier 1 covers the ferry terminal emergency systems and the cold-storage compressors.",
             distractors=["The residential lifts, water pumps and corridor lighting",
                          "Electric-vehicle chargers and decorative lighting",
                          "The SCADA historian and the protection relays"],
             context="definition"),
    ],
    "Storage and Dispatch": [
        dict(front="What state-of-charge window does the battery keep while grid-connected?",
             back="Between 20% and 90%",
             excerpt="While grid-connected, the battery is kept between 20% and 90% state of charge to slow cell ageing.",
             distractors=["Between 10% and 100%", "Between 35% and 90%", "Between 25% and 60%"],
             context="concept"),
        dict(front="What reserve does the controller hold during storm season?",
             back="At least 35% state of charge, from 1 June to 30 September",
             excerpt="During storm season, from 1 June to 30 September, the controller holds a reserve of at least 35% state of charge so that the district can island at short notice.",
             distractors=["At least 20% state of charge, all year",
                          "At least 60% state of charge, from 1 June to 30 September",
                          "At least 35% state of charge, from 1 October to 31 March"],
             context="concept"),
        dict(front="In what order does the controller use resources when the district serves its own load?",
             back="Solar first, then the battery, then the biodiesel generators",
             # Paraphrased on purpose: no 8-word run of this appears on pages 3-4.
             excerpt="Solar is used first and stored energy next; the generators are a last resort once the battery runs low.",
             distractors=["The generators first, then solar, then the battery",
                          "The battery first, then solar, then the generators",
                          "Solar first, then the generators, then the battery"],
             context="process"),
    ],
    "Islanding and Fault Response": [
        dict(front="How quickly does the battery inverter take over after the breaker opens?",
             back="Within 200 milliseconds, in grid-forming mode",
             excerpt="When the breaker opens, the battery inverter switches to grid-forming mode within 200 milliseconds and sets the island's voltage and frequency.",
             distractors=["Within 2 seconds, in grid-following mode", "Within 20 milliseconds, in grid-following mode",
                          "Within five minutes, after operator confirmation"],
             context="process"),
        dict(front="What must happen before the microgrid reconnects to the utility?",
             back="Five minutes of stable utility voltage and an operator's confirmation",
             excerpt="The controller resynchronises with the utility only after five minutes of stable utility voltage and an operator's confirmation.",
             distractors=["Two seconds of normal utility frequency", "An automatic reclose after 200 milliseconds",
                          "A full battery and the utility's written approval"],
             context="process"),
    ],
    "Maintenance and Reporting": [
        dict(front="How are the generators load-tested each quarter?",
             back="On a load bank at 75% of rated output for two hours",
             excerpt="Each quarter, both generators are tested on a load bank at 75% of rated output for two hours.",
             distractors=["At 100% of rated output for 30 minutes", "At 50% of rated output for four hours",
                          "At 75% of rated output for eight hours"],
             context="process"),
        dict(front="How soon must an incident be written up in the operations log?",
             back="Within 48 hours",
             excerpt="Any unplanned island, shed load or equipment fault must be written up as an incident report in the operations log within 48 hours.",
             distractors=["Within 24 hours", "Within 7 days", "By the end of the month"],
             context="timeline"),
    ],
}


class ScriptedModel:
    """Answers the backend's two prompts with the hand-written content above."""

    def __init__(self):
        self.calls: list[dict] = []
        self._served: dict[str, int] = defaultdict(int)
        self._lock = threading.Lock()
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, *, model, messages, **_kw):
        system, user = messages[0]["content"], messages[1]["content"]
        if "study-note generator" in system:
            title = re.search(r'Single-section title hint: "(.+)"', user).group(1)
            payload = {"sections": [{"title": title, "bullets": [{"q": q, "a": a} for q, a in TEMPLATE_NOTES[title]]}]}
            kind = "template"
        elif "flash-card author" in system:
            section = re.search(r"^SECTION: (.+)$", user, re.M).group(1)
            want = int(re.search(r'Max items in "cards": (\d+)', system).group(1))
            with self._lock:
                start = self._served[section]
                picked = CARDS[section][start:start + want]
                self._served[section] = start + len(picked)
            # Like the real model, echo the PAGE hint; the backend ignores it.
            page_m = re.search(r"^PAGE: (\d+)$", user, re.M)
            payload = {"cards": [dict(c, section=section, **({"page": int(page_m.group(1))} if page_m else {}))
                                 for c in picked]}
            kind = "cards"
        else:
            raise AssertionError("unexpected prompt")
        with self._lock:
            self.calls.append({"kind": kind, "user": user})
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))])


def build_pdf() -> bytes:
    import fitz  # PyMuPDF

    doc = fitz.open()
    for n, body in enumerate(PAGES, start=1):
        page = doc.new_page(width=612, height=792)  # US Letter
        y = 64
        if n == 1:
            page.insert_text((64, y), TITLE_LINE, fontsize=17, fontname="hebo")
            y += 22
            page.insert_textbox(fitz.Rect(64, y, 548, y + 40), NOTICE_LINE, fontsize=9, fontname="heit",
                                color=(0.35, 0.37, 0.42))
            y += 46
        rect = fitz.Rect(64, y, 548, 730)
        left = page.insert_textbox(rect, body, fontsize=11, fontname="helv", lineheight=1.45)
        if left < 0:
            raise RuntimeError(f"page {n} text overflowed its box")
        page.insert_text((64, 758), f"Harbor Point Microgrid: Operations Brief  |  Page {n} of {len(PAGES)}  |  Fictional",
                         fontsize=8, fontname="helv", color=(0.45, 0.45, 0.45))
    doc.set_toc(OUTLINE)
    doc.set_metadata({"title": TITLE_LINE, "author": "Flashcard Maker demo fixture (synthetic)",
                      "subject": "Fictional document for an offline demo"})
    data = doc.tobytes(garbage=4, deflate=True)
    doc.close()
    return data


def run_backend(backend: pathlib.Path, pdf: bytes) -> dict:
    sys.path.insert(0, str(backend))
    os.chdir(backend)
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="flash-f6-fixture-"))

    # The backend's own deterministic test settings, with a throwaway DB.
    shim = types.ModuleType("flash_fixture_settings")
    exec("from flashsite.test_settings import *", shim.__dict__)
    shim.DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": str(tmp / "fixture.sqlite3")}}
    sys.modules["flash_fixture_settings"] = shim
    os.environ["DJANGO_SETTINGS_MODULE"] = "flash_fixture_settings"

    import django
    django.setup()
    from django.core.management import call_command
    from django.core.files.uploadedfile import SimpleUploadedFile
    from rest_framework.test import APIClient

    call_command("migrate", verbosity=0)
    model = ScriptedModel()
    patches = [
        mock.patch("flashcards.ai.pipeline.templater.OpenAI", lambda *a, **k: model),
        mock.patch("flashcards.ai.flashcard_gen.CLIENT", model),
        mock.patch("httpx.Client.send", side_effect=AssertionError("network access while building the fixture")),
    ]
    for p in patches:
        p.start()
    try:
        client = APIClient()
        upload = lambda: SimpleUploadedFile(FILENAME, pdf, content_type="application/pdf")
        analyze = client.post("/api/flashcards/analyze/", {"file": upload()}, format="multipart")
        assert analyze.status_code == 200, analyze.content
        analysis = analyze.json()

        allocations = [{"title": s["title"], "page_start": s["page_start"], "page_end": s["page_end"],
                        "cards": PLAN[s["title"]]} for s in analysis["per_section_allocation"]]
        gen = client.post("/api/flashcards/generate/", {
            "file": upload(), "deck_name": DECK_NAME,
            "cards_wanted": str(sum(PLAN.values())), "allocations": json.dumps(allocations),
        }, format="multipart")
        assert gen.status_code == 201, gen.content
        generated = gen.json()
        real_id = generated["deck_id"]

        hand = client.get("/api/flashcards/hand/", {"deck_id": real_id, "n": "all", "order": "doc"})
        toc = client.get("/api/flashcards/toc/", {"deck_id": real_id})
        assert hand.status_code == 200 and toc.status_code == 200
        return {
            "analysis": analysis, "allocations": allocations, "generated": generated,
            "hand": hand.json(), "toc": toc.json(), "real_id": real_id,
            "model_calls": {k: sum(1 for c in model.calls if c["kind"] == k) for k in ("template", "cards")},
        }
    finally:
        for p in patches:
            p.stop()


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    backend = pathlib.Path(sys.argv[1]).resolve()
    pdf = build_pdf()
    PDF_OUT.write_bytes(pdf)
    r = run_backend(backend, pdf)

    # Swap the random public id for the fixed demo id (same format).
    hand = [dict(c, deck=DEMO_DECK_ID) for c in r["hand"]]
    template = r["generated"]["template"]
    generate = {k: v for k, v in r["generated"].items() if k != "template"}
    generate["deck_id"] = DEMO_DECK_ID

    fixture = {
        "fixture": {
            "id": "harbor-point-operations-brief",
            "schema": "flash-demo-fixture/v1",
            "synthetic": True,
            "notice": ("Synthetic, fictional content written for the Flashcard Maker offline demo. "
                       "No real document, organisation or user data."),
            "provenance": {
                "card_text": "hand-written for this fixture (no language model was called)",
                "computed_by_backend": [
                    "analysis (pages, words, TOC sections, recommendation)",
                    "template section page ranges and page_source",
                    "card page grounding, section, document order and ordinals",
                ],
                "backend_sha": BACKEND_SHA,
                "method": ("docs/portfolio/fixture/build_fixture.py: real backend in-process via its HTTP API "
                           "(Django test client), model seams replaced by a scripted stand-in, network blocked"),
                "model_calls_scripted": r["model_calls"],
                "deck_id_note": "deck_id replaced with a fixed demo id in the backend's public-id format",
            },
        },
        "document": {
            "filename": FILENAME,
            "file": PDF_OUT.relative_to(REPO).as_posix(),
            "title": TITLE_LINE,
            "notice": NOTICE_LINE,
            "outline": [{"title": t, "page": p} for _lvl, t, p in OUTLINE],
            "pages": [{"page": i, "text": body} for i, body in enumerate(PAGES, start=1)],
        },
        "analysis": r["analysis"],
        "plan": {"deck_name": DECK_NAME, "cards_wanted": sum(PLAN.values()), "allocations": r["allocations"]},
        "generate": generate,
        "template": template,
        "hand": hand,
        "toc": r["toc"],
    }
    JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
    JSON_OUT.write_text(json.dumps(fixture, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    pages = [c["page"] for c in hand]
    print(f"PDF  {PDF_OUT} ({len(pdf)} bytes)")
    print(f"JSON {JSON_OUT}")
    print(f"analysis: pages={r['analysis']['pages']} words={r['analysis']['words']} "
          f"recommended={r['analysis']['recommended_cards']} sections="
          f"{[(s['title'], s['page_start'], s['page_end']) for s in r['analysis']['per_section_allocation']]}")
    print(f"generate: created={generate['cards_created']} partial={generate['partial']} warnings={generate['warnings']}")
    print(f"hand pages={pages} ordinals={[c['ordinal'] for c in hand]}")
    print(f"model calls (scripted): {r['model_calls']}")


if __name__ == "__main__":
    main()
