"""DNA analysis logic. Pure functions, no Flask here."""
from io import StringIO

from Bio import SeqIO
from Bio.Seq import Seq
from Bio.SeqUtils import gc_fraction

VALID_BASES = set("ATGC")


class SequenceError(ValueError):
    """Raised when the input is not a usable DNA sequence."""


def clean_sequence(raw: str) -> str:
    """Remove whitespace and uppercase the input."""
    return "".join(raw.split()).upper()


def validate_sequence(sequence: str) -> None:
    if not sequence:
        raise SequenceError("Please enter a DNA sequence.")
    invalid = sorted(set(sequence) - VALID_BASES)
    if invalid:
        raise SequenceError(
            f"Invalid letters found: {', '.join(invalid)}. Only A, T, G and C are allowed."
        )


def analyze(raw: str) -> dict:
    sequence = clean_sequence(raw)
    validate_sequence(sequence)

    seq = Seq(sequence)
    length = len(seq)
    gc_percent = round(gc_fraction(seq) * 100, 2)
    at_percent = round(100 - gc_percent, 2)

    leftover = length % 3
    coding = seq[: length - leftover]
    protein = str(coding.translate()) if len(coding) else ""

    return {
        "sequence": sequence,
        "length": length,
        "counts": {base: sequence.count(base) for base in "ATGC"},
        "gc_percent": gc_percent,
        "at_percent": at_percent,
        "reverse_complement": str(seq.reverse_complement()),
        "rna": str(seq.transcribe()),
        "protein": protein,
        "codons_translated": len(coding) // 3,
        "bases_skipped": leftover,
    }


def parse_fasta(text: str) -> dict:
    records = list(SeqIO.parse(StringIO(text), "fasta"))
    if len(records) != 1:
        raise SequenceError(
            f"The FASTA file must contain exactly one sequence (found {len(records)})."
        )
    record = records[0]
    return {"id": record.id, "sequence": str(record.seq).upper()}


if __name__ == "__main__":
    import json
    import sys

    print(json.dumps(analyze(sys.argv[1] if len(sys.argv) > 1 else "ATGGCC"), indent=2))
