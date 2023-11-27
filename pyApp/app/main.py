from pydantic import BaseModel
from fastapi import FastAPI, File, UploadFile
from recommended_model import cf_mem_user

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/uploadfile/")
async def create_upload_file(input_file: UploadFile):
    return {
        "filename" : input_file.filename,
        "content_type" : input_file.content_type,
    }

@app.post("/exec_cf_mem_user/users/{user_id}/works/{work_id}")
async def exec_cf_mem_user(input_file: UploadFile, user_id: int, work_id: int):
    await cf_mem_user.main(input_file, user_id, work_id)
    return {"ok"}