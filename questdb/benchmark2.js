import http from 'k6/http';
import { Counter, Trend, Rate } from 'k6/metrics';

// 配置
const QUESTDB_URL = 'http://localhost:9000/';
const USERS = ['user1', 'user2', 'user3', 'user4', 'user5'];
const EVENTS = ['browse', 'scroll', 'purchase', 'cancel_payment'];

// 自定义指标
const rowsWritten = new Counter('rows_written'); // 成功写入的行数
const writeDuration = new Trend('write_duration', true); // 每次写入持续时间
const failedRequests = new Counter('failed_requests'); // 失败的请求数量
const successRate = new Rate('success_rate'); // 成功率
const readDuration = new Trend('read_duration', true); // 每次读取持续时间
const rowsRead = new Counter('rows_read'); // 成功读取的行数

function generateData() {
    const userId = USERS[Math.floor(Math.random() * USERS.length)];
    const eventType = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    const eventValue = (Math.random() * 100).toFixed(2);
    const pageUrl = `https_example_com_page_${Math.floor(Math.random() * 100)}`;
    const eventTime = Date.now() * 1000000; // 纳秒级时间戳
    return `user_behavior,user_id=${userId},event_type=${eventType},page_url=${pageUrl} event_value=${eventValue} ${eventTime}`;
}

function writeData() {
    const payload = generateData();
    if (!payload.trim()) {
        failedRequests.add(1);
        console.error('Generated payload is empty or invalid.');
        successRate.add(false); // 记录失败
        return;
    }

    const params = { headers: { 'Content-Type': 'text/plain' } };
    const start = new Date().getTime();

    const res = http.post(`${QUESTDB_URL}write`, payload, params);

    const end = new Date().getTime();
    writeDuration.add(end - start);

    if (res && res.status === 204) {
        rowsWritten.add(1);
        successRate.add(true); // 记录成功
    } else {
        failedRequests.add(1);
        successRate.add(false); // 记录失败
        console.error(`Unexpected status code: ${res ? res.status : 'no response'}, body: ${res ? res.body : 'no response'}`);
    }
}

function readData() {
    const userId = USERS[Math.floor(Math.random() * USERS.length)];
    const query = `SELECT * FROM user_behavior WHERE user_id='${userId}' ORDER BY event_time DESC LIMIT 100`;
    const params = { headers: { 'Content-Type': 'application/json' } };
    const start = new Date().getTime();

    const res = http.get(`${QUESTDB_URL}exec?query=${encodeURIComponent(query)}`, params);

    const end = new Date().getTime();
    readDuration.add(end - start);

    if (res && res.status === 200) {
        const rows = JSON.parse(res.body).dataset.length || 0;
        rowsRead.add(rows);
        successRate.add(true); // 记录成功
    } else {
        failedRequests.add(1);
        successRate.add(false); // 记录失败
        console.error(`Unexpected status code: ${res ? res.status : 'no response'}, body: ${res ? res.body : 'no response'}`);
    }
}

export const options = {
    vus: 100,
    duration: '10s',
    thresholds: {
        success_rate: ['rate>0.99'], // 成功率必须大于 99%
        http_req_duration: ['p(95)<200'], // 95% 的请求在 200ms 内完成
    },
};

export default function () {
    if (Math.random() < 0.8) {
        writeData();
    } else {
        readData();
    }
}