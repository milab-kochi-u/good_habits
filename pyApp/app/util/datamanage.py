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
def fwrite(msg, stdout=True, filename=None, add_date=True, ext="log", path=None, header="info", end="\n"):
    dt_now_jst_aware = datetime.datetime.now(
        datetime.timezone(datetime.timedelta(hours=9))
    )
    today = dt_now_jst_aware.strftime('%Y_%m_%d') 
    dst = f"{filename}.{ext}" if filename is not None else f"{today}.{ext}"
    filepath = f"/app/log/{dst}" if path is None else f"{path}/{dst}"
    with open(filepath, mode='a', encoding='utf_8') as f:
        if add_date:
            label = f"[{dt_now_jst_aware.strftime('%H:%M:%S')}][{header}]: "
        else:
            label = f"[{header}]"
        f.write(f"{label}{msg}{end}")
    if(stdout):
        print(msg, end=end)

# 指定user,workのログを返す
def get_log(user_id, work_id):
    dt_now_jst_aware = datetime.datetime.now(
        datetime.timezone(datetime.timedelta(hours=9))
    )
    today = dt_now_jst_aware.strftime('%Y_%m_%d')
    # とりあえず /app/log/{today}.log　しか見ない
    path = f"/app/log/{today}.log"
    if os.path.isfile(path):
        resdata =""
        with open(path, mode='r', encoding='utf_8') as f:
            passed = False
            for data in f:
                if(not passed and 'Requests recommend' in data):
                    if (f"user_id='{user_id}'" in data and f"work_id='{work_id}'" in data):
                        passed = True
                if(passed):
                    resdata += data
        return resdata
    else:
        return 0