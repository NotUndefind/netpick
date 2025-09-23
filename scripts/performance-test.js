#!/usr/bin/env node

// NetPick Performance Test Script
// Tests the /api/discover endpoint for 100 req/sec capability

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TOTAL_REQUESTS = parseInt(process.env.TEST_REQUESTS || '500');
const CONCURRENT_REQUESTS = parseInt(process.env.TEST_CONCURRENT || '100');
const TEST_DURATION_MS = parseInt(process.env.TEST_DURATION || '10000'); // 10 seconds

const countries = ['us', 'fr', 'ca', 'gb', 'de'];
const types = ['any', 'movie', 'series'];

class PerformanceTest {
  constructor() {
    this.results = [];
    this.startTime = null;
    this.endTime = null;
    this.errors = [];
    this.responseTimes = [];
    this.cacheHits = 0;
    this.totalRequests = 0;
  }

  async runTest() {
    console.log('🚀 NetPick Performance Test Starting...');
    console.log(`📊 Target: ${CONCURRENT_REQUESTS} req/sec for ${TEST_DURATION_MS/1000}s`);
    console.log(`🎯 Total requests: ${TOTAL_REQUESTS}`);
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log('');

    // Check if server is running
    await this.checkServerHealth();

    this.startTime = Date.now();

    // Run concurrent requests for the test duration
    const promises = [];
    const requestsPerBatch = Math.ceil(CONCURRENT_REQUESTS / 10); // 10 batches per second
    const batchInterval = 100; // 100ms between batches

    let requestsSent = 0;
    const endTime = Date.now() + TEST_DURATION_MS;

    while (Date.now() < endTime && requestsSent < TOTAL_REQUESTS) {
      const batchPromises = [];

      for (let i = 0; i < requestsPerBatch && requestsSent < TOTAL_REQUESTS; i++) {
        batchPromises.push(this.makeRequest(requestsSent));
        requestsSent++;
      }

      promises.push(...batchPromises);

      // Wait before next batch to maintain rate
      if (Date.now() < endTime) {
        await this.sleep(batchInterval);
      }
    }

    console.log(`📤 Sent ${requestsSent} requests, waiting for responses...`);

    // Wait for all requests to complete
    const results = await Promise.allSettled(promises);

    this.endTime = Date.now();
    this.processResults(results);
    this.generateReport();
  }

