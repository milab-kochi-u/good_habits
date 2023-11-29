import tempfile
import os
import sys
import sqlite3
import numpy as np
import pandas as pd

pd.set_option('display.min_rows', 40)
pd.set_option('display.max_rows', 40)
pd.set_option('display.max_columns', 10)
pd.set_option('display.width', 400)

# file-like object (またはSpooledTemporaryFile)を名前付き一時ファイルとして保存
async def extract_from_sqlite(temp_file) -> str:
    # 一時ファイルを作成
    fd, tmpfile = tempfile.mkstemp()
    print(tmpfile, 'を生成しました')
    with open(tmpfile, 'w+b') as fp:
        msg = await temp_file.read()
        fp.write(msg)
    return tmpfile

# User-Scheme のテーブルを作成する
def create_US_table(filename, user_id, work_id):
    dbname = filename
    conn = sqlite3.connect(dbname)
    cur = conn.cursor()

    # 各ユーザごとに処理をループ
    print('----Users df(without duplicates)')
    Users = pd.read_sql(
        f"""
            SELECT id , name
            FROM Users
            GROUP BY id, name
            ORDER BY id
        """ ,conn)
    print(Users)
    print('count:', Users.shape[0])

    print('----UsersWorks df without duplicates')
    UsersWorks = pd.read_sql(
        f"""
            SELECT id, UserId, WorkId
            FROM UsersWorks
            GROUP BY UserId, WorkId
        """, conn)
    print(UsersWorks)
    print('count:', UsersWorks.shape[0])

    print('----UsersSchemes df without duplicates')
    UsersSchemes = pd.read_sql(
        f"""
            SELECT UsersWorkId , SchemeId 
            FROM UsersSchemes
            GROUP BY UsersWorkId, SchemeId
            ORDER BY SchemeId
        """, conn)
    print(UsersSchemes)
    print('count:', UsersSchemes.shape[0])

    print('----Schemes_during_use df without duplicates')
    Schemes_during_use = pd.read_sql(
        f"""
            SELECT SchemeId
            FROM UsersSchemes
            GROUP BY SchemeId
            ORDER BY SchemeId
        """, conn)
    print(Schemes_during_use)
    print('count:', Schemes_during_use.shape[0])

    print('----Schemes df without duplicates')
    Schemes = pd.read_sql(
        f"""
            SELECT id, label
            FROM Schemes 
            GROUP BY id, label
            ORDER BY id
        """, conn)
    print(Schemes)
    print('count:', Schemes.shape[0])

    # UsersWorks - UsersSchemes でINNER JOIN
    print('----UsersWork-UsersSchemes df without duplicates')
    uw_us = pd.merge(UsersWorks, UsersSchemes, left_on="id", right_on="UsersWorkId").drop(columns=['id', 'UsersWorkId'])
    print(uw_us)
    print('count:', uw_us.shape[0])

    # User - Scheme の行列を作成
    schemes_labels = Schemes[Schemes['id'].isin(Schemes_during_use['SchemeId'])]['label']
    users_ids = Users[Users['id'].isin(uw_us['UserId'])]['id']
    User_Scheme_matrix = pd.DataFrame(index=users_ids.to_numpy(), columns=schemes_labels.to_numpy())
    print(User_Scheme_matrix)
    # 行列の値を計算
    for id in User_Scheme_matrix.index:
        sys.stdout.write(f"user_{id}'s schemes(id): ")
        users_schemes = uw_us.loc[uw_us['UserId']== id, 'SchemeId']
        print(users_schemes.values)
        User_Scheme_matrix.loc[id] = Schemes_during_use['SchemeId'].isin(users_schemes).values
    # print(User_Scheme_matrix)
    cur.close()
    conn.close()
    return User_Scheme_matrix


# ピアソンの相関係数（u, vの類似度計算)
def pearson_coefficent(u: np.ndarray, v: np.ndarray) -> float:
    u_diff = u - np.mean(u)
    v_diff = v - np.mean(v)
    numerator = np.dot(u_diff, v_diff)
    denominator = np.sqrt(sum(u_diff ** 2)) * np.sqrt(sum(v_diff ** 2))
    if denominator == 0:
        return 0.0
    return numerator / denominator

async def main(input_file, user_id, work_id):
    try:
        # 一時的にsqlite3ファイルを生成
        fp = await extract_from_sqlite(input_file)
        # ユーザ×工夫の行列を取得
        us_table = create_US_table(fp,user_id, work_id)
        print(us_table)
        # 一時ファイルを削除
        os.remove(fp)
        

    except Exception as e:
        print(e)


if __name__ == "__main__":
    print('name main')
    main()