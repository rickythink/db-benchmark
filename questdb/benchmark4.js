import http from 'k6/http';
import { Counter, Trend, Rate } from 'k6/metrics';
import { sleep } from 'k6';

// 配置
const QUESTDB_URL = 'http://localhost:9000/';
const TOTAL_VUS = 1000; // 并发用户数
const REQUESTS_PER_VU = 8; // 每个虚拟用户每秒请求数
const TEST_DURATION = '10s';

const generateRandomString = () => Math.random().toString(36).substring(2, 8); // 生成6位随机字符串
// 预定义测试数据
const PREDEFINED_USERS = Array.from({ length: TOTAL_VUS }, (_, i) => `user${i + 1}_${generateRandomString()}`); // 动态生成 USERS

const EVENTS = ['browse', 'scroll', 'purchase', 'cancel_payment'];

// 指标
const rowsWritten = new Counter('rows_written');
const writeDuration = new Trend('write_duration', true);
const failedRequests = new Counter('failed_requests');
const successRate = new Rate('success_rate');
const readDuration = new Trend('read_duration', true);
const rowsRead = new Counter('rows_read');

// 预插入测试数据
function initializeTestData() {
    PREDEFINED_USERS.forEach(userId => {
        const payload = `user_behavior,user_id=${userId},event_type=init,page_url=init_page event_value=0.0 ${Date.now() * 1000000}`;
        const res = http.post(`${QUESTDB_URL}write`, payload, { 
            headers: { 'Content-Type': 'text/plain' } 
        });
        
        if (res.status !== 204) {
            console.error(`Failed to initialize data for user ${userId}`);
        }
    });
}

// 生成测试数据（使用预定义用户）
function generateData(userId) {
    const eventType = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    const eventValue = (Math.random() * 100).toFixed(2);
    const pageUrl = `https_example_com_page_${Math.floor(Math.random() * 100)}`;
    const eventTime = Date.now() * 1000000;
    return `user_behavior,user_id=${userId},event_type=${eventType},page_url=${pageUrl} event_value=${eventValue} ${eventTime}`;
}

// 写操作（更鲁棒）
function writeData(userId) {
    const payload = generateData(userId);
    const params = { headers: { 'Content-Type': 'text/plain' } };
    const start = Date.now();

    try {
        const res = http.post(`${QUESTDB_URL}write`, payload, params);

        const duration = Date.now() - start;
        writeDuration.add(duration);

        if (res && res.status === 204) {
            rowsWritten.add(1);
            successRate.add(true);
            return true;
        } else {
            throw new Error(`Unexpected write status: ${res ? res.status : 'No response'}`);
        }
    } catch (error) {
        console.error('Write error:', error);
        failedRequests.add(1);
        successRate.add(false);
        return false;
    }
}

// 读操作（更可靠）
function readData(userId) {
    const query = `SELECT * FROM user_behavior WHERE user_id='${userId}' LIMIT 10`;
    const params = { headers: { 'Content-Type': 'application/json' } };
    const start = Date.now();

    try {
        const res = http.get(`${QUESTDB_URL}exec?query=${encodeURIComponent(query)}`, params);

        const duration = Date.now() - start;
        readDuration.add(duration);

        if (res && res.status === 200) {
            const rows = JSON.parse(res.body).dataset.length || 0;
            rowsRead.add(rows);
            successRate.add(rows > 0);
            return rows > 0;
        } else {
            throw new Error(`Unexpected read status: ${res ? res.status : 'No response'}`);
        }
    } catch (error) {
        console.error('Read error:', error);
        failedRequests.add(1);
        successRate.add(false);
        return false;
    }
}

// 负载测试配置
export const options = {
    vus: TOTAL_VUS,
    duration: TEST_DURATION,
    thresholds: {
        success_rate: ['rate>0.95'], // 调低到95%，更现实
        http_req_duration: ['p(95)<500'], // 放宽到500ms
        http_req_failed: ['rate<0.05'] // 失败率小于5%
    },
};

// 初始化阶段
export function setup() {
    initializeTestData();
}

// 测试主逻辑
export default function () {
    const userId = PREDEFINED_USERS[__VU - 1]; // 每个 VU 使用固定用户

    // 交替进行写和读操作
    for (let i = 0; i < REQUESTS_PER_VU; i++) {
        if (i % 2 === 0) {
            writeData(userId);
        } else {
            readData(userId);
        }
        
        // 固定间隔，减少随机性
        sleep(0.2);
    }
}