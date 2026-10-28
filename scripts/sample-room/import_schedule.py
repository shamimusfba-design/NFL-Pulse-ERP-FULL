# Converts the factory 'Garments Sample Production & Delivery Schedule' workbook
# (SMS / PPS / Others month sheets) into the normalised JSON used by the Sample Room module.
# Usage: python3 import_schedule.py <schedule.xlsx>   -> writes data.json
# Sheet names are currently hard-coded to October-26; change the list near the bottom for other months.
import openpyxl,collections,re,json,datetime
import sys
SRC=sys.argv[1] if len(sys.argv)>1 else 'sched.xlsx'
wb=openpyxl.load_workbook(SRC,data_only=True)
def load(name):
    ws=wb[name];rows=list(ws.iter_rows(values_only=True))
    hi=next(i for i,r in enumerate(rows) if r and any(str(c).strip()=='Buyer' for c in r if c))
    hdr=[str(c).strip() if c else f'col{j}' for j,c in enumerate(rows[hi])]
    return [dict(zip(hdr,r)) for r in rows[hi+1:] if r and any(c not in (None,'') for c in r[:6])]
def d2(v,ref=None):
    if isinstance(v,datetime.datetime): return v.strftime('%Y-%m-%d')
    if isinstance(v,str):
        m=re.search(r'(\d{1,2})\.(\d{1,2})',v)
        if m:
            dd,mm=int(m.group(1)),int(m.group(2))
            if 1<=mm<=12 and 1<=dd<=31: return f'2026-{mm:02d}-{dd:02d}'
    return None
STAGES=['Pattern due','Fabric due','Trims due','Fabric ok','Need cut','Ready for sewing','Print / Emb out','Sewing running','Sewing ok','Comments due','Approved','Revised','In stock','Cancelled']
def stage(s):
    s=(s or '').lower().strip()
    first=s.split('/')[0].strip()
    t=first
    if 'cancel' in t or t.startswith('no need'): return 'Cancelled'
    if 'pattern due' in t: return 'Pattern due'
    if 'trims due' in t or 'rib due' in t or 'woven due' in t: return 'Trims due'
    if 'fabric due' in t or 'need bulk fabric' in t or 'fabric sent' in t: return 'Fabric due'
    if 'fabric ok' in t: return 'Fabric ok'
    if 'need cut' in t or 'need re cut' in t: return 'Need cut'
    if 'cut ok' in t or 'ready for sewing' in t: return 'Ready for sewing'
    if t.startswith('p . s') or t.startswith('emb') or 'print run' in t: return 'Print / Emb out'
    if 'sewing run' in t: return 'Sewing running'
    if 'cmmts due' in t: return 'Comments due'
    if 'revised' in t: return 'Revised'
    if 'stock' in t: return 'In stock'
    if any(k in t for k in ['pp ok','pp  ok','apv','fit ok','dev. ok','app ok','cmmts ok','fitting ok','re ok','re pp']): return 'Approved'
    if 'sewing ok' in t or t.startswith('ok') or 'meeting ok' in t or 'sok' in t: return 'Sewing ok'
    return 'Sewing ok' if t else 'Fabric due'
def loc(s):
    s=(s or '').lower()
    if '(ncl)' in s: return 'NCL'
    if '(lineb)' in s: return 'Line B'
    if '(line)' in s: return 'Line'
    return 'Sample room'
TYPEMAP={'size set':'Size set','dev.':'Development','dev.0':'Development','dev':'Development','offre':'Offer','offer':'Offer','s/set':'Size set','fitting':'Fit','pp':'PP','app':'APP','photo':'Photo','bps':'BPS','test':'Test','lab test':'Test','ar':'AR','ad':'AD','fit':'Fit','proto':'Proto','sms':'SMS','print apv.':'Print approval','mockup':'Mockup','gift':'Gift','ship':'Shipment','color ref.':'Color ref.','green':'Green seal','gold':'Gold seal'}
def types(t):
    t=str(t or '').strip()
    if not t or re.fullmatch(r'[\d.]+',t) or '#' in t: return []
    t=re.sub(r'(?i)s/set','Size set',t)
    out=[]
    for p in re.split(r'[+/]',t):
        k=p.strip().lower()
        if not k: continue
        out.append(TYPEMAP.get(k,p.strip()))
    return list(dict.fromkeys(out))
