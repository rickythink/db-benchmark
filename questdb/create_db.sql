CREATE TABLE user_behavior (
    user_id SYMBOL,          -- 用户 ID，使用 SYMBOL 可以加速查询和聚合
    event_time TIMESTAMP,    -- 行为发生时间
    event_type SYMBOL,       -- 行为事件类型（如浏览、滚动、下单等）
    event_value DOUBLE,      -- 行为值（如停留时长）
    page_url SYMBOL          -- 行为关联的页面 URL
) 
TIMESTAMP(event_time) -- 声明表的时间戳列，用于时间序列优化
PARTITION BY DAY;
