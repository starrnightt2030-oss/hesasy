"""بيجهّز مشروع أندرويد بعد `npx cap add android`:
نسخ ملفات التطبيق لـ www، الأيقونات، الاسم، الصلاحيات، رقم الإصدار، والتوقيع."""
import os, re, shutil, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
step = sys.argv[1]

def web():
    www = os.path.join(HERE, 'www')
    shutil.rmtree(www, ignore_errors=True)
    os.makedirs(www)
    for f in ['index.html', 'manifest.webmanifest']:
        shutil.copy(os.path.join(ROOT, f), www)
    for d in ['css', 'js', 'fonts', 'icons']:
        shutil.copytree(os.path.join(ROOT, d), os.path.join(www, d))
    ver = re.search(r"hesasy-v([0-9.]+)", open(os.path.join(ROOT, 'sw.js'), encoding='utf-8').read()).group(1)
    code = int(os.environ.get('BUILD_CODE', '1'))
    open(os.path.join(www, 'js', 'build-info.js'), 'w', encoding='utf-8').write(
        'window.HESASY_BUILD = %s;\n' % json.dumps({'version': ver, 'code': code}))
    html = open(os.path.join(www, 'index.html'), encoding='utf-8').read()
    html = html.replace('<script src="js/engine.js"></script>', '<script src="js/build-info.js"></script>\n<script src="js/engine.js"></script>')
    open(os.path.join(www, 'index.html'), 'w', encoding='utf-8').write(html)
    open(os.path.join(HERE, 'version.txt'), 'w').write(ver)
    print('www ready', ver, code)

def android():
    a = os.path.join(HERE, 'android', 'app')
    res = os.path.join(a, 'src', 'main', 'res')
    # الأيقونات
    for dp, ds, fs in os.walk(os.path.join(HERE, 'res')):
        rel = os.path.relpath(dp, os.path.join(HERE, 'res'))
        os.makedirs(os.path.join(res, rel), exist_ok=True)
        for f in fs: shutil.copy(os.path.join(dp, f), os.path.join(res, rel, f))
    for d in os.listdir(res):          # الأيقونة الافتراضية بتاعة Capacitor بصيغة webp
        for f in ('ic_launcher.webp', 'ic_launcher_round.webp', 'ic_launcher_foreground.webp'):
            p = os.path.join(res, d, f)
            if os.path.exists(p): os.remove(p)
    # الاسم
    sp = os.path.join(res, 'values', 'strings.xml')
    s = open(sp, encoding='utf-8').read()
    s = re.sub(r'(<string name="app_name">)[^<]*', r'\1حصصي', s)
    s = re.sub(r'(<string name="title_activity_main">)[^<]*', r'\1حصصي', s)
    open(sp, 'w', encoding='utf-8').write(s)
    # الصلاحيات
    mp = os.path.join(a, 'src', 'main', 'AndroidManifest.xml')
    m = open(mp, encoding='utf-8').read()
    perms = ['<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
             '<uses-permission android:name="android.permission.USE_BIOMETRIC" />',
             '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
             '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />',
             '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />']
    for p in perms:
        if p.split('"')[1] not in m: m = m.replace('</manifest>', '    ' + p + '\n</manifest>')
    if 'requestLegacyExternalStorage' not in m:
        m = m.replace('<application', '<application\n        android:requestLegacyExternalStorage="true"', 1)
    open(mp, 'w', encoding='utf-8').write(m)
    # رقم الإصدار
    gp = os.path.join(a, 'build.gradle')
    g = open(gp, encoding='utf-8').read()
    ver = open(os.path.join(HERE, 'version.txt')).read().strip()
    code = int(os.environ.get('BUILD_CODE', '1'))
    g = re.sub(r'versionCode \d+', 'versionCode %d' % code, g)
    g = re.sub(r'versionName "[^"]*"', 'versionName "%s"' % ver, g)
    open(gp, 'w', encoding='utf-8').write(g)
    print('android ready', ver, code)

{'web': web, 'android': android}[step]()
