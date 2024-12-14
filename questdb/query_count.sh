curl -G "http://localhost:9000/exec" \
    --data-urlencode "query=SELECT count() AS total_records FROM user_behavior;"