D='/home/claude/demo/'
head=open(D+'head3.html').read()
css=''.join(open(D+f).read() for f in ['mf_extra.css','mf2_extra.css','mf3_extra.css','bulk_extra.css','shell_extra.css'])
css+=open("yk.css").read()+"\n.form label.span2{grid-column:span 2}@media (max-width:700px){:root:not(.desk) .form label.span2{grid-column:span 1}}\n.vgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-bottom:12px}\n"
head=head.replace('</style>',css+'\n</style>').replace('<title>NOS · Sample Room</title>','<title>NOS · Yarn Store & Knitting</title>')
body=open('yk_body.html').read().replace('__DATA__',open('yk_data.js').read()).replace('__JS__',open('yk3.js').read())
open('/mnt/user-data/outputs/nos-yarn-knitting.html','w').write(head+body)
print(len(head+body)//1024,'KB')
