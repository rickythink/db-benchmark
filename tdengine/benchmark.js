import http from 'k6/http';
import { Counter, Trend, Rate } from 'k6/metrics';
import { sleep } from 'k6';

// 配置
const TDENGINE_URL = 'http://localhost:6041/rest/sql/test';
const AUTH_HEADER = `Basic cm9vdDp0YW9zZGF0YQ==`; // 使用 Base64 编码的用户名和密码
const vus = 10; // 并发用户数
const generateRandomString = () => Math.random().toString(36).substring(2, 8); // 生成6位随机字符串
const USERS = Array.from({ length: vus }, (_, i) => `user${i + 1}_${generateRandomString()}`); // 动态生成 USERS
console.log("USERS", USERS)
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
const WRITE_RATIO = 1; 

// 生成测试数据
function generateData() {
    const userId = USERS[Math.floor(Math.random() * USERS.length)];
    const eventType = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    const eventValue = (Math.random() * 100).toFixed(2);
    const pageUrl = `https://example.com/page_${Math.floor(Math.random() * 100)}`;
    const eventTime = new Date().toISOString().replace('T', ' ').replace('Z', ''); // ISO8601 转 TDengine 时间格式
    return `INSERT INTO user_behavior_1 USING user_behavior TAGS ('${userId}') VALUES ('${eventTime}', '${userId}', '${eventType}', ${eventValue}, '${pageUrl}'); FLUSH;`;
}

// 写操作
function writeData() {
    const payload = generateData();
    const params = {
        headers: {
            'Content-Type': 'text/plain',
            'Authorization': AUTH_HEADER,
        },
    };
    const start = new Date().getTime();

    const res = http.post(TDENGINE_URL, payload, params);

    const end = new Date().getTime();
    writeDuration.add(end - start);

    if (res && res.status === 200) {
        rowsWritten.add(1);
        successRate.add(true);
    } else {
        failedRequests.add(1);
        successRate.add(false);
        console.error(`Unexpected status code: ${res ? res.status : 'no response'}, body: ${res ? res.body : 'no response'}`);
    }
}

// 读操作
function readData() {
    const userId = USERS[Math.floor(Math.random() * USERS.length)];
    const query = `SELECT * FROM user_behavior WHERE user_id='${userId}' and event_time >= NOW() - 10s ORDER BY event_time DESC LIMIT 100;`;
    const params = {
        headers: {
            'Content-Type': 'text/plain',
            'Authorization': AUTH_HEADER,
        },
    };
    const start = new Date().getTime();

    const res = http.post(TDENGINE_URL, query, params);

    const end = new Date().getTime();
    readDuration.add(end - start);

    if (res && res.status === 200 && res.body) {
        try {
            // 解析 JSON 响应
            const response = JSON.parse(res.body);
    
            // 确认响应 code 为 0 且 data 存在
            if (response.code === 0 && response.data) {
                const rows = response.data.length; // 获取数据行数
                rowsRead.add(rows); // 累加读取的行数
                successRate.add(true); // 成功
                // console.log(`Query successful. Rows read: ${rows}`);
            } else {
                rowsRead.add(0); // 如果 data 不存在或行数为 0，计为 0
                failedRequests.add(1);
                successRate.add(false); // 失败
                console.warn(`Query returned no data. Response: ${res.body}`);
            }
        } catch (error) {
            // 解析 JSON 失败
            rowsRead.add(0);
            failedRequests.add(1);
            successRate.add(false);
            console.error(`Failed to parse response: ${res.body}, Error: ${error.message}`);
        }
    } else {
        // 请求失败
        rowsRead.add(0);
        failedRequests.add(1);
        successRate.add(false);
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
    // 在1秒内随机间隔
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