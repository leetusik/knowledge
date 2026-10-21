import json, urllib.request, sys
A="http://127.0.0.1:8911"
def call(method, path, body=None, tok=None):
    h={"content-type":"application/json"}
    if tok: h["authorization"]=f"Bearer {tok}"
    req=urllib.request.Request(A+path, method=method, data=json.dumps(body).encode() if body is not None else None, headers=h)
    try:
        r=urllib.request.urlopen(req); raw=r.read(); return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        print("ERR", e.code, e.read()[:300], path); raise
out={}
for name, email, slug in [("a","s27-member@example.com","s27org"),("b","s27-other@example.com","otherorg")]:
    s=call("POST","/auth/signup",{"email":email,"password":"s27-live-pass-1"})
    tok=s["token"]; print(name, s["tenant"]["id"], s["project"]["id"])
    call("PATCH","/app/tenant",{"slug":slug},tok)
    c=call("POST","/app/credentials",{"name":"s27"},tok)
    out[name]={"session":tok,"email":email,"slug":slug,"project":s["project"]["id"],"tenant":s["tenant"]["id"],"cred":c}
json.dump(out,open("accts.json","w"),indent=1)
print(json.dumps(out["a"]["cred"])[:300])