def hist(vals):
    ev=[];note=''
    for v in vals:
        if not v: continue
        for part in str(v).split('/'):
            p=part.strip();pl=p.lower();d=d2(p)
            lab=None
            if pl.startswith('fok'): lab='Fabric ok'
            elif 'cut ok' in pl: lab='Cut ok'
            elif pl.startswith('p . s') or pl.startswith('p.s'): lab='Sent to print'
            elif pl.startswith('emb'): lab='Sent to embroidery'
            elif 'cmmts ok' in pl: lab='Buyer comments ok'
            elif 'sewing' in pl: lab=p.split(' 0')[0]
            if lab and d: ev.append([d,lab])
            elif p and not d and lab is None and len(p)<30: note=p
    return ev,note
BUY={'ONL':('Bestseller','ONLY'),'Car':('Bestseller','ONLY'),'ONS':('Bestseller','ONLY & SONS'),'NMT':('Bestseller','NAME IT')}
def group(b):
    for k,v in BUY.items():
        if b.startswith(k): return v
    b2=b.replace('T.M Lewin','T.M. Lewin').replace('New-Look','New Look').replace("Sainsburys","Sainsbury's")
    return (b2,b2)
def clean_buyer(b):
    return b.replace('T.M Lewin','T.M. Lewin').replace('New-Look','New Look').replace('Sainsburys',"Sainsbury's").replace('ONL- SWT','ONL-SWT').replace('ONL-JRSY Express','ONL-JRSY Exp.').replace('ONL-JRSY NOOS','ONL-JRSY Noos').strip()
REM={'pass':'On time'}
out=[];i=0
for n,cat in [('SMS October-26 ','SMS'),('PPS October-26','PP'),('Others October-26 ','Others')]:
    for r in load(n):
        b=str(r.get('Buyer') or '').strip()
        if b in('','None','Sub Total','G. Sub Total','Grand Total'):continue
        q=r.get('Qty(pcs)')
        if not isinstance(q,(int,float)) or q<=0: continue
        i+=1;b=clean_buyer(b);g,brand=group(b)
        st_raw=str(r.get('Present Status') or '').strip()
        ev,note=hist([r.get('col18'),r.get('col19'),r.get('col20'),st_raw])
        fin=str(r.get('col21') or '').strip()
        if fin not in('Print','Solid','Emb.','Print+Emb.'): fin=''
        sd=r.get('Sewing Complete Qty (pcs)');sd=int(sd) if isinstance(sd,(int,float)) else 0
        dq=r.get('Delivery Qty (Pcs)');dq=int(dq) if isinstance(dq,(int,float)) else 0
        rem=str(r.get('Remarks') or '').strip()
        rem={'Pass':'On time','Emb. Delay':'Emb.Delay','P':'','Fabric on time':'On time'}.get(rem,rem)
        tp=types(r.get('Sample Type')) or ([cat] if cat!='Others' else ['Development'])
        style=r.get('Style No.');style=str(int(style)) if isinstance(style,float) else str(style or '').strip()
        coll=r.get('Coll#');coll=(str(int(coll)) if isinstance(coll,float) else str(coll or '')).strip()
        dye=r.get('Dyeing Close Date')
        out.append({'id':i,'cat':cat,'group':g,'brand':brand,'buyer':b,'merch':str(r.get('Merchandiser Name') or '').strip(),'style':style,'types':tp,
          'color':str(r.get('Color / Panton') or '').strip(),'qty':int(q),'rcvd':d2(r.get('Order sheet receive date')),'coll':coll,
          'sewDone':min(sd,int(q)),'dyeClose':d2(dye) if not (isinstance(dye,str) and 'n/a' in dye.lower()) else 'N/A','sewStart':d2(r.get('Sewing Start date')),'sewClose':d2(r.get('Sewing Close  date')),
          'sewActual':d2(r.get('Actual Sewing Complete Date')),'delQty':min(dq,int(q)),'delActual':d2(r.get('Actual Delivery Date')),
          'statusRaw':st_raw,'stage':stage(st_raw),'loc':loc(st_raw),'finish':fin,'reason':rem,'history':ev,'note':note})
print(len(out));print(collections.Counter(o['stage'] for o in out));print(collections.Counter(t for o in out for t in o['types']))
print(collections.Counter(o['reason'] for o in out))
print(sum(1 for o in out if not o['rcvd']))
json.dump(out,open('data.json','w'),separators=(',',':'))
import os;print(os.path.getsize('data.json'))
