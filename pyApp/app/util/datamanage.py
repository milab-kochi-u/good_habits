import datetime
import os

# データ保管用フォルダの設置
def init():
    logroot = "/app/log"
    csvroot = f"{logroot}/csv"
    if not (os.path.isdir(logroot)):
        os.mkdir(logroot)
    if not (os.path.isdir(csvroot)):
        os.mkdir(csvroot)

# 与えられたpathに対してmsgを追記する
def fwrite(msg, stdout=True, filename=None, add_date=True, end="\n"):
    dt_now_jst_aware = datetime.datetime.now(
        datetime.timezone(datetime.timedelta(hours=9))
    )
    today = dt_now_jst_aware.strftime('%Y_%m_%d') 
    dst = filename if filename is not None else f"{today}.log"
    filepath = f"/app/log/{dst}"
    with open(filepath, mode='a', encoding='utf_8') as f:
        if add_date:
            label = f"[{dt_now_jst_aware.strftime('%H:%M:%S')}]: "
        else:
            label = ""
        f.write(f"{label}{msg}{end}")
    print(msg, end=end)