  async checkServerHealth() {
    console.log('🏥 Checking server health...');

    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      const data = await response.json();

      if (response.ok && data.status === 'healthy') {
        console.log('✅ Server is healthy');
        console.log(`📊 Cache status: ${data.services.cache.status}`);
        console.log(`💾 Total cached shows: ${data.services.cache.stats.totalShows}`);
        console.log('');
      } else {
        console.warn('⚠️  Server health check failed:', data);
      }
    } catch (error) {
      console.error('❌ Server health check error:', error.message);
      console.log('⚠️  Continuing with test anyway...');
    }
  }

  async makeRequest(requestId) {
    const country = countries[Math.floor(Math.random() * countries.length)];
    const type = types[Math.floor(Math.random() * types.length)];

    const url = `${BASE_URL}/api/discover?country=${country}&type=${type}&userId=test-${requestId}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url);
      const responseTime = Date.now() - startTime;

      const isFromCache = response.headers.get('X-Cache-Hit') === 'true';

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          responseTime,
          fromCache: isFromCache,
          country,
          type,
          showTitle: data.data?.show?.title || 'Unknown'
        };
      } else {
        const errorData = await response.text();
        return {
          success: false,
          responseTime,
          error: `HTTP ${response.status}: ${errorData}`,
          country,
          type
        };
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message,
        country,
        type
      };
    }
  }

  processResults(results) {
    this.totalRequests = results.length;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        this.responseTimes.push(data.responseTime);

        if (data.success) {
          if (data.fromCache) {
            this.cacheHits++;
          }
        } else {
          this.errors.push({
            requestId: index,
            error: data.error,
            country: data.country,
            type: data.type
          });
        }
      } else {
        this.errors.push({
          requestId: index,
          error: result.reason?.message || 'Promise rejected'
        });
      }
    });
  }

  generateReport() {
    const duration = (this.endTime - this.startTime) / 1000;
    const requestsPerSecond = this.totalRequests / duration;
    const successfulRequests = this.totalRequests - this.errors.length;
    const successRate = (successfulRequests / this.totalRequests) * 100;
    const cacheHitRate = (this.cacheHits / successfulRequests) * 100;

    // Calculate response time statistics
    this.responseTimes.sort((a, b) => a - b);
    const avgResponseTime = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    const p50 = this.responseTimes[Math.floor(this.responseTimes.length * 0.5)];
    const p95 = this.responseTimes[Math.floor(this.responseTimes.length * 0.95)];
    const p99 = this.responseTimes[Math.floor(this.responseTimes.length * 0.99)];
    const minTime = this.responseTimes[0];
    const maxTime = this.responseTimes[this.responseTimes.length - 1];

    console.log('\n📊 NetPick Performance Test Results');
    console.log('====================================');
    console.log(`⏱️  Test Duration: ${duration.toFixed(2)}s`);
    console.log(`📤 Total Requests: ${this.totalRequests}`);
    console.log(`✅ Successful Requests: ${successfulRequests}`);
    console.log(`❌ Failed Requests: ${this.errors.length}`);
    console.log(`📈 Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`🚀 Requests/Second: ${requestsPerSecond.toFixed(2)}`);
    console.log(`💾 Cache Hit Rate: ${cacheHitRate.toFixed(2)}%`);
    console.log('');
    console.log('⏱️  Response Time Statistics:');
    console.log(`   Average: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Min: ${minTime}ms`);
    console.log(`   Max: ${maxTime}ms`);
    console.log(`   P50 (Median): ${p50}ms`);
    console.log(`   P95: ${p95}ms`);
    console.log(`   P99: ${p99}ms`);
    console.log('');

    // Performance Assessment
    const performance = this.assessPerformance(requestsPerSecond, avgResponseTime, successRate, cacheHitRate);
    console.log(`🎯 Performance Grade: ${performance.grade}`);
    console.log(`📝 Assessment: ${performance.message}`);
    console.log('');

    // Show errors if any
    if (this.errors.length > 0 && this.errors.length <= 10) {
      console.log('❌ Error Details:');
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.error} (${error.country}/${error.type})`);
      });
      console.log('');
    } else if (this.errors.length > 10) {
      console.log(`❌ ${this.errors.length} errors occurred (showing first 10):`);
      this.errors.slice(0, 10).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.error}`);
      });
      console.log('');
    }

    // Save detailed results
    this.saveDetailedResults({
      duration,
      requestsPerSecond,
      successRate,
      cacheHitRate,
      responseTimes: {
        avg: avgResponseTime,
        min: minTime,
        max: maxTime,
        p50,
        p95,
        p99
      },
      performance,
      errors: this.errors
    });
  }

  assessPerformance(rps, avgResponseTime, successRate, cacheHitRate) {
    let score = 0;
    let issues = [];

    // Rate capability (40 points max)
    if (rps >= 100) score += 40;
    else if (rps >= 80) score += 32;
    else if (rps >= 60) score += 24;
    else if (rps >= 40) score += 16;
    else issues.push(`Low request rate: ${rps.toFixed(1)}/sec (target: 100/sec)`);

    // Response time (30 points max)
    if (avgResponseTime <= 200) score += 30;
    else if (avgResponseTime <= 500) score += 20;
    else if (avgResponseTime <= 1000) score += 10;
    else issues.push(`High response time: ${avgResponseTime.toFixed(0)}ms (target: <200ms)`);

    // Success rate (20 points max)
    if (successRate >= 99) score += 20;
    else if (successRate >= 95) score += 15;
    else if (successRate >= 90) score += 10;
    else issues.push(`Low success rate: ${successRate.toFixed(1)}% (target: >99%)`);

    // Cache hit rate (10 points max)
    if (cacheHitRate >= 95) score += 10;
    else if (cacheHitRate >= 90) score += 8;
    else if (cacheHitRate >= 80) score += 6;
    else issues.push(`Low cache hit rate: ${cacheHitRate.toFixed(1)}% (target: >95%)`);

    let grade, message;
    if (score >= 90) {
      grade = '🟢 EXCELLENT';
      message = 'MVP ready for production! All performance targets met.';
    } else if (score >= 80) {
      grade = '🟡 GOOD';
      message = 'MVP performance is good with minor optimizations needed.';
    } else if (score >= 60) {
      grade = '🟠 FAIR';
      message = 'MVP needs optimization before production deployment.';
    } else {
      grade = '🔴 POOR';
      message = 'Significant performance issues need to be addressed.';
    }

    if (issues.length > 0) {
      message += ` Issues: ${issues.join('; ')}`;
    }

    return { grade, message, score, issues };
  }

  saveDetailedResults(summary) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `performance-test-${timestamp}.json`;
    const filepath = path.join(__dirname, '..', 'test-results', filename);

    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      config: {
        baseUrl: BASE_URL,
        totalRequests: this.totalRequests,
        targetConcurrency: CONCURRENT_REQUESTS,
        testDuration: TEST_DURATION_MS
      },
      summary,
      rawData: {
        responseTimes: this.responseTimes,
        errors: this.errors
      }
    };

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`💾 Detailed results saved to: ${filepath}`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the test
async function main() {
  const test = new PerformanceTest();
  try {
    await test.runTest();
    process.exit(0);
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}