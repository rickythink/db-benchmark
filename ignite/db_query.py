from pyignite import Client

# 创建客户端并连接到 Ignite
client = Client()
client.connect('127.0.0.1', 10800)

# 查询数据
try:
    # 查询 SQL
    query = "SELECT * FROM user_behavior WHERE user_id = 'user12_ztlnhn'"
    # query = "SELECT count(*) FROM user_behavior"
    
    # 执行查询
    result = client.sql(query)

    # 打印结果
    print("Query results:")
    for row in result:
        print(row)

finally:
    # 关闭连接
    client.close()