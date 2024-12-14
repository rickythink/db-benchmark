
         /\      Grafana   /‾‾/  
    /\  /  \     |\  __   /  /   
   /  \/    \    | |/ /  /   ‾‾\ 
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/ 

     execution: local
        script: benchmark.js
        output: -

     scenarios: (100.00%) 1 scenario, 10 max VUs, 40s max duration (incl. graceful stop):
              * default: 10 looping VUs for 10s (gracefulStop: 30s)


     ✓ status is 204

     checks.........................: 100.00% 183 out of 183
     data_received..................: 14 kB   1.4 kB/s
     data_sent......................: 248 MB  24 MB/s
     http_req_blocked...............: avg=24.99µs  min=4.63µs   med=8.39µs   max=530.38µs p(90)=15.18µs  p(95)=169.9µs 
     http_req_connecting............: avg=11.73µs  min=0s       med=0s       max=445.37µs p(90)=0s       p(95)=122.51µs
     http_req_duration..............: avg=121.86ms min=12.27ms  med=83.28ms  max=875.61ms p(90)=207.2ms  p(95)=651.33ms
       { expected_response:true }...: avg=121.86ms min=12.27ms  med=83.28ms  max=875.61ms p(90)=207.2ms  p(95)=651.33ms
     http_req_failed................: 0.00%   0 out of 183
     http_req_receiving.............: avg=3.28ms   min=18.44µs  med=46.19µs  max=102.07ms p(90)=4.93ms   p(95)=16.07ms 
     http_req_sending...............: avg=4.38ms   min=462.3µs  med=865.77µs max=81.39ms  p(90)=7.47ms   p(95)=15.15ms 
     http_req_tls_handshaking.......: avg=0s       min=0s       med=0s       max=0s       p(90)=0s       p(95)=0s      
     http_req_waiting...............: avg=114.18ms min=5.69ms   med=71.95ms  max=874.47ms p(90)=200.17ms p(95)=650.1ms 
     http_reqs......................: 183     17.917716/s
     iteration_duration.............: avg=551.66ms min=185.83ms med=470.35ms max=1.48s    p(90)=1s       p(95)=1.02s   
     iterations.....................: 183     17.917716/s
     vus............................: 10      min=10         max=10
     vus_max........................: 10      min=10         max=10


running (10.2s), 00/10 VUs, 183 complete and 0 interrupted iterations
default ✓ [======================================] 10 VUs  10s