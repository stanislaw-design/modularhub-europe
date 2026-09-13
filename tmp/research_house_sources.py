from pathlib import Path
from pypdf import PdfReader
import openpyxl, json
root=Path('_docs')
out=Path('tmp/house-research'); out.mkdir(parents=True,exist_ok=True)
for p in root.glob('*.pdf'):
    reader=PdfReader(p)
    pages=[f'\n--- PAGE {i+1} ---\n'+(page.extract_text() or '') for i,page in enumerate(reader.pages)]
    (out/(p.stem+'.txt')).write_text('\n'.join(pages),encoding='utf-8')
    print(p.name, 'pages',len(pages),'characters',sum(map(len,pages)))
for p in root.glob('*.xlsx'):
    wb=openpyxl.load_workbook(p,read_only=True,data_only=True)
    parts=[]
    for ws in wb:
        rows=[{'row':i,'cells':list(row)} for i,row in enumerate(ws.values,1) if any(v is not None for v in row)]
        parts.append({'sheet':ws.title,'rows':rows})
        print(p.name,ws.title,len(rows),'rows')
    (out/(p.stem+'.json')).write_text(json.dumps(parts,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
