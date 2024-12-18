import http from 'k6/http';
import { Counter, Trend, Rate } from 'k6/metrics';
import { sleep } from 'k6';

// 配置
const FASTAPI_URL = 'http://localhost:8000/execute-sql';
const vus = 100; // 并发用户数
const generateRandomString = () => Math.random().toString(36).substring(2, 8); // 生成6位随机字符串
const USERS = Array.from({ length: vus }, (_, i) => `user${i + 1}_${generateRandomString()}`); // 动态生成 USERS
const EVENTS = ['browse', 'scroll', 'purchase', 'cancel_payment'];

// 自定义指标
const rowsWritten = new Counter('rows_written'); // 成功写入的行数
const writeDuration = new Trend('write_duration', true); // 每次写入持续时间
const failedRequests = new Counter('failed_requests'); // 失败的请求数量
const successRate = new Rate('success_rate'); // 成功率
const readDuration = new Trend('read_duration', true); // 每次读取持续时间
const rowsRead = new Counter('rows_read'); // 成功读取的行数

// 每个用户的请求频率设置
const REQUESTS_PER_SECOND = 8; // 每秒 8 个请求
const WRITE_RATIO = 0.8; // 写请求比例

// 生成测试数据
function generateInsertSQL() {
    const userId = USERS[Math.floor(Math.random() * USERS.length)];
    const eventType = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    const eventValue = (Math.random() * 100).toFixed(2);
    const pageUrl = `https://example.com/page${Math.floor(Math.random() * 100)}`;
    const eventTime = new Date().toISOString(); // ISO8601 格式时间戳

    // 构建 INSERT SQL
    return `INSERT INTO user_behavior (user_id, event_time, event_type, event_value, page_url) VALUES ('${userId}', '${eventTime}', '${eventType}', ${eventValue}, '${pageUrl}')`;
}

// 写操作
function writeData() {
    const sql = generateInsertSQL();

    const payload = JSON.stringify({ sql });
    const params = { headers: { 'Content-Type': 'application/json' } };

    const start = new Date().getTime();
    const res = http.post(FASTAPI_URL, payload, params);
    const end = new Date().getTime();

    writeDuration.add(end - start);

    if (res && res.status === 200 && res.json().status === 'success') {
        rowsWritten.add(1);
        successRate.add(true); // 记录成功
    } else {
        failedRequests.add(1);
        successRate.add(false); // 记录失败
        console.error(`Failed to write: ${res.status} - ${res.body}`);
    }
}

// 生成 SELECT 查询
function generateSelectSQL() {
    const userId = USERS[Math.floor(Math.random() * USERS.length)];
    return `SELECT * FROM user_behavior WHERE user_id = '${userId}' ORDER BY event_time DESC LIMIT 100`;
}

// 读操作
function readData() {
    const sql = generateSelectSQL();

    const payload = JSON.stringify({ sql });
    const params = { headers: { 'Content-Type': 'application/json' } };

    const start = new Date().getTime();
    const res = http.post(FASTAPI_URL, payload, params);
    const end = new Date().getTime();

    readDuration.add(end - start);

    if (res && res.status === 200 && res.json().status === 'success') {
        const rows = res.json().count || 0;
        console.log(`[sql] ${sql} | [query count] ${rows}`)
        rowsRead.add(rows);
        successRate.add(true); // 记录成功
    } else {
        failedRequests.add(1);
        successRate.add(false); // 记录失败
        console.error(`Failed to read: ${res.status} - ${res.body}`);
    }
}

// 配置负载测试
export const options = {
    vus: vus, // 初始并发用户数
    duration: '10s', // 测试时长
    thresholds: {
        success_rate: ['rate>0.99'], // 成功率必须大于 99%
        http_req_duration: ['p(95)<200'], // 95% 的请求在 200ms 内完成
    },
};

export default function () {
    // 8个请求，但在1秒内随机间隔
    const requestCount = REQUESTS_PER_SECOND;
    const randomWaits = Array.from({ length: requestCount }, () => Math.random() * 1000);

    // 对随机等待时间进行归一化，确保总时间不超过1秒
    const totalRandomTime = randomWaits.reduce((a, b) => a + b, 0);
    const normalizedWaits = randomWaits.map(wait => (wait / totalRandomTime) * 1000);

    for (let i = 0; i < requestCount; i++) {
        if (Math.random() < WRITE_RATIO) {
            writeData();
        } else {
            readData();
        }

        // 在每个请求之间随机但受控地等待
        sleep(normalizedWaits[i] / 1000);
    }
}