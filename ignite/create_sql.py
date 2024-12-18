from pyignite import Client

client = Client()
client.connect('127.0.0.1', 10800)

# 执行 SQL 创建表
client.sql('CREATE TABLE user_behavior ('
           'user_id VARCHAR, '
           'event_time TIMESTAMP, '
           'event_type VARCHAR, '
           'event_value DOUBLE, '
           'page_url VARCHAR, '
           'PRIMARY KEY (user_id, event_time)'
           ') WITH "cache_name=user_behavior_cache";')
print("Table created!")
client.close()