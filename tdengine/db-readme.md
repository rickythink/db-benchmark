# setup
```
docker run -d -p 6030:6030 -p 6041:6041 -p 6043-6060:6043-6060 -p 6043-6060:6043-6060/udp tdengine/tdengine
```

# create db
```
curl -X POST http://localhost:6041/rest/sql \
    -H "Content-Type: text/plain" \
    -H "Authorization: Basic cm9vdDp0YW9zZGF0YQ==" \
    -d "CREATE DATABASE test;"
```

# create table
```
curl -X POST http://localhost:6041/rest/sql/test \
    -H "Content-Type: text/plain" \
    -H "Authorization: Basic cm9vdDp0YW9zZGF0YQ==" \
    -d "
    CREATE STABLE user_behavior (
        event_time TIMESTAMP, 
        user_id BINARY(64), 
        event_type BINARY(64),
        event_value DOUBLE,
        page_url BINARY(256)
    ) TAGS (
        user_id_tag BINARY(64)
    );"
```
```
```
curl -X POST http://localhost:6041/rest/sql/test \
    -H "Content-Type: text/plain" \
    -H "Authorization: Basic cm9vdDp0YW9zZGF0YQ==" \
    -d "
    SHOW TABLES;"
```

# query
```
curl -X POST http://localhost:6041/rest/sql/test \
    -H "Content-Type: text/plain" \
    -H "Authorization: Basic cm9vdDp0YW9zZGF0YQ==" \
    -d "SELECT * FROM user_behavior_1 LIMIT 20;"
```
```
curl -X POST http://localhost:6041/rest/sql/test \
    -H "Content-Type: text/plain" \
    -H "Authorization: Basic cm9vdDp0YW9zZGF0YQ==" \
    -d "SELECT * FROM user_behavior_1 WHERE user_id = 'user8_8qihno';"
    ```

# insert

curl -X POST http://localhost:6041/rest/sql/test \
    -H "Content-Type: text/plain" \
    -H "Authorization: Basic cm9vdDp0YW9zZGF0YQ==" \
    -d "
    INSERT INTO user_behavior_1 USING user_behavior TAGS ('user123') 
    VALUES ('2024-12-14 10:00:00.000', 'user123', 'browse', 12.34, 'https://example.com/page1');"