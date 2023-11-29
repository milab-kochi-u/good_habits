import tempfile
import os
import sys
import sqlite3
import numpy as np
import pandas as pd

pd.set_option('display.min_rows', 40)
pd.set_option('display.max_rows', 40)
pd.set_option('display.max_columns', 20)
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
def create_US_table(filename, work_id):
    # index: user (一度も工夫を採用したことのないユーザは除く)
    # Column: scheme (一度も採用されたことのない工夫は除く) 
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
            WHERE WorkId = {work_id}
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

    # 行列の値を計算
    for id in User_Scheme_matrix.index:
        users_schemes = uw_us.loc[uw_us['UserId']== id, 'SchemeId']
        User_Scheme_matrix.loc[id] = Schemes_during_use['SchemeId'].isin(users_schemes).values * 1
    cur.close()
    conn.close()
    return User_Scheme_matrix

"""
    ユーザに工夫を推薦する
    引数：
        matrix: 
            pandas Dataframe型の(User x Scheme)行列
            index: schemes name, column: user id 
            工夫の採用有無を表現する（採用していれば1, していなければ0)
        user_id:
            推薦を受け取る対象ユーザのuser id
    戻り値：
        推薦を受け取る対象ユーザの未採用工夫に対する予測評価付き配列(pandas Series型)
"""
def recommend(matrix, user_id):
    # 推薦を受け取る対象ユーザの列を取得
    u_i = matrix[user_id]
    others = matrix.drop(columns=user_id)
    s_i_others = pd.Series(name="similarity")
    # 対象ユーザとその他ユーザとの類似度を計算
    for _id, u_k in others.items():
        sys.stdout.write(f"user{user_id} - user{_id}")
        u_ik = pd.concat([u_i, u_k], axis=1)
        s_ik = u_ik.corr(method='pearson')
        s_ik = s_ik.iat[0,1]
        s_i_others[_id] = s_ik
        sys.stdout.write(f"  similarity {round(s_ik,3)}\n")
    # 類似したユーザ集合を用意
    threshold = 0.05
    print(s_i_others)

async def main(input_file, user_id, work_id):
    try:
        # 一時的にsqlite3ファイルを生成
        fp = await extract_from_sqlite(input_file)
        # ユーザ×工夫の行列を取得
        us_table = create_US_table(fp, work_id)
        print(us_table)
        # 一時ファイルを削除
        os.remove(fp)
        # 推薦を実施
        res_ps = recommend(us_table.T, user_id)
        

    except Exception as e:
        print(e)


if __name__ == "__main__":
    print('name main')
    main()