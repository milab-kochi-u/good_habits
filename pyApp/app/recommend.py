import os
import tempfile
from util.datamanage import fwrite
from recommended_model import cf_mem_user

async def recommend(finput, user_id, work_id, model):
    # file-like object (またはSpooledTemporaryFile)を名前付き一時ファイルとして保存
    async def extract_from_sqlite(temp_file) -> str:
        # 一時ファイルを作成
        fd, tmpfile = tempfile.mkstemp()
        with open(tmpfile, 'w+b') as fp:
            msg = await temp_file.read()
            fp.write(msg)
        return tmpfile
        fwrite(f"一次ファイル{tmpfile}を生成しました")

    try:
        # logging
        fwrite(f"Requests recommend(filename='{finput.filename}', user_id='{user_id}', work_id='{work_id}', model='{model}') have been received.")
        # 一時的にsqlite3ファイルを生成
        fp = await extract_from_sqlite(finput)
        # クエリに応じた推薦モデルを実施
        if model == "cf_mem_user":
            result = cf_mem_user.main(fp,user_id,work_id)
        # 一時ファイルを削除
        os.remove(fp)
        fwrite(f"一時ファイル{fp}を削除しました")
        fwrite(f"推薦結果を返します")
        fwrite(f"{'-' * 200}", add_date=False)
        return result

    except Exception as e:
        print(e)

if __name__ == "__main__":
    print("Don't exec this program from command line")