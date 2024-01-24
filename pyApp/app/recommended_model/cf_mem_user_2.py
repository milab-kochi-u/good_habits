import os
import sys
import sqlite3
import numpy as np
import pandas as pd
import textwrap
from util.datamanage import fwrite

pd.set_option('display.min_rows', 30)
pd.set_option('display.max_rows', 30)
pd.set_option('display.max_columns', 20)
pd.set_option('display.width', 400)

# User-Scheme のテーブルを作成する
def create_US_table(filename, work_id):
    # index: user (一度も工夫を採用したことのないユーザは除く)
    # Column: scheme (一度も採用されたことのない工夫は除く) 
    dbname = filename
    conn = sqlite3.connect(dbname)
    cur = conn.cursor()

    def record_timestamp():
        data = pd.read_sql(
            f"""
                SELECT createdAt, updatedAt
                FROM SimulationLogs
                ORDER BY updatedAt DESC
                LIMIT 1
            """,conn)
        fwrite(f"DB createdAt: {data.iloc[-1,0]}, DB updatedAt: {data.iloc[-1,1]}")
        
    record_timestamp()

    # 各ユーザごとに処理をループ
    # Users df (without duplicates)
    Users = pd.read_sql(
        f"""
            SELECT id , name
            FROM Users
            GROUP BY id, name
            ORDER BY id
        """ ,conn)

    # UsersWorks df without duplicates
    UsersWorks = pd.read_sql(
        f"""
            SELECT id, UserId, WorkId
            FROM UsersWorks
            WHERE WorkId = {work_id}
            GROUP BY UserId, WorkId
        """, conn)

    # UsersSchemes df without duplicates
    UsersSchemes = pd.read_sql(
        f"""
            SELECT UsersWorkId , SchemeId
            FROM UsersSchemes
            GROUP BY UsersWorkId, SchemeId
            ORDER BY SchemeId
        """, conn)
    
    UsersSchemes_d = pd.read_sql(
        f"""
            SELECT UsersWorkId, SchemeId, createdAt, deletedAt
            FROM UsersSchemes
        """, conn)

    # Schemes_during_use df without duplicates
    Schemes_during_use = pd.read_sql(
        f"""
            SELECT SchemeId
            FROM UsersSchemes
            GROUP BY SchemeId
            ORDER BY SchemeId
        """, conn)

    # Schemes df without duplicates
    Schemes = pd.read_sql(
        f"""
            SELECT id, label
            FROM Schemes 
            GROUP BY id, label
            ORDER BY id
        """, conn)

    # Tasks df
    # source_task, deletedAtは考慮しない
    Tasks = pd.read_sql(
        f"""
            SELECT id, result, start_time, started_at, finished_at, UsersWorkId
            FROM Tasks
            WHERE result IS NOT NULL
        """, conn)
    fwrite(f"Tasks\n{Tasks}")

    # UsersWorks - UsersSchemes でINNER JOIN
    # UsersWork-UsersSchemes df without duplicates
    uw_us = pd.merge(UsersWorks, UsersSchemes, left_on="id", right_on="UsersWorkId").drop(columns=['id', 'UsersWorkId'])

    # User - Scheme の行列を作成
    schemes_labels = Schemes[Schemes['id'].isin(Schemes_during_use['SchemeId'])]['label']
    users_ids = Users[Users['id'].isin(uw_us['UserId'])]['id']
    User_Scheme_matrix = pd.DataFrame(index=users_ids.to_numpy(), columns=schemes_labels.to_numpy())

    # taskテーブルに使用中のschemeIdを付けて返す(必ず1つschemeを選ぶ前提なのでschemeを未採用・複数採用した場合の検証は未実施)
    def get_schemes_of_the_time():
        '''
            date_timeはdatetime型とする

            UsersSchemesテーブルをsql的に以下のように検索すれば良さそう
            ・継続利用中の工夫
            (createdAt < date_time AND deletedAt IS NULL)
            ・現在削除されているがdate_time時点では使っていたもの
            (deletedAt IS NOT NULL AND createdAt < date_time AND date_time < deletedAt)

            date_time の求め方
            ・開始できなかった場合
            start_time
            ・開始できた場合
            started_at
        '''
        t_us = pd.merge(Tasks, UsersSchemes_d);
        # 開始できなかった場合のデータ
        start_fail_base = t_us[t_us['started_at'].isna()]
        start_fail1= start_fail_base[(start_fail_base['createdAt'] < start_fail_base['start_time']) & start_fail_base['deletedAt'].isna()]
        start_fail2 = start_fail_base[start_fail_base['deletedAt'].notna() & (start_fail_base['createdAt'] < start_fail_base['start_time']) & (start_fail_base['start_time'] < start_fail_base['deletedAt'])]
        start_success_base = t_us[t_us['started_at'].notna()]
        start_success1= start_success_base[(start_success_base['createdAt'] < start_success_base['started_at']) & start_success_base['deletedAt'].isna()]
        start_success2 = start_success_base[start_success_base['deletedAt'].notna() & (start_success_base['createdAt'] < start_success_base['started_at']) & (start_success_base['started_at'] < start_success_base['deletedAt'])]
        conc = pd.concat([start_fail1,start_fail2,start_success1,start_success2])
        return conc
        
    # daletedAtはobject型なのでDatetime型に
    UsersSchemes_d['deletedAt'] = pd.to_datetime(UsersSchemes_d['deletedAt'], errors='coerce')
    UsersSchemes_d['createdAt'] = pd.to_datetime(UsersSchemes_d['createdAt'], errors='coerce')
    Tasks['start_time'] = pd.to_datetime(Tasks['start_time'], errors='coerce')
    Tasks['started_at'] = pd.to_datetime(Tasks['started_at'], errors='coerce')
    Tasks['finished_at'] = pd.to_datetime(Tasks['finished_at'], errors='coerce')

    # Task - UsersSchemes_d から全てのデータにおけるタスク実行時のschemeを取得する
    t_us_d = get_schemes_of_the_time()

    # 行列の値を計算(UserはUsersWorksを1つしか持たない前提の検証のみ実施)
    for UserId in User_Scheme_matrix.index:
        # fwrite(f"User_Scheme_matrix.index:\n{User_Scheme_matrix.index}\nid:{UserId}")
        users_schemes = uw_us.loc[uw_us['UserId'] == UserId, 'SchemeId']
        # fwrite(f"users_schemes\n{users_schemes}")

        users_UsersWorks_id = UsersWorks[UsersWorks['UserId'] == UserId]['id'].tolist()[0]
        # t_us_d から該当ユーザのUsersWorkIdを持つデータを抽出
        users_t_us_d = t_us_d[t_us_d['UsersWorkId'] == users_UsersWorks_id]
        # SchemeIdごとにグループ分け
        def myfunc(x):
            if x in users_t_us_d['SchemeId'].values:
                gbp = users_t_us_d.groupby('SchemeId')
                gb = gbp.get_group(x)
                gbsum = gb.shape[0]
                gbtrue = (gb['result'] == 1).sum()
                gbfalse = (gb['result'] == 0).sum()
                return (gbtrue / gbsum)
            else:
                return -1
        
        User_Scheme_matrix.loc[UserId] = Schemes_during_use['SchemeId'].apply(myfunc).values

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
        推薦を受け取る対象ユーザの未採用工夫に対する予測評価付き配列
