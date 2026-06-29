"""
Test script to verify API endpoints are working with migrated data
"""

import requests
import json
from time import sleep

BASE_URL = "http://localhost:5555/api/v1"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def test_endpoint(method, endpoint, name):
    """Test an API endpoint"""
    try:
        url = f"{BASE_URL}{endpoint}"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ {name}")
            print(f"  Status: {response.status_code}")
            
            # Show response summary
            if isinstance(data, dict):
                if 'data' in data:
                    if isinstance(data['data'], list):
                        print(f"  Records returned: {len(data['data'])}")
                    elif isinstance(data['data'], dict):
                        print(f"  Response keys: {list(data['data'].keys())[:5]}")
                elif isinstance(data, dict):
                    print(f"  Response keys: {list(data.keys())[:5]}")
            
            return True
        else:
            print(f"✗ {name}")
            print(f"  Status: {response.status_code}")
            print(f"  Error: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"✗ {name}")
        print(f"  Error: {str(e)}")
        return False

def main():
    print_section("API ENDPOINT TESTING")
    
    # Test health endpoint
    print("\n1. Health Check")
    try:
        response = requests.get("http://localhost:5555/api/health", timeout=5)
        if response.status_code == 200:
            print(f"✓ API Server is running")
            print(f"  Response: {response.json()}")
        else:
            print(f"✗ API Server returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Cannot reach API server: {e}")
        print(f"  Make sure backend is running: node backend/dist/server.js")
        return False
    
    # Test endpoints
    print_section("TESTING DATA ENDPOINTS")
    
    results = []
    
    # Players endpoints
    print("\n2. Players Endpoints")
    results.append(test_endpoint("GET", "/players?league=WNBA&limit=5", "List players"))
    results.append(test_endpoint("GET", "/players/1628909?league=WNBA", "Get specific player"))
    results.append(test_endpoint("GET", "/players/1628909/stats?league=WNBA", "Get player season stats"))
    results.append(test_endpoint("GET", "/players/1628909/game-logs?league=WNBA&limit=5", "Get player game logs"))
    
    # Teams endpoints
    print("\n3. Teams Endpoints")
    results.append(test_endpoint("GET", "/teams?league=WNBA", "List teams"))
    results.append(test_endpoint("GET", "/teams/1611661325?league=WNBA", "Get team details"))
    results.append(test_endpoint("GET", "/teams/1611661325/roster?league=WNBA&season=2024", "Get team roster"))
    
    # News endpoints
    print("\n4. News Endpoints")
    results.append(test_endpoint("GET", "/news?league=WNBA&limit=5", "List news articles"))
    
    # Games endpoints
    print("\n5. Games Endpoints")
    results.append(test_endpoint("GET", "/games/forecasts?league=WNBA&season=2026&limit=3", "Get game forecasts"))
    
    # Summary
    print_section("TEST SUMMARY")
    passed = sum(results)
    total = len(results)
    print(f"\nTests Passed: {passed}/{total}")
    
    if passed == total:
        print("✓ ALL TESTS PASSED - API is working with migrated data!")
        return True
    else:
        print(f"✗ {total - passed} test(s) failed")
        return False

if __name__ == '__main__':
    success = main()
    print("\n" + "="*60 + "\n")
    exit(0 if success else 1)
