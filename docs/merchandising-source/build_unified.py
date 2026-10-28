import json
t=[x for x in json.load(open('/tmp/track.json')) if x['cargo'] and x['cargo'][:2]=='20' and x['cargo']>='2026-09-01']
keep=['buyer','job','style','qty','handover','sewTA','cargo','week','printEmb','pp','ppSend','merch']
t=[{k:x.get(k) for k in keep} for x in t]
css=''.join(open(f).read() for f in ['mf_extra.css','mf2_extra.css','mf3_extra.css','bulk_extra.css','shell_extra.css'])
head=open('head3.html').read().replace('</style>',css+'\n</style>').replace('<title>NOS · Sample Room</title>','<title>NOS · Merchandising</title>')
body=open('shell_body.html').read()
body=body.replace('__DATA__',open('/tmp/data.json').read()).replace('__PO__',open('/tmp/po.json').read()).replace('__TRACK__',json.dumps(t,separators=(',',':')))
body=body.replace('__SAMPLEPOS__','[]').replace('__POIMPORT__',open('/tmp/esb/po-import.js').read())
body=body.replace('__COSTJS__',open('cost.js').read())
body=body.replace('__SAMPLE_MOUNT__',open('sample_mount.js').read()).replace('__BULK_MOUNT__',open('bulk2.js').read())
open('/mnt/user-data/outputs/nos-merchandising.html','w').write(head+body)
print(len(head+body))
