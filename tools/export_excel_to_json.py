import pandas as pd
import json
from pathlib import Path

EXCEL_PATH = "Plan_de_continuite_documents_et_consignes_v7_offre_angle_marketing_MAJ.xlsx"
OUT_DIR = Path("data")
OUT_DIR.mkdir(exist_ok=True)

def to_json(df, out_path):
    df = df.copy()
    df = df.where(pd.notnull(df), None)

    records = []
    for row in df.to_dict(orient="records"):
        clean = {}
        for k, v in row.items():
            if isinstance(v, float) and pd.isna(v):
                clean[k] = None
            else:
                clean[k] = v
        records.append(clean)

    out_path.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

def main():
    questions = pd.read_excel(EXCEL_PATH, sheet_name="Questionnaire et logique")
    docs = pd.read_excel(EXCEL_PATH, sheet_name="Documents Dalinia – complet")
    rules = pd.read_excel(EXCEL_PATH, sheet_name="Règles proposition docs")

    to_json(questions, OUT_DIR / "questions.json")
    to_json(docs, OUT_DIR / "documents.json")
    to_json(rules, OUT_DIR / "regles.json")

    print("OK → data/questions.json, data/documents.json, data/regles.json")

if __name__ == "__main__":
    main()
