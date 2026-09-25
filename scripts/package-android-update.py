"""Package only public app assets; publish the manifest after the ZIP upload."""
import pathlib,json,zipfile,hashlib
root=pathlib.Path(__file__).resolve().parent.parent
app=root/'android-app'; info=json.loads((app/'bundle-info.json').read_text())
out=app/'release';out.mkdir(exist_ok=True)
archive=out/(info['version']+'.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for file in sorted((app/'www').rglob('*')):
        if file.is_file(): z.write(file,file.relative_to(app/'www'))
manifest={'schema':1,'appId':'com.familybook.app','runtime':info['runtime'],'version':info['version'],
          'url':f"https://github.com/escobarsapparel-star/family-book/releases/download/android-web-{info['runtime']}/{archive.name}",
          'checksum':hashlib.sha256(archive.read_bytes()).hexdigest()}
(out/'latest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Packaged {archive.name}: {archive.stat().st_size:,} bytes')
