#!/usr/bin/env python3
"""
Test script to verify the translation API fix
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_text_nodes():
    """Test optimized text-only translation"""
    print("\n" + "="*60)
    print("TEST: Optimized text-nodes path")
    print("="*60)
    
    text_nodes = [
        "India launches new space mission",
        "The mission aims to explore the moon",
        "Scientists have been working for five years",
    ]
    
    payload = {
        "text_nodes": text_nodes,
        "target_lang": "tamil"
    }
    
    try:
        start = time.time()
        response = requests.post(
            f"{BASE_URL}/translate",
            json=payload,
            timeout=60
        )
        elapsed = time.time() - start
        
        print(f"Status: {response.status_code}")
        print(f"Time: {elapsed:.2f}s")
        
        data = response.json()
        print(f"Success: {data.get('success')}")
        print(f"Engine: {data.get('engine')}")
        
        if data.get('success'):
            print("✅ OPTIMIZED PATH WORKS!")
            print(f"Translated {len(data.get('translated_nodes', []))} nodes")
            for i, node in enumerate(data.get('translated_nodes', [])[:2]):
                print(f"  {i+1}. {node}")
        else:
            print(f"❌ Error: {data.get('error')}")
        
        return data.get('success')
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def test_legacy_html():
    """Test legacy HTML translation (fallback)"""
    print("\n" + "="*60)
    print("TEST: Legacy HTML path")
    print("="*60)
    
    html = """
    <div>
        <h1>India's New Space Mission</h1>
        <p>The Indian Space Research Organisation announces a historic mission.</p>
        <p>This marks a major milestone for India's space program.</p>
    </div>
    """
    
    payload = {
        "html_content": html,
        "target_lang": "hindi"
    }
    
    try:
        start = time.time()
        response = requests.post(
            f"{BASE_URL}/translate",
            json=payload,
            timeout=60
        )
        elapsed = time.time() - start
        
        print(f"Status: {response.status_code}")
        print(f"Time: {elapsed:.2f}s")
        
        data = response.json()
        print(f"Success: {data.get('success')}")
        print(f"Engine: {data.get('engine')}")
        
        if data.get('success'):
            print("✅ LEGACY PATH WORKS!")
        else:
            print(f"❌ Error: {data.get('error')}")
        
        return data.get('success')
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def test_invalid_request():
    """Test error handling with invalid request"""
    print("\n" + "="*60)
    print("TEST: Invalid request handling")
    print("="*60)
    
    payload = {
        "target_lang": "tamil"
        # Missing both html_content and text_nodes
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/translate",
            json=payload,
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Success: {data.get('success')}")
        print(f"Error: {data.get('error')}")
        
        if not data.get('success'):
            print("✅ ERROR HANDLING WORKS!")
            return True
        else:
            print("❌ Should have failed")
            return False
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

if __name__ == "__main__":
    print("\n🧪 Translation API Tests\n")
    print("Make sure translator_api.py is running on localhost:8000")
    
    try:
        # Test health endpoint first
        health = requests.get(f"{BASE_URL}/").json()
        print(f"✓ Server healthy: {health}")
    except Exception as e:
        print(f"✗ Server not responding: {e}")
        print("\nStart the server with: python translator_api.py")
        exit(1)
    
    results = []
    results.append(("Optimized (text-nodes)", test_text_nodes()))
    results.append(("Legacy (HTML)", test_legacy_html()))
    results.append(("Error Handling", test_invalid_request()))
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(r[1] for r in results)
    print(f"\nOverall: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")
