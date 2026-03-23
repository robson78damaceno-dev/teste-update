import zipfile
import re
import collections

try:
    with zipfile.ZipFile(r'c:\Users\lalves\Documents\projetos-ti\mjc-test\documentaçao\recordcomercial\MKTID_Guia de Aplicação (1).ppsx', 'r') as z:
        colors = []
        for n in z.namelist():
            if n.endswith('.xml'):
                content = z.read(n).decode('utf-8', errors='ignore')
                found = re.findall(r'val="([0-9A-Fa-f]{6})"', content)
                colors.extend(found)
        if colors:
            print("Most common colors:")
            for c, count in collections.Counter(colors).most_common(20):
                print(f"#{c}: {count} times")
        else:
            print("No colors found")
except Exception as e:
    print(e)
