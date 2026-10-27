# PLACEHOLDER CASE. Replace with the real Case 1 ("The Stolen Bike").
# It only exists to exercise the case pipeline, and it shows the interface
# every generator follows: generate(seed) returns {"datasets": ..., "answers": ...}.

import random

NAMES = [
    "Dana Reyes", "Sam Ortiz", "Priya Shah", "Leo Kim",
    "Mara Novak", "Theo Grant", "Iris Bell", "Omar Haddad",
]
DAYTIME_PLACES = ["bike rack", "lobby", "cafe", "parking lot"]


def generate(seed):
    rng = random.Random(seed)
    people = rng.sample(NAMES, len(NAMES))
    culprit, bystander, others = people[0], people[1], people[2:]

    planted = {"name": culprit, "place": "bike rack", "time": "18:52", "note": "seen with bolt cutters"}
    herring = {"name": bystander, "place": "bike rack", "time": "18:15", "note": "locked own bike"}

    # Everyone else is only around before 18:00, so the checkpoint answer stays exact.
    filler = [
        {
            "name": rng.choice(others),
            "place": rng.choice(DAYTIME_PLACES),
            "time": f"{rng.randint(8, 17):02d}:{rng.randint(0, 59):02d}",
            "note": rng.choice(["passing through", "coffee run", "meeting", "parked car"]),
        }
        for _ in range(10)
    ]

    shuffled = [planted, herring] + filler
    rng.shuffle(shuffled)
    # Ids are assigned after shuffling so their order gives nothing away.
    records = [{"id": f"BK-{n:04d}", **r} for n, r in enumerate(shuffled, start=1)]
    evidence_id = records[shuffled.index(planted)]["id"]

    return {
        "datasets": {
            "records": records,
        },
        "answers": {
            "checkpoints": [
                {
                    "question": "Who was at the bike rack after 18:00?",
                    "kind": "set",
                    "answer": [culprit, bystander],
                },
            ],
            "culprit": culprit,
            "evidence": [evidence_id],
        },
    }
