"""
IndicTrans2 Benchmark Suite
============================
Comprehensive performance comparison between:
- Original PyTorch implementation
- Optimized implementation (batching + caching)
- ONNX Runtime (if available)

Measures:
  - Single request latency
  - Batch throughput
  - Cache efficiency
  - Memory usage
  - Real-world article translation
"""

import os
import sys
import time
import json
import psutil
import tracemalloc
import traceback
from pathlib import Path
from typing import List, Dict, Any, Tuple
import numpy as np
import requests
from datetime import datetime

# ============================================================
# TEST DATA
# ============================================================

SAMPLE_TEXTS = {
    "short": [
        "Hello, this is a test.",
        "Welcome to Bharat News.",
        "Translation quality test.",
    ],
    "medium": [
        "This is a medium length text that contains more information about various topics. "
        "It should be representative of typical news article text found in our system. "
        "Translation accuracy and speed are critical for user experience.",
        "Artificial intelligence and machine learning are transforming how we process information. "
        "Natural language processing enables computers to understand human language in context. "
        "This technology powers many modern applications and services.",
        "Climate change is one of the most pressing challenges of our time. "
        "Global cooperation and sustainable development are essential for our future. "
        "Scientific research continues to show the urgency of climate action.",
    ],
    "long": [
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 20,
        "The history of India is long and varied, spanning many millennia. " * 20,
        "Technology continues to evolve at an unprecedented pace. " * 20,
    ],
}

ARTICLE_HTML = """
<html>
<head><title>Test Article</title></head>
<body>
<h1>Bharat News - Technology Today</h1>
<p>Artificial intelligence is revolutionizing industries across the globe. Machine learning models 
are becoming more sophisticated and capable than ever before. Natural language processing now enables 
seamless communication across language barriers.</p>
<p>The latest advancements in neural networks have led to breakthrough discoveries in medical imaging, 
autonomous vehicles, and predictive analytics. Organizations are investing heavily in AI infrastructure 
to remain competitive in the digital economy.</p>
<p>However, challenges remain in areas like bias detection, model interpretability, and computational efficiency. 
Researchers continue to work on these problems to ensure AI systems are safe, fair, and sustainable.</p>
<p>Data privacy and security are increasingly important as AI systems process more personal information. 
Regulatory frameworks are being developed globally to govern the use of AI technologies.</p>
</body>
</html>
"""


# ============================================================
# UTILITIES
# ============================================================

class PerformanceCollector:
    """Collects and analyzes performance metrics."""
    
    def __init__(self):
        self.latencies: List[float] = []
        self.throughputs: List[float] = []
        self.memory_usage: List[float] = []
        self.cache_hits: int = 0
        self.cache_misses: int = 0
    
    def record_latency(self, duration: float):
        self.latencies.append(duration)
    
    def record_throughput(self, items_per_sec: float):
        self.throughputs.append(items_per_sec)
    
    def record_memory(self, mb: float):
        self.memory_usage.append(mb)
    
    def stats(self) -> Dict[str, Any]:
        """Compute statistics."""
        lats = np.array(self.latencies)
        throughputs = np.array(self.throughputs)
        mems = np.array(self.memory_usage)
        
        return {
            "latency_ms": {
                "min": float(np.min(lats)) if len(lats) > 0 else 0,
                "max": float(np.max(lats)) if len(lats) > 0 else 0,
                "mean": float(np.mean(lats)) if len(lats) > 0 else 0,
                "p50": float(np.percentile(lats, 50)) if len(lats) > 0 else 0,
                "p95": float(np.percentile(lats, 95)) if len(lats) > 0 else 0,
                "p99": float(np.percentile(lats, 99)) if len(lats) > 0 else 0,
                "count": len(lats),
            },
            "throughput": {
                "mean_items_per_sec": float(np.mean(throughputs)) if len(throughputs) > 0 else 0,
                "min_items_per_sec": float(np.min(throughputs)) if len(throughputs) > 0 else 0,
                "max_items_per_sec": float(np.max(throughputs)) if len(throughputs) > 0 else 0,
            },
            "memory_mb": {
                "mean": float(np.mean(mems)) if len(mems) > 0 else 0,
                "max": float(np.max(mems)) if len(mems) > 0 else 0,
            },
            "cache": {
                "hits": self.cache_hits,
                "misses": self.cache_misses,
                "hit_rate": self.cache_hits / (self.cache_hits + self.cache_misses) if (self.cache_hits + self.cache_misses) > 0 else 0,
            },
        }


