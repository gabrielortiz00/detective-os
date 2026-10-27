# Game-side Python that runs in the worker. It is executed into a private
# namespace, never imported, so player code has no module to reach it through.

import copy

CHECKPOINT_KINDS = {"set", "ordered", "number", "text"}


class CaseError(Exception):
    pass


def _check(condition, message):
    if not condition:
        raise CaseError(message)


def load_case(source, seed):
    """Run a generator privately and return (datasets, answers)."""
    namespace = {"__name__": "case_generator"}
    exec(source, namespace)
    _check(callable(namespace.get("generate")), "generator has no generate(seed) function")

    result = namespace["generate"](seed)
    _check(isinstance(result, dict), "generate() must return a dict")
    _check(set(result) == {"datasets", "answers"}, 'generate() must return exactly "datasets" and "answers"')

    datasets = result["datasets"]
    _check(isinstance(datasets, dict) and datasets, '"datasets" must be a non-empty dict')
    for name in datasets:
        # Each name becomes a player variable, so it has to be a usable one.
        _check(isinstance(name, str) and name.isidentifier(), f"dataset name {name!r} is not a valid variable name")
        _check(name != "case", 'a dataset can\'t be named "case"')

    answers = result["answers"]
    _check(isinstance(answers, dict), '"answers" must be a dict')
    checkpoints = answers.get("checkpoints")
    _check(isinstance(checkpoints, list) and checkpoints, '"checkpoints" must be a non-empty list')
    for i, checkpoint in enumerate(checkpoints):
        _check(isinstance(checkpoint, dict), f"checkpoint {i} must be a dict")
        _check(isinstance(checkpoint.get("question"), str), f"checkpoint {i} needs a question")
        _check("answer" in checkpoint, f"checkpoint {i} needs an answer")
        checkpoint.setdefault("kind", "set")
        _check(checkpoint["kind"] in CHECKPOINT_KINDS, f"checkpoint {i} has unknown kind {checkpoint['kind']!r}")
    _check(isinstance(answers.get("culprit"), str), '"culprit" must be a string')
    evidence = answers.get("evidence")
    _check(isinstance(evidence, list) and evidence, '"evidence" must be a non-empty list of record ids')

    return datasets, answers


class Case:
    def __init__(self, datasets):
        self._datasets = datasets

    def __repr__(self):
        return "<case: call case.files() to see the data>"

    def files(self):
        """Print each dataset with its size and fields."""
        rows = [(name, *_describe(value)) for name, value in self._datasets.items()]
        name_width = max(len(name) for name, _, _ in rows)
        size_width = max(len(size) for _, size, _ in rows)
        for name, size, fields in rows:
            line = f"{name.ljust(name_width)}   {size.ljust(size_width)}"
            if fields:
                line += "   fields: " + ", ".join(fields)
            print(line.rstrip())


def _describe(value):
    if isinstance(value, list):
        # Collect keys across all records, since messy data may skip some.
        fields = []
        for record in value:
            if isinstance(record, dict):
                fields += [key for key in record if key not in fields]
        return f"{len(value)} records", fields
    if isinstance(value, dict):
        return f"{len(value)} entries", []
    return type(value).__name__, []


def player_globals(datasets):
    """A fresh namespace for one run, with copies the player can freely wreck."""
    namespace = {name: copy.deepcopy(value) for name, value in datasets.items()}
    namespace["case"] = Case({name: namespace[name] for name in datasets})
    return namespace
