import os
import sys
from pydantic import BaseModel
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
sys.path.append(os.pardir)
from util import datamanage 
from recommend import recommend

app = FastAPI()
datamanage.init()

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/uploadfile/")
async def create_upload_file(input_file: UploadFile):
    return {
        "filename" : input_file.filename,
        "content_type" : input_file.content_type,
    }

@app.post("/recommend/users/{user_id}/works/{work_id}")
async def exec_recommendation(input_file: UploadFile, user_id: int, work_id: int, model: str = "cf_mem_user"):
    result = await recommend(input_file, user_id, work_id, model)
    return JSONResponse(content=result)

@app.get("/getLog/users/{user_id}/works/{work_id}")
async def get_log(user_id: int, work_id: int, sim_date: str):
    data = datamanage.get_log(user_id,work_id, sim_date)
    if(data != 0):
        return {"result": data}
    else:
        return {"result": "muri"}