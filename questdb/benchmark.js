import http from 'k6/http';
import { check, Counter, Trend } from 'k6/metrics';

// QuestDB 配置
const QUESTDB_URL = 'http://localhost:9000/'; // 替换为你的 QuestDB HTTP API 地址
const USERS = ['user1', 'user2', 'user3', 'user4', 'user5'];
const EVENTS = ['browse', 'scroll', 'purchase', 'cancel_payment'];

// 自定义指标
const rowsWritten = new Counter('rows_written'); // 成功写入的总行数
const writeDuration = new Trend('write_duration', true); // 每次写入的持续时间
const failedRequests = new Counter('failed_requests'); // 失败的请求数量

// 生成一行模拟数据
function generateData() {
    const userId = USERS[Math.floor(Math.random() * USERS.length)];
    const eventType = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    const eventValue = Math.random() * 100; // 假设行为值是一个随机浮点数
    const pageUrl = `https://example.com/page-${Math.floor(Math.random() * 100)}`;
    const timestamp = Date.now(); // 纳秒级时间戳
    return `user_behavior,user_id=${userId},event_type=${eventType},page_url=${pageUrl} event_value=${eventValue} ${timestamp}000000`;
}

// k6 配置
export const options = {
    vus: 10, // 从低并发开始
    duration: '10s', // 测试时长
    thresholds: {
        http_req_failed: ['rate<0.01'], // 失败率小于1%
        http_req_duration: ['p(95)<200'], // 95%的请求在200ms内完成
    },
};

export default function () {
    const payload = generateData();

    // 验证 payload 是否有效
    if (!payload || payload.trim() === '') {
        console.error('Generated payload is empty or invalid.');
        failedRequests.add(1);
        return;
    }
    console.log('Payload:', payload); // 打印生成的数据，方便调试

    const params = { headers: { 'Content-Type': 'text/plain' } };
    const start = new Date().getTime();

    // 发送 HTTP POST 请求
    const res = http.post(`${QUESTDB_URL}write`, payload, params);

    // 检查 HTTP POST 返回值
    if (!res) {
        console.error('HTTP POST request returned null or undefined.');
        failedRequests.add(1);
        return;
    }

    const end = new Date().getTime();
    writeDuration.add(end - start);

    // 检查请求状态
    const success = check(res, {
        'status is 204': (r) => r.status === 204,
    });

    if (success) {
        rowsWritten.add(1); // 成功写入一行
    } else {
        console.error(`Unexpected status code: ${res.status}, body: ${res.body}`);
        failedRequests.add(1);
    }
}