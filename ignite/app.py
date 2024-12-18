from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pyignite import Client
from pyignite.exceptions import CacheError

# 创建 FastAPI 应用
app = FastAPI()

# Ignite 客户端初始化
IGNITE_HOST = "127.0.0.1"
IGNITE_PORT = 10800
client = Client()
client.connect(IGNITE_HOST, IGNITE_PORT)

# 请求数据模型
class SQLRequest(BaseModel):
    sql: str  # SQL 查询语句

# 路由：执行 SQL 查询
@app.post("/execute-sql")
async def execute_sql(request: SQLRequest):
    try:
        # 执行 SQL 查询
        result = client.sql(request.sql)

        # 如果是 SELECT 查询，返回结果
        rows = [row for row in result]
        return {"status": "success", "rows": rows, "count": len(rows)}
    except CacheError as e:
        # 捕获 Ignite 错误
        raise HTTPException(status_code=400, detail=f"SQL execution error: {str(e)}")
    except Exception as e:
        # 捕获其他错误
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

# 健康检查路由
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# 关闭 Ignite 客户端
@app.on_event("shutdown")
def shutdown_event():
    client.close()