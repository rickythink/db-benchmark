import random
from datetime import datetime, timedelta
from pyignite import Client

# 创建客户端并连接到 Ignite
client = Client()
client.connect('127.0.0.1', 10800)

# 定义随机数据生成函数
def generate_random_user_behavior():
    user_id = f"user{random.randint(1, 1000)}"  # 随机生成 user_id
    event_time = datetime.now() - timedelta(days=random.randint(0, 365))  # 随机日期在过去一年
    event_type = random.choice(['browse', 'click', 'purchase', 'add_to_cart'])  # 随机事件类型
    event_value = round(random.uniform(1.0, 100.0), 2)  # 随机事件值
    page_url = f"https://example.com/page{random.randint(1, 50)}"  # 随机生成页面 URL
    return user_id, event_time.strftime('%Y-%m-%d %H:%M:%S'), event_type, event_value, page_url

# 插入随机数据
try:
    for _ in range(10):  # 插入 10 条随机数据
        user_id, event_time, event_type, event_value, page_url = generate_random_user_behavior()
        insert_query = (
            "INSERT INTO user_behavior (user_id, event_time, event_type, event_value, page_url) "
            f"VALUES ('{user_id}', '{event_time}', '{event_type}', {event_value}, '{page_url}')"
        )
        client.sql(insert_query)
        print(f"Inserted: {user_id}, {event_time}, {event_type}, {event_value}, {page_url}")

finally:
    # 关闭连接
    client.close()