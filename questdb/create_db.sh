curl -G http://localhost:9000/exec \
    --data-urlencode "query=CREATE TABLE user_behavior (
        user_id SYMBOL INDEX, -- 为 user_id 列添加索引
        event_time TIMESTAMP,
        event_type SYMBOL,
        event_value DOUBLE,
        page_url SYMBOL
    ) TIMESTAMP(event_time) PARTITION BY DAY;"