# ============================================================
# BENCHMARK TESTS
# ============================================================

def test_server_availability(server_url: str = "http://localhost:8000") -> bool:
    """Check if translation server is running."""
    try:
        resp = requests.get(f"{server_url}/", timeout=5)
        return resp.status_code == 200
    except:
        return False


def benchmark_single_requests(
    server_url: str,
    target_lang: str,
    text_sizes: Dict[str, List[str]],
    iterations_per_size: int = 5,
) -> Dict[str, Any]:
    """
    Benchmark single-request performance.
    Tests impact of text length on latency.
    """
    print(f"\n{'='*70}")
    print(f"  Single Request Performance")
    print(f"{'='*70}")
    
    results = {}
    
    for size_name, texts in text_sizes.items():
        collector = PerformanceCollector()
        print(f"\n{size_name.upper()} texts ({len(texts[0])} chars each):")
        
        for iteration in range(iterations_per_size):
            latencies = []
            
            for text in texts:
                start = time.time()
                try:
                    resp = requests.post(
                        f"{server_url}/translate",
                        json={
                            "text_nodes": [text],
                            "target_lang": target_lang,
                        },
                        timeout=180,
                    )
                    elapsed = (time.time() - start) * 1000  # ms
                    latencies.append(elapsed)
                    
                    if resp.status_code != 200:
                        print(f"  ❌ Request failed: {resp.status_code}")
                        continue
                    
                    data = resp.json()
                    if not data.get("success"):
                        print(f"  ❌ Translation failed: {data.get('error')}")
                        continue
                except Exception as e:
                    print(f"  ❌ Request error: {e}")
                    continue
            
            if latencies:
                avg_latency = np.mean(latencies)
                collector.record_latency(avg_latency)
                print(f"  Iter {iteration+1:2d}: {avg_latency:8.1f}ms")
        
        results[size_name] = collector.stats()
    
    return results


