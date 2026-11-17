from flask import Flask, jsonify, render_template, request

from analysis import SequenceError, analyze, parse_fasta

# public/ is served by Vercel's CDN in production; locally Flask serves it at the same URLs.
app = Flask(__name__, static_folder="public", static_url_path="")


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/analyze")
def analyze_route():
    body = request.get_json(silent=True)
    if not body or not isinstance(body.get("sequence"), str):
        return jsonify(error='Send JSON like {"sequence": "ATGGCC"}.'), 400
    try:
        return jsonify(analyze(body["sequence"]))
    except SequenceError as exc:
        return jsonify(error=str(exc)), 400


@app.post("/api/fasta")
def fasta_route():
    upload = request.files.get("file")
    if upload is None:
        return jsonify(error="No file uploaded."), 400
    try:
        return jsonify(parse_fasta(upload.read().decode("utf-8")))
    except (SequenceError, UnicodeDecodeError) as exc:
        return jsonify(error=str(exc)), 400


if __name__ == "__main__":
    app.run(debug=True)