"""
def recommend(matrix, user_id):
    fwrite(f"matrix:\n{matrix.T}")
    fwrite(f"user_id:{user_id}")
    # 推薦を受け取る対象ユーザの列を取得
    u_i = matrix[user_id]
    others = matrix.drop(columns=user_id)
    s_i_others = pd.Series(name="similarity")
    # 対象ユーザとその他ユーザとの類似度を計算

    #(おまけ)自身との類似度も出してみる
    # myself = pd.concat([u_i,u_i], axis=1)
    # s_myself = myself.corr(method='pearson')
    # s_myself = s_myself.iat[0,1]
    # print(f"me: {s_myself}") # ←もちろん類似度は100%になった
    for _id, u_k in others.items():
        u_ik = pd.concat([u_i, u_k], axis=1)
        s_ik = u_ik.corr(method='pearson')
        s_ik = s_ik.iat[0,1]
        s_i_others[_id] = s_ik

    # 類似したユーザ集合を用意
    threshold = 0.05
    sim_set = s_i_others[s_i_others >= threshold].sort_values(ascending=False)
    # _show = textwrap.indent(sim_set.to_string(), '        ')
    fwrite(f"類似度{threshold}を超えたユーザ集合");
    fwrite(f"\n(id, 類似度)\n{sim_set}");

    # 未採用の工夫に対して採用スコアを予測

    # 既存手法でやってみる
    predict_values = pd.Series(name="Predicted effect of schemes")
    if sim_set.shape[0] == 0:
        return predict_values 
        
    ser_score_avg = u_i[u_i != -1].mean()
    other_score_avg = others[sim_set.index]
    other_score_avg = other_score_avg[other_score_avg != -1]
    fwrite(f"others score avg {other_score_avg}")
    for index in u_i[u_i == -1].index:

        others_index_score = others[sim_set.index].loc[index]

        # fwrite(f"otherのindexに対するスコア\n{others_index_score}")
        # fwrite(f"otherのindexに対するスコア - otherのスコア平均(1)\n{others_index_score - 1}")
        
        # 類似ユーザ集合othersの各類似度
        # と
        # othersのindex(userが不採用の工夫)のスコアとothersのスコア平均との差
        # の積
        dot = sim_set * (others_index_score-other_score_avg)
        # fwrite(f"類似度との積\n{dot}")
        # fwrite(f"類似度との積の合計\n{dot.sum()}")
        # fwrite(f"othersの類似度合計\n{sim_set.sum()}")
        # fwrite(f"予測スコア\n{(1+(dot.sum()/sim_set.sum()))}")

        # 予測スコア
        pv = user_score_avg + (dot.sum() / sim_set.sum())
        predict_values[index] = round(pv, 3)

        fwrite(f"{index}に対する予測スコア: {round(pv,3)}")

        # 平均による閾値処理（オリジナル）も考えてみた（不採用）
        # 単純平均
        # mean = others_index_score.mean()
        # print(f"単純平均: {round(mean,3)}")
        # 加重平均
        # weight = np.arange(others_index_score.shape[0],0,-1)
        # wma = sum(others_index_score * weight) / sum(weight)
        # print(f"加重平均: {round(wma,3)}")
        # predict_values[index] = round(wma,3)
    return predict_values.sort_values(ascending=False)

def main(sqlite_path, user_id, work_id):
    try:
        # ユーザ×工夫の行列を取得
        us_table = create_US_table(sqlite_path, work_id)
        # 行列をcsvとして保存
        csv_string = us_table.to_csv()
        fwrite(csv_string,stdout=False,add_date=True,header="csv",end="\n\n");
        fwrite(f"ユーザ×工夫行列を保存しました")
        # 推薦を実施
        res_ps = recommend(us_table.T, user_id)
        fwrite(f"res_ps:\n{res_ps}")
        if res_ps.shape[0] == 0:
            fwrite(f"user id {user_id} におすすめできる工夫が存在しません．")
            return None
        fwrite(f"user id {user_id} におすすめの工夫: {list(res_ps.to_dict().keys())[:10]}")
        return res_ps.to_dict()

    except Exception as e:
        fwrite("error")
        print(e.__class__.__name__) # ZeroDivisionError
        print(e.args) # ('division by zero',)
        print(e) # division by zero
        print(f"{e.__class__.__name__}: {e}") # ZeroDivisionError: division by zero

if __name__ == "__main__":
    print("Don't exec this program from command line")