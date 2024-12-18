import http from 'k6/http';
import { Counter, Trend, Rate } from 'k6/metrics';
import { sleep } from 'k6';

// 配置
const QUESTDB_URL = 'http://localhost:9000/';
const vus = 10; // 并发用户数
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
const WRITE_RATIO = 0.8; 

// 生成测试数据
function generateData() {
    const userId = USERS[Math.floor(Math.random() * USERS.length)];
    const eventType = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    const eventValue = (Math.random() * 100).toFixed(2);
    const pageUrl = `https_example_com_page_${Math.floor(Math.random() * 100)}`;
    const eventTime = Date.now() * 1000000; // 纳秒级时间戳
    return `user_behavior,user_id=${userId},event_type=${eventType},page_url=${pageUrl} event_value=${eventValue} ${eventTime}`;
}

// 写操作
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

// 读操作
function readData() {
    const userId = USERS[Math.floor(Math.random() * USERS.length)];
    const query = `SELECT * FROM user_behavior WHERE user_id='${userId}' LIMIT 1`;
    const params = { headers: { 'Content-Type': 'application/json' } };
    const start = new Date().getTime();

    const res = http.get(`${QUESTDB_URL}exec?query=${encodeURIComponent(query)}`, params);

    const end = new Date().getTime();
    readDuration.add(end - start);

    if (res && res.status === 200) {
        const rows = JSON.parse(res.body).dataset.length || 0;
        rowsRead.add(rows);
        if (rows === 0) {
            successRate.add(false); // 记录失败
        } else {
            successRate.add(true); // 记录成功
        }
    } else {
        failedRequests.add(1);
        successRate.add(false); // 记录失败
        console.error(`Unexpected status code: ${res ? res.status : 'no response'}, body: ${res ? res.body : 'no response'}`);
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
    // 定义每秒的请求总数
    const requestCount = REQUESTS_PER_SECOND;

    // 根据写操作比例计算写操作和读操作的数量
    const writeCount = Math.floor(requestCount * WRITE_RATIO);
    const readCount = requestCount - writeCount;

    // 生成写和读的操作列表
    const operations = [
        ...Array(writeCount).fill('write'),
        ...Array(readCount).fill('read'),
    ];

    // 随机生成等待时间并归一化，确保总时间不超过1秒
    const randomWaits = Array.from({ length: requestCount }, () => Math.random() * 1000);
    const totalRandomTime = randomWaits.reduce((a, b) => a + b, 0);
    const normalizedWaits = randomWaits.map(wait => (wait / totalRandomTime) * 1000);

    // 按照操作顺序执行写操作和读操作，确保写在读之前
    for (let i = 0; i < operations.length; i++) {
        if (operations[i] === 'write') {
            writeData();
        } else {
            readData();
        }

        // 在每个请求之间随机但受控地等待
        sleep(normalizedWaits[i] / 1000);
    }
}