def benchmark_batch_requests(
    server_url: str,
    target_lang: str,
    batch_sizes: List[int] = [5, 10, 20, 50],
    iterations: int = 3,
) -> Dict[str, Any]:
    """
    Benchmark batched text_nodes performance.
    Tests smart batching queue efficiency.
    """
    print(f"\n{'='*70}")
    print(f"  Batch Request Performance")
    print(f"{'='*70}")
    
    results = {}
    
    for batch_size in batch_sizes:
        collector = PerformanceCollector()
        print(f"\nBatch size: {batch_size}")
        
        for iteration in range(iterations):
            # Create batch of medium text
            batch_texts = SAMPLE_TEXTS["medium"] * (batch_size // len(SAMPLE_TEXTS["medium"]) + 1)
            batch_texts = batch_texts[:batch_size]
            
            start = time.time()
            try:
                resp = requests.post(
                    f"{server_url}/translate",
                    json={
                        "text_nodes": batch_texts,
                        "target_lang": target_lang,
                    },
                    timeout=180,
                )
                elapsed = (time.time() - start) * 1000  # ms
                
                if resp.status_code != 200:
                    print(f"  ❌ Request failed: {resp.status_code}")
                    continue
                
                data = resp.json()
                if not data.get("success"):
                    print(f"  ❌ Translation failed: {data.get('error')}")
                    continue
                
                collector.record_latency(elapsed)
                
                # Calculate throughput
                chars_translated = sum(len(t) for t in batch_texts)
                throughput = (batch_size / elapsed) * 1000 if elapsed > 0 else 0
                collector.record_throughput(throughput)
                
                print(f"  Iter {iteration+1}: {elapsed:8.1f}ms ({throughput:6.1f} texts/sec)")
            
            except Exception as e:
                print(f"  ❌ Request error: {e}")
        
        results[f"batch_{batch_size}"] = collector.stats()
    
    return results


def benchmark_cache_efficiency(
    server_url: str,
    target_lang: str,
    num_repeats: int = 5,
) -> Dict[str, Any]:
    """
    Benchmark caching performance.
    Repeat same texts multiple times and compare.
    """
    print(f"\n{'='*70}")
    print(f"  Cache Efficiency")
    print(f"{'='*70}")
    
    test_texts = SAMPLE_TEXTS["medium"][:3]
    
    first_pass_times = []
    repeat_times = []
    
    print(f"\nTranslating {len(test_texts)} texts {num_repeats} times...")
    print(f"(First pass should be slower, repeats should use cache)\n")
    
    for repeat in range(num_repeats):
        start = time.time()
        try:
            resp = requests.post(
                f"{server_url}/translate",
                json={
                    "text_nodes": test_texts,
                    "target_lang": target_lang,
                },
                timeout=180,
            )
            elapsed = (time.time() - start) * 1000
            
            if resp.status_code == 200 and resp.json().get("success"):
                if repeat == 0:
                    first_pass_times.append(elapsed)
                else:
                    repeat_times.append(elapsed)
                
                marker = "🔄 CACHE" if repeat > 0 else "🆕 FRESH"
                print(f"  Pass {repeat+1}: {elapsed:8.1f}ms {marker}")
        except Exception as e:
            print(f"  ❌ Request {repeat+1} failed: {e}")
    
    first_avg = np.mean(first_pass_times) if first_pass_times else 0
    repeat_avg = np.mean(repeat_times) if repeat_times else 0
    speedup = first_avg / repeat_avg if repeat_avg > 0 else 0
    
    return {
        "first_pass_ms": first_avg,
        "cached_ms": repeat_avg,
        "cache_speedup": speedup,
        "cache_improvement_pct": ((first_avg - repeat_avg) / first_avg * 100) if first_avg > 0 else 0,
    }


def benchmark_article_translation(
    server_url: str,
    target_lang: str,
) -> Dict[str, Any]:
    """
    Benchmark full article translation (real-world scenario).
    """
    print(f"\n{'='*70}")
    print(f"  Full Article Translation (Real-world)")
    print(f"{'='*70}")
    
    from bs4 import BeautifulSoup
    
    # Extract text nodes from HTML (simulate frontend)
    soup = BeautifulSoup(ARTICLE_HTML, "html.parser")
    text_nodes = []
    for element in soup.descendants:
        if hasattr(element, "name") and element.string:
            text = str(element.string).strip()
            if text and len(text) > 2:
                text_nodes.append(text)
    
    print(f"\nArticle: {len(ARTICLE_HTML)} chars HTML")
    print(f"Text nodes: {len(text_nodes)}")
    print(f"Total chars: {sum(len(t) for t in text_nodes)}")
    print()
    
    times = []
    for i in range(3):
        start = time.time()
        try:
            resp = requests.post(
                f"{server_url}/translate",
                json={
                    "text_nodes": text_nodes,
                    "target_lang": target_lang,
                },
                timeout=180,
            )
            elapsed = (time.time() - start) * 1000
            
            if resp.status_code == 200 and resp.json().get("success"):
                times.append(elapsed)
                marker = "🔄 CACHE" if i > 0 else "🆕 FRESH"
                print(f"  Pass {i+1}: {elapsed:8.1f}ms {marker}")
            else:
                print(f"  ❌ Translation failed")
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    return {
        "num_text_nodes": len(text_nodes),
        "total_chars": sum(len(t) for t in text_nodes),
        "first_pass_ms": times[0] if times else 0,
        "average_ms": np.mean(times) if times else 0,
        "cache_speedup": times[0] / times[1] if len(times) > 1 and times[1] > 0 else 0,
    }


# ============================================================
# MAIN BENCHMARK SUITE
# ============================================================

def run_full_benchmark(
    server_url: str = "http://localhost:8000",
    target_lang: str = "hindi",
) -> Dict[str, Any]:
    """Run complete benchmark suite."""
    
    print(f"\n{'='*70}")
    print(f"  IndicTrans2 HIGH-PERFORMANCE BENCHMARK SUITE")
    print(f"{'='*70}")
    print(f"Server: {server_url}")
    print(f"Target: {target_lang}")
    print(f"Time: {datetime.now().isoformat()}")
    
    # Check server
    if not test_server_availability(server_url):
        print(f"\n❌ Translation server not available at {server_url}")
        print(f"   Start with: python translator_api_optimized.py")
        return {}
    
    print(f"✅ Server is running\n")
    
    # Get server info
    try:
        info = requests.get(f"{server_url}/").json()
        print(f"Server Info:")
        print(f"  Model:  {info.get('model')}")
        print(f"  Device: {info.get('device')}")
        print(f"  ONNX:   {info.get('onnx_enabled')}")
        print(f"  Cache:  {info.get('cache_stats')}")
    except Exception as e:
        print(f"  Could not fetch server info: {e}")
    
    results = {}
    
    try:
        # 1. Single request performance
        results["single_requests"] = benchmark_single_requests(
            server_url,
            target_lang,
            SAMPLE_TEXTS,
            iterations_per_size=3,
        )
        
        # 2. Batch performance
        results["batch_requests"] = benchmark_batch_requests(
            server_url,
            target_lang,
            batch_sizes=[5, 10, 20],
            iterations=2,
        )
        
        # 3. Cache efficiency
        results["cache_efficiency"] = benchmark_cache_efficiency(
            server_url,
            target_lang,
            num_repeats=5,
        )
        
        # 4. Article translation
        results["article_translation"] = benchmark_article_translation(
            server_url,
            target_lang,
        )
    
    except Exception as e:
        print(f"\n❌ Benchmark error: {e}")
        traceback.print_exc()
        return results
    
    # Print summary
    print(f"\n{'='*70}")
    print(f"  BENCHMARK SUMMARY")
    print(f"{'='*70}")
    
    if "single_requests" in results:
        sr = results["single_requests"].get("medium", {})
        print(f"\nSingle Requests (medium text):")
        if "latency_ms" in sr:
            lat = sr["latency_ms"]
            print(f"  Mean latency: {lat.get('mean', 0):.1f}ms")
            print(f"  P95 latency:  {lat.get('p95', 0):.1f}ms")
            print(f"  P99 latency:  {lat.get('p99', 0):.1f}ms")
    
    if "cache_efficiency" in results:
        ce = results["cache_efficiency"]
        print(f"\nCache Efficiency:")
        print(f"  First pass:      {ce.get('first_pass_ms', 0):.1f}ms")
        print(f"  Cached (avg):    {ce.get('cached_ms', 0):.1f}ms")
        print(f"  Cache speedup:   {ce.get('cache_speedup', 0):.1f}x")
        print(f"  Improvement:     {ce.get('cache_improvement_pct', 0):.1f}%")
    
    if "article_translation" in results:
        at = results["article_translation"]
        print(f"\nArticle Translation:")
        print(f"  Text nodes:      {at.get('num_text_nodes', 0)}")
        print(f"  First pass:      {at.get('first_pass_ms', 0):.1f}ms")
        print(f"  Cached avg:      {at.get('average_ms', 0):.1f}ms")
        print(f"  Cache speedup:   {at.get('cache_speedup', 0):.1f}x")
    
    # Save results to file
    output_file = "benchmark_results.json"
    try:
        with open(output_file, "w") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n✅ Results saved to {output_file}")
    except Exception as e:
        print(f"\n⚠️  Could not save results: {e}")
    
    print(f"\n{'='*70}\n")
    
    return results


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Benchmark IndicTrans2 optimization")
    parser.add_argument("--server", type=str, default="http://localhost:8000", help="Server URL")
    parser.add_argument("--lang", type=str, default="hindi", help="Target language")
    
    args = parser.parse_args()
    
    run_full_benchmark(server_url=args.server, target_lang=args.lang)
