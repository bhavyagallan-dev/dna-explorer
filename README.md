# DNA Explorer

A web-based DNA analysis tool using Biopython. Enter a DNA sequence and see its length, base composition, GC/AT percentage, reverse complement, RNA transcript and protein translation.

## Stack
- Frontend: HTML, CSS, JavaScript (`templates/index.html`, `public/`)
- Backend: Python, Flask, Biopython (`app.py`, `analysis.py`)
- Hosting: Vercel

## Run locally
```
python -m pip install -r requirements.txt
python app.py
```
Open http://127.0.0.1:5000

Try the calculations alone: `python analysis.py ATGGCC`

## API
`POST /api/analyze` with `{"sequence": "ATGGCC"}` returns the analysis as JSON.
`POST /api/fasta` with a multipart `file` returns `{"id", "sequence"}` for a single-record FASTA file.

## Rules
- Only A, T, G, C are accepted (spaces and line breaks are removed).
- The input is treated as the coding strand and translated from the first base with the standard genetic code.
- If the length is not divisible by 3, only complete codons are translated.
